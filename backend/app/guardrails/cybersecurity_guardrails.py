"""
Cybersecurity Guardrails Engine for Joti Platform.

Validates GenAI inputs and outputs to ensure quality, accuracy, and safety
in threat intelligence analysis.
"""
import re
import json
from typing import Dict, List, Optional, Any
from enum import Enum
from app.core.logging import logger


class GuardrailAction(str, Enum):
    """Action to take when a guardrail is violated."""
    REJECT = "reject"       # Block the output entirely
    WARN = "warn"           # Allow but flag the issue
    FIX = "fix"             # Attempt to auto-fix the output
    LOG = "log"             # Log only, allow output through


class GuardrailResult:
    """Result of a guardrail check."""

    def __init__(self, passed: bool, guardrail_name: str, message: str = "",
                 action: GuardrailAction = GuardrailAction.WARN, fixed_output: Optional[str] = None):
        self.passed = passed
        self.guardrail_name = guardrail_name
        self.message = message
        self.action = action
        self.fixed_output = fixed_output

    def to_dict(self) -> Dict:
        return {
            "passed": self.passed,
            "guardrail": self.guardrail_name,
            "message": self.message,
            "action": self.action.value,
        }


# ==============================================================================
# GLOBAL GUARDRAILS (apply to all GenAI calls)
# ==============================================================================

def check_prompt_injection(user_input: str) -> GuardrailResult:
    """Detect common prompt injection patterns in user inputs."""
    injection_patterns = [
        r"ignore\s+(all\s+)?previous\s+instructions",
        r"disregard\s+(all\s+)?above",
        r"you\s+are\s+now\s+(?:a|an)\s+(?:different|new)",
        r"system\s*:\s*you\s+are",
        r"forget\s+(everything|all)\s+(you|that)",
        r"pretend\s+you\s+are",
        r"act\s+as\s+(?:if|though)\s+you",
        r"override\s+(?:your|all)\s+(?:instructions|rules)",
        r"\[SYSTEM\]",
        r"<\|im_start\|>",
    ]

    text_lower = user_input.lower()
    for pattern in injection_patterns:
        if re.search(pattern, text_lower):
            return GuardrailResult(
                passed=False,
                guardrail_name="anti_prompt_injection",
                message=f"Potential prompt injection detected",
                action=GuardrailAction.REJECT
            )

    return GuardrailResult(passed=True, guardrail_name="anti_prompt_injection")


def check_output_grounding(output: str, source_content: str) -> GuardrailResult:
    """Verify that output claims are grounded in the source content."""
    # Extract any CVE IDs from the output
    output_cves = set(re.findall(r"CVE-\d{4}-\d{4,}", output))
    source_cves = set(re.findall(r"CVE-\d{4}-\d{4,}", source_content))

    fabricated_cves = output_cves - source_cves
    if fabricated_cves:
        return GuardrailResult(
            passed=False,
            guardrail_name="data_grounding",
            message=f"CVEs not found in source: {', '.join(fabricated_cves)}",
            action=GuardrailAction.WARN
        )

    return GuardrailResult(passed=True, guardrail_name="data_grounding")


def check_pii_leakage(output: str) -> GuardrailResult:
    """Check for potential PII in the output that should be redacted."""
    pii_patterns = {
        "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
        "credit_card": r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",
        "phone": r"\b(?:\+1[\s-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b",
    }

    for pii_type, pattern in pii_patterns.items():
        if re.search(pattern, output):
            return GuardrailResult(
                passed=False,
                guardrail_name="pii_protection",
                message=f"Potential {pii_type} detected in output",
                action=GuardrailAction.WARN
            )

    return GuardrailResult(passed=True, guardrail_name="pii_protection")


def validate_mitre_technique_format(technique_id: str) -> bool:
    """Validate MITRE ATT&CK technique ID format."""
    return bool(re.match(r"^T\d{4}(\.\d{3})?$", technique_id))


# ==============================================================================
# FUNCTION-SPECIFIC GUARDRAILS
# ==============================================================================

def check_executive_summary(output: str) -> GuardrailResult:
    """Validate executive summary format: prose paragraphs, no bullet points, word limit."""
    # Check for bullet points
    bullet_patterns = [r"^\s*[-*]\s+", r"^\s*\d+\.\s+"]
    lines = output.strip().split("\n")
    bullet_count = 0
    for line in lines:
        for pattern in bullet_patterns:
            if re.match(pattern, line):
                bullet_count += 1

    if bullet_count > 2:
        return GuardrailResult(
            passed=False,
            guardrail_name="executive_summary_format",
            message=f"Executive summary contains {bullet_count} bullet points. Should be narrative prose.",
            action=GuardrailAction.WARN
        )

    # Check word count
    word_count = len(output.split())
    if word_count > 350:
        return GuardrailResult(
            passed=False,
            guardrail_name="executive_summary_format",
            message=f"Executive summary is {word_count} words (max 250 recommended).",
            action=GuardrailAction.WARN
        )

    # Check paragraph count (2-4 paragraphs expected)
    paragraphs = [p.strip() for p in output.strip().split("\n\n") if p.strip()]
    if len(paragraphs) < 1:
        return GuardrailResult(
            passed=False,
            guardrail_name="executive_summary_format",
            message="Executive summary should contain at least 1 paragraph.",
            action=GuardrailAction.WARN
        )

    return GuardrailResult(passed=True, guardrail_name="executive_summary_format")


def check_technical_summary(output: str) -> GuardrailResult:
    """Validate technical summary includes MITRE ATT&CK references."""
    techniques = re.findall(r"T\d{4}(?:\.\d{3})?", output)
    if len(techniques) == 0:
        return GuardrailResult(
            passed=False,
            guardrail_name="technical_summary_format",
            message="Technical summary should reference MITRE ATT&CK technique IDs.",
            action=GuardrailAction.WARN
        )

    # Validate technique ID formats
    invalid_techniques = [t for t in techniques if not validate_mitre_technique_format(t)]
    if invalid_techniques:
        return GuardrailResult(
            passed=False,
            guardrail_name="technical_summary_format",
            message=f"Invalid MITRE technique IDs: {', '.join(invalid_techniques)}",
            action=GuardrailAction.WARN
        )

    # Check word count (300-400 recommended)
    word_count = len(output.split())
    if word_count < 100:
        return GuardrailResult(
            passed=False,
            guardrail_name="technical_summary_format",
            message=f"Technical summary is too short ({word_count} words, 300-400 recommended).",
            action=GuardrailAction.WARN
        )

    return GuardrailResult(passed=True, guardrail_name="technical_summary_format")


def check_ioc_extraction_json(output: str) -> GuardrailResult:
    """Validate IOC extraction output is valid JSON with expected structure."""
    try:
        # Try to extract JSON from output (may have surrounding text)
        json_match = re.search(r"\{[\s\S]*\}", output)
        if not json_match:
            return GuardrailResult(
                passed=False,
                guardrail_name="ioc_extraction_format",
                message="IOC extraction output does not contain valid JSON.",
                action=GuardrailAction.WARN
            )

        data = json.loads(json_match.group())

        # Validate structure
        if "indicators" not in data:
            return GuardrailResult(
                passed=False,
                guardrail_name="ioc_extraction_format",
                message="IOC output missing 'indicators' key.",
                action=GuardrailAction.WARN
            )

        indicators = data["indicators"]
        expected_keys = {"ips", "domains", "urls", "hashes", "emails", "cves"}
        present_keys = set(indicators.keys())

        if not expected_keys.issubset(present_keys):
            missing = expected_keys - present_keys
            return GuardrailResult(
                passed=False,
                guardrail_name="ioc_extraction_format",
                message=f"IOC output missing indicator types: {', '.join(missing)}",
                action=GuardrailAction.WARN
            )

        # Validate IOC formats
        for ip_entry in indicators.get("ips", []):
            ip_val = ip_entry.get("value", "")
            # Check defanging (should contain [.])
            if "." in ip_val and "[.]" not in ip_val:
                return GuardrailResult(
                    passed=False,
                    guardrail_name="ioc_extraction_format",
                    message=f"IP not defanged: {ip_val}",
                    action=GuardrailAction.FIX
                )

        for hash_entry in indicators.get("hashes", []):
            hash_val = hash_entry.get("value", "")
            hash_type = hash_entry.get("type", "").upper()
            expected_lengths = {"MD5": 32, "SHA1": 40, "SHA256": 64}
            if hash_type in expected_lengths and len(hash_val) != expected_lengths[hash_type]:
                return GuardrailResult(
                    passed=False,
                    guardrail_name="ioc_extraction_format",
                    message=f"Invalid {hash_type} hash length: {len(hash_val)} (expected {expected_lengths[hash_type]})",
                    action=GuardrailAction.WARN
                )

        for cve_entry in indicators.get("cves", []):
            cve_val = cve_entry.get("value", "")
            if not re.match(r"^CVE-\d{4}-\d{4,}$", cve_val):
                return GuardrailResult(
                    passed=False,
                    guardrail_name="ioc_extraction_format",
                    message=f"Invalid CVE format: {cve_val}",
                    action=GuardrailAction.WARN
                )

        return GuardrailResult(passed=True, guardrail_name="ioc_extraction_format")

    except json.JSONDecodeError as e:
        return GuardrailResult(
            passed=False,
            guardrail_name="ioc_extraction_format",
            message=f"Invalid JSON in IOC output: {str(e)}",
            action=GuardrailAction.WARN
        )


# ==============================================================================
# MAIN ENGINE
# ==============================================================================

class CybersecurityGuardrailEngine:
    """
    Central guardrails engine that validates GenAI inputs and outputs
    for cybersecurity threat intelligence operations.
    """

    def __init__(self):
        self.enabled = True
        self.violations: List[Dict] = []

    def validate_input(self, user_input: str, context: Optional[Dict] = None) -> List[GuardrailResult]:
        """Run all input guardrails before sending to GenAI."""
        results = []

        if not self.enabled:
            return results

        # Anti-prompt injection
        result = check_prompt_injection(user_input)
        if not result.passed:
            self.violations.append(result.to_dict())
        results.append(result)

        return results

    def validate_output(
        self,
        output: str,
        output_type: str = "generic",
        source_content: Optional[str] = None,
    ) -> List[GuardrailResult]:
        """
        Run output guardrails after receiving GenAI response.

        Args:
            output: The GenAI output text
            output_type: One of 'executive_summary', 'technical_summary', 'ioc_extraction', 'generic'
            source_content: Original article content for grounding checks
        """
        results = []

        if not self.enabled:
            return results

        # Global output checks
        pii_result = check_pii_leakage(output)
        if not pii_result.passed:
            self.violations.append(pii_result.to_dict())
        results.append(pii_result)

        # Data grounding check (if source content available)
        if source_content:
            grounding_result = check_output_grounding(output, source_content)
            if not grounding_result.passed:
                self.violations.append(grounding_result.to_dict())
            results.append(grounding_result)

        # Function-specific checks
        if output_type == "executive_summary":
            exec_result = check_executive_summary(output)
            if not exec_result.passed:
                self.violations.append(exec_result.to_dict())
            results.append(exec_result)

        elif output_type == "technical_summary":
            tech_result = check_technical_summary(output)
            if not tech_result.passed:
                self.violations.append(tech_result.to_dict())
            results.append(tech_result)

        elif output_type == "ioc_extraction":
            ioc_result = check_ioc_extraction_json(output)
            if not ioc_result.passed:
                self.violations.append(ioc_result.to_dict())
            results.append(ioc_result)

        # Log any violations
        failed = [r for r in results if not r.passed]
        if failed:
            logger.warning(
                "guardrail_violations",
                output_type=output_type,
                violations=[r.to_dict() for r in failed],
                violation_count=len(failed)
            )

        return results

    def has_blocking_violations(self, results: List[GuardrailResult]) -> bool:
        """Check if any guardrail results require blocking the output."""
        return any(not r.passed and r.action == GuardrailAction.REJECT for r in results)

    def get_violations_summary(self, results: List[GuardrailResult]) -> List[Dict]:
        """Get a summary of all violations."""
        return [r.to_dict() for r in results if not r.passed]

    def reset_violations(self):
        """Reset the violations log."""
        self.violations = []


# ==============================================================================
# FACTORY FUNCTION (used by GenAIOrchestrator)
# ==============================================================================

# Singleton instance
_engine_instance: Optional[CybersecurityGuardrailEngine] = None


def get_guardrail_engine(db_session=None) -> CybersecurityGuardrailEngine:
    """Get or create the singleton guardrail engine.

    This is the entry point used by GenAIOrchestrator._get_guardrail_engine().
    The db_session parameter is accepted for future DB-backed guardrail configs.
    """
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = CybersecurityGuardrailEngine()
    return _engine_instance
