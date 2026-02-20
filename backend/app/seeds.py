"""Database seed script for initial data."""
import json
import os
from app.core.database import SessionLocal
from app.models import FeedSource, WatchListKeyword, ConnectorConfig, User, UserRole, Skill, Guardrail, SystemConfiguration
from app.auth.security import hash_password
from datetime import datetime

# Get the project root directory (parent of backend/)
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_SCRIPT_DIR)
_PROJECT_ROOT = os.path.dirname(_BACKEND_DIR)
_CONFIG_FILE = os.path.join(_PROJECT_ROOT, "config", "seed-sources.json")


def run_migrations(db):
    """Run any pending schema migrations."""
    from sqlalchemy import text
    from app.core.config import settings
    
    # Only run PostgreSQL-specific migrations if using PostgreSQL
    if settings.DATABASE_URL.startswith("postgresql"):
        try:
            db.execute(text("ALTER TYPE articlestatus ADD VALUE IF NOT EXISTS 'HUNT_GENERATED' AFTER 'NEED_TO_HUNT'"))
            db.commit()
            print("✓ Added HUNT_GENERATED to articlestatus enum")
        except Exception:
            # Already exists or error - ignore
            db.rollback()
    else:
        # SQLite doesn't need enum migrations
        print("✓ Using SQLite - no enum migrations needed")


def seed_database():
    """Initialize database with seed data."""
    db = SessionLocal()
    
    # Run migrations first
    run_migrations(db)
    
    try:
        # Create default admin user with password from environment variable
        # SECURITY: Admin password MUST be set via ADMIN_PASSWORD environment variable
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin_password = os.environ.get("ADMIN_PASSWORD")
            if not admin_password:
                print("⚠ ADMIN_PASSWORD not set - skipping admin user creation")
                print("  Set ADMIN_PASSWORD environment variable to create admin user")
            else:
                # Validate password strength
                if len(admin_password) < 8:
                    print("⚠ ADMIN_PASSWORD must be at least 8 characters - skipping admin user creation")
                else:
                    admin = User(
                        email=os.environ.get("ADMIN_EMAIL", "admin@localhost"),
                        username="admin",
                        hashed_password=hash_password(admin_password),
                        role=UserRole.ADMIN,
                        is_active=True,
                        full_name="Administrator"
                    )
                    db.add(admin)
                    print("✓ Created admin user (password from ADMIN_PASSWORD env var)")

        # Create tarun admin user
        tarun = db.query(User).filter(User.username == "tarun").first()
        if not tarun:
            tarun_password = os.environ.get("ADMIN_PASSWORD", "")
            if tarun_password and len(tarun_password) >= 8:
                tarun = User(
                    email="tarun@joti.local",
                    username="tarun",
                    hashed_password=hash_password(tarun_password),
                    role=UserRole.ADMIN,
                    is_active=True,
                    full_name="Tarun (Admin)"
                )
                db.add(tarun)
                print("✓ Created tarun admin user")

        # Load feed sources - try multiple paths
        sources_data = []
        config_paths = [
            _CONFIG_FILE,
            "config/seed-sources.json",
            "../config/seed-sources.json",
            os.path.join(os.getcwd(), "config", "seed-sources.json")
        ]
        for config_path in config_paths:
            if os.path.exists(config_path):
                with open(config_path, "r") as f:
                    sources_data = json.load(f)
                print(f"✓ Loaded sources from {config_path}")
                break
        else:
            print("⚠ No seed-sources.json found, skipping feed sources")
        
        for source_data in sources_data:
            existing = db.query(FeedSource).filter(FeedSource.url == source_data["url"]).first()
            if not existing:
                source = FeedSource(
                    name=source_data["name"],
                    description=source_data.get("description"),
                    url=source_data["url"],
                    feed_type=source_data.get("feed_type", "rss"),
                    is_active=True,
                    next_fetch=datetime.utcnow()
                )
                db.add(source)
                print(f"✓ Added feed source: {source_data['name']}")
        
        # Add default watchlist keywords (50 categorized cybersecurity keywords)
        default_keywords = [
            # Malware
            ("ransomware", "Malware"),
            ("trojan", "Malware"),
            ("botnet", "Malware"),
            ("wiper malware", "Malware"),
            ("infostealer", "Malware"),
            ("rootkit", "Malware"),
            ("RAT remote access trojan", "Malware"),
            # Threat Actor
            ("state-sponsored", "Threat Actor"),
            ("Lazarus Group", "Threat Actor"),
            ("Fancy Bear", "Threat Actor"),
            ("Cozy Bear", "Threat Actor"),
            ("Volt Typhoon", "Threat Actor"),
            ("Scattered Spider", "Threat Actor"),
            # APT Group
            ("advanced persistent threat", "APT Group"),
            ("APT28", "APT Group"),
            ("APT29", "APT Group"),
            ("APT41", "APT Group"),
            ("Kimsuky", "APT Group"),
            # Vulnerability
            ("critical vulnerability", "Vulnerability"),
            ("remote code execution", "Vulnerability"),
            ("privilege escalation", "Vulnerability"),
            ("authentication bypass", "Vulnerability"),
            ("server-side request forgery", "Vulnerability"),
            # CVE
            ("zero-day", "CVE"),
            ("CVE-2024", "CVE"),
            ("CVE-2025", "CVE"),
            ("CVE-2026", "CVE"),
            # Exploit
            ("exploitation", "Exploit"),
            ("proof of concept exploit", "Exploit"),
            ("exploit kit", "Exploit"),
            # Attack Type
            ("SQL injection", "Attack Type"),
            ("cross-site scripting", "Attack Type"),
            ("denial of service", "Attack Type"),
            ("credential theft", "Attack Type"),
            ("brute force attack", "Attack Type"),
            # TTP
            ("lateral movement", "TTP"),
            ("command and control", "TTP"),
            ("data exfiltration", "TTP"),
            ("defense evasion", "TTP"),
            ("persistence mechanism", "TTP"),
            # Ransomware
            ("LockBit", "Ransomware"),
            ("BlackCat ALPHV", "Ransomware"),
            ("Cl0p", "Ransomware"),
            ("double extortion", "Ransomware"),
            # Supply Chain
            ("supply chain attack", "Supply Chain"),
            ("software supply chain compromise", "Supply Chain"),
            # Phishing
            ("phishing", "Phishing"),
            ("spear phishing", "Phishing"),
            ("business email compromise", "Phishing"),
            # C2 Infrastructure
            ("backdoor", "C2 Infrastructure"),
            ("Cobalt Strike", "C2 Infrastructure"),
            # Data Exfiltration
            ("data breach", "Data Exfiltration"),
        ]

        for keyword, category in default_keywords:
            existing = db.query(WatchListKeyword).filter(
                WatchListKeyword.keyword == keyword
            ).first()
            if not existing:
                wl = WatchListKeyword(keyword=keyword, category=category, is_active=True)
                db.add(wl)
                print(f"✓ Added watchlist keyword: {keyword} [{category}]")
        
        # Add default connectors (stubs)
        connectors = [
            {"name": "xsiam", "type": "xsiam", "config": {}},
            {"name": "defender", "type": "defender", "config": {}},
            {"name": "wiz", "type": "wiz", "config": {}},
            {"name": "splunk", "type": "splunk", "config": {}},
            {"name": "slack", "type": "slack", "config": {}},
            {"name": "email", "type": "email", "config": {}},
        ]
        
        for connector_data in connectors:
            existing = db.query(ConnectorConfig).filter(
                ConnectorConfig.name == connector_data["name"]
            ).first()
            if not existing:
                connector = ConnectorConfig(
                    name=connector_data["name"],
                    connector_type=connector_data["type"],
                    config=connector_data["config"],
                    is_active=False  # Require manual configuration
                )
                db.add(connector)
                print(f"✓ Added connector config: {connector_data['name']}")
        
        # Seed expert-level GenAI skills
        _seed_skills(db)

        # Seed guardrails
        _seed_guardrails(db)

        # Seed GenAI function configurations
        _seed_genai_functions(db)

        db.commit()
        print("\n✅ Database seeding complete!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Seeding failed: {e}")
        raise
    finally:
        db.close()


def _seed_skills(db):
    """Seed expert-level GenAI skills for CTI platform."""
    skills = [
        {
            "name": "Executive Threat Briefing Writer",
            "description": "Writes 2-4 paragraph narrative prose for C-suite executives. Covers business impact, threat attribution, and recommended actions.",
            "category": "persona",
            "instruction": (
                "You are a senior CISO advisor writing threat briefings for C-suite executives. "
                "Write in flowing narrative prose — never use bullet points or numbered lists. "
                "Structure as 2-4 paragraphs covering: (1) What happened and who is responsible (threat actor attribution with confidence level), "
                "(2) Business impact — financial exposure, operational disruption, regulatory implications, "
                "(3) Recommended strategic actions prioritized by risk reduction. "
                "Reference specific CVE IDs and threat actor names when available. "
                "Use professional, clear language accessible to non-technical leaders. "
                "Maximum 250 words. End with a risk rating: CRITICAL, HIGH, MEDIUM, or LOW."
            ),
        },
        {
            "name": "Technical IOC Analyst",
            "description": "Extracts 12+ indicator types with confidence scores, defanging, and context per indicator. Structured JSON output.",
            "category": "domain_expertise",
            "instruction": (
                "You are a Principal SOC Analyst specializing in indicator extraction. "
                "Extract ALL indicators of compromise from the provided content. "
                "Indicator types to identify: IPv4, IPv6, Domain, URL, MD5 hash, SHA1 hash, SHA256 hash, "
                "Email address, CVE ID, File path, Registry key, Mutex name, User agent string, YARA rule names, "
                "SSL certificate hashes, CIDR ranges, ASN numbers. "
                "For each indicator provide: type, value (defanged — replace dots in IPs/domains with [.]), "
                "confidence (HIGH/MEDIUM/LOW), context (surrounding sentence or phrase explaining relevance), "
                "and any associated threat actor or campaign. "
                "Output as valid JSON array: [{\"type\": \"...\", \"value\": \"...\", \"confidence\": \"...\", \"context\": \"...\"}]. "
                "If no indicators found, return empty array []. Never fabricate indicators."
            ),
        },
        {
            "name": "MITRE ATT&CK Mapper",
            "description": "Maps observed behaviors to MITRE ATT&CK v15 techniques using T####.### format with tactic context.",
            "category": "domain_expertise",
            "instruction": (
                "You are a MITRE ATT&CK framework expert. Map every observable adversary behavior described in the content "
                "to specific MITRE ATT&CK Enterprise techniques. "
                "Use the T####.### format (e.g., T1566.001 for Spearphishing Attachment). "
                "For each mapping provide: technique_id (T-code), technique_name, tactic (the ATT&CK tactic column), "
                "sub_technique (if applicable), evidence (the text passage supporting this mapping), "
                "and confidence (HIGH/MEDIUM/LOW). "
                "Reference ATT&CK v15 (latest as of Feb 2026). "
                "Group mappings by tactic phase: Initial Access → Execution → Persistence → Privilege Escalation → "
                "Defense Evasion → Credential Access → Discovery → Lateral Movement → Collection → "
                "Command and Control → Exfiltration → Impact. "
                "Only map techniques with clear textual evidence — do not infer techniques without supporting text."
            ),
        },
        {
            "name": "Threat Actor Profiler",
            "description": "Identifies threat actors, aliases, attribution confidence, known TTPs, target sectors, and geopolitical context.",
            "category": "persona",
            "instruction": (
                "You are a CTI strategist specializing in threat actor attribution and profiling. "
                "Identify all threat actors mentioned in or implied by the content. "
                "For each actor provide: primary_name, known_aliases (list), "
                "attribution_confidence (CONFIRMED/LIKELY/POSSIBLE/UNATTRIBUTED), "
                "suspected_origin (nation-state or region), target_sectors (list of industries), "
                "target_regions (list of geographies), known_ttps (MITRE ATT&CK technique IDs), "
                "associated_malware (list), active_since (year if known), "
                "geopolitical_context (1-2 sentences on motivation). "
                "Cross-reference with MITRE ATT&CK Groups database naming conventions. "
                "If no specific actor attribution is possible, state 'UNATTRIBUTED' with reasoning."
            ),
        },
        {
            "name": "Detection Engineer",
            "description": "Generates detection queries for SIEM/XDR platforms: KQL, SPL, XQL, YARA, and Sigma rules.",
            "category": "domain_expertise",
            "instruction": (
                "You are a Senior Detection Engineer. Generate detection queries for the threats described in the content. "
                "Produce queries for these platforms:\n"
                "1. KQL (Microsoft Defender / Sentinel) — use DeviceProcessEvents, DeviceNetworkEvents, DeviceFileEvents tables\n"
                "2. SPL (Splunk) — use index=* with relevant sourcetypes\n"
                "3. XQL (Palo Alto XSIAM) — use dataset = xdr_data with proper XQL syntax\n"
                "4. Sigma rules — use standard Sigma YAML format with logsource, detection, and condition fields\n"
                "5. YARA rules — for file-based detections when applicable\n"
                "For each query include: platform, data_source_requirements (which logs are needed), "
                "detection_logic (what it catches), false_positive_considerations, "
                "and severity (CRITICAL/HIGH/MEDIUM/LOW/INFO). "
                "Ensure all queries are syntactically valid for their target platform."
            ),
        },
        {
            "name": "Vulnerability Assessment Analyst",
            "description": "Provides CVSS context, exploit availability, affected products, patch status, and compensating controls.",
            "category": "domain_expertise",
            "instruction": (
                "You are a Vulnerability Management specialist. For each CVE or vulnerability mentioned in the content, provide: "
                "cve_id, cvss_score (base score if known), cvss_vector, severity, "
                "affected_products (vendor and version ranges), "
                "exploit_availability (NONE/POC/WEAPONIZED/IN_THE_WILD), "
                "patch_status (PATCHED/UNPATCHED/PARTIAL — with patch date if known), "
                "compensating_controls (list of mitigations if unpatched), "
                "epss_context (likelihood of exploitation based on EPSS if inferable), "
                "and prioritization_recommendation (IMMEDIATE/SCHEDULED/MONITOR). "
                "Reference NVD, CISA KEV catalog, and vendor advisories where applicable."
            ),
        },
        {
            "name": "Incident Response Advisor",
            "description": "Provides containment, eradication, recovery recommendations, evidence preservation, and timeline reconstruction.",
            "category": "persona",
            "instruction": (
                "You are an IR Team Lead advising on incident response. Based on the threat described, provide: "
                "1. IMMEDIATE CONTAINMENT — actions to stop the spread within the first hour "
                "(network isolation, account lockout, endpoint quarantine). "
                "2. EVIDENCE PRESERVATION — what to collect before remediation "
                "(memory dumps, disk images, log exports, packet captures). Chain of custody considerations. "
                "3. ERADICATION — steps to remove the threat (malware removal, credential rotation, "
                "persistence mechanism cleanup, backdoor hunting). "
                "4. RECOVERY — return to normal operations (system restoration, monitoring validation, "
                "phased reconnection). "
                "5. LESSONS LEARNED — key questions for post-incident review. "
                "6. TIMELINE — reconstruct the likely attack timeline based on available evidence. "
                "Prioritize actions by urgency. Reference NIST SP 800-61r3 incident handling guidelines."
            ),
        },
        {
            "name": "Compliance & Risk Analyst",
            "description": "Maps findings to NIST CSF, ISO 27001, SOC 2, PCI DSS. Identifies regulatory impact.",
            "category": "persona",
            "instruction": (
                "You are a GRC (Governance, Risk, Compliance) specialist. Map the security findings from the content to: "
                "1. NIST Cybersecurity Framework 2.0 — identify relevant Functions (Govern, Identify, Protect, Detect, Respond, Recover) "
                "and specific Categories/Subcategories. "
                "2. ISO 27001:2022 — map to relevant Annex A controls. "
                "3. SOC 2 Trust Service Criteria — identify applicable criteria (CC6, CC7, CC8). "
                "4. PCI DSS 4.0 — map to relevant requirements if payment data is involved. "
                "5. REGULATORY IMPACT — identify potential regulatory notifications required "
                "(GDPR 72-hour notification, SEC 4-day disclosure, state breach notification laws). "
                "6. RISK ASSESSMENT — provide likelihood, impact, and overall risk rating. "
                "Present in a structured format that can feed into a risk register."
            ),
        },
    ]

    for skill_data in skills:
        existing = db.query(Skill).filter(Skill.name == skill_data["name"]).first()
        if not existing:
            skill = Skill(
                name=skill_data["name"],
                description=skill_data["description"],
                category=skill_data["category"],
                instruction=skill_data["instruction"],
                is_active=True,
            )
            db.add(skill)
            print(f"✓ Added skill: {skill_data['name']}")
        else:
            # Update instruction if skill already exists (keeps skills current)
            existing.instruction = skill_data["instruction"]
            existing.description = skill_data["description"]
            print(f"↻ Updated skill: {skill_data['name']}")


def _seed_guardrails(db):
    """Seed global and function-specific guardrails."""
    # Platform guardrails (operational)
    guardrails = [
        {
            "name": "Anti-Prompt-Injection",
            "description": "Detects and blocks prompt injection patterns in user inputs before they reach the LLM.",
            "type": "input_validation",
            "config": {
                "scope": "global",
                "patterns": [
                    "ignore previous instructions",
                    "disregard all prior",
                    "you are now",
                    "act as if",
                    "system prompt",
                ],
                "action": "reject",
            },
        },
        {
            "name": "Data Grounding",
            "description": "Ensures outputs reference only content from the provided article. Flags fabricated IOCs or claims.",
            "type": "output_validation",
            "config": {
                "scope": "global",
                "checks": ["no_fabricated_iocs", "source_attribution"],
                "action": "log",
            },
        },
        {
            "name": "PII Protection",
            "description": "Redacts SSN, credit card numbers, phone numbers, and other PII from LLM outputs.",
            "type": "output_validation",
            "config": {
                "scope": "global",
                "patterns": ["ssn", "credit_card", "phone_number", "email_address"],
                "action": "redact",
            },
        },
        {
            "name": "Output Format Enforcement",
            "description": "Ensures JSON outputs are valid JSON and summaries stay within word limits.",
            "type": "output_validation",
            "config": {
                "scope": "global",
                "checks": ["valid_json", "word_limit"],
                "max_words": 500,
                "action": "retry",
            },
        },
        {
            "name": "Token Budget",
            "description": "Enforces maximum token usage per request and per day per user.",
            "type": "rate_limit",
            "config": {
                "scope": "global",
                "max_tokens_per_request": 4096,
                "max_tokens_per_day": 100000,
                "action": "reject",
            },
        },
        {
            "name": "Content Safety",
            "description": "Blocks generation of malicious code, exploit instructions, or harmful content.",
            "type": "output_validation",
            "config": {
                "scope": "global",
                "checks": ["no_malicious_code", "no_exploit_instructions"],
                "action": "reject",
            },
        },
        {
            "name": "Executive Summary Format",
            "description": "Enforces narrative prose (no bullets), 2-4 paragraphs, max 250 words for executive summaries.",
            "type": "output_validation",
            "config": {
                "scope": "executive_summary",
                "checks": ["no_bullet_points", "paragraph_count", "word_limit"],
                "min_paragraphs": 2,
                "max_paragraphs": 4,
                "max_words": 250,
                "action": "retry",
            },
        },
        {
            "name": "Technical Summary Format",
            "description": "Ensures technical summaries include MITRE ATT&CK IDs and reference attack chain.",
            "type": "output_validation",
            "config": {
                "scope": "technical_summary",
                "checks": ["contains_mitre_ids", "attack_chain_reference"],
                "min_words": 200,
                "max_words": 400,
                "action": "retry",
            },
        },
        {
            "name": "IOC Extraction Validation",
            "description": "Validates JSON structure and IOC formats (IP regex, hash length, CVE format) for extracted IOCs.",
            "type": "output_validation",
            "config": {
                "scope": "ioc_extraction",
                "checks": ["valid_json", "ioc_format_validation", "defanging_check"],
                "action": "retry",
            },
        },
        {
            "name": "TTP Mapping Validation",
            "description": "Validates MITRE technique ID format (T####.### pattern) in TTP mapping outputs.",
            "type": "output_validation",
            "config": {
                "scope": "ttp_mapping",
                "checks": ["technique_id_format", "known_technique_catalog"],
                "action": "retry",
            },
        },
        {
            "name": "Hunt Query Syntax",
            "description": "Validates query syntax for target SIEM/XDR platform (KQL, XQL, SPL).",
            "type": "output_validation",
            "config": {
                "scope": "hunt_query",
                "checks": ["kql_syntax", "xql_syntax", "spl_syntax"],
                "action": "log",
            },
        },
    ]

    for gr_data in guardrails:
        existing = db.query(Guardrail).filter(Guardrail.name == gr_data["name"]).first()
        if not existing:
            guardrail = Guardrail(
                name=gr_data["name"],
                description=gr_data["description"],
                type=gr_data["type"],
                config=gr_data["config"],
                is_active=True,
            )
            db.add(guardrail)
            print(f"✓ Added guardrail: {gr_data['name']}")
        else:
            existing.config = gr_data["config"]
            existing.description = gr_data["description"]
            print(f"↻ Updated guardrail: {gr_data['name']}")

    # Seed from attack catalog (51 security attack guardrails)
    try:
        from app.guardrails.genai_attack_catalog import get_default_guardrail_seeds
        catalog_seeds = get_default_guardrail_seeds()
        for seed in catalog_seeds:
            existing = db.query(Guardrail).filter(Guardrail.name == seed["name"]).first()
            if not existing:
                guardrail = Guardrail(
                    name=seed["name"],
                    description=seed["description"],
                    type=seed["type"],
                    config=seed["config"],
                    is_active=True,
                )
                db.add(guardrail)
                print(f"✓ Added catalog guardrail: {seed['name']}")
    except ImportError:
        print("⚠ Attack catalog not available, skipping catalog guardrails")


def _seed_genai_functions(db):
    """Seed GenAI function configurations into GenAIFunctionConfig table."""
    from app.models import GenAIFunctionConfig
    functions = [
        {
            "function_name": "article_summarization",
            "display_name": "Article Summarization",
            "description": "Generates executive and technical summaries for threat intelligence articles. Extracts key findings, affected systems, and recommended actions.",
        },
        {
            "function_name": "intel_extraction",
            "display_name": "Intel Extraction",
            "description": "Extracts IOCs (IPs, domains, hashes, CVEs), MITRE ATT&CK TTPs, threat actor names, and malware families from article content using deep NLP analysis.",
        },
        {
            "function_name": "hunt_query_generation",
            "display_name": "Hunt Query Generation",
            "description": "Generates platform-specific threat hunting queries (XSIAM XQL, Defender KQL, Splunk SPL, Wiz GraphQL) from extracted IOCs and TTPs.",
        },
        {
            "function_name": "hunt_title",
            "display_name": "Hunt Title Generation",
            "description": "Auto-generates concise, descriptive titles for hunt queries based on the threat context and targeted indicators.",
        },
        {
            "function_name": "threat_landscape",
            "display_name": "Threat Landscape Analysis",
            "description": "Generates comprehensive AI threat landscape briefs covering current threat posture, active TTPs, top threat actors, and SOC recommendations based on aggregated intelligence.",
        },
        {
            "function_name": "campaign_brief",
            "display_name": "Campaign Brief",
            "description": "Analyzes correlated articles and shared IOCs to generate a threat campaign brief attributing activity to known actors with hunting priorities.",
        },
        {
            "function_name": "correlation_analysis",
            "display_name": "Correlation Analysis",
            "description": "Finds correlations across threat intelligence: shared IOCs between articles, clusters of related indicators, and cross-article TTP patterns.",
        },
        {
            "function_name": "threat_actor_enrichment",
            "display_name": "Threat Actor Enrichment",
            "description": "Enriches threat actor profiles with GenAI-generated intelligence: aliases, origin country, motivation, target sectors, TTPs, and associated tools from article context.",
        },
        {
            "function_name": "ioc_context",
            "display_name": "IOC Context & Explanation",
            "description": "Provides contextual explanation for individual IOCs — what they are, why they're significant, associated threat actors, and suggested defensive actions.",
        },
        {
            "function_name": "intel_ingestion",
            "display_name": "Intel Ingestion Analysis",
            "description": "Analyses manually uploaded documents and URLs, extracts IOCs, maps TTPs, and populates the intelligence database.",
        },
    ]

    for fn in functions:
        existing = db.query(GenAIFunctionConfig).filter(
            GenAIFunctionConfig.function_name == fn["function_name"]
        ).first()
        if not existing:
            db.add(GenAIFunctionConfig(
                function_name=fn["function_name"],
                display_name=fn["display_name"],
                description=fn["description"],
            ))
            print(f"✓ Added GenAI function: {fn['display_name']}")
        else:
            # Update description/display_name but don't overwrite model assignments
            existing.display_name = fn["display_name"]
            existing.description = fn["description"]


if __name__ == "__main__":
    seed_database()
