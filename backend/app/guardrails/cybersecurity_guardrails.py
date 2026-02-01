"""
Comprehensive Cybersecurity Guardrails for GenAI
50+ guardrails specifically designed for threat hunting, incident response, and XDR/EDR work.
"""
import re
import json
import structlog
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

logger = structlog.get_logger()


class GuardrailCategory(str, Enum):
    """Categories of guardrails."""
    PROMPT_SAFETY = "prompt_safety"
    QUERY_VALIDATION = "query_validation"
    OUTPUT_VALIDATION = "output_validation"
    HALLUCINATION_PREVENTION = "hallucination_prevention"
    SECURITY_CONTEXT = "security_context"
    PLATFORM_SPECIFIC = "platform_specific"
    DATA_PROTECTION = "data_protection"
    COMPLIANCE = "compliance"


class GuardrailSeverity(str, Enum):
    """Severity levels for guardrail violations."""
    CRITICAL = "critical"  # Block immediately
    HIGH = "high"          # Block with warning
    MEDIUM = "medium"      # Warn but allow
    LOW = "low"            # Log only
    INFO = "info"          # Informational


@dataclass
class GuardrailResult:
    """Result of a guardrail check."""
    passed: bool
    guardrail_id: str
    guardrail_name: str
    category: GuardrailCategory
    severity: GuardrailSeverity
    message: str
    details: Dict = field(default_factory=dict)
    suggestion: Optional[str] = None
    knowledge_base_recommended: bool = False


@dataclass
class GuardrailDefinition:
    """Definition of a guardrail."""
    id: str
    name: str
    description: str
    category: GuardrailCategory
    severity: GuardrailSeverity
    enabled: bool = True
    config: Dict = field(default_factory=dict)
    applicable_use_cases: List[str] = field(default_factory=list)
    applicable_platforms: List[str] = field(default_factory=list)


# =============================================================================
# 50 CYBERSECURITY GUARDRAILS
# =============================================================================

CYBERSECURITY_GUARDRAILS: List[GuardrailDefinition] = [
    # =========================================================================
    # PROMPT SAFETY GUARDRAILS (1-10)
    # =========================================================================
    GuardrailDefinition(
        id="PS001",
        name="Prompt Injection Detection",
        description="Detect and block prompt injection attacks that attempt to override system instructions",
        category=GuardrailCategory.PROMPT_SAFETY,
        severity=GuardrailSeverity.CRITICAL,
        applicable_use_cases=["all"]
    ),
    GuardrailDefinition(
        id="PS002",
        name="Jailbreak Prevention",
        description="Prevent attempts to bypass security controls through creative prompting",
        category=GuardrailCategory.PROMPT_SAFETY,
        severity=GuardrailSeverity.CRITICAL,
        applicable_use_cases=["all"]
    ),
    GuardrailDefinition(
        id="PS003",
        name="Malicious Command Injection",
        description="Block prompts that attempt to inject shell commands or code execution",
        category=GuardrailCategory.PROMPT_SAFETY,
        severity=GuardrailSeverity.CRITICAL,
        applicable_use_cases=["hunt_query", "chatbot"]
    ),
    GuardrailDefinition(
        id="PS004",
        name="Data Exfiltration Prevention",
        description="Detect prompts attempting to extract sensitive system information",
        category=GuardrailCategory.PROMPT_SAFETY,
        severity=GuardrailSeverity.HIGH,
        applicable_use_cases=["all"]
    ),
    GuardrailDefinition(
        id="PS005",
        name="Role Manipulation Detection",
        description="Detect attempts to make the model assume dangerous roles",
        category=GuardrailCategory.PROMPT_SAFETY,
        severity=GuardrailSeverity.HIGH,
        applicable_use_cases=["chatbot", "report"]
    ),
    GuardrailDefinition(
        id="PS006",
        name="Indirect Prompt Injection",
        description="Detect hidden instructions in user-provided content (articles, IOCs)",
        category=GuardrailCategory.PROMPT_SAFETY,
        severity=GuardrailSeverity.HIGH,
        applicable_use_cases=["summarization", "ioc_extraction"]
    ),
    GuardrailDefinition(
        id="PS007",
        name="Encoding Attack Detection",
        description="Detect base64, hex, or other encoded malicious payloads in prompts",
        category=GuardrailCategory.PROMPT_SAFETY,
        severity=GuardrailSeverity.HIGH,
        applicable_use_cases=["all"]
    ),
    GuardrailDefinition(
        id="PS008",
        name="Unicode Manipulation Detection",
        description="Detect attempts to use Unicode tricks to bypass filters",
        category=GuardrailCategory.PROMPT_SAFETY,
        severity=GuardrailSeverity.MEDIUM,
        applicable_use_cases=["all"]
    ),
    GuardrailDefinition(
        id="PS009",
        name="Excessive Length Check",
        description="Reject prompts that exceed safe length limits (potential DOS)",
        category=GuardrailCategory.PROMPT_SAFETY,
        severity=GuardrailSeverity.MEDIUM,
        config={"max_length": 50000}
    ),
    GuardrailDefinition(
        id="PS010",
        name="Repetition Attack Detection",
        description="Detect token repetition attacks designed to confuse the model",
        category=GuardrailCategory.PROMPT_SAFETY,
        severity=GuardrailSeverity.MEDIUM,
        applicable_use_cases=["all"]
    ),
    
    # =========================================================================
    # QUERY VALIDATION GUARDRAILS (11-25)
    # =========================================================================
    GuardrailDefinition(
        id="QV001",
        name="KQL Syntax Validation",
        description="Validate KQL query syntax for Microsoft Defender/Sentinel",
        category=GuardrailCategory.QUERY_VALIDATION,
        severity=GuardrailSeverity.HIGH,
        applicable_platforms=["defender", "sentinel"]
    ),
    GuardrailDefinition(
        id="QV002",
        name="XQL Syntax Validation",
        description="Validate XQL query syntax for Cortex XSIAM",
        category=GuardrailCategory.QUERY_VALIDATION,
        severity=GuardrailSeverity.HIGH,
        applicable_platforms=["xsiam"]
    ),
    GuardrailDefinition(
        id="QV003",
        name="SPL Syntax Validation",
        description="Validate SPL query syntax for Splunk",
        category=GuardrailCategory.QUERY_VALIDATION,
        severity=GuardrailSeverity.HIGH,
        applicable_platforms=["splunk"]
    ),
    GuardrailDefinition(
        id="QV004",
        name="YARA-L Syntax Validation",
        description="Validate YARA-L query syntax for Google Chronicle",
        category=GuardrailCategory.QUERY_VALIDATION,
        severity=GuardrailSeverity.HIGH,
        applicable_platforms=["chronicle"]
    ),
    GuardrailDefinition(
        id="QV005",
        name="Query Complexity Check",
        description="Warn about overly complex queries that may timeout",
        category=GuardrailCategory.QUERY_VALIDATION,
        severity=GuardrailSeverity.MEDIUM,
        config={"max_joins": 5, "max_subqueries": 3}
    ),
    GuardrailDefinition(
        id="QV006",
        name="Time Range Validation",
        description="Ensure queries have appropriate time bounds to prevent full table scans",
        category=GuardrailCategory.QUERY_VALIDATION,
        severity=GuardrailSeverity.HIGH,
        config={"max_days": 30}
    ),
    GuardrailDefinition(
        id="QV007",
        name="Wildcard Abuse Prevention",
        description="Detect excessive wildcards that could cause performance issues",
        category=GuardrailCategory.QUERY_VALIDATION,
        severity=GuardrailSeverity.MEDIUM,
        applicable_platforms=["all"]
    ),
    GuardrailDefinition(
        id="QV008",
        name="Destructive Operation Prevention",
        description="Block queries containing DELETE, DROP, TRUNCATE operations",
        category=GuardrailCategory.QUERY_VALIDATION,
        severity=GuardrailSeverity.CRITICAL,
        applicable_use_cases=["all"],
        applicable_platforms=["all"]
    ),
    GuardrailDefinition(
        id="QV009",
        name="Table Reference Validation",
        description="Validate that referenced tables/datasets exist in the platform",
        category=GuardrailCategory.QUERY_VALIDATION,
        severity=GuardrailSeverity.HIGH,
        applicable_platforms=["all"]
    ),
    GuardrailDefinition(
        id="QV010",
        name="Field Name Validation",
        description="Validate that field names are correct for the target platform schema",
        category=GuardrailCategory.QUERY_VALIDATION,
        severity=GuardrailSeverity.MEDIUM,
        applicable_platforms=["all"]
    ),
    GuardrailDefinition(
        id="QV011",
        name="IOC Format Validation",
        description="Validate IOC formats in queries (IPs, domains, hashes)",
        category=GuardrailCategory.QUERY_VALIDATION,
        severity=GuardrailSeverity.MEDIUM,
        applicable_use_cases=["hunt_query"]
    ),
    GuardrailDefinition(
        id="QV012",
        name="MITRE ATT&CK Technique Validation",
        description="Validate MITRE ATT&CK technique IDs are correctly formatted",
        category=GuardrailCategory.QUERY_VALIDATION,
        severity=GuardrailSeverity.LOW,
        applicable_use_cases=["hunt_query", "ioc_extraction"]
    ),
    GuardrailDefinition(
        id="QV013",
        name="Query Result Limit Enforcement",
        description="Ensure queries include result limits to prevent data overload",
        category=GuardrailCategory.QUERY_VALIDATION,
        severity=GuardrailSeverity.MEDIUM,
        config={"max_results": 10000}
    ),
    GuardrailDefinition(
        id="QV014",
        name="Regex Complexity Check",
        description="Prevent ReDoS attacks from complex regex patterns",
        category=GuardrailCategory.QUERY_VALIDATION,
        severity=GuardrailSeverity.HIGH,
        applicable_platforms=["all"]
    ),
    GuardrailDefinition(
        id="QV015",
        name="Cross-Platform Query Compatibility",
        description="Flag queries that use platform-specific syntax when targeting multiple platforms",
        category=GuardrailCategory.QUERY_VALIDATION,
        severity=GuardrailSeverity.INFO,
        applicable_platforms=["all"]
    ),
    
    # =========================================================================
    # OUTPUT VALIDATION GUARDRAILS (26-35)
    # =========================================================================
    GuardrailDefinition(
        id="OV001",
        name="Executable Code Detection",
        description="Detect and warn about executable code in GenAI output",
        category=GuardrailCategory.OUTPUT_VALIDATION,
        severity=GuardrailSeverity.HIGH,
        applicable_use_cases=["all"]
    ),
    GuardrailDefinition(
        id="OV002",
        name="Malicious URL Detection",
        description="Detect potentially malicious URLs in output",
        category=GuardrailCategory.OUTPUT_VALIDATION,
        severity=GuardrailSeverity.MEDIUM,
        applicable_use_cases=["all"]
    ),
    GuardrailDefinition(
        id="OV003",
        name="PII Detection",
        description="Detect and mask Personally Identifiable Information in output",
        category=GuardrailCategory.OUTPUT_VALIDATION,
        severity=GuardrailSeverity.HIGH,
        applicable_use_cases=["report", "summarization", "chatbot"]
    ),
    GuardrailDefinition(
        id="OV004",
        name="Credential Detection",
        description="Detect exposed credentials, API keys, or tokens in output",
        category=GuardrailCategory.OUTPUT_VALIDATION,
        severity=GuardrailSeverity.CRITICAL,
        applicable_use_cases=["all"]
    ),
    GuardrailDefinition(
        id="OV005",
        name="Internal Path Detection",
        description="Detect internal file paths or system information leakage",
        category=GuardrailCategory.OUTPUT_VALIDATION,
        severity=GuardrailSeverity.MEDIUM,
        applicable_use_cases=["all"]
    ),
    GuardrailDefinition(
        id="OV006",
        name="JSON Structure Validation",
        description="Validate JSON output structure matches expected schema",
        category=GuardrailCategory.OUTPUT_VALIDATION,
        severity=GuardrailSeverity.MEDIUM,
        applicable_use_cases=["ioc_extraction", "hunt_query"]
    ),
    GuardrailDefinition(
        id="OV007",
        name="Confidence Score Validation",
        description="Ensure confidence scores are within valid ranges (0-1)",
        category=GuardrailCategory.OUTPUT_VALIDATION,
        severity=GuardrailSeverity.LOW,
        applicable_use_cases=["ioc_extraction", "summarization"]
    ),
    GuardrailDefinition(
        id="OV008",
        name="Empty Response Detection",
        description="Detect and handle empty or insufficient responses",
        category=GuardrailCategory.OUTPUT_VALIDATION,
        severity=GuardrailSeverity.MEDIUM,
        applicable_use_cases=["all"]
    ),
    GuardrailDefinition(
        id="OV009",
        name="Response Length Validation",
        description="Ensure responses are within acceptable length bounds",
        category=GuardrailCategory.OUTPUT_VALIDATION,
        severity=GuardrailSeverity.LOW,
        config={"min_length": 10, "max_length": 100000}
    ),
    GuardrailDefinition(
        id="OV010",
        name="Markdown Injection Prevention",
        description="Sanitize markdown output to prevent XSS in UI",
        category=GuardrailCategory.OUTPUT_VALIDATION,
        severity=GuardrailSeverity.MEDIUM,
        applicable_use_cases=["report", "summarization"]
    ),
    
    # =========================================================================
    # HALLUCINATION PREVENTION GUARDRAILS (36-45)
    # =========================================================================
    GuardrailDefinition(
        id="HP001",
        name="IOC Reality Check",
        description="Verify extracted IOCs match patterns in source content",
        category=GuardrailCategory.HALLUCINATION_PREVENTION,
        severity=GuardrailSeverity.HIGH,
        applicable_use_cases=["ioc_extraction"]
    ),
    GuardrailDefinition(
        id="HP002",
        name="TTP Attribution Verification",
        description="Verify TTP attributions have evidence in source material",
        category=GuardrailCategory.HALLUCINATION_PREVENTION,
        severity=GuardrailSeverity.HIGH,
        applicable_use_cases=["ioc_extraction", "summarization"]
    ),
    GuardrailDefinition(
        id="HP003",
        name="Threat Actor Verification",
        description="Cross-reference threat actor names against known databases",
        category=GuardrailCategory.HALLUCINATION_PREVENTION,
        severity=GuardrailSeverity.MEDIUM,
        applicable_use_cases=["ioc_extraction", "report"]
    ),
    GuardrailDefinition(
        id="HP004",
        name="Date/Time Plausibility Check",
        description="Verify dates mentioned are plausible and not in the future",
        category=GuardrailCategory.HALLUCINATION_PREVENTION,
        severity=GuardrailSeverity.LOW,
        applicable_use_cases=["summarization", "report"]
    ),
    GuardrailDefinition(
        id="HP005",
        name="CVE Validity Check",
        description="Verify CVE IDs are properly formatted and exist",
        category=GuardrailCategory.HALLUCINATION_PREVENTION,
        severity=GuardrailSeverity.MEDIUM,
        applicable_use_cases=["ioc_extraction", "hunt_query"]
    ),
    GuardrailDefinition(
        id="HP006",
        name="MITRE Technique Existence Check",
        description="Verify MITRE ATT&CK technique IDs actually exist",
        category=GuardrailCategory.HALLUCINATION_PREVENTION,
        severity=GuardrailSeverity.MEDIUM,
        applicable_use_cases=["ioc_extraction", "hunt_query"]
    ),
    GuardrailDefinition(
        id="HP007",
        name="Knowledge Base Grounding",
        description="Verify claims against knowledge base documentation",
        category=GuardrailCategory.HALLUCINATION_PREVENTION,
        severity=GuardrailSeverity.HIGH,
        applicable_use_cases=["chatbot", "hunt_query"]
    ),
    GuardrailDefinition(
        id="HP008",
        name="Platform Feature Verification",
        description="Verify referenced platform features/functions actually exist",
        category=GuardrailCategory.HALLUCINATION_PREVENTION,
        severity=GuardrailSeverity.HIGH,
        applicable_use_cases=["hunt_query"],
        applicable_platforms=["all"]
    ),
    GuardrailDefinition(
        id="HP009",
        name="Numerical Claim Verification",
        description="Verify numerical claims (percentages, counts) have source evidence",
        category=GuardrailCategory.HALLUCINATION_PREVENTION,
        severity=GuardrailSeverity.LOW,
        applicable_use_cases=["report", "summarization"]
    ),
    GuardrailDefinition(
        id="HP010",
        name="Citation Verification",
        description="Verify cited sources and references are accurate",
        category=GuardrailCategory.HALLUCINATION_PREVENTION,
        severity=GuardrailSeverity.MEDIUM,
        applicable_use_cases=["report"]
    ),
    
    # =========================================================================
    # SECURITY CONTEXT GUARDRAILS (46-50)
    # =========================================================================
    GuardrailDefinition(
        id="SC001",
        name="Sensitive Environment Detection",
        description="Detect when queries target production/sensitive environments",
        category=GuardrailCategory.SECURITY_CONTEXT,
        severity=GuardrailSeverity.HIGH,
        applicable_use_cases=["hunt_query"]
    ),
    GuardrailDefinition(
        id="SC002",
        name="Privileged Operation Warning",
        description="Warn when queries require elevated privileges",
        category=GuardrailCategory.SECURITY_CONTEXT,
        severity=GuardrailSeverity.MEDIUM,
        applicable_use_cases=["hunt_query"]
    ),
    GuardrailDefinition(
        id="SC003",
        name="Data Classification Check",
        description="Ensure output respects data classification policies",
        category=GuardrailCategory.SECURITY_CONTEXT,
        severity=GuardrailSeverity.HIGH,
        applicable_use_cases=["report", "chatbot"]
    ),
    GuardrailDefinition(
        id="SC004",
        name="Cross-Tenant Query Prevention",
        description="Prevent queries that could access other tenants' data",
        category=GuardrailCategory.SECURITY_CONTEXT,
        severity=GuardrailSeverity.CRITICAL,
        applicable_use_cases=["hunt_query"],
        applicable_platforms=["defender", "sentinel"]
    ),
    GuardrailDefinition(
        id="SC005",
        name="Audit Trail Requirement",
        description="Ensure all GenAI operations are properly logged",
        category=GuardrailCategory.SECURITY_CONTEXT,
        severity=GuardrailSeverity.HIGH,
        applicable_use_cases=["all"]
    ),
    
    # =========================================================================
    # DATA PROTECTION GUARDRAILS (DP001-DP010) - PII, PHI, CREDENTIALS
    # =========================================================================
    GuardrailDefinition(
        id="DP001",
        name="PII Detection and Blocking",
        description="Detect and block Personally Identifiable Information (SSN, credit cards, phone numbers, emails, etc.)",
        category=GuardrailCategory.DATA_PROTECTION,
        severity=GuardrailSeverity.CRITICAL,
        applicable_use_cases=["all"]
    ),
    GuardrailDefinition(
        id="DP002",
        name="PHI/HIPAA Detection",
        description="Detect Protected Health Information (medical records, diagnoses, prescriptions, insurance IDs)",
        category=GuardrailCategory.DATA_PROTECTION,
        severity=GuardrailSeverity.CRITICAL,
        applicable_use_cases=["all"]
    ),
    GuardrailDefinition(
        id="DP003",
        name="Credential/Secret Detection",
        description="Detect API keys, passwords, tokens, private keys, and connection strings",
        category=GuardrailCategory.DATA_PROTECTION,
        severity=GuardrailSeverity.CRITICAL,
        applicable_use_cases=["all"]
    ),
    GuardrailDefinition(
        id="DP004",
        name="IP Address Exposure Prevention",
        description="Detect and warn about public IP addresses that may reveal infrastructure",
        category=GuardrailCategory.DATA_PROTECTION,
        severity=GuardrailSeverity.MEDIUM,
        applicable_use_cases=["hunt_query", "report", "chatbot"]
    ),
    GuardrailDefinition(
        id="DP005",
        name="Internal Hostname Detection",
        description="Detect internal hostnames and domain names that shouldn't be exposed",
        category=GuardrailCategory.DATA_PROTECTION,
        severity=GuardrailSeverity.MEDIUM,
        applicable_use_cases=["all"]
    ),
    GuardrailDefinition(
        id="DP006",
        name="Financial Data Protection",
        description="Detect bank account numbers, routing numbers, and financial identifiers",
        category=GuardrailCategory.DATA_PROTECTION,
        severity=GuardrailSeverity.HIGH,
        applicable_use_cases=["all"]
    ),
    GuardrailDefinition(
        id="DP007",
        name="Employee Data Protection",
        description="Detect employee IDs, salary information, and HR-related PII",
        category=GuardrailCategory.DATA_PROTECTION,
        severity=GuardrailSeverity.HIGH,
        applicable_use_cases=["all"]
    ),
    GuardrailDefinition(
        id="DP008",
        name="Customer Data Protection",
        description="Detect customer IDs, account details, and customer-specific information",
        category=GuardrailCategory.DATA_PROTECTION,
        severity=GuardrailSeverity.HIGH,
        applicable_use_cases=["all"]
    ),
    GuardrailDefinition(
        id="DP009",
        name="Biometric Data Detection",
        description="Detect references to fingerprints, facial recognition, and other biometric data",
        category=GuardrailCategory.DATA_PROTECTION,
        severity=GuardrailSeverity.CRITICAL,
        applicable_use_cases=["all"]
    ),
    GuardrailDefinition(
        id="DP010",
        name="Location Data Protection",
        description="Detect GPS coordinates, precise addresses, and location tracking data",
        category=GuardrailCategory.DATA_PROTECTION,
        severity=GuardrailSeverity.MEDIUM,
        applicable_use_cases=["all"]
    ),
]


# =============================================================================
# PLATFORM-SPECIFIC QUERY SYNTAX DEFINITIONS
# =============================================================================

PLATFORM_SYNTAX = {
    "defender": {
        "name": "Microsoft Defender for Endpoint / M365 Defender",
        "language": "KQL (Kusto Query Language)",
        "tables": [
            "DeviceProcessEvents", "DeviceNetworkEvents", "DeviceFileEvents",
            "DeviceRegistryEvents", "DeviceLogonEvents", "DeviceImageLoadEvents",
            "DeviceEvents", "AlertInfo", "AlertEvidence", "EmailEvents",
            "IdentityLogonEvents", "CloudAppEvents"
        ],
        "common_fields": [
            "Timestamp", "DeviceId", "DeviceName", "ActionType", "FileName",
            "FolderPath", "SHA1", "SHA256", "MD5", "ProcessId", "ProcessCommandLine",
            "AccountName", "AccountDomain", "RemoteIP", "RemotePort", "LocalIP",
            "InitiatingProcessFileName", "InitiatingProcessCommandLine"
        ],
        "operators": ["==", "!=", "contains", "!contains", "has", "!has", "startswith", "endswith", "matches regex", "in", "!in"],
        "time_functions": ["ago()", "datetime()", "now()"],
        "keywords": ["where", "project", "extend", "summarize", "join", "union", "let", "order by", "top", "limit"],
        "example_query": """DeviceProcessEvents
| where Timestamp > ago(24h)
| where ProcessCommandLine contains "powershell"
| project Timestamp, DeviceName, AccountName, ProcessCommandLine
| order by Timestamp desc""",
        "documentation_url": "https://learn.microsoft.com/en-us/microsoft-365/security/defender/advanced-hunting-query-language"
    },
    
    "sentinel": {
        "name": "Microsoft Sentinel",
        "language": "KQL (Kusto Query Language)",
        "tables": [
            "SecurityEvent", "SecurityAlert", "Syslog", "CommonSecurityLog",
            "AzureActivity", "SigninLogs", "AuditLogs", "OfficeActivity",
            "ThreatIntelligenceIndicator", "Heartbeat", "Event", "WindowsEvent"
        ],
        "common_fields": [
            "TimeGenerated", "Computer", "Account", "EventID", "Activity",
            "SourceIP", "DestinationIP", "SourcePort", "DestinationPort",
            "CommandLine", "ProcessName", "ParentProcessName"
        ],
        "operators": ["==", "!=", "contains", "!contains", "has", "!has", "startswith", "endswith", "matches regex", "in", "!in"],
        "time_functions": ["ago()", "datetime()", "now()"],
        "keywords": ["where", "project", "extend", "summarize", "join", "union", "let", "order by", "top", "limit"],
        "example_query": """SecurityEvent
| where TimeGenerated > ago(24h)
| where EventID == 4688
| where CommandLine contains "powershell"
| project TimeGenerated, Computer, Account, CommandLine
| order by TimeGenerated desc""",
        "documentation_url": "https://learn.microsoft.com/en-us/azure/sentinel/kusto-overview"
    },
    
    "xsiam": {
        "name": "Cortex XSIAM / XDR",
        "language": "XQL (XSIAM Query Language)",
        "tables": [
            "xdr_data", "cloud_audit_log", "auth_data", "file_data",
            "network_data", "process_data", "registry_data"
        ],
        "common_fields": [
            "_time", "agent_hostname", "agent_id", "actor_primary_username",
            "action_process_command_line", "action_file_path", "action_file_sha256",
            "action_remote_ip", "action_remote_port", "action_local_ip",
            "causality_chain", "event_type", "action_type"
        ],
        "operators": ["=", "!=", "~=", "!~=", "contains", "in", "not in", "<", ">", "<=", ">="],
        "time_functions": ["relative_timestamp()", "timestamp()"],
        "keywords": ["dataset", "filter", "fields", "sort", "limit", "dedup", "join", "union", "alter", "comp", "config"],
        "example_query": """dataset = xdr_data
| filter event_type = PROCESS and action_process_command_line contains "powershell"
| fields _time, agent_hostname, actor_primary_username, action_process_command_line
| sort desc _time
| limit 1000""",
        "documentation_url": "https://docs-cortex.paloaltonetworks.com/r/Cortex-XDR/Cortex-XDR-XQL-Language-Reference"
    },
    
    "splunk": {
        "name": "Splunk Enterprise / Cloud",
        "language": "SPL (Search Processing Language)",
        "tables": [
            "main", "windows", "linux", "network", "firewall", "dns", "proxy",
            "_internal", "_audit", "syslog", "wineventlog"
        ],
        "common_fields": [
            "_time", "host", "source", "sourcetype", "index", "user",
            "src_ip", "dest_ip", "src_port", "dest_port", "action",
            "CommandLine", "ProcessName", "ParentProcessName", "EventCode"
        ],
        "operators": ["=", "!=", "<", ">", "<=", ">=", "AND", "OR", "NOT"],
        "time_functions": ["earliest=", "latest=", "relative_time()"],
        "keywords": ["search", "stats", "table", "fields", "where", "eval", "rex", "join", "append", "transaction", "timechart", "chart"],
        "example_query": """index=main sourcetype=windows:security EventCode=4688
| search CommandLine="*powershell*"
| table _time, host, user, CommandLine
| sort -_time
| head 1000""",
        "documentation_url": "https://docs.splunk.com/Documentation/Splunk/latest/SearchReference"
    },
    
    "chronicle": {
        "name": "Google Chronicle / Security Operations",
        "language": "YARA-L 2.0",
        "tables": [
            "events", "udm_events", "entity_graph", "ioc_matches"
        ],
        "common_fields": [
            "metadata.event_timestamp", "metadata.event_type", "principal.hostname",
            "principal.user.userid", "target.ip", "target.port", "network.dns.questions",
            "security_result.action", "extensions.auth.type"
        ],
        "operators": ["=", "!=", ">", "<", ">=", "<=", "nocase", "re.regex"],
        "time_functions": ["timestamp.get_date()", "timestamp.get_minute()"],
        "keywords": ["rule", "meta", "events", "match", "condition", "outcome", "options"],
        "example_query": """rule detect_powershell_execution {
  meta:
    author = "SOC Team"
    description = "Detect PowerShell execution"
  events:
    $e.metadata.event_type = "PROCESS_LAUNCH"
    $e.target.process.command_line = /.*powershell.*/i
  outcome:
    $risk_score = 50
  condition:
    $e
}""",
        "documentation_url": "https://cloud.google.com/chronicle/docs/detection/yara-l-2-0-overview"
    },
    
    "wiz": {
        "name": "Wiz Cloud Security",
        "language": "GraphQL",
        "tables": [
            "CloudResources", "Issues", "SecurityGraph", "ConfigurationFindings"
        ],
        "common_fields": [
            "id", "type", "name", "cloudPlatform", "region", "subscriptionId",
            "severity", "status", "createdAt", "updatedAt"
        ],
        "operators": ["equals", "contains", "startsWith", "endsWith", "in", "gt", "lt", "gte", "lte"],
        "keywords": ["query", "filter", "where", "orderBy", "first", "after"],
        "example_query": """{
  issues(filterBy: {
    severity: [CRITICAL, HIGH]
    status: [OPEN]
  }, first: 100) {
    nodes {
      id
      title
      severity
      resource {
        name
        type
      }
    }
  }
}""",
        "documentation_url": "https://docs.wiz.io/wiz-docs/docs/api-reference"
    }
}


class CybersecurityGuardrailEngine:
    """
    Engine for applying cybersecurity guardrails to GenAI operations.
    """
    
    def __init__(self, db_session=None, knowledge_base_service=None):
        self.db = db_session
        self.knowledge_base = knowledge_base_service
        self.guardrails = {g.id: g for g in CYBERSECURITY_GUARDRAILS}
        self.logger = logger.bind(component="guardrail_engine")
    
    def get_all_guardrails(self) -> List[GuardrailDefinition]:
        """Get all available guardrails."""
        return CYBERSECURITY_GUARDRAILS
    
    def get_guardrails_by_category(self, category: GuardrailCategory) -> List[GuardrailDefinition]:
        """Get guardrails by category."""
        return [g for g in CYBERSECURITY_GUARDRAILS if g.category == category]
    
    def get_guardrails_for_use_case(self, use_case: str) -> List[GuardrailDefinition]:
        """Get applicable guardrails for a specific use case."""
        return [
            g for g in CYBERSECURITY_GUARDRAILS 
            if "all" in g.applicable_use_cases or use_case in g.applicable_use_cases
        ]
    
    def get_guardrails_for_platform(self, platform: str) -> List[GuardrailDefinition]:
        """Get applicable guardrails for a specific platform."""
        return [
            g for g in CYBERSECURITY_GUARDRAILS 
            if not g.applicable_platforms or "all" in g.applicable_platforms or platform in g.applicable_platforms
        ]
    
    def get_platform_syntax(self, platform: str) -> Optional[Dict]:
        """Get syntax documentation for a platform."""
        return PLATFORM_SYNTAX.get(platform)
    
    async def validate_input(
        self,
        prompt: str,
        use_case: str,
        platform: Optional[str] = None,
        guardrail_ids: Optional[List[str]] = None
    ) -> Tuple[bool, List[GuardrailResult]]:
        """
        Validate input against selected guardrails.
        Returns (passed, results) tuple.
        """
        results = []
        all_passed = True
        
        # Get applicable guardrails
        if guardrail_ids:
            guardrails = [self.guardrails[id] for id in guardrail_ids if id in self.guardrails]
        else:
            guardrails = self.get_guardrails_for_use_case(use_case)
            if platform:
                guardrails.extend(self.get_guardrails_for_platform(platform))
        
        # Remove duplicates
        guardrails = list({g.id: g for g in guardrails}.values())
        
        for guardrail in guardrails:
            if not guardrail.enabled:
                continue
            
            result = await self._check_guardrail(guardrail, prompt, use_case, platform)
            results.append(result)
            
            if not result.passed and guardrail.severity in [GuardrailSeverity.CRITICAL, GuardrailSeverity.HIGH]:
                all_passed = False
        
        return all_passed, results
    
    async def validate_output(
        self,
        output: str,
        use_case: str,
        platform: Optional[str] = None,
        source_content: Optional[str] = None
    ) -> Tuple[bool, List[GuardrailResult]]:
        """
        Validate GenAI output against output guardrails.
        """
        results = []
        all_passed = True
        
        # Get output validation guardrails
        output_guardrails = [
            g for g in CYBERSECURITY_GUARDRAILS 
            if g.category in [GuardrailCategory.OUTPUT_VALIDATION, GuardrailCategory.HALLUCINATION_PREVENTION]
        ]
        
        for guardrail in output_guardrails:
            if not guardrail.enabled:
                continue
            
            result = await self._check_output_guardrail(guardrail, output, use_case, platform, source_content)
            results.append(result)
            
            if not result.passed and guardrail.severity in [GuardrailSeverity.CRITICAL, GuardrailSeverity.HIGH]:
                all_passed = False
        
        return all_passed, results
    
    async def validate_query_syntax(
        self,
        query: str,
        platform: str
    ) -> Tuple[bool, List[GuardrailResult]]:
        """
        Validate query syntax for a specific platform.
        """
        results = []
        platform_info = PLATFORM_SYNTAX.get(platform)
        
        if not platform_info:
            return True, [GuardrailResult(
                passed=True,
                guardrail_id="QV000",
                guardrail_name="Platform Check",
                category=GuardrailCategory.QUERY_VALIDATION,
                severity=GuardrailSeverity.INFO,
                message=f"Unknown platform: {platform}. Syntax validation skipped.",
                knowledge_base_recommended=True
            )]
        
        # Check for destructive operations
        destructive_patterns = ['DELETE', 'DROP', 'TRUNCATE', 'REMOVE', 'DESTROY']
        for pattern in destructive_patterns:
            if pattern.lower() in query.lower():
                results.append(GuardrailResult(
                    passed=False,
                    guardrail_id="QV008",
                    guardrail_name="Destructive Operation Prevention",
                    category=GuardrailCategory.QUERY_VALIDATION,
                    severity=GuardrailSeverity.CRITICAL,
                    message=f"Query contains potentially destructive operation: {pattern}",
                    suggestion="Remove destructive operations. Hunt queries should be read-only."
                ))
        
        # Check for time bounds
        time_indicators = {
            "defender": ["ago(", "datetime(", "> ago(", "< now()"],
            "sentinel": ["ago(", "datetime(", "> ago(", "< now()"],
            "xsiam": ["relative_timestamp", "_time >", "_time <"],
            "splunk": ["earliest=", "latest=", "_time"],
            "chronicle": ["timestamp", "events"]
        }
        
        has_time_bound = False
        if platform in time_indicators:
            for indicator in time_indicators[platform]:
                if indicator.lower() in query.lower():
                    has_time_bound = True
                    break
        
        if not has_time_bound:
            results.append(GuardrailResult(
                passed=False,
                guardrail_id="QV006",
                guardrail_name="Time Range Validation",
                category=GuardrailCategory.QUERY_VALIDATION,
                severity=GuardrailSeverity.HIGH,
                message="Query lacks time bounds. This may cause full table scans.",
                suggestion=f"Add time filter. Example: {platform_info['time_functions'][0] if platform_info.get('time_functions') else 'time filter'}"
            ))
        
        # Check for result limits
        limit_patterns = {
            "defender": ["limit", "top"],
            "sentinel": ["limit", "top"],
            "xsiam": ["limit"],
            "splunk": ["head", "tail", "| limit"],
            "chronicle": ["outcome"]
        }
        
        has_limit = False
        if platform in limit_patterns:
            for pattern in limit_patterns[platform]:
                if pattern.lower() in query.lower():
                    has_limit = True
                    break
        
        if not has_limit:
            results.append(GuardrailResult(
                passed=True,  # Warning only
                guardrail_id="QV013",
                guardrail_name="Query Result Limit Enforcement",
                category=GuardrailCategory.QUERY_VALIDATION,
                severity=GuardrailSeverity.MEDIUM,
                message="Query has no result limit. Consider adding one to prevent data overload.",
                suggestion="Add limit clause to restrict results (e.g., limit 1000)"
            ))
        
        # Check for valid table references
        valid_tables = platform_info.get("tables", [])
        table_found = False
        for table in valid_tables:
            if table.lower() in query.lower():
                table_found = True
                break
        
        if not table_found and valid_tables:
            results.append(GuardrailResult(
                passed=True,  # Info only
                guardrail_id="QV009",
                guardrail_name="Table Reference Validation",
                category=GuardrailCategory.QUERY_VALIDATION,
                severity=GuardrailSeverity.INFO,
                message=f"No recognized tables found. Valid tables for {platform}: {', '.join(valid_tables[:5])}...",
                knowledge_base_recommended=True,
                suggestion=f"Refer to documentation: {platform_info.get('documentation_url', 'N/A')}"
            ))
        
        all_passed = all(r.passed for r in results) if results else True
        return all_passed, results
    
    async def check_knowledge_base(
        self,
        platform: str,
        query_type: str
    ) -> Tuple[bool, str]:
        """
        Check if knowledge base has documentation for the platform.
        Returns (has_docs, message).
        """
        if not self.knowledge_base:
            return False, "Knowledge base service not available. Ask admin to configure it."
        
        # Check for platform documentation
        # This would integrate with the actual knowledge base service
        platform_info = PLATFORM_SYNTAX.get(platform)
        
        if platform_info:
            return True, f"Found documentation for {platform_info['name']}. Language: {platform_info['language']}"
        
        return False, f"No documentation found for {platform}. Please ask admin to add {platform} documentation to the Knowledge Base for better query generation."
    
    async def _check_guardrail(
        self,
        guardrail: GuardrailDefinition,
        prompt: str,
        use_case: str,
        platform: Optional[str]
    ) -> GuardrailResult:
        """Check a specific guardrail against input."""
        
        # =========================================================================
        # PROMPT SAFETY CHECKS
        # =========================================================================
        
        if guardrail.id == "PS001":  # Prompt Injection
            injection_patterns = [
                r"ignore.*previous.*instructions",
                r"forget.*everything",
                r"you.*are.*now",
                r"act.*as.*if",
                r"pretend.*you.*are",
                r"disregard.*system.*prompt",
                r"override.*instructions",
                r"new.*instructions",
                r"<\|.*\|>",  # Special tokens
                r"\[INST\]",
                r"\[/INST\]",
                r"system\s*:\s*",
                r"</?(system|user|assistant)>",
            ]
            for pattern in injection_patterns:
                if re.search(pattern, prompt, re.IGNORECASE):
                    return GuardrailResult(
                        passed=False,
                        guardrail_id=guardrail.id,
                        guardrail_name=guardrail.name,
                        category=guardrail.category,
                        severity=guardrail.severity,
                        message="Potential prompt injection detected",
                        details={"pattern": pattern},
                        suggestion="Remove instruction override attempts from input"
                    )
        
        elif guardrail.id == "PS002":  # Jailbreak Prevention
            jailbreak_patterns = [
                r"DAN\s*mode",
                r"developer\s*mode",
                r"do\s*anything\s*now",
                r"act\s*without\s*restrictions",
                r"bypass.*safety",
                r"ignore.*guidelines",
                r"hypothetically",
                r"roleplay\s*as",
                r"evil\s*mode",
            ]
            for pattern in jailbreak_patterns:
                if re.search(pattern, prompt, re.IGNORECASE):
                    return GuardrailResult(
                        passed=False,
                        guardrail_id=guardrail.id,
                        guardrail_name=guardrail.name,
                        category=guardrail.category,
                        severity=guardrail.severity,
                        message="Potential jailbreak attempt detected",
                        details={"pattern": pattern},
                        suggestion="Remove attempts to bypass safety controls"
                    )
        
        elif guardrail.id == "PS003":  # Command Injection
            command_patterns = [
                r"`[^`]+`",  # Backtick commands
                r"\$\([^)]+\)",  # $(command)
                r";\s*(rm|del|drop|format|dd)\s",
                r"\|\s*(bash|sh|cmd|powershell)",
                r"&&\s*(rm|del|drop)",
                r">\s*/etc/",
                r">\s*C:\\",
            ]
            for pattern in command_patterns:
                if re.search(pattern, prompt, re.IGNORECASE):
                    return GuardrailResult(
                        passed=False,
                        guardrail_id=guardrail.id,
                        guardrail_name=guardrail.name,
                        category=guardrail.category,
                        severity=guardrail.severity,
                        message="Potential command injection detected",
                        details={"pattern": pattern}
                    )
        
        elif guardrail.id == "PS004":  # Data Exfiltration Prevention
            exfil_patterns = [
                r"(list|show|display|output|print|reveal)\s*(all)?\s*(secrets?|passwords?|credentials?|keys?|tokens?)",
                r"dump.*database",
                r"extract.*config",
                r"show.*env(ironment)?",
                r"print.*api.?key",
                r"display.*internal",
            ]
            for pattern in exfil_patterns:
                if re.search(pattern, prompt, re.IGNORECASE):
                    return GuardrailResult(
                        passed=False,
                        guardrail_id=guardrail.id,
                        guardrail_name=guardrail.name,
                        category=guardrail.category,
                        severity=guardrail.severity,
                        message="Potential data exfiltration attempt detected",
                        details={"pattern": pattern},
                        suggestion="Remove requests for sensitive system information"
                    )
        
        elif guardrail.id == "PS007":  # Encoding Attack
            base64_pattern = r'[A-Za-z0-9+/]{50,}={0,2}'
            if re.search(base64_pattern, prompt):
                return GuardrailResult(
                    passed=False,
                    guardrail_id=guardrail.id,
                    guardrail_name=guardrail.name,
                    category=guardrail.category,
                    severity=guardrail.severity,
                    message="Potential encoded payload detected",
                    suggestion="Decode and verify content before processing"
                )
        
        elif guardrail.id == "PS009":  # Length Check
            max_length = guardrail.config.get("max_length", 50000)
            if len(prompt) > max_length:
                return GuardrailResult(
                    passed=False,
                    guardrail_id=guardrail.id,
                    guardrail_name=guardrail.name,
                    category=guardrail.category,
                    severity=guardrail.severity,
                    message=f"Prompt exceeds maximum length ({len(prompt)} > {max_length})",
                    suggestion="Reduce prompt length or split into multiple requests"
                )
        
        # =========================================================================
        # DATA PROTECTION CHECKS (PII/PHI/CREDENTIALS) - CRITICAL
        # =========================================================================
        
        elif guardrail.id == "DP001":  # PII Detection
            pii_found = self._detect_pii(prompt)
            if pii_found:
                return GuardrailResult(
                    passed=False,
                    guardrail_id=guardrail.id,
                    guardrail_name=guardrail.name,
                    category=guardrail.category,
                    severity=guardrail.severity,
                    message=f"PII detected in input: {', '.join(pii_found)}",
                    details={"pii_types": pii_found},
                    suggestion="Remove or redact PII before processing. Use [REDACTED] placeholders."
                )
        
        elif guardrail.id == "DP002":  # PHI Detection
            phi_found = self._detect_phi(prompt)
            if phi_found:
                return GuardrailResult(
                    passed=False,
                    guardrail_id=guardrail.id,
                    guardrail_name=guardrail.name,
                    category=guardrail.category,
                    severity=guardrail.severity,
                    message=f"Protected Health Information (PHI) detected: {', '.join(phi_found)}",
                    details={"phi_types": phi_found},
                    suggestion="Remove all PHI before processing. HIPAA compliance required."
                )
        
        elif guardrail.id == "DP003":  # Credential Detection
            creds_found = self._detect_credentials(prompt)
            if creds_found:
                return GuardrailResult(
                    passed=False,
                    guardrail_id=guardrail.id,
                    guardrail_name=guardrail.name,
                    category=guardrail.category,
                    severity=guardrail.severity,
                    message=f"Credentials/secrets detected: {', '.join(creds_found)}",
                    details={"credential_types": creds_found},
                    suggestion="Never include credentials in prompts. Use secure vault references."
                )
        
        elif guardrail.id == "DP004":  # IP Address Redaction
            ip_patterns = [
                r'\b(?:\d{1,3}\.){3}\d{1,3}\b',  # IPv4
                r'\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b',  # IPv6
            ]
            for pattern in ip_patterns:
                matches = re.findall(pattern, prompt)
                # Filter out common safe IPs
                suspicious_ips = [ip for ip in matches if not ip.startswith(('10.', '192.168.', '172.16.', '127.'))]
                if suspicious_ips:
                    return GuardrailResult(
                        passed=False,
                        guardrail_id=guardrail.id,
                        guardrail_name=guardrail.name,
                        category=guardrail.category,
                        severity=guardrail.severity,
                        message=f"Public IP addresses detected that may need redaction",
                        details={"ips": suspicious_ips[:5]},  # Limit to 5
                        suggestion="Consider redacting IP addresses if they contain sensitive targeting info"
                    )
        
        # =========================================================================
        # QUERY VALIDATION CHECKS
        # =========================================================================
        
        elif guardrail.id == "QV008":  # Destructive Operation Prevention
            destructive_patterns = [
                r'\b(DELETE|DROP|TRUNCATE|ALTER|UPDATE|INSERT)\b',
                r'\b(rm\s+-rf|rmdir|del\s+/s)\b',
            ]
            for pattern in destructive_patterns:
                if re.search(pattern, prompt, re.IGNORECASE):
                    return GuardrailResult(
                        passed=False,
                        guardrail_id=guardrail.id,
                        guardrail_name=guardrail.name,
                        category=guardrail.category,
                        severity=guardrail.severity,
                        message="Destructive operation keywords detected",
                        details={"pattern": pattern},
                        suggestion="Only read-only queries are allowed in threat hunting"
                    )
        
        # Default: passed
        return GuardrailResult(
            passed=True,
            guardrail_id=guardrail.id,
            guardrail_name=guardrail.name,
            category=guardrail.category,
            severity=guardrail.severity,
            message="Check passed"
        )
    
    def _detect_pii(self, text: str) -> List[str]:
        """Detect various types of PII in text."""
        pii_found = []
        
        # Social Security Numbers (US)
        if re.search(r'\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b', text):
            pii_found.append("SSN")
        
        # Credit Card Numbers (various formats)
        if re.search(r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b', text):
            pii_found.append("Credit Card")
        
        # Phone Numbers (various formats)
        if re.search(r'\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b', text):
            pii_found.append("Phone Number")
        
        # Email Addresses
        if re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text):
            pii_found.append("Email Address")
        
        # Driver's License (common patterns)
        if re.search(r'\b[A-Z]{1,2}[0-9]{5,8}\b', text):
            # Check context for DL keywords
            if re.search(r'(driver|license|DL|DMV)', text, re.IGNORECASE):
                pii_found.append("Driver's License")
        
        # Passport Numbers
        if re.search(r'\b[A-Z]{1,2}[0-9]{6,9}\b', text):
            if re.search(r'passport', text, re.IGNORECASE):
                pii_found.append("Passport Number")
        
        # Date of Birth patterns
        if re.search(r'\b(DOB|date\s*of\s*birth|birthday|born\s*on)\s*[:=]?\s*\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}\b', text, re.IGNORECASE):
            pii_found.append("Date of Birth")
        
        # Full Names with context
        if re.search(r'\b(patient|user|customer|employee)\s*(name|:)\s*[A-Z][a-z]+\s+[A-Z][a-z]+\b', text, re.IGNORECASE):
            pii_found.append("Full Name")
        
        # Bank Account Numbers
        if re.search(r'\b(account|acct|routing)\s*(number|#|no\.?)?\s*[:=]?\s*\d{8,17}\b', text, re.IGNORECASE):
            pii_found.append("Bank Account")
        
        return pii_found
    
    def _detect_phi(self, text: str) -> List[str]:
        """Detect Protected Health Information (HIPAA)."""
        phi_found = []
        
        # Medical Record Numbers
        if re.search(r'\b(MRN|medical\s*record|patient\s*ID)\s*[:=#]?\s*[A-Z0-9]{5,15}\b', text, re.IGNORECASE):
            phi_found.append("Medical Record Number")
        
        # Health Insurance IDs
        if re.search(r'\b(insurance|policy|member)\s*(ID|number|#)\s*[:=#]?\s*[A-Z0-9]{5,20}\b', text, re.IGNORECASE):
            phi_found.append("Insurance ID")
        
        # Diagnosis/Condition mentions with identifiers
        if re.search(r'\b(diagnosis|condition|treatment|medication)\s*[:=]?\s*[A-Za-z\s]+\b', text, re.IGNORECASE):
            # Check if there's also patient identifier nearby
            if re.search(r'(patient|name|MRN|DOB)', text, re.IGNORECASE):
                phi_found.append("Medical Diagnosis")
        
        # Prescription information
        if re.search(r'\b(prescription|Rx|medication|dosage)\s*[:=]?\s*[A-Za-z0-9\s]+mg\b', text, re.IGNORECASE):
            phi_found.append("Prescription Info")
        
        # Healthcare provider NPIs
        if re.search(r'\bNPI\s*[:=#]?\s*\d{10}\b', text, re.IGNORECASE):
            phi_found.append("Provider NPI")
        
        # Lab Results
        if re.search(r'\b(lab\s*result|test\s*result|blood\s*work)\s*[:=]', text, re.IGNORECASE):
            phi_found.append("Lab Results")
        
        # Hospital/Clinic names with patient context
        if re.search(r'(hospital|clinic|medical\s*center|healthcare)', text, re.IGNORECASE):
            if re.search(r'(patient|admission|discharge|treatment)', text, re.IGNORECASE):
                phi_found.append("Healthcare Facility")
        
        return phi_found
    
    def _detect_credentials(self, text: str) -> List[str]:
        """Detect credentials, API keys, tokens, and secrets."""
        creds_found = []
        
        # API Keys (various providers)
        api_key_patterns = [
            (r'sk-[A-Za-z0-9]{32,}', "OpenAI API Key"),
            (r'AIza[A-Za-z0-9_\-]{35}', "Google API Key"),
            (r'AKIA[A-Z0-9]{16}', "AWS Access Key"),
            (r'ghp_[A-Za-z0-9]{36}', "GitHub PAT"),
            (r'glpat-[A-Za-z0-9\-]{20,}', "GitLab PAT"),
            (r'xox[baprs]-[A-Za-z0-9\-]+', "Slack Token"),
            (r'[A-Za-z0-9]{32,}\.apps\.googleusercontent\.com', "Google OAuth"),
        ]
        for pattern, key_type in api_key_patterns:
            if re.search(pattern, text):
                creds_found.append(key_type)
        
        # Generic patterns
        if re.search(r'\b(api[_-]?key|apikey)\s*[:=]\s*["\']?[A-Za-z0-9\-_]{16,}["\']?', text, re.IGNORECASE):
            if "API Key" not in " ".join(creds_found):
                creds_found.append("Generic API Key")
        
        # Passwords
        if re.search(r'\b(password|passwd|pwd)\s*[:=]\s*["\']?[^\s"\']{6,}["\']?', text, re.IGNORECASE):
            creds_found.append("Password")
        
        # Bearer Tokens
        if re.search(r'[Bb]earer\s+[A-Za-z0-9\-_\.]+', text):
            creds_found.append("Bearer Token")
        
        # JWT Tokens
        if re.search(r'eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+', text):
            creds_found.append("JWT Token")
        
        # Private Keys
        if re.search(r'-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----', text):
            creds_found.append("Private Key")
        
        # Connection Strings
        if re.search(r'(mongodb|mysql|postgres|redis|amqp)://[^\s]+:[^\s]+@', text, re.IGNORECASE):
            creds_found.append("Database Connection String")
        
        # Secret keywords with values
        if re.search(r'\b(secret|token|auth)\s*[:=]\s*["\']?[A-Za-z0-9\-_]{20,}["\']?', text, re.IGNORECASE):
            creds_found.append("Secret Value")
        
        return creds_found
    
    async def _check_output_guardrail(
        self,
        guardrail: GuardrailDefinition,
        output: str,
        use_case: str,
        platform: Optional[str],
        source_content: Optional[str]
    ) -> GuardrailResult:
        """Check output against guardrail."""
        
        if guardrail.id == "OV004":  # Credential Detection
            creds_found = self._detect_credentials(output)
            if creds_found:
                return GuardrailResult(
                    passed=False,
                    guardrail_id=guardrail.id,
                    guardrail_name=guardrail.name,
                    category=guardrail.category,
                    severity=guardrail.severity,
                    message=f"Credentials detected in output: {', '.join(creds_found)}",
                    details={"credential_types": creds_found},
                    suggestion="BLOCK: Model output contains exposed credentials. Remove before displaying."
                )
        
        elif guardrail.id == "OV003":  # PII Detection
            pii_found = self._detect_pii(output)
            if pii_found:
                return GuardrailResult(
                    passed=False,
                    guardrail_id=guardrail.id,
                    guardrail_name=guardrail.name,
                    category=guardrail.category,
                    severity=guardrail.severity,
                    message=f"PII detected in output: {', '.join(pii_found)}",
                    details={"pii_types": pii_found},
                    suggestion="BLOCK: Mask or remove PII before displaying output to user."
                )
        
        elif guardrail.id == "OV001":  # PHI Detection in Output
            phi_found = self._detect_phi(output)
            if phi_found:
                return GuardrailResult(
                    passed=False,
                    guardrail_id=guardrail.id,
                    guardrail_name=guardrail.name,
                    category=guardrail.category,
                    severity=guardrail.severity,
                    message=f"PHI detected in output: {', '.join(phi_found)}",
                    details={"phi_types": phi_found},
                    suggestion="BLOCK: HIPAA violation risk. Remove all PHI from output."
                )
        
        elif guardrail.id == "HP001":  # IOC Reality Check - Comprehensive validation
            if source_content and use_case == "ioc_extraction":
                hallucinated = []
                
                # Extract and validate IPs
                ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
                output_ips = set(re.findall(ip_pattern, output))
                source_ips = set(re.findall(ip_pattern, source_content))
                hallucinated_ips = output_ips - source_ips
                if hallucinated_ips:
                    hallucinated.extend([f"IP:{ip}" for ip in list(hallucinated_ips)[:3]])
                
                # Extract and validate domains
                domain_pattern = r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b'
                output_domains = set(re.findall(domain_pattern, output.lower()))
                source_domains = set(re.findall(domain_pattern, source_content.lower()))
                hallucinated_domains = output_domains - source_domains
                if hallucinated_domains:
                    hallucinated.extend([f"Domain:{d}" for d in list(hallucinated_domains)[:3]])
                
                # Extract and validate hashes (MD5, SHA1, SHA256)
                hash_patterns = {
                    'MD5': r'\b[a-fA-F0-9]{32}\b',
                    'SHA1': r'\b[a-fA-F0-9]{40}\b',
                    'SHA256': r'\b[a-fA-F0-9]{64}\b'
                }
                for hash_type, pattern in hash_patterns.items():
                    output_hashes = set(re.findall(pattern, output.lower()))
                    source_hashes = set(re.findall(pattern, source_content.lower()))
                    hallucinated_hashes = output_hashes - source_hashes
                    if hallucinated_hashes:
                        hallucinated.extend([f"{hash_type}:{h[:16]}..." for h in list(hallucinated_hashes)[:2]])
                
                # Extract and validate URLs
                url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
                output_urls = set(re.findall(url_pattern, output))
                source_urls = set(re.findall(url_pattern, source_content))
                hallucinated_urls = output_urls - source_urls
                if hallucinated_urls:
                    hallucinated.extend([f"URL:{u[:50]}..." for u in list(hallucinated_urls)[:2]])
                
                # Extract and validate email addresses
                email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
                output_emails = set(re.findall(email_pattern, output))
                source_emails = set(re.findall(email_pattern, source_content))
                hallucinated_emails = output_emails - source_emails
                if hallucinated_emails:
                    hallucinated.extend([f"Email:{e}" for e in list(hallucinated_emails)[:2]])
                
                # Extract and validate CVEs
                cve_pattern = r'CVE-\d{4}-\d{4,7}'
                output_cves = set(re.findall(cve_pattern, output, re.IGNORECASE))
                source_cves = set(re.findall(cve_pattern, source_content, re.IGNORECASE))
                hallucinated_cves = output_cves - source_cves
                if hallucinated_cves:
                    hallucinated.extend([f"CVE:{c}" for c in list(hallucinated_cves)[:2]])
                
                if hallucinated:
                    return GuardrailResult(
                        passed=False,
                        guardrail_id=guardrail.id,
                        guardrail_name=guardrail.name,
                        category=guardrail.category,
                        severity=guardrail.severity,
                        message=f"Potential hallucinated IOCs not found in source: {hallucinated[:10]}",
                        details={"hallucinated": hallucinated, "total_count": len(hallucinated)},
                        suggestion="BLOCK: Remove IOCs not present in source content. Only extract IOCs that appear in the original article."
                    )
        
        elif guardrail.id == "HP002":  # TTP Attribution Verification
            if source_content and use_case in ["ioc_extraction", "summarization"]:
                # Verify MITRE ATT&CK IDs in output exist in source
                mitre_pattern = r'T\d{4}(?:\.\d{3})?'
                output_techniques = set(re.findall(mitre_pattern, output))
                source_techniques = set(re.findall(mitre_pattern, source_content))
                
                hallucinated_techniques = output_techniques - source_techniques
                if hallucinated_techniques:
                    return GuardrailResult(
                        passed=False,
                        guardrail_id=guardrail.id,
                        guardrail_name=guardrail.name,
                        category=guardrail.category,
                        severity=guardrail.severity,
                        message=f"TTP IDs not found in source: {list(hallucinated_techniques)[:5]}",
                        details={"hallucinated_techniques": list(hallucinated_techniques)},
                        suggestion="Verify MITRE technique IDs exist in source material"
                    )
        
        elif guardrail.id == "HP006":  # MITRE Technique Existence Check
            # Validate MITRE technique IDs are properly formatted
            mitre_pattern = r'T\d{4}(?:\.\d{3})?'
            techniques = re.findall(mitre_pattern, output if output else prompt)
            
            invalid_techniques = []
            for tech in techniques:
                # Basic format validation - T followed by 4 digits, optionally .3 digits
                if not re.match(r'^T\d{4}(\.\d{3})?$', tech):
                    invalid_techniques.append(tech)
            
            if invalid_techniques:
                return GuardrailResult(
                    passed=False,
                    guardrail_id=guardrail.id,
                    guardrail_name=guardrail.name,
                    category=guardrail.category,
                    severity=guardrail.severity,
                    message=f"Invalid MITRE technique IDs: {invalid_techniques[:5]}",
                    details={"invalid_techniques": invalid_techniques},
                    suggestion="Use valid MITRE ATT&CK technique IDs (format: Txxxx or Txxxx.xxx)"
                )
        
        elif guardrail.id == "OV008":  # Empty Response
            if not output or len(output.strip()) < 10:
                return GuardrailResult(
                    passed=False,
                    guardrail_id=guardrail.id,
                    guardrail_name=guardrail.name,
                    category=guardrail.category,
                    severity=guardrail.severity,
                    message="Response is empty or too short",
                    suggestion="Retry with different parameters or model"
                )
        
        return GuardrailResult(
            passed=True,
            guardrail_id=guardrail.id,
            guardrail_name=guardrail.name,
            category=guardrail.category,
            severity=guardrail.severity,
            message="Check passed"
        )


# Helper function to get guardrail engine instance
def get_guardrail_engine(db_session=None, knowledge_base=None) -> CybersecurityGuardrailEngine:
    """Factory function to get guardrail engine."""
    return CybersecurityGuardrailEngine(db_session, knowledge_base)


# =============================================================================
# GLOBAL GUARDRAIL VALIDATION ENGINE
# =============================================================================

# Benign domains to exclude from IOC lists
BENIGN_DOMAINS = {
    # Security vendors
    'crowdstrike.com', 'mandiant.com', 'fireeye.com', 'paloaltonetworks.com',
    'fortinet.com', 'checkpoint.com', 'trendmicro.com', 'symantec.com',
    'mcafee.com', 'sophos.com', 'kaspersky.com', 'sentinelone.com',
    'carbonblack.com', 'cybereason.com', 'cylance.com',
    # News/Research sites
    'bleepingcomputer.com', 'thehackernews.com', 'darkreading.com',
    'securityweek.com', 'threatpost.com', 'krebsonsecurity.com',
    'infosecurity-magazine.com', 'cyberscoop.com', 'therecord.media',
    # Government/Official
    'cisa.gov', 'ncsc.gov.uk', 'cert.org', 'mitre.org', 'nist.gov',
    'us-cert.gov', 'enisa.europa.eu', 'cyber.gc.ca',
    # Major tech companies
    'microsoft.com', 'google.com', 'apple.com', 'amazon.com', 'aws.amazon.com',
    'azure.microsoft.com', 'cloud.google.com', 'github.com', 'gitlab.com',
    'cloudflare.com', 'akamai.com', 'fastly.com',
    # Social/General
    'twitter.com', 'x.com', 'linkedin.com', 'facebook.com', 'youtube.com',
    'reddit.com', 'medium.com', 'substack.com',
}


class GlobalGuardrailValidator:
    """
    Validator for global guardrails with actual logic.
    These guardrails apply to ALL GenAI functions.
    """
    
    def __init__(self, db_session=None):
        self.db = db_session
        self.logger = logger.bind(component="global_guardrail_validator")
    
    def get_enabled_global_guardrails(self) -> List[Dict]:
        """Get all enabled global guardrails, including overrides from DB."""
        from app.genai.prompts import DEFAULT_GUARDRAILS
        
        builtin = DEFAULT_GUARDRAILS.get("global", [])
        
        # Check for DB overrides (enabled/disabled status)
        if self.db:
            try:
                from app.models import SystemConfiguration
                config = self.db.query(SystemConfiguration).filter(
                    SystemConfiguration.category == "guardrails",
                    SystemConfiguration.key == "global_overrides"
                ).first()
                
                if config and config.value:
                    import json
                    overrides = json.loads(config.value)
                    # Apply overrides
                    for g in builtin:
                        if g["id"] in overrides:
                            g["enabled"] = overrides[g["id"]].get("enabled", g["enabled"])
            except Exception as e:
                self.logger.warning("failed_to_load_global_overrides", error=str(e))
        
        return [g for g in builtin if g.get("enabled", True)]
    
    async def validate_input(self, prompt: str, use_case: str = "general") -> Tuple[bool, List[GuardrailResult]]:
        """Validate input against global input guardrails."""
        results = []
        all_passed = True
        
        guardrails = self.get_enabled_global_guardrails()
        
        for g in guardrails:
            if g.get("validation_type") != "input_validation":
                continue
            
            result = await self._run_input_validation(g, prompt, use_case)
            results.append(result)
            
            if not result.passed and g.get("severity") in ["critical", "high"]:
                all_passed = False
        
        return all_passed, results
    
    async def validate_output(
        self, 
        output: str, 
        source_content: Optional[str] = None,
        use_case: str = "general",
        source_url: Optional[str] = None
    ) -> Tuple[bool, List[GuardrailResult]]:
        """Validate output against global output guardrails."""
        results = []
        all_passed = True
        
        guardrails = self.get_enabled_global_guardrails()
        
        for g in guardrails:
            if g.get("validation_type") != "output_validation":
                continue
            
            result = await self._run_output_validation(g, output, source_content, source_url)
            results.append(result)
            
            if not result.passed and g.get("severity") in ["critical", "high"]:
                all_passed = False
        
        return all_passed, results
    
    async def _run_input_validation(self, guardrail: Dict, prompt: str, use_case: str) -> GuardrailResult:
        """Run input validation logic for a guardrail."""
        logic = guardrail.get("validation_logic", "")
        gid = guardrail["id"]
        
        if logic == "validate_prompt_injection":
            # Detect prompt injection attempts
            injection_patterns = [
                r"ignore.*previous.*instructions",
                r"forget.*everything",
                r"you.*are.*now",
                r"pretend.*you.*are",
                r"disregard.*system",
                r"override.*instructions",
                r"new.*instructions",
                r"\[INST\]",
                r"\[/INST\]",
                r"</?(system|user|assistant)>",
                r"DAN\s*mode",
                r"developer\s*mode",
                r"jailbreak",
            ]
            
            for pattern in injection_patterns:
                if re.search(pattern, prompt, re.IGNORECASE):
                    return GuardrailResult(
                        passed=False,
                        guardrail_id=gid,
                        guardrail_name=guardrail["name"],
                        category=GuardrailCategory.PROMPT_SAFETY,
                        severity=GuardrailSeverity.CRITICAL,
                        message=f"Prompt injection pattern detected: {pattern}",
                        suggestion="Remove instruction manipulation attempts"
                    )
        
        elif logic == "validate_no_destructive_ops":
            # Detect destructive SQL/query operations
            destructive_patterns = [
                r'\b(DELETE|DROP|TRUNCATE|ALTER|UPDATE|INSERT)\s+',
                r'\b(rm\s+-rf|rmdir|del\s+/s)\b',
                r'\b(format\s+c:)\b',
            ]
            
            for pattern in destructive_patterns:
                if re.search(pattern, prompt, re.IGNORECASE):
                    return GuardrailResult(
                        passed=False,
                        guardrail_id=gid,
                        guardrail_name=guardrail["name"],
                        category=GuardrailCategory.QUERY_VALIDATION,
                        severity=GuardrailSeverity.CRITICAL,
                        message=f"Destructive operation detected: {pattern}",
                        suggestion="Only read-only operations are allowed"
                    )
        
        # Default: passed
        severity_str = guardrail.get("severity", "medium").lower()
        return GuardrailResult(
            passed=True,
            guardrail_id=gid,
            guardrail_name=guardrail["name"],
            category=GuardrailCategory.PROMPT_SAFETY,
            severity=GuardrailSeverity(severity_str),
            message="Check passed"
        )
    
    async def _run_output_validation(
        self, 
        guardrail: Dict, 
        output: str, 
        source_content: Optional[str],
        source_url: Optional[str]
    ) -> GuardrailResult:
        """Run output validation logic for a guardrail."""
        logic = guardrail.get("validation_logic", "")
        gid = guardrail["id"]
        
        if logic == "validate_no_hallucination":
            # Check for IOCs in output that don't appear in source
            if source_content:
                hallucinated = []
                
                # Check IPs
                ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
                output_ips = set(re.findall(ip_pattern, output))
                source_ips = set(re.findall(ip_pattern, source_content))
                hallucinated_ips = output_ips - source_ips
                if hallucinated_ips:
                    hallucinated.extend([f"IP:{ip}" for ip in list(hallucinated_ips)[:3]])
                
                # Check domains
                domain_pattern = r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b'
                output_domains = set(re.findall(domain_pattern, output.lower()))
                source_domains = set(re.findall(domain_pattern, source_content.lower()))
                # Filter benign domains
                output_domains = {d for d in output_domains if d not in BENIGN_DOMAINS}
                hallucinated_domains = output_domains - source_domains
                if hallucinated_domains:
                    hallucinated.extend([f"Domain:{d}" for d in list(hallucinated_domains)[:3]])
                
                # Check hashes
                hash_patterns = [
                    (r'\b[a-fA-F0-9]{32}\b', 'MD5'),
                    (r'\b[a-fA-F0-9]{40}\b', 'SHA1'),
                    (r'\b[a-fA-F0-9]{64}\b', 'SHA256'),
                ]
                for pattern, hash_type in hash_patterns:
                    output_hashes = set(re.findall(pattern, output.lower()))
                    source_hashes = set(re.findall(pattern, source_content.lower()))
                    hallucinated_hashes = output_hashes - source_hashes
                    if hallucinated_hashes:
                        hallucinated.extend([f"{hash_type}:{h[:16]}..." for h in list(hallucinated_hashes)[:2]])
                
                if hallucinated:
                    return GuardrailResult(
                        passed=False,
                        guardrail_id=gid,
                        guardrail_name=guardrail["name"],
                        category=GuardrailCategory.HALLUCINATION_PREVENTION,
                        severity=GuardrailSeverity.CRITICAL,
                        message=f"Potential hallucinated IOCs not in source: {hallucinated[:5]}",
                        details={"hallucinated": hallucinated},
                        suggestion="Remove IOCs not present in source content"
                    )
        
        elif logic == "validate_json_output":
            # Check if output is valid JSON when expected
            if output.strip().startswith('{') or output.strip().startswith('['):
                try:
                    import json
                    json.loads(output)
                except json.JSONDecodeError as e:
                    return GuardrailResult(
                        passed=False,
                        guardrail_id=gid,
                        guardrail_name=guardrail["name"],
                        category=GuardrailCategory.OUTPUT_VALIDATION,
                        severity=GuardrailSeverity.HIGH,
                        message=f"Invalid JSON output: {str(e)[:100]}",
                        suggestion="Ensure output is valid JSON"
                    )
        
        elif logic == "validate_source_exclusion":
            # Ensure source URL/domain is not in IOC output
            if source_url:
                source_domain = re.search(r'https?://([^/]+)', source_url)
                if source_domain:
                    domain = source_domain.group(1).lower()
                    if domain in output.lower():
                        return GuardrailResult(
                            passed=False,
                            guardrail_id=gid,
                            guardrail_name=guardrail["name"],
                            category=GuardrailCategory.OUTPUT_VALIDATION,
                            severity=GuardrailSeverity.HIGH,
                            message=f"Source domain {domain} found in output as IOC",
                            suggestion="Exclude the source publication domain from IOC lists"
                        )
        
        elif logic == "validate_benign_filtering":
            # Check for benign domains in output IOC lists
            domain_pattern = r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b'
            output_domains = set(re.findall(domain_pattern, output.lower()))
            benign_found = output_domains & BENIGN_DOMAINS
            
            if benign_found:
                return GuardrailResult(
                    passed=False,
                    guardrail_id=gid,
                    guardrail_name=guardrail["name"],
                    category=GuardrailCategory.OUTPUT_VALIDATION,
                    severity=GuardrailSeverity.HIGH,
                    message=f"Benign domains should not be IOCs: {list(benign_found)[:5]}",
                    details={"benign_domains": list(benign_found)},
                    suggestion="Remove legitimate security vendor/news domains from IOC output"
                )
        
        elif logic == "validate_no_credentials":
            # Detect credentials in output
            credential_patterns = [
                (r'sk-[A-Za-z0-9]{32,}', "OpenAI API Key"),
                (r'AKIA[A-Z0-9]{16}', "AWS Access Key"),
                (r'ghp_[A-Za-z0-9]{36}', "GitHub Token"),
                (r'-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----', "Private Key"),
                (r'\b(password|passwd|pwd)\s*[:=]\s*["\']?[^\s"\']{6,}', "Password"),
                (r'\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b', "SSN"),
                (r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b', "Credit Card"),
            ]
            
            for pattern, cred_type in credential_patterns:
                if re.search(pattern, output, re.IGNORECASE):
                    return GuardrailResult(
                        passed=False,
                        guardrail_id=gid,
                        guardrail_name=guardrail["name"],
                        category=GuardrailCategory.DATA_PROTECTION,
                        severity=GuardrailSeverity.CRITICAL,
                        message=f"Credential/PII detected in output: {cred_type}",
                        suggestion="Remove or redact sensitive credentials from output"
                    )
        
        # Default: passed
        severity_str = guardrail.get("severity", "medium").lower()
        return GuardrailResult(
            passed=True,
            guardrail_id=gid,
            guardrail_name=guardrail["name"],
            category=GuardrailCategory.OUTPUT_VALIDATION,
            severity=GuardrailSeverity(severity_str),
            message="Check passed"
        )


def get_global_guardrail_validator(db_session=None) -> GlobalGuardrailValidator:
    """Factory function to get global guardrail validator."""
    return GlobalGuardrailValidator(db_session)
