"""Intelligence Extractor — GenAI-powered IOC/TTP extraction with regex fallback."""

import re
import json
from typing import Dict, List, Optional
from app.core.logging import logger


# ── Regex patterns for IOC extraction (fallback) ─────────────────────────────

IOC_PATTERNS = {
    "ipv4": re.compile(
        r"\b(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}"
        r"(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\b"
    ),
    "ipv6": re.compile(
        r"\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b"
        r"|\b(?:[0-9a-fA-F]{1,4}:){1,7}:\b"
        r"|\b::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}\b"
    ),
    "domain": re.compile(
        r"\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+"
        r"(?:com|net|org|io|info|biz|co|us|uk|de|ru|cn|xyz|top|"
        r"online|site|tech|club|space|pro|app|dev|gov|edu|mil)\b",
        re.IGNORECASE,
    ),
    "url": re.compile(
        r"https?://[^\s<>\"'\)\]}{,]+",
        re.IGNORECASE,
    ),
    "md5": re.compile(r"\b[0-9a-fA-F]{32}\b"),
    "sha1": re.compile(r"\b[0-9a-fA-F]{40}\b"),
    "sha256": re.compile(r"\b[0-9a-fA-F]{64}\b"),
    "email": re.compile(
        r"\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b"
    ),
    "cve": re.compile(r"\bCVE-\d{4}-\d{4,}\b", re.IGNORECASE),
    "registry_key": re.compile(
        r"\b(?:HKEY_(?:LOCAL_MACHINE|CURRENT_USER|CLASSES_ROOT|USERS|CURRENT_CONFIG)"
        r"|HKLM|HKCU|HKCR|HKU|HKCC)\\[^\s\"'<>]+",
        re.IGNORECASE,
    ),
    "file_path_windows": re.compile(
        r"[A-Z]:\\(?:[^\s\\/:*?\"<>|]+\\)*[^\s\\/:*?\"<>|]+",
    ),
    "file_path_unix": re.compile(
        r"(?:/(?:etc|usr|var|tmp|opt|home|root|proc|sys|dev|bin|sbin|lib|mnt|media)"
        r"(?:/[^\s\"'<>|;]+)+)",
    ),
}

# IPs that are almost always noise
_NOISE_IPS = {
    "0.0.0.0", "127.0.0.1", "255.255.255.255",
    "10.0.0.0", "172.16.0.0", "192.168.0.0",
    "192.168.1.1", "192.168.0.1", "8.8.8.8", "8.8.4.4",
    "1.1.1.1", "1.0.0.1",
}

# Domains that are almost always noise
_NOISE_DOMAINS = {
    "example.com", "example.org", "example.net",
    "localhost", "localhost.localdomain",
    "google.com", "www.google.com",
    "microsoft.com", "www.microsoft.com",
    "github.com", "www.github.com",
    "twitter.com", "facebook.com",
    "schema.org", "w3.org", "www.w3.org",
    "creativecommons.org",
}

# Hash-like strings that are not real hashes
_NOISE_HASHES = {
    "0" * 32, "0" * 40, "0" * 64,
    "d41d8cd98f00b204e9800998ecf8427e",  # MD5 of empty string
    "da39a3ee5e6b4b0d3255bfef95601890afd80709",  # SHA1 of empty
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",  # SHA256 of empty
}


# ── MITRE ATT&CK keyword map (lightweight, no external dependency) ────────────

_TTP_KEYWORD_MAP: Dict[str, Dict] = {
    "T1566": {"name": "Phishing", "keywords": ["phishing", "spear-phishing", "spearphishing", "phish"]},
    "T1566.001": {"name": "Spearphishing Attachment", "keywords": ["spearphishing attachment", "phishing attachment", "malicious attachment"]},
    "T1566.002": {"name": "Spearphishing Link", "keywords": ["spearphishing link", "phishing link", "malicious link"]},
    "T1059": {"name": "Command and Scripting Interpreter", "keywords": ["command and scripting", "script execution"]},
    "T1059.001": {"name": "PowerShell", "keywords": ["powershell", "invoke-expression", "iex ", "invoke-webrequest"]},
    "T1059.003": {"name": "Windows Command Shell", "keywords": ["cmd.exe", "command shell", "cmd /c"]},
    "T1059.005": {"name": "Visual Basic", "keywords": ["vbscript", "visual basic", "vba macro"]},
    "T1059.007": {"name": "JavaScript", "keywords": ["wscript", "cscript", "jscript"]},
    "T1204": {"name": "User Execution", "keywords": ["user execution", "user clicked", "opened attachment"]},
    "T1204.002": {"name": "Malicious File", "keywords": ["malicious file", "malicious document", "weaponized document"]},
    "T1053": {"name": "Scheduled Task/Job", "keywords": ["scheduled task", "cron job", "schtasks", "at command"]},
    "T1547.001": {"name": "Registry Run Keys / Startup Folder", "keywords": ["run key", "startup folder", "autorun", "registry persistence"]},
    "T1543.003": {"name": "Windows Service", "keywords": ["malicious service", "service persistence", "sc create"]},
    "T1078": {"name": "Valid Accounts", "keywords": ["valid accounts", "compromised credentials", "stolen credentials", "credential theft"]},
    "T1110": {"name": "Brute Force", "keywords": ["brute force", "password spray", "credential stuffing"]},
    "T1003": {"name": "OS Credential Dumping", "keywords": ["credential dumping", "lsass", "mimikatz", "hashdump", "sam database"]},
    "T1003.001": {"name": "LSASS Memory", "keywords": ["lsass memory", "lsass.exe", "procdump lsass"]},
    "T1055": {"name": "Process Injection", "keywords": ["process injection", "dll injection", "process hollowing", "code injection"]},
    "T1055.001": {"name": "Dynamic-link Library Injection", "keywords": ["dll injection", "loadlibrary", "dll side-loading"]},
    "T1027": {"name": "Obfuscated Files or Information", "keywords": ["obfuscated", "obfuscation", "encoded payload", "base64 encoded"]},
    "T1140": {"name": "Deobfuscate/Decode Files", "keywords": ["deobfuscate", "decode files", "certutil -decode"]},
    "T1071": {"name": "Application Layer Protocol", "keywords": ["c2 communication", "command and control", "c&c", "beacon"]},
    "T1071.001": {"name": "Web Protocols", "keywords": ["http c2", "https c2", "web-based c2"]},
    "T1105": {"name": "Ingress Tool Transfer", "keywords": ["tool transfer", "download payload", "stage payload", "wget", "curl download"]},
    "T1041": {"name": "Exfiltration Over C2 Channel", "keywords": ["exfiltration", "data exfiltration", "exfil over c2"]},
    "T1048": {"name": "Exfiltration Over Alternative Protocol", "keywords": ["dns exfiltration", "exfiltration over dns", "data exfil"]},
    "T1486": {"name": "Data Encrypted for Impact", "keywords": ["ransomware", "encrypt files", "data encrypted for impact", "file encryption"]},
    "T1490": {"name": "Inhibit System Recovery", "keywords": ["delete shadow copies", "vssadmin delete", "bcdedit", "inhibit recovery"]},
    "T1562.001": {"name": "Disable or Modify Tools", "keywords": ["disable antivirus", "disable defender", "tamper protection", "disable edr"]},
    "T1070.004": {"name": "File Deletion", "keywords": ["delete logs", "clear logs", "file deletion", "remove evidence"]},
    "T1021.001": {"name": "Remote Desktop Protocol", "keywords": ["rdp", "remote desktop", "mstsc"]},
    "T1021.002": {"name": "SMB/Windows Admin Shares", "keywords": ["smb lateral", "admin share", "psexec", "wmic"]},
    "T1570": {"name": "Lateral Tool Transfer", "keywords": ["lateral movement", "lateral tool transfer", "move laterally"]},
    "T1190": {"name": "Exploit Public-Facing Application", "keywords": ["exploit public-facing", "web exploit", "rce vulnerability", "remote code execution"]},
    "T1133": {"name": "External Remote Services", "keywords": ["vpn compromise", "external remote service", "citrix exploit"]},
    "T1195": {"name": "Supply Chain Compromise", "keywords": ["supply chain", "supply-chain", "trojanized update"]},
    "T1036": {"name": "Masquerading", "keywords": ["masquerading", "renamed binary", "fake process name"]},
    "T1218": {"name": "System Binary Proxy Execution", "keywords": ["lolbin", "living off the land", "mshta", "regsvr32", "rundll32"]},
    "T1047": {"name": "Windows Management Instrumentation", "keywords": ["wmi", "wmic", "windows management instrumentation"]},
    "T1543": {"name": "Create or Modify System Process", "keywords": ["create service", "modify service", "systemd service"]},
    "T1098": {"name": "Account Manipulation", "keywords": ["account manipulation", "add admin", "add user to group"]},
    "T1136": {"name": "Create Account", "keywords": ["create account", "net user /add", "new user account"]},
    "T1564": {"name": "Hide Artifacts", "keywords": ["hidden files", "hide artifacts", "attrib +h"]},
    "T1518": {"name": "Software Discovery", "keywords": ["software discovery", "installed software", "program enumeration"]},
    "T1082": {"name": "System Information Discovery", "keywords": ["system information", "systeminfo", "hostname", "os version"]},
    "T1083": {"name": "File and Directory Discovery", "keywords": ["file discovery", "directory listing", "dir /s"]},
    "T1057": {"name": "Process Discovery", "keywords": ["process discovery", "tasklist", "process enumeration"]},
    "T1018": {"name": "Remote System Discovery", "keywords": ["remote system discovery", "network scan", "nmap", "port scan"]},
    "T1560": {"name": "Archive Collected Data", "keywords": ["archive data", "compress data", "rar ", "7zip", "zip archive"]},
    "T1114": {"name": "Email Collection", "keywords": ["email collection", "mailbox access", "email harvesting"]},
    "T1497": {"name": "Virtualization/Sandbox Evasion", "keywords": ["sandbox evasion", "vm detection", "anti-sandbox", "anti-analysis"]},
    "T1588.002": {"name": "Obtain Capabilities: Tool", "keywords": ["cobalt strike", "metasploit", "empire framework", "covenant"]},
    "T1573": {"name": "Encrypted Channel", "keywords": ["encrypted channel", "encrypted c2", "ssl c2", "tls tunnel"]},
    "T1568": {"name": "Dynamic Resolution", "keywords": ["dynamic dns", "dga", "domain generation algorithm", "fast flux"]},
    "T1090": {"name": "Proxy", "keywords": ["proxy", "tor network", "socks proxy", "reverse proxy"]},
    "T1572": {"name": "Protocol Tunneling", "keywords": ["protocol tunneling", "dns tunneling", "icmp tunneling", "ssh tunnel"]},
    "T1189": {"name": "Drive-by Compromise", "keywords": ["drive-by", "watering hole", "drive-by compromise", "browser exploit"]},
    "T1203": {"name": "Exploitation for Client Execution", "keywords": ["client-side exploit", "browser exploit", "document exploit"]},
    "T1068": {"name": "Exploitation for Privilege Escalation", "keywords": ["privilege escalation exploit", "local privilege escalation", "lpe"]},
    "T1548": {"name": "Abuse Elevation Control Mechanism", "keywords": ["uac bypass", "elevation control", "sudo exploit"]},
    "T1134": {"name": "Access Token Manipulation", "keywords": ["token manipulation", "token impersonation", "token theft"]},
    "T1574": {"name": "Hijack Execution Flow", "keywords": ["dll hijacking", "dll search order", "path interception"]},
    "T1071.004": {"name": "DNS", "keywords": ["dns c2", "dns beacon", "dns command and control"]},
    "T1102": {"name": "Web Service", "keywords": ["dead drop resolver", "web service c2", "pastebin c2", "telegram c2"]},
    "T1583": {"name": "Acquire Infrastructure", "keywords": ["attacker infrastructure", "bulletproof hosting", "actor infrastructure"]},
}


# ── Threat Actor keyword map ─────────────────────────────────────────────────

_THREAT_ACTOR_MAP: Dict[str, Dict] = {
    # Nation-state APT groups (Russia)
    "APT28": {"aliases": ["fancy bear", "sofacy", "pawn storm", "sednit", "apt 28"], "attribution": "Russia"},
    "APT29": {"aliases": ["cozy bear", "the dukes", "nobelium", "apt 29"], "attribution": "Russia"},
    "Sandworm": {"aliases": ["sandworm team", "voodoo bear", "telebots", "electrum"], "attribution": "Russia"},
    "Turla": {"aliases": ["venomous bear", "waterbug", "snake", "uroburos", "epic turla"], "attribution": "Russia"},
    # Nation-state APT groups (China)
    "APT41": {"aliases": ["double dragon", "barium", "wicked panda", "winnti", "apt 41"], "attribution": "China"},
    "APT40": {"aliases": ["leviathan", "temp.periscope", "kryptonite panda", "apt 40"], "attribution": "China"},
    "APT10": {"aliases": ["stone panda", "menupass", "cloud hopper", "apt 10"], "attribution": "China"},
    "Volt Typhoon": {"aliases": ["volt typhoon", "vanguard panda", "bronze silhouette"], "attribution": "China"},
    "Salt Typhoon": {"aliases": ["salt typhoon", "ghost emperor", "famousSparrow"], "attribution": "China"},
    # Nation-state APT groups (North Korea)
    "Lazarus Group": {"aliases": ["lazarus", "hidden cobra", "zinc", "apt38", "apt 38"], "attribution": "North Korea"},
    "Kimsuky": {"aliases": ["kimsuky", "thallium", "velvet chollima", "black banshee"], "attribution": "North Korea"},
    "APT37": {"aliases": ["reaper", "ricochet chollima", "group123", "apt 37"], "attribution": "North Korea"},
    # Nation-state APT groups (Iran)
    "APT33": {"aliases": ["elfin", "refined kitten", "magnallium", "apt 33"], "attribution": "Iran"},
    "APT34": {"aliases": ["oilrig", "helix kitten", "cobalt gypsy", "apt 34"], "attribution": "Iran"},
    "APT35": {"aliases": ["charming kitten", "phosphorus", "newscaster", "apt 35"], "attribution": "Iran"},
    # Financially motivated
    "FIN7": {"aliases": ["fin7", "carbanak", "navigator group", "sangria tempest"], "attribution": "Criminal"},
    "Scattered Spider": {"aliases": ["scattered spider", "oktapus", "unc3944", "starfraud"], "attribution": "Criminal"},
    "REvil": {"aliases": ["revil", "sodinokibi", "gold southfield"], "attribution": "Criminal"},
    "Conti": {"aliases": ["conti", "wizard spider", "gold ulrick"], "attribution": "Criminal"},
    "BlackCat": {"aliases": ["blackcat", "alphv", "noberus"], "attribution": "Criminal"},
    "LockBit": {"aliases": ["lockbit"], "attribution": "Criminal"},
}

# Build flat keyword → actor mapping for quick lookup
_THREAT_ACTOR_KEYWORDS: Dict[str, str] = {}
for actor_name, info in _THREAT_ACTOR_MAP.items():
    # Map both the canonical name and all aliases
    _THREAT_ACTOR_KEYWORDS[actor_name.lower()] = actor_name
    for alias in info["aliases"]:
        _THREAT_ACTOR_KEYWORDS[alias.lower()] = actor_name

# Also match generic APT patterns
_APT_PATTERN = re.compile(r"\b(APT[-\s]?\d+|TA[-\s]?\d+|FIN\d+|UNC\d+|DEV[-\s]?\d+|Group[-\s]?\d+)\b", re.IGNORECASE)


def _extract_threat_actors(content: str) -> List[Dict]:
    """Extract named threat actors from content."""
    content_lower = content.lower()
    actors: List[Dict] = []
    seen: set = set()

    # Check known actor keywords
    for keyword, canonical_name in _THREAT_ACTOR_KEYWORDS.items():
        if keyword in content_lower and canonical_name not in seen:
            seen.add(canonical_name)
            idx = content_lower.find(keyword)
            start = max(0, idx - 30)
            end = min(len(content), idx + len(keyword) + 30)
            evidence = content[start:end].strip().replace("\n", " ")
            info = _THREAT_ACTOR_MAP.get(canonical_name, {})
            actors.append({
                "value": canonical_name,
                "attribution": info.get("attribution", "Unknown"),
                "confidence": 80,
                "evidence": evidence,
            })

    # Check APT pattern (e.g., APT123, TA456)
    for match in _APT_PATTERN.finditer(content):
        value = match.group(0).upper().replace(" ", "").replace("-", "")
        # Normalize e.g. APT 28 → APT28
        normalized = re.sub(r"(\D)(\d)", r"\1\2", value)
        if normalized not in seen:
            seen.add(normalized)
            start = max(0, match.start() - 30)
            end = min(len(content), match.end() + 30)
            evidence = content[start:end].strip().replace("\n", " ")
            actors.append({
                "value": normalized,
                "attribution": "Unknown",
                "confidence": 70,
                "evidence": evidence,
            })

    return actors


# ── GenAI extraction prompt ──────────────────────────────────────────────────

_EXTRACTION_SYSTEM_PROMPT = """You are an expert threat intelligence analyst. Your task is to extract ALL Indicators of Compromise (IOCs) and MITRE ATT&CK Techniques, Tactics, and Procedures (TTPs) from the given text.

Extract the following IOC types:
- IPv4 and IPv6 addresses (type: "ip")
- Domain names (type: "domain")
- URLs (type: "url")
- File hashes: MD5, SHA1, SHA256 (type: "hash")
- Email addresses (type: "email")
- CVE identifiers (type: "cve")
- Windows registry keys (type: "registry_key")
- File paths — Windows and Unix (type: "file_path")

For each IOC, provide:
- value: the exact indicator string
- type: one of ip, domain, url, hash, email, cve, registry_key, file_path
- confidence: integer 1-100 (how confident you are this is a real IOC, not a benign reference)
- evidence: a short phrase from the text that references this IOC

For TTPs, identify MITRE ATT&CK techniques referenced or implied in the text:
- mitre_id: the technique ID (e.g. T1566.001)
- name: the technique name
- confidence: integer 1-100
- evidence: a short phrase from the text supporting this mapping

CRITICAL RULES:
1. ONLY extract indicators that are EXPLICITLY mentioned in the article text. NEVER fabricate, invent, or assume indicators that are not present. Zero hallucination tolerance.
2. DO NOT extract the article's source/publisher domain or any URLs belonging to the publication website. These are NOT indicators of compromise.
3. Skip example/documentation values, RFC IPs (10.x, 192.168.x, 172.16.x), localhost, well-known benign domains (google.com, microsoft.com, github.com, twitter.com, linkedin.com).
4. Defang indicators: if you see hxxp, [.], [dot], etc., reconstruct the real value.
5. For hashes, verify length: MD5=32, SHA1=40, SHA256=64 hex chars.
6. For TTPs, only use valid MITRE ATT&CK IDs from the Enterprise matrix (T#### or T####.### format).
7. If the text contains no IOCs or TTPs, return empty arrays — do NOT make up indicators to fill the response.

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{
  "iocs": [
    {"value": "...", "type": "...", "confidence": 90, "evidence": "..."}
  ],
  "ttps": [
    {"mitre_id": "T1566.001", "name": "Spearphishing Attachment", "confidence": 85, "evidence": "..."}
  ]
}"""


def _defang(text: str) -> str:
    """Reverse common defanging in threat intel reports."""
    text = text.replace("hxxp", "http")
    text = text.replace("hXXp", "http")
    text = text.replace("[.]", ".")
    text = text.replace("[dot]", ".")
    text = text.replace("[@]", "@")
    text = text.replace("[at]", "@")
    text = text.replace("(.)", ".")
    return text


def _extract_iocs_regex(content: str) -> List[Dict]:
    """Extract IOCs from content using regex patterns."""
    defanged = _defang(content)
    iocs: List[Dict] = []
    seen: set = set()

    type_map = {
        "ipv4": "ip",
        "ipv6": "ip",
        "domain": "domain",
        "url": "url",
        "md5": "hash",
        "sha1": "hash",
        "sha256": "hash",
        "email": "email",
        "cve": "cve",
        "registry_key": "registry_key",
        "file_path_windows": "file_path",
        "file_path_unix": "file_path",
    }

    for pattern_name, regex in IOC_PATTERNS.items():
        ioc_type = type_map.get(pattern_name, pattern_name)
        for match in regex.finditer(defanged):
            value = match.group(0).strip().rstrip(".,;:)")
            lower_val = value.lower()

            # Skip noise
            if ioc_type == "ip" and value in _NOISE_IPS:
                continue
            if ioc_type == "domain" and lower_val in _NOISE_DOMAINS:
                continue
            if ioc_type == "hash" and lower_val in _NOISE_HASHES:
                continue
            # Skip if value is too short for meaningful domain
            if ioc_type == "domain" and len(value) < 5:
                continue

            dedup_key = f"{ioc_type}:{lower_val}"
            if dedup_key in seen:
                continue
            seen.add(dedup_key)

            # Extract surrounding context as evidence
            start = max(0, match.start() - 40)
            end = min(len(defanged), match.end() + 40)
            evidence = defanged[start:end].strip().replace("\n", " ")

            iocs.append({
                "value": value,
                "type": ioc_type,
                "confidence": 70,
                "evidence": evidence,
            })

    return iocs


def _extract_ttps_regex(content: str) -> List[Dict]:
    """Extract TTPs by keyword matching against MITRE ATT&CK techniques."""
    content_lower = content.lower()
    ttps: List[Dict] = []
    seen: set = set()

    for mitre_id, info in _TTP_KEYWORD_MAP.items():
        for keyword in info["keywords"]:
            if keyword in content_lower and mitre_id not in seen:
                seen.add(mitre_id)
                # Find evidence snippet
                idx = content_lower.find(keyword)
                start = max(0, idx - 30)
                end = min(len(content), idx + len(keyword) + 30)
                evidence = content[start:end].strip().replace("\n", " ")

                ttps.append({
                    "mitre_id": mitre_id,
                    "name": info["name"],
                    "confidence": 60,
                    "evidence": evidence,
                })
                break  # One match per technique is enough

    return ttps


def _parse_genai_json(raw: str) -> Dict:
    """Parse JSON from GenAI response, handling markdown fences."""
    text = raw.strip()
    # Strip markdown code fences
    if text.startswith("```"):
        lines = text.split("\n", 1)
        if len(lines) > 1:
            text = lines[1]
        # Remove trailing fence
        if text.rstrip().endswith("```"):
            text = text.rstrip()[: -3].rstrip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object in the text
        brace_start = text.find("{")
        brace_end = text.rfind("}")
        if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
            try:
                return json.loads(text[brace_start: brace_end + 1])
            except json.JSONDecodeError:
                pass
    return {"iocs": [], "ttps": []}


class IntelligenceExtractor:
    """Extracts IOCs and TTPs from threat intelligence text using GenAI with regex fallback."""

    @staticmethod
    def extract_all(content: str, source_url: str = None) -> Dict:
        """Regex-based extraction (synchronous fallback).

        Returns:
            dict with keys: iocs, ttps, entities, summary
        """
        if not content or not content.strip():
            return {"iocs": [], "ttps": [], "entities": [], "summary": None}

        iocs = _extract_iocs_regex(content)
        ttps = _extract_ttps_regex(content)
        threat_actors = _extract_threat_actors(content)

        logger.info(
            "regex_extraction_complete",
            ioc_count=len(iocs),
            ttp_count=len(ttps),
            threat_actor_count=len(threat_actors),
        )

        return {
            "iocs": iocs,
            "ttps": ttps,
            "threat_actors": threat_actors,
            "entities": [],
            "summary": None,
        }

    @staticmethod
    async def extract_with_genai(
        content: str,
        source_url: str = None,
        db_session=None,
    ) -> Dict:
        """GenAI-powered extraction with regex enrichment.

        Uses the configured GenAI provider to extract IOCs and TTPs,
        then merges with regex results to catch anything the model missed.

        Returns:
            dict with keys: iocs, ttps, entities, summary,
                           executive_summary, technical_summary
        """
        from app.genai.provider import get_model_manager

        if not content or not content.strip():
            return {
                "iocs": [], "ttps": [], "entities": [],
                "summary": None, "executive_summary": None, "technical_summary": None,
            }

        # Truncate to a reasonable size for the LLM context window
        content_for_llm = content[:12000]

        # Extract source domain to exclude from results
        source_domain = None
        if source_url:
            try:
                from urllib.parse import urlparse
                parsed = urlparse(source_url)
                source_domain = parsed.netloc.lower()
                if source_domain.startswith("www."):
                    source_domain = source_domain[4:]
            except Exception:
                pass

        genai_iocs: List[Dict] = []
        genai_ttps: List[Dict] = []

        try:
            model_manager = get_model_manager()

            source_note = f"\n\nIMPORTANT: The article source domain is '{source_domain}'. Do NOT extract '{source_domain}' or any URL containing it as an IOC." if source_domain else ""
            user_prompt = f"Extract all IOCs and TTPs from the following threat intelligence text:{source_note}\n\n{content_for_llm}"

            result = await model_manager.generate_with_fallback(
                system_prompt=_EXTRACTION_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                temperature=0.1,
                max_tokens=4000,
            )

            raw_response = result.get("response", "")
            model_used = result.get("model_used", "unknown")

            parsed = _parse_genai_json(raw_response)

            genai_iocs = parsed.get("iocs", [])
            genai_ttps = parsed.get("ttps", [])

            logger.info(
                "genai_extraction_complete",
                model=model_used,
                ioc_count=len(genai_iocs),
                ttp_count=len(genai_ttps),
            )

        except Exception as e:
            logger.warning("genai_extraction_failed_using_regex_only", error=str(e))

        # Always enrich with regex results to catch anything GenAI missed
        regex_iocs = _extract_iocs_regex(content)
        regex_ttps = _extract_ttps_regex(content)
        threat_actors = _extract_threat_actors(content)

        # Merge: GenAI results take priority, add unique regex finds
        merged_iocs = _merge_iocs(genai_iocs, regex_iocs)
        merged_ttps = _merge_ttps(genai_ttps, regex_ttps)

        # Filter out IOCs matching the article's source domain
        if source_domain:
            merged_iocs = _filter_source_domain(merged_iocs, source_domain)

        logger.info(
            "extraction_merged",
            genai_iocs=len(genai_iocs),
            regex_iocs=len(regex_iocs),
            merged_iocs=len(merged_iocs),
            genai_ttps=len(genai_ttps),
            regex_ttps=len(regex_ttps),
            merged_ttps=len(merged_ttps),
            threat_actors=len(threat_actors),
        )

        return {
            "iocs": merged_iocs,
            "ttps": merged_ttps,
            "threat_actors": threat_actors,
            "entities": [],
            "summary": None,
            "executive_summary": None,
            "technical_summary": None,
        }


def _filter_source_domain(iocs: List[Dict], source_domain: str) -> List[Dict]:
    """Remove IOCs that match the article's source/publisher domain."""
    filtered = []
    for ioc in iocs:
        value = ioc.get("value", "").lower()
        ioc_type = ioc.get("type", "")
        if ioc_type == "domain" and (
            value == source_domain
            or value == f"www.{source_domain}"
            or value.endswith(f".{source_domain}")
        ):
            continue
        if ioc_type == "url" and source_domain in value:
            continue
        filtered.append(ioc)
    return filtered


def _merge_iocs(primary: List[Dict], secondary: List[Dict]) -> List[Dict]:
    """Merge two IOC lists, primary wins on duplicates."""
    seen = set()
    merged = []

    for ioc in primary:
        val = ioc.get("value", "").lower()
        ioc_type = ioc.get("type", "")
        key = f"{ioc_type}:{val}"
        if key not in seen:
            seen.add(key)
            merged.append(ioc)

    for ioc in secondary:
        val = ioc.get("value", "").lower()
        ioc_type = ioc.get("type", "")
        key = f"{ioc_type}:{val}"
        if key not in seen:
            seen.add(key)
            merged.append(ioc)

    return merged


def _merge_ttps(primary: List[Dict], secondary: List[Dict]) -> List[Dict]:
    """Merge two TTP lists, primary wins on duplicates."""
    seen = set()
    merged = []

    for ttp in primary:
        mid = ttp.get("mitre_id", "")
        if mid and mid not in seen:
            seen.add(mid)
            merged.append(ttp)

    for ttp in secondary:
        mid = ttp.get("mitre_id", "")
        if mid and mid not in seen:
            seen.add(mid)
            merged.append(ttp)

    return merged
