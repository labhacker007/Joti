"""
Guardrail Management API Routes
Provides endpoints for managing and applying cybersecurity guardrails.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.models import User
from app.core.logging import logger
from app.guardrails.cybersecurity_guardrails import (
    CybersecurityGuardrailEngine,
    CYBERSECURITY_GUARDRAILS,
    PLATFORM_SYNTAX,
    GuardrailCategory,
    GuardrailSeverity,
    get_guardrail_engine
)

router = APIRouter(prefix="/guardrails/cybersecurity", tags=["guardrails"])


class GuardrailListResponse(BaseModel):
    """Response containing list of guardrails."""
    guardrails: List[Dict]
    total: int
    categories: Dict[str, int]


class ValidateInputRequest(BaseModel):
    """Request to validate input against guardrails."""
    prompt: str = Field(..., description="The input prompt to validate")
    use_case: str = Field(..., description="Use case (hunt_query, ioc_extraction, etc.)")
    platform: Optional[str] = Field(None, description="Target platform")
    guardrail_ids: Optional[List[str]] = Field(None, description="Specific guardrail IDs to apply")


class ValidateOutputRequest(BaseModel):
    """Request to validate output against guardrails."""
    output: str = Field(..., description="The GenAI output to validate")
    use_case: str = Field(..., description="Use case")
    platform: Optional[str] = Field(None, description="Target platform")
    source_content: Optional[str] = Field(None, description="Original source content for hallucination check")


class ValidateQueryRequest(BaseModel):
    """Request to validate query syntax."""
    query: str = Field(..., description="The query to validate")
    platform: str = Field(..., description="Target platform (defender, xsiam, splunk, etc.)")


class ValidationResponse(BaseModel):
    """Response from validation."""
    passed: bool
    results: List[Dict]
    critical_failures: int
    high_failures: int
    warnings: int
    suggestions: List[str]


@router.get("/list", response_model=GuardrailListResponse)
async def list_guardrails(
    category: Optional[str] = None,
    use_case: Optional[str] = None,
    platform: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all available cybersecurity guardrails.
    Can filter by category, use case, or platform.
    """
    engine = get_guardrail_engine(db)
    
    guardrails = engine.get_all_guardrails()
    
    # Filter by category
    if category:
        guardrails = [g for g in guardrails if g.category.value == category]
    
    # Filter by use case
    if use_case:
        guardrails = [g for g in guardrails if "all" in g.applicable_use_cases or use_case in g.applicable_use_cases]
    
    # Filter by platform
    if platform:
        guardrails = [g for g in guardrails if not g.applicable_platforms or "all" in g.applicable_platforms or platform in g.applicable_platforms]
    
    # Count by category
    categories = {}
    for g in CYBERSECURITY_GUARDRAILS:
        cat = g.category.value
        categories[cat] = categories.get(cat, 0) + 1
    
    return GuardrailListResponse(
        guardrails=[{
            "id": g.id,
            "name": g.name,
            "description": g.description,
            "category": g.category.value,
            "severity": g.severity.value,
            "enabled": g.enabled,
            "applicable_use_cases": g.applicable_use_cases,
            "applicable_platforms": g.applicable_platforms,
            "config": g.config
        } for g in guardrails],
        total=len(guardrails),
        categories=categories
    )


@router.get("/categories")
async def get_categories(
    current_user: User = Depends(get_current_user)
):
    """Get all guardrail categories with descriptions."""
    return {
        "categories": [
            {
                "id": GuardrailCategory.PROMPT_SAFETY.value,
                "name": "Prompt Safety",
                "description": "Protect against prompt injection and manipulation attacks",
                "icon": "🛡️"
            },
            {
                "id": GuardrailCategory.QUERY_VALIDATION.value,
                "name": "Query Validation",
                "description": "Validate query syntax and prevent dangerous operations",
                "icon": "🔍"
            },
            {
                "id": GuardrailCategory.OUTPUT_VALIDATION.value,
                "name": "Output Validation",
                "description": "Sanitize and validate GenAI output",
                "icon": "📤"
            },
            {
                "id": GuardrailCategory.HALLUCINATION_PREVENTION.value,
                "name": "Hallucination Prevention",
                "description": "Verify factual accuracy and prevent fabricated information",
                "icon": "🎯"
            },
            {
                "id": GuardrailCategory.SECURITY_CONTEXT.value,
                "name": "Security Context",
                "description": "Enforce security policies and data classification",
                "icon": "🔐"
            },
            {
                "id": GuardrailCategory.PLATFORM_SPECIFIC.value,
                "name": "Platform Specific",
                "description": "Platform-specific validation and best practices",
                "icon": "⚙️"
            },
            {
                "id": GuardrailCategory.DATA_PROTECTION.value,
                "name": "Data Protection",
                "description": "Protect sensitive data and PII",
                "icon": "🔒"
            },
            {
                "id": GuardrailCategory.COMPLIANCE.value,
                "name": "Compliance",
                "description": "Ensure regulatory and policy compliance",
                "icon": "📋"
            }
        ]
    }


@router.get("/platforms")
async def get_platforms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all supported platforms with syntax documentation."""
    platforms = []
    
    for platform_id, platform_info in PLATFORM_SYNTAX.items():
        platforms.append({
            "id": platform_id,
            "name": platform_info["name"],
            "language": platform_info["language"],
            "tables": platform_info.get("tables", []),
            "common_fields": platform_info.get("common_fields", []),
            "operators": platform_info.get("operators", []),
            "keywords": platform_info.get("keywords", []),
            "example_query": platform_info.get("example_query", ""),
            "documentation_url": platform_info.get("documentation_url", "")
        })
    
    # Check which platforms are connected
    try:
        from app.connectors.routes import get_connectors
        # This would integrate with actual connectors
        connected = ["defender", "xsiam"]  # Example
    except:
        connected = []
    
    return {
        "platforms": platforms,
        "connected_platforms": connected,
        "total": len(platforms)
    }


@router.get("/platform/{platform_id}/syntax")
async def get_platform_syntax(
    platform_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed syntax documentation for a specific platform."""
    platform_info = PLATFORM_SYNTAX.get(platform_id)
    
    if not platform_info:
        # Check knowledge base for documentation
        has_kb_docs = False  # Would check actual KB
        
        if not has_kb_docs:
            raise HTTPException(
                status_code=404,
                detail={
                    "message": f"Platform '{platform_id}' not found in built-in documentation",
                    "suggestion": "Please ask your administrator to add documentation for this platform to the Knowledge Base",
                    "knowledge_base_recommended": True
                }
            )
    
    return {
        "platform": platform_id,
        **platform_info,
        "guardrails": [
            {
                "id": g.id,
                "name": g.name,
                "description": g.description,
                "severity": g.severity.value
            }
            for g in CYBERSECURITY_GUARDRAILS
            if platform_id in g.applicable_platforms or "all" in g.applicable_platforms
        ]
    }


@router.post("/validate/input", response_model=ValidationResponse)
async def validate_input(
    request: ValidateInputRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Validate input prompt against applicable guardrails.
    Used before sending prompts to GenAI.
    """
    engine = get_guardrail_engine(db)
    
    passed, results = await engine.validate_input(
        prompt=request.prompt,
        use_case=request.use_case,
        platform=request.platform,
        guardrail_ids=request.guardrail_ids
    )
    
    # Count by severity
    critical = sum(1 for r in results if not r.passed and r.severity == GuardrailSeverity.CRITICAL)
    high = sum(1 for r in results if not r.passed and r.severity == GuardrailSeverity.HIGH)
    warnings = sum(1 for r in results if not r.passed and r.severity in [GuardrailSeverity.MEDIUM, GuardrailSeverity.LOW])
    
    # Collect suggestions
    suggestions = [r.suggestion for r in results if r.suggestion and not r.passed]
    
    # Log validation
    logger.info(
        "guardrail_input_validation",
        user_id=current_user.id,
        use_case=request.use_case,
        platform=request.platform,
        passed=passed,
        critical_failures=critical,
        high_failures=high
    )
    
    return ValidationResponse(
        passed=passed,
        results=[{
            "guardrail_id": r.guardrail_id,
            "guardrail_name": r.guardrail_name,
            "category": r.category.value,
            "severity": r.severity.value,
            "passed": r.passed,
            "message": r.message,
            "details": r.details,
            "suggestion": r.suggestion,
            "knowledge_base_recommended": r.knowledge_base_recommended
        } for r in results],
        critical_failures=critical,
        high_failures=high,
        warnings=warnings,
        suggestions=suggestions
    )


@router.post("/validate/output", response_model=ValidationResponse)
async def validate_output(
    request: ValidateOutputRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Validate GenAI output against applicable guardrails.
    Used after receiving responses from GenAI.
    """
    engine = get_guardrail_engine(db)
    
    passed, results = await engine.validate_output(
        output=request.output,
        use_case=request.use_case,
        platform=request.platform,
        source_content=request.source_content
    )
    
    critical = sum(1 for r in results if not r.passed and r.severity == GuardrailSeverity.CRITICAL)
    high = sum(1 for r in results if not r.passed and r.severity == GuardrailSeverity.HIGH)
    warnings = sum(1 for r in results if not r.passed and r.severity in [GuardrailSeverity.MEDIUM, GuardrailSeverity.LOW])
    suggestions = [r.suggestion for r in results if r.suggestion and not r.passed]
    
    logger.info(
        "guardrail_output_validation",
        user_id=current_user.id,
        use_case=request.use_case,
        passed=passed,
        critical_failures=critical
    )
    
    return ValidationResponse(
        passed=passed,
        results=[{
            "guardrail_id": r.guardrail_id,
            "guardrail_name": r.guardrail_name,
            "category": r.category.value,
            "severity": r.severity.value,
            "passed": r.passed,
            "message": r.message,
            "details": r.details,
            "suggestion": r.suggestion,
            "knowledge_base_recommended": r.knowledge_base_recommended
        } for r in results],
        critical_failures=critical,
        high_failures=high,
        warnings=warnings,
        suggestions=suggestions
    )


@router.post("/validate/query")
async def validate_query(
    request: ValidateQueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Validate query syntax for a specific platform.
    Checks syntax, time bounds, result limits, and dangerous operations.
    """
    engine = get_guardrail_engine(db)
    
    # First check if platform is in knowledge base
    has_docs, kb_message = await engine.check_knowledge_base(request.platform, "query")
    
    # Validate query
    passed, results = await engine.validate_query_syntax(
        query=request.query,
        platform=request.platform
    )
    
    # Get platform info
    platform_info = PLATFORM_SYNTAX.get(request.platform, {})
    
    return {
        "passed": passed,
        "platform": request.platform,
        "platform_name": platform_info.get("name", request.platform),
        "language": platform_info.get("language", "Unknown"),
        "documentation_url": platform_info.get("documentation_url"),
        "knowledge_base_available": has_docs,
        "knowledge_base_message": kb_message if not has_docs else None,
        "results": [{
            "guardrail_id": r.guardrail_id,
            "guardrail_name": r.guardrail_name,
            "severity": r.severity.value,
            "passed": r.passed,
            "message": r.message,
            "suggestion": r.suggestion,
            "knowledge_base_recommended": r.knowledge_base_recommended
        } for r in results],
        "suggestions": [r.suggestion for r in results if r.suggestion]
    }


@router.get("/knowledge-base/check/{platform}")
async def check_knowledge_base(
    platform: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if knowledge base has documentation for a platform.
    If not, recommend adding it.
    """
    engine = get_guardrail_engine(db)
    has_docs, message = await engine.check_knowledge_base(platform, "documentation")
    
    # Get built-in docs if available
    platform_info = PLATFORM_SYNTAX.get(platform)
    
    return {
        "platform": platform,
        "has_builtin_docs": platform_info is not None,
        "has_knowledge_base_docs": has_docs,
        "message": message,
        "recommendation": None if (platform_info or has_docs) else {
            "action": "add_to_knowledge_base",
            "message": f"Please add {platform} documentation to the Knowledge Base for improved query generation and validation.",
            "suggested_sources": [
                f"Official {platform} documentation",
                f"{platform} query language reference",
                f"{platform} field/schema reference"
            ]
        },
        "builtin_info": {
            "name": platform_info.get("name") if platform_info else None,
            "language": platform_info.get("language") if platform_info else None,
            "tables_count": len(platform_info.get("tables", [])) if platform_info else 0,
            "fields_count": len(platform_info.get("common_fields", [])) if platform_info else 0,
            "documentation_url": platform_info.get("documentation_url") if platform_info else None
        } if platform_info else None
    }


@router.put("/toggle/{guardrail_id}")
async def toggle_guardrail(
    guardrail_id: str,
    enabled: bool,
    current_user: User = Depends(require_permission("manage:guardrails")),
    db: Session = Depends(get_db)
):
    """Toggle a guardrail on/off."""
    # Find guardrail
    guardrail = None
    for g in CYBERSECURITY_GUARDRAILS:
        if g.id == guardrail_id:
            guardrail = g
            break
    
    if not guardrail:
        raise HTTPException(status_code=404, detail=f"Guardrail {guardrail_id} not found")
    
    # Update (in memory for now - would persist to DB)
    guardrail.enabled = enabled
    
    logger.info(
        "guardrail_toggled",
        guardrail_id=guardrail_id,
        enabled=enabled,
        user_id=current_user.id
    )
    
    return {
        "success": True,
        "guardrail_id": guardrail_id,
        "enabled": enabled
    }


@router.get("/stats")
async def get_guardrail_stats(
    current_user: User = Depends(require_permission("view:analytics")),
    db: Session = Depends(get_db)
):
    """Get guardrail usage statistics."""
    # This would query actual usage from logs
    return {
        "total_guardrails": len(CYBERSECURITY_GUARDRAILS),
        "enabled": sum(1 for g in CYBERSECURITY_GUARDRAILS if g.enabled),
        "disabled": sum(1 for g in CYBERSECURITY_GUARDRAILS if not g.enabled),
        "by_category": {
            cat.value: sum(1 for g in CYBERSECURITY_GUARDRAILS if g.category == cat)
            for cat in GuardrailCategory
        },
        "by_severity": {
            sev.value: sum(1 for g in CYBERSECURITY_GUARDRAILS if g.severity == sev)
            for sev in GuardrailSeverity
        },
        "supported_platforms": list(PLATFORM_SYNTAX.keys()),
        "recent_violations": []  # Would come from logs
    }


# =============================================================================
# GUARDRAIL DETAIL AND TESTING ENDPOINTS
# =============================================================================

@router.get("/detail/{guardrail_id}")
async def get_guardrail_detail(
    guardrail_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get full details of a specific guardrail including its validation logic.
    Works for both built-in cybersecurity guardrails and global guardrails.
    """
    from app.genai.prompts import DEFAULT_GUARDRAILS
    
    # Check built-in cybersecurity guardrails
    for g in CYBERSECURITY_GUARDRAILS:
        if g.id == guardrail_id:
            return {
                "id": g.id,
                "name": g.name,
                "description": g.description,
                "category": g.category.value,
                "severity": g.severity.value,
                "enabled": g.enabled,
                "applicable_use_cases": g.applicable_use_cases,
                "applicable_platforms": g.applicable_platforms,
                "config": g.config,
                "type": "cybersecurity",
                "validation_logic": _get_validation_logic_description(g.id),
                "has_active_validation": g.id in ["PS001", "PS002", "PS003", "PS004", "PS007", "PS009", 
                                                   "DP001", "DP002", "DP003", "DP004", "QV008",
                                                   "OV003", "OV004", "HP001", "HP002", "HP006", "OV008"]
            }
    
    # Check global guardrails
    global_guardrails = DEFAULT_GUARDRAILS.get("global", [])
    for g in global_guardrails:
        if g.get("id") == guardrail_id:
            return {
                "id": g["id"],
                "name": g["name"],
                "description": g["description"],
                "category": g.get("category", "quality"),
                "severity": g.get("severity", "high"),
                "enabled": g.get("enabled", True),
                "validation_type": g.get("validation_type", "prompt_instruction"),
                "validation_logic": g.get("validation_logic"),
                "type": "global",
                "has_active_validation": g.get("validation_type") in ["input_validation", "output_validation"],
                "prompt_rule": _get_global_guardrail_logic(g.get("validation_logic"))
            }
    
    raise HTTPException(status_code=404, detail=f"Guardrail {guardrail_id} not found")


def _get_validation_logic_description(guardrail_id: str) -> str:
    """Get a human-readable description of the validation logic for a guardrail."""
    logic_descriptions = {
        "PS001": """Prompt Injection Detection Logic:
- Scans for patterns like 'ignore previous instructions', 'forget everything', 'you are now'
- Detects special tokens: [INST], </system>, etc.
- Blocks attempts to override system prompt""",
        
        "PS002": """Jailbreak Prevention Logic:
- Detects 'DAN mode', 'developer mode', 'act without restrictions'
- Blocks roleplay exploitation: 'pretend you are', 'hypothetically'
- Prevents safety bypass attempts""",
        
        "PS003": """Command Injection Detection Logic:
- Detects backtick commands, $(command) patterns
- Blocks shell pipes: | bash, | powershell
- Prevents rm, del, format commands""",
        
        "PS004": """Data Exfiltration Prevention Logic:
- Blocks requests for secrets, passwords, API keys
- Detects dump database, extract config patterns
- Prevents show env, print internal requests""",
        
        "PS007": """Encoding Attack Detection Logic:
- Detects Base64 encoded payloads (50+ chars)
- Identifies hex-encoded malicious content
- Blocks obfuscation attempts""",
        
        "PS009": """Excessive Length Check Logic:
- Blocks prompts exceeding 50,000 characters
- Prevents DoS via token exhaustion
- Config: max_length=50000""",
        
        "DP001": """PII Detection Logic:
- Detects SSN patterns: XXX-XX-XXXX
- Credit card numbers: Visa, MasterCard, Amex
- Phone numbers, email addresses
- Driver's license, passport numbers""",
        
        "DP002": """PHI/HIPAA Detection Logic:
- Medical Record Numbers (MRN)
- Health Insurance IDs
- Diagnosis/condition mentions with identifiers
- Prescription information, Provider NPIs""",
        
        "DP003": """Credential Detection Logic:
- OpenAI API keys: sk-...
- AWS Access Keys: AKIA...
- GitHub tokens: ghp_...
- JWT tokens, private keys, connection strings""",
        
        "QV008": """Destructive Operation Prevention Logic:
- Blocks DELETE, DROP, TRUNCATE, ALTER, UPDATE, INSERT
- Prevents rm -rf, rmdir, del /s
- Read-only queries only""",
        
        "HP001": """IOC Reality Check Logic:
- Extracts IPs, domains, hashes from output
- Compares against source content
- Flags IOCs not found in source as hallucinated""",
        
        "HP002": """TTP Attribution Verification Logic:
- Extracts MITRE ATT&CK technique IDs (Txxxx)
- Verifies they exist in source material
- Blocks unattributed technique claims""",
        
        "HP006": """MITRE Technique Existence Check:
- Validates Txxxx or Txxxx.xxx format
- Ensures proper technique ID structure
- Blocks invalid MITRE IDs""",
        
        "OV003": """PII Detection in Output Logic:
- Same as DP001 but applied to output
- Blocks responses containing SSN, credit cards
- Prevents PII leakage in responses""",
        
        "OV004": """Credential Detection in Output:
- Same as DP003 but applied to output
- Blocks responses with API keys, passwords
- Prevents credential exposure""",
        
        "OV008": """Empty Response Detection:
- Blocks responses under 10 characters
- Ensures meaningful output
- Suggests retry with different parameters"""
    }
    return logic_descriptions.get(guardrail_id, "Prompt-based instruction - enforced via system prompt")


def _get_global_guardrail_logic(validation_logic: str) -> str:
    """Get the validation rule/prompt for a global guardrail."""
    logic_rules = {
        "validate_no_hallucination": """Validation Rule (Output):
1. Extract all IOCs from GenAI output (IPs, domains, hashes, URLs, emails, CVEs)
2. Extract same patterns from source content
3. Compare: output_iocs - source_iocs = hallucinated
4. If any hallucinated IOCs found → BLOCK with list

Regex Patterns Used:
- IP: \\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b
- Domain: \\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}\\b
- MD5: \\b[a-fA-F0-9]{32}\\b
- SHA1: \\b[a-fA-F0-9]{40}\\b
- SHA256: \\b[a-fA-F0-9]{64}\\b
- URL: https?://[^\\s<>"{}|\\\\^`\\[\\]]+
- Email: \\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b
- CVE: CVE-\\d{4}-\\d{4,7}""",

        "validate_json_output": """Validation Rule (Output):
1. Check if output starts with { or [
2. Attempt JSON parse
3. If JSONDecodeError → BLOCK with parse error message

Logic: json.loads(output) must succeed""",

        "validate_source_exclusion": """Validation Rule (Output):
1. Extract domain from source URL
2. Check if domain appears in IOC output
3. If source domain in output → BLOCK

Example: If article from bleepingcomputer.com, block if bleepingcomputer.com appears as IOC""",

        "validate_benign_filtering": """Validation Rule (Output):
1. Extract all domains from output
2. Compare against BENIGN_DOMAINS list
3. If any benign domains found → BLOCK

Benign Domains Include:
- Security vendors: crowdstrike.com, mandiant.com, paloaltonetworks.com
- News sites: bleepingcomputer.com, thehackernews.com
- Government: cisa.gov, mitre.org, nist.gov
- Tech giants: microsoft.com, google.com, aws.amazon.com
- CDNs: cloudflare.com, akamai.com""",

        "validate_no_credentials": """Validation Rule (Output):
1. Scan for credential patterns
2. If any match → BLOCK

Patterns Detected:
- OpenAI: sk-[A-Za-z0-9]{32,}
- AWS: AKIA[A-Z0-9]{16}
- GitHub: ghp_[A-Za-z0-9]{36}
- Private Keys: -----BEGIN PRIVATE KEY-----
- Passwords: password=xxx, pwd:xxx
- SSN: \\d{3}-\\d{2}-\\d{4}
- Credit Cards: 4xxx (Visa), 5xxx (MC)""",

        "validate_prompt_injection": """Validation Rule (Input):
1. Scan input for injection patterns
2. If any match → BLOCK

Patterns Detected:
- "ignore.*previous.*instructions"
- "forget.*everything"
- "you.*are.*now"
- "pretend.*you.*are"
- "disregard.*system"
- "DAN mode", "developer mode", "jailbreak"
- [INST], [/INST], </system>""",

        "validate_no_destructive_ops": """Validation Rule (Input):
1. Scan for destructive SQL/command patterns
2. If any match → BLOCK

Patterns Detected:
- SQL: DELETE, DROP, TRUNCATE, ALTER, UPDATE, INSERT
- Shell: rm -rf, rmdir, del /s
- System: format c:"""
    }
    return logic_rules.get(validation_logic, "Prompt-based instruction - guidance injected into system prompt")


class TestGuardrailRequest(BaseModel):
    """Request to test a specific guardrail."""
    guardrail_id: str
    test_input: str
    source_content: Optional[str] = None
    source_url: Optional[str] = None
    use_model: bool = False  # If True, actually invoke AI model
    model_id: Optional[str] = None


class FullPipelineTestRequest(BaseModel):
    """Request to test the full GenAI pipeline with guardrails."""
    user_prompt: str
    use_case: str = "ioc_extraction"
    model_id: Optional[str] = None
    source_content: Optional[str] = None


class TestCase(BaseModel):
    """Single test case for a guardrail suite."""
    input_text: str
    expected_result: bool  # True = should pass, False = should be blocked
    description: Optional[str] = None
    expected_violations: Optional[List[str]] = []  # Expected guardrail IDs
    source_content: Optional[str] = None


class TestSuiteRequest(BaseModel):
    """Request to run a test suite."""
    test_cases: List[TestCase]
    use_case: str = "general"
    platform: Optional[str] = None
    guardrail_ids: Optional[List[str]] = None
    model_id: Optional[str] = None


class GroundTruthRequest(BaseModel):
    """Request for ground truth validation (RAG evaluation)."""
    query: str
    expected_answer: str
    context: Optional[str] = None
    model: Optional[str] = None


class ModelCompareRequest(BaseModel):
    """Request to compare guardrail performance across models."""
    test_input: str
    use_case: str = "general"
    models: Optional[List[str]] = None


@router.post("/test/single")
async def test_single_guardrail(
    request: TestGuardrailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Test a single guardrail with input and get detailed results.
    """
    from app.genai.prompts import DEFAULT_GUARDRAILS
    from app.guardrails.cybersecurity_guardrails import GlobalGuardrailValidator
    
    guardrail_id = request.guardrail_id
    test_input = request.test_input
    source_content = request.source_content
    source_url = request.source_url
    
    # Check if it's a global guardrail
    global_guardrails = DEFAULT_GUARDRAILS.get("global", [])
    global_guardrail = next((g for g in global_guardrails if g.get("id") == guardrail_id), None)
    
    if global_guardrail:
        validator = GlobalGuardrailValidator(db)
        validation_type = global_guardrail.get("validation_type", "prompt_instruction")
        
        if validation_type == "input_validation":
            passed, results = await validator.validate_input(test_input, "general")
            # Filter to just this guardrail
            result = next((r for r in results if r.guardrail_id == guardrail_id), None)
            if result:
                return {
                    "guardrail_id": guardrail_id,
                    "guardrail_name": global_guardrail["name"],
                    "validation_type": "input_validation",
                    "passed": result.passed,
                    "message": result.message,
                    "suggestion": result.suggestion,
                    "details": result.details,
                    "severity": result.severity.value
                }
            else:
                return {
                    "guardrail_id": guardrail_id,
                    "guardrail_name": global_guardrail["name"],
                    "validation_type": "input_validation",
                    "passed": True,
                    "message": "Input validation passed",
                    "details": {"note": "Guardrail logic was applied but no issues found"}
                }
        
        elif validation_type == "output_validation":
            # For output validation, treat test_input as the output to validate
            passed, results = await validator.validate_output(
                test_input, 
                source_content=source_content,
                source_url=source_url
            )
            result = next((r for r in results if r.guardrail_id == guardrail_id), None)
            if result:
                return {
                    "guardrail_id": guardrail_id,
                    "guardrail_name": global_guardrail["name"],
                    "validation_type": "output_validation",
                    "passed": result.passed,
                    "message": result.message,
                    "suggestion": result.suggestion,
                    "details": result.details,
                    "severity": result.severity.value
                }
            else:
                return {
                    "guardrail_id": guardrail_id,
                    "guardrail_name": global_guardrail["name"],
                    "validation_type": "output_validation",
                    "passed": True,
                    "message": "Output validation passed",
                    "details": {"note": "Guardrail logic was applied but no issues found"}
                }
        
        else:
            # Prompt instruction - no active validation
            return {
                "guardrail_id": guardrail_id,
                "guardrail_name": global_guardrail["name"],
                "validation_type": "prompt_instruction",
                "passed": None,  # Cannot test prompt instructions
                "message": "This guardrail is a prompt instruction enforced via the system prompt, not an active validation rule",
                "details": {
                    "description": global_guardrail["description"],
                    "note": "Prompt instructions guide the AI model's behavior but cannot be directly tested. The instruction is injected into every request to guide model responses."
                }
            }
    
    # Check cybersecurity guardrails
    engine = get_guardrail_engine(db)
    cyber_guardrail = next((g for g in CYBERSECURITY_GUARDRAILS if g.id == guardrail_id), None)
    
    if cyber_guardrail:
        # Run validation
        passed, results = await engine.validate_input(
            prompt=test_input,
            use_case="general",
            guardrail_ids=[guardrail_id]
        )
        
        if results:
            result = results[0]
            return {
                "guardrail_id": guardrail_id,
                "guardrail_name": cyber_guardrail.name,
                "validation_type": "input_validation" if cyber_guardrail.category in [
                    GuardrailCategory.PROMPT_SAFETY, 
                    GuardrailCategory.QUERY_VALIDATION,
                    GuardrailCategory.DATA_PROTECTION
                ] else "output_validation",
                "passed": result.passed,
                "message": result.message,
                "suggestion": result.suggestion,
                "details": result.details,
                "severity": result.severity.value
            }
    
    raise HTTPException(status_code=404, detail=f"Guardrail {guardrail_id} not found")


@router.post("/test/single-with-model")
async def test_single_guardrail_with_model(
    request: TestGuardrailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Test a single guardrail with actual AI model invocation.
    
    This provides real-world testing by:
    1. Running input through input guardrails
    2. If passed, sending to AI model (for output guardrails)
    3. Running model response through output guardrails
    4. Returning full trace with timing
    """
    from app.guardrails.testing_service import GuardrailTestingService, GuardrailTestRequest as TSRequest
    
    testing_service = GuardrailTestingService(db)
    
    ts_request = TSRequest(
        guardrail_id=request.guardrail_id,
        test_input=request.test_input,
        source_content=request.source_content,
        source_url=request.source_url,
        use_model=request.use_model,
        model_id=request.model_id
    )
    
    result = await testing_service.test_single_guardrail(ts_request)
    return result


@router.post("/test/full-pipeline")
async def test_full_pipeline(
    request: FullPipelineTestRequest,
    current_user: User = Depends(require_permission("manage:genai")),
    db: Session = Depends(get_db)
):
    """
    Test the complete GenAI pipeline with all guardrails.
    
    This is the end-to-end test that mirrors production behavior:
    1. Run user prompt through ALL input guardrails (global + function)
    2. If input passes, invoke the selected AI model with guardrail instructions
    3. Run model response through ALL output guardrails
    4. Return comprehensive trace showing:
       - Which guardrails were triggered
       - What was blocked and why
       - Model response (if reached)
       - Latency metrics
    
    Based on AWS Bedrock Guardrails testing approach.
    """
    from app.guardrails.testing_service import GuardrailTestingService
    
    testing_service = GuardrailTestingService(db)
    
    result = await testing_service.test_full_pipeline(
        user_prompt=request.user_prompt,
        use_case=request.use_case,
        model_id=request.model_id,
        source_content=request.source_content
    )
    
    return result


@router.post("/test/suite-with-model")
async def run_test_suite_with_model(
    request: TestSuiteRequest,
    current_user: User = Depends(require_permission("manage:genai")),
    db: Session = Depends(get_db)
):
    """
    Run a test suite with actual AI model invocation.
    
    Unlike /test/suite which only validates input/output patterns,
    this endpoint:
    1. Actually invokes the AI model for each test case
    2. Validates model responses against guardrails
    3. Calculates accuracy, precision, recall, F1 metrics
    4. Returns detailed per-test results with model responses
    
    Based on OpenAI Evals framework approach.
    """
    from app.guardrails.testing_service import GuardrailTestingService, GuardrailTestCase
    
    testing_service = GuardrailTestingService(db)
    
    # Convert request test cases to GuardrailTestCase objects
    test_cases = [
        GuardrailTestCase(
            input_text=tc.input_text,
            expected_pass=tc.expected_result,
            description=tc.description or "",
            source_content=getattr(tc, 'source_content', None)
        )
        for tc in request.test_cases
    ]
    
    # Run with model
    results, metrics = await testing_service.run_test_suite(
        test_cases=test_cases,
        use_case=request.use_case,
        model_id=getattr(request, 'model_id', None),
        run_with_model=True
    )
    
    return {
        "metrics": {
            "total_tests": metrics.total_tests,
            "accuracy": round(metrics.accuracy, 4),
            "precision": round(metrics.precision, 4),
            "recall": round(metrics.recall, 4),
            "f1_score": round(metrics.f1_score, 4),
            "true_positives": metrics.true_positives,
            "true_negatives": metrics.true_negatives,
            "false_positives": metrics.false_positives,
            "false_negatives": metrics.false_negatives,
            "average_latency_ms": round(metrics.average_latency_ms, 2),
            "model_used": metrics.model_used
        },
        "results": [
            {
                "input_preview": r.test_case.input_text[:100] + "..." if len(r.test_case.input_text) > 100 else r.test_case.input_text,
                "description": r.test_case.description,
                "expected_pass": r.test_case.expected_pass,
                "actual_pass": r.actual_passed,
                "status": r.status.value,
                "violations": r.guardrail_results,
                "model_response_preview": r.model_response[:200] + "..." if r.model_response and len(r.model_response) > 200 else r.model_response,
                "latency_ms": round(r.latency_ms, 2)
            }
            for r in results
        ],
        "use_case": request.use_case,
        "ran_with_model": True
    }


@router.post("/test/ground-truth-llm-judge")
async def test_ground_truth_with_llm_judge(
    request: GroundTruthRequest,
    current_user: User = Depends(require_permission("manage:genai")),
    db: Session = Depends(get_db)
):
    """
    Test RAG accuracy using LLM-as-judge approach.
    
    This is more sophisticated than simple string matching:
    1. Sends query + context to the model
    2. Gets actual model response
    3. Uses another LLM call to judge:
       - CORRECTNESS: Is the answer factually correct?
       - COMPLETENESS: Does it cover all key points?
       - FAITHFULNESS: Is it grounded in context (no hallucination)?
       - RELEVANCE: Is it relevant to the question?
    4. Returns detailed metrics and assessment
    
    Based on RAGAS and ARES evaluation frameworks.
    """
    from app.guardrails.testing_service import GuardrailTestingService
    
    testing_service = GuardrailTestingService(db)
    
    result = await testing_service.evaluate_ground_truth(
        query=request.query,
        expected_answer=request.expected_answer,
        context=request.context or "",
        model_id=request.model
    )
    
    return result


@router.get("/test/adversarial-cases")
async def get_adversarial_test_cases(
    current_user: User = Depends(get_current_user)
):
    """
    Get pre-built adversarial test cases for guardrail evaluation.
    
    These cover common attack vectors:
    - Prompt injection attempts
    - Jailbreak attempts
    - PII/credential leakage
    - SQL/command injection
    - Plus legitimate requests that should pass
    """
    from app.guardrails.testing_service import ADVERSARIAL_TEST_CASES
    
    return {
        "test_cases": [
            {
                "input_text": tc.input_text,
                "expected_pass": tc.expected_pass,
                "description": tc.description,
                "category": tc.category
            }
            for tc in ADVERSARIAL_TEST_CASES
        ],
        "total": len(ADVERSARIAL_TEST_CASES),
        "blocked_count": len([tc for tc in ADVERSARIAL_TEST_CASES if not tc.expected_pass]),
        "passed_count": len([tc for tc in ADVERSARIAL_TEST_CASES if tc.expected_pass])
    }


@router.get("/combined/{function_name}")
async def get_combined_guardrails(
    function_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all guardrails that apply to a function (global + function-specific)
    with their validation logic details.
    """
    from app.genai.prompts import DEFAULT_GUARDRAILS
    
    combined = []
    
    # Add global guardrails first
    global_guardrails = DEFAULT_GUARDRAILS.get("global", [])
    for g in global_guardrails:
        combined.append({
            "id": g["id"],
            "name": g["name"],
            "description": g["description"],
            "category": g.get("category", "quality"),
            "severity": g.get("severity", "high"),
            "enabled": g.get("enabled", True),
            "scope": "global",
            "validation_type": g.get("validation_type", "prompt_instruction"),
            "has_active_validation": g.get("validation_type") in ["input_validation", "output_validation"],
            "prompt_rule": _get_global_guardrail_logic(g.get("validation_logic")) if g.get("validation_logic") else g["description"]
        })
    
    # Add function-specific guardrails
    function_guardrails = DEFAULT_GUARDRAILS.get(function_name, [])
    for g in function_guardrails:
        combined.append({
            "id": g.get("id", g.get("name", "").lower().replace(" ", "_")),
            "name": g["name"],
            "description": g["description"],
            "category": g.get("category", "quality"),
            "priority": g.get("priority", 99),
            "enabled": g.get("enabled", True),
            "scope": "function",
            "validation_type": "prompt_instruction",  # Function guardrails are prompt instructions
            "has_active_validation": False,
            "prompt_rule": g["description"]  # The description IS the rule for function guardrails
        })
    
    # Check for hunt_query parent if applicable
    if "hunt_query" in function_name:
        hunt_guardrails = DEFAULT_GUARDRAILS.get("hunt_query", [])
        for g in hunt_guardrails:
            combined.append({
                "id": g.get("id", g.get("name", "").lower().replace(" ", "_")),
                "name": g["name"],
                "description": g["description"],
                "category": g.get("category", "quality"),
                "priority": g.get("priority", 99),
                "enabled": g.get("enabled", True),
                "scope": "function",
                "validation_type": "prompt_instruction",
                "has_active_validation": False,
                "prompt_rule": g["description"]
            })
    
    return {
        "function_name": function_name,
        "total_guardrails": len(combined),
        "global_count": len([g for g in combined if g["scope"] == "global"]),
        "function_count": len([g for g in combined if g["scope"] == "function"]),
        "active_validation_count": len([g for g in combined if g["has_active_validation"]]),
        "guardrails": combined
    }


# =============================================================================
# EDITABLE GUARDRAIL CRUD ENDPOINTS
# =============================================================================

# Available functions for guardrail application
GENAI_FUNCTIONS = [
    {"id": "hunt_query", "name": "Hunt Query Generation", "description": "Generate threat hunting queries for SIEM/XDR platforms"},
    {"id": "executive_summary", "name": "Executive Summary", "description": "Generate executive-level summaries of threats"},
    {"id": "technical_summary", "name": "Technical Summary", "description": "Generate technical analysis summaries"},
    {"id": "ioc_extraction", "name": "IOC Extraction", "description": "Extract indicators of compromise from articles"},
    {"id": "ttp_extraction", "name": "TTP Extraction", "description": "Extract MITRE ATT&CK tactics, techniques, and procedures"},
    {"id": "report_generation", "name": "Report Generation", "description": "Generate threat intelligence reports"},
    {"id": "chatbot", "name": "Chatbot", "description": "Interactive security chatbot responses"},
    {"id": "article_analysis", "name": "Article Analysis", "description": "Analyze and categorize threat intelligence articles"},
]


class GuardrailCreateRequest(BaseModel):
    """Request to create a new guardrail."""
    guardrail_id: str = Field(..., min_length=2, max_length=50, description="Unique guardrail ID (e.g., 'CUSTOM001')")
    name: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    category: str = Field(..., description="Category (prompt_safety, query_validation, etc.)")
    severity: str = Field(..., description="Severity (critical, high, medium, low, info)")
    scope: str = Field("global", description="Scope: 'global' or 'function'")
    applicable_functions: Optional[List[str]] = Field([], description="Functions this applies to (if scope=function)")
    applicable_platforms: Optional[List[str]] = Field([], description="Platforms this applies to")
    config: Optional[Dict] = Field({})
    custom_message: Optional[str] = None
    suggestion: Optional[str] = None


class GuardrailUpdateRequest(BaseModel):
    """Request to update a guardrail."""
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    scope: Optional[str] = None
    applicable_functions: Optional[List[str]] = None
    applicable_platforms: Optional[List[str]] = None
    config: Optional[Dict] = None
    custom_message: Optional[str] = None
    suggestion: Optional[str] = None
    status: Optional[str] = None  # active, disabled, testing


class FunctionOverrideRequest(BaseModel):
    """Request to override guardrail for a function."""
    function_name: str
    guardrail_id: int
    is_enabled: bool = True
    severity_override: Optional[str] = None
    custom_config: Optional[Dict] = {}


@router.get("/functions")
async def list_functions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all available GenAI functions that guardrails can apply to."""
    return {
        "functions": GENAI_FUNCTIONS,
        "total": len(GENAI_FUNCTIONS)
    }


@router.get("/editable")
async def list_editable_guardrails(
    scope: Optional[str] = None,
    function_name: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List editable guardrails from database.
    Falls back to built-in guardrails if database is empty.
    """
    from app.genai.models import Guardrail
    
    query = db.query(Guardrail)
    
    if scope:
        query = query.filter(Guardrail.scope == scope)
    if category:
        query = query.filter(Guardrail.category == category)
    if status:
        query = query.filter(Guardrail.status == status)
    
    db_guardrails = query.order_by(Guardrail.category, Guardrail.guardrail_id).all()
    
    # If no DB guardrails exist, sync from built-in defaults
    if not db_guardrails:
        await sync_default_guardrails(db, current_user)
        db_guardrails = query.all()
    
    # Filter by function if specified
    if function_name:
        db_guardrails = [
            g for g in db_guardrails
            if g.scope == "global" or function_name in (g.applicable_functions or [])
        ]
    
    result = []
    for g in db_guardrails:
        result.append({
            "id": g.id,
            "guardrail_id": g.guardrail_id,
            "name": g.name,
            "description": g.description,
            "category": g.category,
            "severity": g.severity,
            "scope": g.scope,
            "applicable_functions": g.applicable_functions or [],
            "applicable_platforms": g.applicable_platforms or [],
            "config": g.config or {},
            "custom_message": g.custom_message,
            "suggestion": g.suggestion,
            "status": g.status,
            "is_default": g.is_default,
            "created_at": g.created_at.isoformat() if g.created_at else None,
            "updated_at": g.updated_at.isoformat() if g.updated_at else None
        })
    
    # Group by scope
    global_guardrails = [g for g in result if g["scope"] == "global"]
    function_guardrails = [g for g in result if g["scope"] == "function"]
    
    return {
        "guardrails": result,
        "total": len(result),
        "by_scope": {
            "global": len(global_guardrails),
            "function": len(function_guardrails)
        },
        "by_category": {
            cat.value: len([g for g in result if g["category"] == cat.value])
            for cat in GuardrailCategory
        },
        "functions": GENAI_FUNCTIONS
    }


async def sync_default_guardrails(db: Session, user: User):
    """Sync built-in guardrails to database for editing."""
    from app.genai.models import Guardrail
    
    for g in CYBERSECURITY_GUARDRAILS:
        existing = db.query(Guardrail).filter(Guardrail.guardrail_id == g.id).first()
        if not existing:
            db_guardrail = Guardrail(
                guardrail_id=g.id,
                name=g.name,
                description=g.description,
                category=g.category.value,
                severity=g.severity.value,
                scope="global" if "all" in g.applicable_use_cases else "function",
                applicable_functions=[] if "all" in g.applicable_use_cases else g.applicable_use_cases,
                applicable_platforms=g.applicable_platforms or [],
                config=g.config,
                status="active" if g.enabled else "disabled",
                is_default=True,
                created_by_id=user.id
            )
            db.add(db_guardrail)
    
    db.commit()
    logger.info("synced_default_guardrails", count=len(CYBERSECURITY_GUARDRAILS))


@router.post("/editable")
async def create_guardrail(
    request: GuardrailCreateRequest,
    current_user: User = Depends(require_permission("manage:genai")),
    db: Session = Depends(get_db)
):
    """Create a new custom guardrail."""
    from app.genai.models import Guardrail, GuardrailAuditLog
    
    # Check if guardrail ID already exists
    existing = db.query(Guardrail).filter(Guardrail.guardrail_id == request.guardrail_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Guardrail ID '{request.guardrail_id}' already exists")
    
    guardrail = Guardrail(
        guardrail_id=request.guardrail_id,
        name=request.name,
        description=request.description,
        category=request.category,
        severity=request.severity,
        scope=request.scope,
        applicable_functions=request.applicable_functions or [],
        applicable_platforms=request.applicable_platforms or [],
        config=request.config or {},
        custom_message=request.custom_message,
        suggestion=request.suggestion,
        status="active",
        is_default=False,
        created_by_id=current_user.id
    )
    
    db.add(guardrail)
    db.commit()
    db.refresh(guardrail)
    
    # Audit log
    audit = GuardrailAuditLog(
        guardrail_id=guardrail.id,
        action="created",
        changes={"new": request.dict()},
        user_id=current_user.id
    )
    db.add(audit)
    db.commit()
    
    logger.info("guardrail_created", guardrail_id=guardrail.guardrail_id, user_id=current_user.id)
    
    return {
        "message": "Guardrail created successfully",
        "guardrail": {
            "id": guardrail.id,
            "guardrail_id": guardrail.guardrail_id,
            "name": guardrail.name,
            "scope": guardrail.scope
        }
    }


@router.put("/editable/{guardrail_db_id}")
async def update_guardrail(
    guardrail_db_id: int,
    request: GuardrailUpdateRequest,
    current_user: User = Depends(require_permission("manage:genai")),
    db: Session = Depends(get_db)
):
    """Update an existing guardrail."""
    from app.genai.models import Guardrail, GuardrailAuditLog
    
    guardrail = db.query(Guardrail).filter(Guardrail.id == guardrail_db_id).first()
    if not guardrail:
        raise HTTPException(status_code=404, detail="Guardrail not found")
    
    old_values = {
        "name": guardrail.name,
        "description": guardrail.description,
        "category": guardrail.category,
        "severity": guardrail.severity,
        "scope": guardrail.scope,
        "applicable_functions": guardrail.applicable_functions,
        "status": guardrail.status
    }
    
    # Update fields
    if request.name is not None:
        guardrail.name = request.name
    if request.description is not None:
        guardrail.description = request.description
    if request.category is not None:
        guardrail.category = request.category
    if request.severity is not None:
        guardrail.severity = request.severity
    if request.scope is not None:
        guardrail.scope = request.scope
    if request.applicable_functions is not None:
        guardrail.applicable_functions = request.applicable_functions
    if request.applicable_platforms is not None:
        guardrail.applicable_platforms = request.applicable_platforms
    if request.config is not None:
        guardrail.config = request.config
    if request.custom_message is not None:
        guardrail.custom_message = request.custom_message
    if request.suggestion is not None:
        guardrail.suggestion = request.suggestion
    if request.status is not None:
        guardrail.status = request.status
    
    guardrail.updated_by_id = current_user.id
    guardrail.updated_at = datetime.utcnow()
    
    db.commit()
    
    # Audit log
    new_values = {k: getattr(guardrail, k) for k in old_values.keys()}
    audit = GuardrailAuditLog(
        guardrail_id=guardrail.id,
        action="updated",
        changes={"old": old_values, "new": new_values},
        user_id=current_user.id
    )
    db.add(audit)
    db.commit()
    
    logger.info("guardrail_updated", guardrail_id=guardrail.guardrail_id, user_id=current_user.id)
    
    return {
        "message": "Guardrail updated successfully",
        "guardrail": {
            "id": guardrail.id,
            "guardrail_id": guardrail.guardrail_id,
            "name": guardrail.name,
            "scope": guardrail.scope,
            "status": guardrail.status
        }
    }


@router.delete("/editable/{guardrail_db_id}")
async def delete_guardrail(
    guardrail_db_id: int,
    current_user: User = Depends(require_permission("manage:genai")),
    db: Session = Depends(get_db)
):
    """Delete a custom guardrail. Default guardrails can only be disabled, not deleted."""
    from app.genai.models import Guardrail, GuardrailAuditLog
    
    guardrail = db.query(Guardrail).filter(Guardrail.id == guardrail_db_id).first()
    if not guardrail:
        raise HTTPException(status_code=404, detail="Guardrail not found")
    
    if guardrail.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete default guardrails. Disable them instead.")
    
    # Audit log before deletion
    audit = GuardrailAuditLog(
        guardrail_id=guardrail.id,
        action="deleted",
        changes={"deleted": guardrail.guardrail_id},
        user_id=current_user.id
    )
    db.add(audit)
    
    db.delete(guardrail)
    db.commit()
    
    logger.info("guardrail_deleted", guardrail_id=guardrail.guardrail_id, user_id=current_user.id)
    
    return {"message": "Guardrail deleted successfully"}


@router.post("/function-override")
async def create_function_override(
    request: FunctionOverrideRequest,
    current_user: User = Depends(require_permission("manage:genai")),
    db: Session = Depends(get_db)
):
    """Create or update a function-specific guardrail override."""
    from app.genai.models import FunctionGuardrailOverride, Guardrail
    
    # Verify guardrail exists
    guardrail = db.query(Guardrail).filter(Guardrail.id == request.guardrail_id).first()
    if not guardrail:
        raise HTTPException(status_code=404, detail="Guardrail not found")
    
    # Check for existing override
    override = db.query(FunctionGuardrailOverride).filter(
        FunctionGuardrailOverride.function_name == request.function_name,
        FunctionGuardrailOverride.guardrail_id == request.guardrail_id
    ).first()
    
    if override:
        # Update existing
        override.is_enabled = request.is_enabled
        override.severity_override = request.severity_override
        override.custom_config = request.custom_config or {}
        override.updated_by_id = current_user.id
        override.updated_at = datetime.utcnow()
    else:
        # Create new
        override = FunctionGuardrailOverride(
            function_name=request.function_name,
            guardrail_id=request.guardrail_id,
            is_enabled=request.is_enabled,
            severity_override=request.severity_override,
            custom_config=request.custom_config or {},
            created_by_id=current_user.id
        )
        db.add(override)
    
    db.commit()
    
    logger.info(
        "function_override_saved",
        function=request.function_name,
        guardrail_id=request.guardrail_id,
        enabled=request.is_enabled
    )
    
    return {
        "message": "Function override saved",
        "override": {
            "function_name": request.function_name,
            "guardrail_id": request.guardrail_id,
            "is_enabled": request.is_enabled
        }
    }


@router.get("/function-overrides/{function_name}")
async def get_function_overrides(
    function_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all guardrail overrides for a specific function."""
    from app.genai.models import FunctionGuardrailOverride, Guardrail
    
    overrides = db.query(FunctionGuardrailOverride).filter(
        FunctionGuardrailOverride.function_name == function_name
    ).all()
    
    result = []
    for o in overrides:
        guardrail = db.query(Guardrail).filter(Guardrail.id == o.guardrail_id).first()
        result.append({
            "id": o.id,
            "function_name": o.function_name,
            "guardrail_id": o.guardrail_id,
            "guardrail_name": guardrail.name if guardrail else None,
            "is_enabled": o.is_enabled,
            "severity_override": o.severity_override,
            "custom_config": o.custom_config
        })
    
    return {
        "function_name": function_name,
        "overrides": result,
        "total": len(result)
    }


@router.get("/effective/{function_name}")
async def get_effective_guardrails(
    function_name: str,
    platform: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the effective guardrails for a specific function.
    Combines global guardrails, function-specific guardrails, and overrides.
    """
    from app.genai.models import Guardrail, FunctionGuardrailOverride
    
    # Get all active guardrails
    guardrails = db.query(Guardrail).filter(Guardrail.status == "active").all()
    
    # Get overrides for this function
    overrides = {
        o.guardrail_id: o
        for o in db.query(FunctionGuardrailOverride).filter(
            FunctionGuardrailOverride.function_name == function_name
        ).all()
    }
    
    effective = []
    for g in guardrails:
        # Check if this guardrail applies to this function
        applies = False
        if g.scope == "global":
            applies = True
        elif function_name in (g.applicable_functions or []):
            applies = True
        
        if not applies:
            continue
        
        # Check platform filter
        if platform and g.applicable_platforms:
            if platform not in g.applicable_platforms:
                continue
        
        # Apply override if exists
        override = overrides.get(g.id)
        if override:
            if not override.is_enabled:
                continue  # Disabled for this function
            severity = override.severity_override or g.severity
            config = {**g.config, **override.custom_config}
        else:
            severity = g.severity
            config = g.config
        
        effective.append({
            "id": g.id,
            "guardrail_id": g.guardrail_id,
            "name": g.name,
            "category": g.category,
            "severity": severity,
            "scope": g.scope,
            "config": config,
            "has_override": override is not None
        })
    
    return {
        "function_name": function_name,
        "platform": platform,
        "effective_guardrails": effective,
        "total": len(effective),
        "global_count": len([g for g in effective if g["scope"] == "global"]),
        "function_specific_count": len([g for g in effective if g["scope"] == "function"])
    }


# =============================================================================
# GUARDRAIL TESTING & EVALUATION ENDPOINTS
# =============================================================================

# Note: TestCase, TestSuiteRequest, GroundTruthRequest, ModelCompareRequest are defined above


@router.post("/test/suite")
async def run_test_suite(
    request: TestSuiteRequest,
    current_user: User = Depends(require_permission("manage:genai")),
    db: Session = Depends(get_db)
):
    """
    Run a test suite against guardrails and return accuracy metrics.
    Returns accuracy, precision, recall, F1 score.
    """
    engine = get_guardrail_engine(db)
    
    results = []
    true_positives = 0  # Correctly blocked harmful
    true_negatives = 0  # Correctly allowed safe
    false_positives = 0  # Incorrectly blocked safe (guardrail was too strict)
    false_negatives = 0  # Incorrectly allowed harmful (guardrail missed it)
    
    for test_case in request.test_cases:
        passed, guardrail_results = await engine.validate_input(
            prompt=test_case.input_text,
            use_case=request.use_case,
            platform=request.platform,
            guardrail_ids=request.guardrail_ids
        )
        
        # Determine actual failures
        critical_high_failures = [
            r for r in guardrail_results 
            if not r.passed and r.severity in [GuardrailSeverity.CRITICAL, GuardrailSeverity.HIGH]
        ]
        actual_blocked = len(critical_high_failures) > 0
        
        # Calculate metrics
        if test_case.expected_result:  # Expected to pass
            if passed:
                true_negatives += 1
                status = "true_negative"
            else:
                false_positives += 1
                status = "false_positive"
        else:  # Expected to fail
            if not passed:
                true_positives += 1
                status = "true_positive"
            else:
                false_negatives += 1
                status = "false_negative"
        
        # Check if expected violations matched
        actual_violations = [r.guardrail_id for r in guardrail_results if not r.passed]
        matched_violations = set(test_case.expected_violations or []) & set(actual_violations)
        
        results.append({
            "input_preview": test_case.input_text[:100] + "..." if len(test_case.input_text) > 100 else test_case.input_text,
            "description": test_case.description,
            "expected_pass": test_case.expected_result,
            "actual_pass": passed,
            "status": status,
            "violations": actual_violations,
            "expected_violations": test_case.expected_violations,
            "matched_violations": list(matched_violations),
            "details": [
                {"guardrail": r.guardrail_id, "passed": r.passed, "message": r.message}
                for r in guardrail_results if not r.passed
            ]
        })
    
    # Calculate metrics
    total = len(request.test_cases)
    correct = true_positives + true_negatives
    accuracy = correct / total if total > 0 else 0
    
    # Precision: Of all blocked, how many were correctly blocked?
    precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
    
    # Recall: Of all harmful, how many were blocked?
    recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
    
    # F1 Score: Harmonic mean of precision and recall
    f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    return {
        "metrics": {
            "total_tests": total,
            "correct": correct,
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1_score, 4),
            "true_positives": true_positives,
            "true_negatives": true_negatives,
            "false_positives": false_positives,
            "false_negatives": false_negatives
        },
        "results": results,
        "use_case": request.use_case,
        "platform": request.platform
    }


@router.post("/test/ground-truth")
async def test_ground_truth(
    request: GroundTruthRequest,
    current_user: User = Depends(require_permission("manage:genai")),
    db: Session = Depends(get_db)
):
    """
    Test RAG accuracy against ground truth.
    Compares model output with expected answer for hallucination detection.
    """
    from app.genai.provider import get_model_manager
    from app.genai.prompts import PromptManager
    
    model_manager = get_model_manager()
    prompt_manager = PromptManager(db_session=db, enable_rag=True)
    
    # Build a test prompt with guardrails
    system_prompt = """You are a helpful assistant answering questions based on the provided context.
IMPORTANT: Only use information from the provided context. If the answer is not in the context, say "I don't know based on the provided context."
Do NOT make up or infer information not explicitly stated."""
    
    user_prompt = f"""Context:
{request.context or 'No additional context provided.'}

Question: {request.query}

Answer:"""
    
    # Get model response
    model_id = request.model or model_manager.get_primary_model()
    try:
        provider = await model_manager.get_provider(model_id)
        response = await provider.generate(system_prompt, user_prompt, temperature=0.1)
    except Exception as e:
        return {"error": str(e), "model": model_id}
    
    # Calculate similarity metrics
    from difflib import SequenceMatcher
    
    expected = request.expected_answer.lower().strip()
    actual = response.lower().strip()
    
    # Exact match
    exact_match = expected == actual
    
    # Sequence similarity
    similarity = SequenceMatcher(None, expected, actual).ratio()
    
    # Key word overlap
    expected_words = set(expected.split())
    actual_words = set(actual.split())
    word_overlap = len(expected_words & actual_words) / len(expected_words) if expected_words else 0
    
    # Check for hallucination indicators
    hallucination_indicators = []
    if request.context:
        context_words = set(request.context.lower().split())
        response_words = set(response.lower().split())
        # Words in response but not in context or expected answer
        novel_words = response_words - context_words - expected_words - {"the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "i", "you", "it", "that", "this", "don't", "know", "based", "provided", "context"}
        if len(novel_words) > len(response_words) * 0.3:  # More than 30% novel words
            hallucination_indicators.append("High percentage of words not in context")
    
    # Confidence assessment
    if similarity > 0.9:
        confidence = "high"
    elif similarity > 0.7:
        confidence = "medium"
    elif similarity > 0.5:
        confidence = "low"
    else:
        confidence = "very_low"
    
    # Run guardrails on output
    engine = get_guardrail_engine(db)
    passed, guardrail_results = await engine.validate_output(
        output=response,
        use_case="chatbot",
        source_content=request.context
    )
    
    return {
        "query": request.query,
        "expected_answer": request.expected_answer,
        "actual_answer": response,
        "model_used": model_id,
        "metrics": {
            "exact_match": exact_match,
            "similarity": round(similarity, 4),
            "word_overlap": round(word_overlap, 4),
            "confidence": confidence
        },
        "hallucination_check": {
            "passed": passed,
            "indicators": hallucination_indicators,
            "guardrail_results": [
                {"guardrail": r.guardrail_id, "passed": r.passed, "message": r.message}
                for r in guardrail_results if not r.passed
            ]
        },
        "assessment": "PASS" if exact_match or (similarity > 0.8 and passed) else "NEEDS_REVIEW"
    }


@router.post("/test/model-compare")
async def compare_models(
    request: ModelCompareRequest,
    current_user: User = Depends(require_permission("manage:genai")),
    db: Session = Depends(get_db)
):
    """
    Compare guardrail enforcement across different models.
    Tests the same input against multiple models to ensure consistent guardrail behavior.
    """
    from app.genai.provider import get_model_manager
    
    model_manager = get_model_manager()
    available_models = await model_manager.get_available_models()
    
    # Filter to requested models or use all available
    if request.models:
        models_to_test = [m for m in available_models if m["id"] in request.models]
    else:
        models_to_test = available_models[:3]  # Limit to 3 models
    
    engine = get_guardrail_engine(db)
    
    results = []
    for model_info in models_to_test:
        model_id = model_info["id"]
        
        # Run input guardrails
        input_passed, input_results = await engine.validate_input(
            prompt=request.test_input,
            use_case=request.use_case
        )
        
        # If input passes guardrails, get model response
        if input_passed:
            try:
                provider = await model_manager.get_provider(model_id)
                
                # Simple test prompt
                response = await provider.generate(
                    system_prompt="You are a helpful security assistant.",
                    user_prompt=request.test_input,
                    temperature=0.1
                )
                
                # Run output guardrails
                output_passed, output_results = await engine.validate_output(
                    output=response,
                    use_case=request.use_case
                )
                
                results.append({
                    "model": model_id,
                    "model_name": model_info.get("name", model_id),
                    "input_guardrails_passed": input_passed,
                    "output_guardrails_passed": output_passed,
                    "response_preview": response[:200] + "..." if len(response) > 200 else response,
                    "input_violations": [r.guardrail_id for r in input_results if not r.passed],
                    "output_violations": [r.guardrail_id for r in output_results if not r.passed],
                    "error": None
                })
            except Exception as e:
                results.append({
                    "model": model_id,
                    "model_name": model_info.get("name", model_id),
                    "input_guardrails_passed": input_passed,
                    "output_guardrails_passed": None,
                    "response_preview": None,
                    "input_violations": [r.guardrail_id for r in input_results if not r.passed],
                    "output_violations": [],
                    "error": str(e)
                })
        else:
            results.append({
                "model": model_id,
                "model_name": model_info.get("name", model_id),
                "input_guardrails_passed": False,
                "output_guardrails_passed": None,
                "response_preview": None,
                "input_violations": [r.guardrail_id for r in input_results if not r.passed],
                "output_violations": [],
                "error": "Input blocked by guardrails"
            })
    
    # Consistency check
    all_input_passed = all(r["input_guardrails_passed"] for r in results)
    all_input_failed = all(not r["input_guardrails_passed"] for r in results)
    input_consistent = all_input_passed or all_input_failed
    
    output_results = [r for r in results if r["output_guardrails_passed"] is not None]
    output_consistent = len(set(r["output_guardrails_passed"] for r in output_results)) <= 1
    
    return {
        "test_input": request.test_input[:200],
        "use_case": request.use_case,
        "models_tested": len(models_to_test),
        "results": results,
        "consistency": {
            "input_guardrails_consistent": input_consistent,
            "output_guardrails_consistent": output_consistent,
            "all_passed_input": all_input_passed,
            "all_blocked_input": all_input_failed
        }
    }


@router.get("/best-practices")
async def get_guardrail_best_practices(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Get guardrail best practices and recommendations.
    """
    best_practices = {
        "prompt_safety": {
            "name": "Prompt Safety",
            "description": "Protect against prompt injection and manipulation attacks",
            "practices": [
                "Always validate user input before passing to GenAI models",
                "Use system prompts to define strict boundaries",
                "Implement role separation between system and user content",
                "Block known injection patterns (ignore previous, forget, pretend)",
                "Sanitize special characters and control tokens",
                "Limit prompt length to prevent DoS attacks"
            ],
            "recommended_guardrails": ["PS001", "PS002", "PS003", "PS007"]
        },
        "data_protection": {
            "name": "Data Protection",
            "description": "Protect sensitive data (PII, PHI, credentials)",
            "practices": [
                "Scan all inputs for PII before GenAI processing",
                "Implement output filtering for credentials and secrets",
                "Use redaction for sensitive data in prompts",
                "Validate no API keys or tokens in responses",
                "Apply HIPAA/GDPR compliance checks where applicable",
                "Log all data protection guardrail triggers for audit"
            ],
            "recommended_guardrails": ["DP001", "DP002", "DP003", "OV003", "OV004"]
        },
        "hallucination_prevention": {
            "name": "Hallucination Prevention",
            "description": "Ensure factual accuracy and prevent fabricated information",
            "practices": [
                "Require source attribution for factual claims",
                "Cross-reference IOCs with source content",
                "Validate MITRE technique IDs against official database",
                "Check numerical claims have evidence",
                "Use RAG to ground responses in verified knowledge",
                "Implement confidence scoring for extracted data"
            ],
            "recommended_guardrails": ["HP001", "HP002", "HP006", "HP007"]
        },
        "query_validation": {
            "name": "Query Validation",
            "description": "Validate query syntax and prevent dangerous operations",
            "practices": [
                "Validate syntax for target platform (KQL, XQL, SPL)",
                "Always include time bounds in queries",
                "Block destructive operations (DELETE, DROP)",
                "Limit query complexity to prevent timeouts",
                "Validate table and field references",
                "Include result limits to prevent data overload"
            ],
            "recommended_guardrails": ["QV001", "QV006", "QV008", "QV013"]
        },
        "testing": {
            "name": "Testing & Evaluation",
            "description": "Best practices for testing guardrail effectiveness",
            "practices": [
                "Create adversarial test cases for each guardrail",
                "Test both positive (should block) and negative (should allow) cases",
                "Measure accuracy, precision, recall, and F1 score",
                "Test ground truth validation for RAG accuracy",
                "Compare guardrail behavior across different models",
                "Regularly update test suites with new attack patterns"
            ],
            "recommended_guardrails": []
        }
    }
    
    if category and category in best_practices:
        return best_practices[category]
    
    return {
        "categories": list(best_practices.keys()),
        "practices": best_practices
    }


@router.get("/context-preview/{function_name}")
async def preview_guardrail_context(
    function_name: str,
    platform: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Preview the guardrail context that would be passed to the GenAI model for a specific function.
    Shows exactly what guardrails and instructions the model receives.
    """
    from app.genai.prompts import PromptManager, PromptFunction, DEFAULT_GUARDRAILS
    
    # Map function name to PromptFunction
    function_map = {
        "ioc_extraction": PromptFunction.IOC_EXTRACTION,
        "ttp_extraction": PromptFunction.TTP_EXTRACTION,
        "executive_summary": PromptFunction.EXECUTIVE_SUMMARY,
        "technical_summary": PromptFunction.TECHNICAL_SUMMARY,
        "hunt_query_xsiam": PromptFunction.HUNT_QUERY_XSIAM,
        "hunt_query_defender": PromptFunction.HUNT_QUERY_DEFENDER,
        "hunt_query_splunk": PromptFunction.HUNT_QUERY_SPLUNK,
        "chatbot": PromptFunction.CHATBOT
    }
    
    function = function_map.get(function_name)
    if not function:
        return {
            "error": f"Unknown function: {function_name}",
            "available_functions": list(function_map.keys())
        }
    
    # Get the prompt manager
    prompt_manager = PromptManager(db_session=db, enable_rag=True)
    
    # Get guardrails for this function
    guardrails_text = prompt_manager.get_guardrails(
        function=function,
        include_global=True,
        platform=platform
    )
    
    # Get the default guardrails structure
    global_guardrails = DEFAULT_GUARDRAILS.get("global", [])
    
    # Map function to guardrail category
    category_map = {
        "ioc_extraction": "ioc_extraction",
        "ttp_extraction": "ttp_extraction",
        "executive_summary": "executive_summary",
        "technical_summary": "technical_summary",
        "hunt_query_xsiam": "hunt_query_xsiam",
        "hunt_query_defender": "hunt_query_defender",
        "hunt_query_splunk": "hunt_query_splunk",
        "chatbot": "chatbot"
    }
    
    # Get function-specific guardrails
    func_category = category_map.get(function_name, function_name)
    function_guardrails = DEFAULT_GUARDRAILS.get(func_category, [])
    
    # Also check for hunt_query parent if applicable
    if "hunt_query" in function_name:
        function_guardrails = DEFAULT_GUARDRAILS.get("hunt_query", []) + function_guardrails
    
    # Check for custom overrides from database
    from app.models import SystemConfiguration
    custom_config = db.query(SystemConfiguration).filter(
        SystemConfiguration.category == "guardrails",
        SystemConfiguration.key == function_name
    ).first()
    
    custom_guardrails = []
    if custom_config and custom_config.value:
        try:
            import json
            custom_guardrails = json.loads(custom_config.value)
        except:
            pass
    
    return {
        "function_name": function_name,
        "platform": platform,
        "guardrail_context_for_model": guardrails_text,
        "structure": {
            "global_guardrails": {
                "count": len(global_guardrails),
                "guardrails": [
                    {"id": g.get("id"), "name": g.get("name"), "enabled": g.get("enabled", True)}
                    for g in global_guardrails
                ]
            },
            "function_guardrails": {
                "count": len(function_guardrails),
                "guardrails": [
                    {"id": g.get("id"), "name": g.get("name"), "enabled": g.get("enabled", True)}
                    for g in function_guardrails
                ]
            },
            "custom_overrides": {
                "has_custom": len(custom_guardrails) > 0,
                "count": len(custom_guardrails),
                "guardrails": [
                    {"id": g.get("id"), "name": g.get("name"), "enabled": g.get("enabled", True)}
                    for g in custom_guardrails
                ]
            }
        },
        "total_active_guardrails": len(global_guardrails) + len(function_guardrails) + len(custom_guardrails),
        "note": "This shows the exact guardrail instructions that are injected into the system prompt for this function."
    }
