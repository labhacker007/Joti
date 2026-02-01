"""Extract structured threat intelligence from article content."""
import re
import json
from typing import List, Dict, Set, Optional
from urllib.parse import urlparse
import structlog
from app.models import ExtractedIntelligenceType

logger = structlog.get_logger(__name__)


class IntelligenceExtractor:
    """Extract IOCs, IOAs, MITRE ATT&CK TTPs, and ATLAS techniques from article text."""
    
    # ================================================================================
    # COMPREHENSIVE IOC PATTERNS - Enhanced for full cybersecurity threat coverage
    # ================================================================================
    
    # IP Addresses (IPv4 - public IPs only, filtering private ranges)
    IP_PATTERN = r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'
    
    # Domain names
    DOMAIN_PATTERN = r'(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}'
    
    # Email addresses
    EMAIL_PATTERN = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    
    # URLs (http/https)
    URL_PATTERN = r'https?://(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&/=]*)'
    
    # File Hashes (MD5, SHA1, SHA256, SHA512)
    HASH_MD5_PATTERN = r'\b[a-fA-F0-9]{32}\b'
    HASH_SHA1_PATTERN = r'\b[a-fA-F0-9]{40}\b'
    HASH_SHA256_PATTERN = r'\b[a-fA-F0-9]{64}\b'
    HASH_SHA512_PATTERN = r'\b[a-fA-F0-9]{128}\b'
    
    # CVE identifiers
    CVE_PATTERN = r'CVE-\d{4}-\d{4,7}'
    
    # Registry keys (Windows)
    REGISTRY_PATTERN = r'(?:HKEY_LOCAL_MACHINE|HKLM|HKEY_CURRENT_USER|HKCU|HKEY_CLASSES_ROOT|HKCR|HKEY_USERS|HKU|HKEY_CURRENT_CONFIG|HKCC)\\[^\s<>"|?*]+'
    
    # File paths (Windows and Unix)
    FILE_PATH_WINDOWS = r'[A-Z]:\\(?:[^\s<>"|?*\r\n]+\\)*[^\s<>"|?*\r\n]+'
    FILE_PATH_UNIX = r'/(?:usr|var|etc|tmp|home|root|opt|bin|sbin|lib|mnt|media|srv|proc|sys)/[^\s<>"|?*\r\n]+'
    FILE_PATH_PATTERN = r'(?:' + FILE_PATH_WINDOWS + r'|' + FILE_PATH_UNIX + r')'
    
    # Filenames with common malicious extensions
    FILENAME_PATTERN = r'\b[\w\-\.]+\.(?:exe|dll|bat|cmd|ps1|vbs|vba|js|hta|msi|scr|pif|jar|wsf|wsh|iso|img|vhd|lnk|chm|inf|reg|doc[xm]?|xls[xmb]?|ppt[xm]?|pdf|rtf|html?|sh|py|pl|rb|php|asp[x]?|jsp)\b'
    
    # PowerShell/Command execution patterns
    COMMAND_PATTERN = r'(?:powershell|cmd|bash|sh|wscript|cscript|mshta|certutil|bitsadmin|regsvr32|rundll32|msiexec|wmic)(?:\.exe)?\s+[^\r\n]{10,}'
    
    # Base64 encoded strings (potential payloads)
    BASE64_PATTERN = r'\b(?:[A-Za-z0-9+/]{4}){10,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?\b'
    
    # SSL/TLS Certificate fingerprints (SHA1, SHA256)
    CERT_SHA1_PATTERN = r'\b(?:SHA1|Thumbprint|Fingerprint)[\s:]+([A-Fa-f0-9]{40})\b'
    CERT_SHA256_PATTERN = r'\b(?:SHA256|Fingerprint)[\s:]+([A-Fa-f0-9]{64})\b'
    
    # Certificate serial numbers
    CERT_SERIAL_PATTERN = r'\b(?:Serial(?:\s+Number)?|S/N)[\s:]+([A-Fa-f0-9]{8,40})\b'
    
    # Bitcoin/Cryptocurrency wallet addresses
    BITCOIN_PATTERN = r'\b(?:1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}\b'
    ETHEREUM_PATTERN = r'\b0x[a-fA-F0-9]{40}\b'
    
    # User-Agent strings (potential malware signatures)
    USER_AGENT_PATTERN = r'User-Agent:\s*([^\r\n]+)'
    
    # MAC addresses
    MAC_PATTERN = r'\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b'
    
    # CIDR notation
    CIDR_PATTERN = r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/(?:3[0-2]|[12]?[0-9])\b'
    
    # ASN (Autonomous System Numbers)
    ASN_PATTERN = r'\bAS[0-9]{1,10}\b'
    
    # YARA rule names
    YARA_RULE_PATTERN = r'\brule\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\{|:)'
    
    # JA3/JA3S fingerprints (TLS fingerprinting)
    JA3_PATTERN = r'\b[a-f0-9]{32}\b'  # JA3 is MD5 hash format
    
    # JARM fingerprints
    JARM_PATTERN = r'\b[a-f0-9]{62}\b'
    
    # SSH fingerprints
    SSH_FINGERPRINT_PATTERN = r'\b(?:SHA256:|MD5:)?[A-Za-z0-9+/]{43}=?\b'
    
    # Service names/ports patterns
    PORT_PATTERN = r'\b(?:port|tcp|udp)\s*(?:/|:)?\s*(\d{1,5})\b'
    
    # MITRE ATT&CK Enterprise Techniques (comprehensive subset)
    MITRE_TECHNIQUES = {
        # Initial Access
        "T1190": "Exploit Public-Facing Application",
        "T1133": "External Remote Services",
        "T1200": "Hardware Additions",
        "T1566": "Phishing",
        "T1566.001": "Phishing: Spearphishing Attachment",
        "T1566.002": "Phishing: Spearphishing Link",
        "T1566.003": "Phishing: Spearphishing via Service",
        "T1566.004": "Phishing: Spearphishing Voice",
        "T1091": "Replication Through Removable Media",
        "T1195": "Supply Chain Compromise",
        "T1195.001": "Supply Chain Compromise: Compromise Software Dependencies",
        "T1195.002": "Supply Chain Compromise: Compromise Software Supply Chain",
        "T1199": "Trusted Relationship",
        "T1078": "Valid Accounts",
        "T1078.001": "Valid Accounts: Default Accounts",
        "T1078.002": "Valid Accounts: Domain Accounts",
        "T1078.003": "Valid Accounts: Local Accounts",
        "T1078.004": "Valid Accounts: Cloud Accounts",
        
        # Execution
        "T1059": "Command and Scripting Interpreter",
        "T1059.001": "Command and Scripting Interpreter: PowerShell",
        "T1059.003": "Command and Scripting Interpreter: Windows Command Shell",
        "T1059.004": "Command and Scripting Interpreter: Unix Shell",
        "T1059.005": "Command and Scripting Interpreter: Visual Basic",
        "T1059.006": "Command and Scripting Interpreter: Python",
        "T1059.007": "Command and Scripting Interpreter: JavaScript",
        "T1203": "Exploitation for Client Execution",
        "T1204": "User Execution",
        "T1204.001": "User Execution: Malicious Link",
        "T1204.002": "User Execution: Malicious File",
        "T1204.003": "User Execution: Malicious Image",
        "T1047": "Windows Management Instrumentation",
        "T1053": "Scheduled Task/Job",
        "T1053.005": "Scheduled Task/Job: Scheduled Task",
        "T1569": "System Services",
        "T1569.002": "System Services: Service Execution",
        
        # Persistence
        "T1098": "Account Manipulation",
        "T1547": "Boot or Logon Autostart Execution",
        "T1547.001": "Boot or Logon Autostart Execution: Registry Run Keys",
        "T1136": "Create Account",
        "T1136.001": "Create Account: Local Account",
        "T1136.002": "Create Account: Domain Account",
        "T1543": "Create or Modify System Process",
        "T1543.003": "Create or Modify System Process: Windows Service",
        "T1546": "Event Triggered Execution",
        "T1505": "Server Software Component",
        "T1505.003": "Server Software Component: Web Shell",
        
        # Privilege Escalation
        "T1548": "Abuse Elevation Control Mechanism",
        "T1134": "Access Token Manipulation",
        "T1068": "Exploitation for Privilege Escalation",
        "T1055": "Process Injection",
        "T1055.001": "Process Injection: Dynamic-link Library Injection",
        "T1055.012": "Process Injection: Process Hollowing",
        
        # Defense Evasion
        "T1140": "Deobfuscate/Decode Files or Information",
        "T1562": "Impair Defenses",
        "T1562.001": "Impair Defenses: Disable or Modify Tools",
        "T1070": "Indicator Removal",
        "T1070.001": "Indicator Removal: Clear Windows Event Logs",
        "T1070.004": "Indicator Removal: File Deletion",
        "T1036": "Masquerading",
        "T1036.005": "Masquerading: Match Legitimate Name or Location",
        "T1027": "Obfuscated Files or Information",
        "T1218": "System Binary Proxy Execution",
        "T1218.011": "System Binary Proxy Execution: Rundll32",
        "T1112": "Modify Registry",
        
        # Credential Access
        "T1110": "Brute Force",
        "T1110.001": "Brute Force: Password Guessing",
        "T1110.003": "Brute Force: Password Spraying",
        "T1555": "Credentials from Password Stores",
        "T1003": "OS Credential Dumping",
        "T1003.001": "OS Credential Dumping: LSASS Memory",
        "T1003.003": "OS Credential Dumping: NTDS",
        "T1558": "Steal or Forge Kerberos Tickets",
        "T1558.003": "Steal or Forge Kerberos Tickets: Kerberoasting",
        "T1552": "Unsecured Credentials",
        
        # Discovery
        "T1087": "Account Discovery",
        "T1083": "File and Directory Discovery",
        "T1046": "Network Service Discovery",
        "T1135": "Network Share Discovery",
        "T1057": "Process Discovery",
        "T1012": "Query Registry",
        "T1018": "Remote System Discovery",
        "T1082": "System Information Discovery",
        "T1016": "System Network Configuration Discovery",
        "T1049": "System Network Connections Discovery",
        
        # Lateral Movement
        "T1021": "Remote Services",
        "T1021.001": "Remote Services: Remote Desktop Protocol",
        "T1021.002": "Remote Services: SMB/Windows Admin Shares",
        "T1021.004": "Remote Services: SSH",
        "T1021.006": "Remote Services: Windows Remote Management",
        "T1080": "Taint Shared Content",
        "T1550": "Use Alternate Authentication Material",
        "T1550.002": "Use Alternate Authentication Material: Pass the Hash",
        "T1550.003": "Use Alternate Authentication Material: Pass the Ticket",
        
        # Collection
        "T1560": "Archive Collected Data",
        "T1119": "Automated Collection",
        "T1005": "Data from Local System",
        "T1039": "Data from Network Shared Drive",
        "T1025": "Data from Removable Media",
        "T1074": "Data Staged",
        "T1114": "Email Collection",
        "T1056": "Input Capture",
        "T1056.001": "Input Capture: Keylogging",
        "T1113": "Screen Capture",
        
        # Command and Control
        "T1071": "Application Layer Protocol",
        "T1071.001": "Application Layer Protocol: Web Protocols",
        "T1071.004": "Application Layer Protocol: DNS",
        "T1132": "Data Encoding",
        "T1001": "Data Obfuscation",
        "T1573": "Encrypted Channel",
        "T1008": "Fallback Channels",
        "T1105": "Ingress Tool Transfer",
        "T1571": "Non-Standard Port",
        "T1572": "Protocol Tunneling",
        "T1090": "Proxy",
        "T1219": "Remote Access Software",
        "T1102": "Web Service",
        
        # Exfiltration
        "T1020": "Automated Exfiltration",
        "T1030": "Data Transfer Size Limits",
        "T1048": "Exfiltration Over Alternative Protocol",
        "T1041": "Exfiltration Over C2 Channel",
        "T1567": "Exfiltration Over Web Service",
        "T1029": "Scheduled Transfer",
        
        # Impact
        "T1531": "Account Access Removal",
        "T1485": "Data Destruction",
        "T1486": "Data Encrypted for Impact",
        "T1491": "Defacement",
        "T1561": "Disk Wipe",
        "T1499": "Endpoint Denial of Service",
        "T1498": "Network Denial of Service",
        "T1496": "Resource Hijacking",
        "T1489": "Service Stop",
        "T1529": "System Shutdown/Reboot",
    }
    
    # MITRE ATLAS (Adversarial Threat Landscape for AI Systems)
    ATLAS_TECHNIQUES = {
        # Reconnaissance
        "AML.T0000": "ML Model Inventorying",
        "AML.T0001": "ML Attack Staging",
        "AML.T0002": "Acquire Public ML Artifacts",
        
        # Resource Development
        "AML.T0003": "Acquire Infrastructure",
        "AML.T0004": "Develop Capabilities",
        "AML.T0005": "Obtain Capabilities",
        
        # Initial Access
        "AML.T0006": "Supply Chain Compromise of ML Artifacts",
        "AML.T0007": "Phishing",
        "AML.T0008": "Valid Accounts",
        
        # Execution
        "AML.T0009": "User Execution",
        "AML.T0010": "ML Supply Chain Compromise",
        
        # ML Attack Staging
        "AML.T0011": "Acquire Public ML Artifacts",
        "AML.T0012": "Create Proxy ML Model",
        "AML.T0013": "Craft Adversarial Data",
        "AML.T0014": "Verify Attack",
        
        # ML Model Access
        "AML.T0015": "ML Model Inference API Access",
        "AML.T0016": "Physical Environment Access",
        "AML.T0017": "Model Theft/Replication",
        
        # Persistence
        "AML.T0018": "Backdoor ML Model",
        "AML.T0019": "Poison Training Data",
        
        # Defense Evasion
        "AML.T0020": "Evade ML Model",
        "AML.T0021": "Spoof Labels/Detections",
        
        # Discovery
        "AML.T0022": "Discover ML Model Ontology",
        "AML.T0023": "Discover ML Model Family",
        "AML.T0024": "Discover ML Artifacts",
        
        # Collection
        "AML.T0025": "Exfiltrate ML Artifacts",
        "AML.T0026": "Extract ML Model",
        
        # ML Attack
        "AML.T0027": "Adversarial ML Attack",
        "AML.T0028": "Model Evasion",
        "AML.T0029": "Model Poisoning",
        "AML.T0030": "Model Inversion",
        "AML.T0031": "Membership Inference",
        "AML.T0032": "Model Extraction",
        "AML.T0033": "Inference Attack",
        
        # Impact
        "AML.T0034": "Denial of ML Service",
        "AML.T0035": "Cost Harvesting",
        "AML.T0036": "Erode ML Model Integrity",
        "AML.T0037": "Data Poisoning",
        "AML.T0038": "System Misuse",
        "AML.T0039": "External Harms",
    }
    
    # IOA (Indicators of Attack) - Behavioral patterns
    IOA_PATTERNS = {
        "lateral_movement": [
            r"(?i)\b(?:lateral\s+movement|moved\s+laterally|spread(?:ing)?\s+(?:to|across))\b",
            r"(?i)\b(?:psexec|wmi(?:c)?|winrm|dcom|ssh\s+hop|pivot(?:ing)?)\b",
            r"(?i)\b(?:pass.the.hash|pass.the.ticket|overpass.the.hash)\b",
        ],
        "privilege_escalation": [
            r"(?i)\b(?:privilege\s+escalat|escala(?:ted|ting)\s+privilege|priv(?:\s+)?esc)\b",
            r"(?i)\b(?:local\s+admin|domain\s+admin|root\s+access|sudo)\b",
            r"(?i)\b(?:uac\s+bypass|token\s+manipulation|token\s+impersonat)\b",
        ],
        "defense_evasion": [
            r"(?i)\b(?:defense\s+evasion|evas(?:ion|ive)|bypass(?:ed|ing)?)\b",
            r"(?i)\b(?:disable(?:d)?\s+(?:antivirus|av|edr|security|logging))\b",
            r"(?i)\b(?:obfuscat|encrypt(?:ed)?\s+payload|pack(?:ed|er)|crypter)\b",
            r"(?i)\b(?:living.off.the.land|lolbin|lolbas|fileless)\b",
        ],
        "credential_theft": [
            r"(?i)\b(?:credential\s+(?:theft|dump|harvest|steal))\b",
            r"(?i)\b(?:mimikatz|lsass|ntds\.dit|sam\s+database|hashdump)\b",
            r"(?i)\b(?:keylog(?:ger|ging)?|password\s+spray|brute\s+force)\b",
        ],
        "data_exfiltration": [
            r"(?i)\b(?:exfiltrat|data\s+(?:theft|stolen|leak)|steal(?:ing)?\s+data)\b",
            r"(?i)\b(?:upload(?:ed)?\s+to\s+(?:c2|c&c|cloud|external))\b",
            r"(?i)\b(?:dns\s+tunnel|http\s+exfil|covert\s+channel)\b",
        ],
        "persistence": [
            r"(?i)\b(?:establish(?:ed|ing)?\s+persistence|maintain(?:ed|ing)?\s+access)\b",
            r"(?i)\b(?:scheduled\s+task|registry\s+(?:key|run)|startup\s+folder)\b",
            r"(?i)\b(?:web\s+shell|backdoor|implant|beacon)\b",
            r"(?i)\b(?:rootkit|bootkit|service\s+install)\b",
        ],
        "command_and_control": [
            r"(?i)\b(?:command.and.control|c2|c&c|command\s+channel)\b",
            r"(?i)\b(?:beacon(?:ing)?|call(?:ing)?\s+(?:back|home)|phone\s+home)\b",
            r"(?i)\b(?:cobalt\s+strike|metasploit|empire|covenant)\b",
        ],
        "reconnaissance": [
            r"(?i)\b(?:reconnaissance|recon|enumerat|discover(?:y|ing))\b",
            r"(?i)\b(?:port\s+scan|network\s+scan|host\s+discovery)\b",
            r"(?i)\b(?:bloodhound|sharphound|ad\s+enumeration)\b",
        ],
        "initial_access": [
            r"(?i)\b(?:initial\s+(?:access|compromise|infection))\b",
            r"(?i)\b(?:spearphish|phish(?:ing)?|social\s+engineer)\b",
            r"(?i)\b(?:exploit(?:ed|ing)?\s+(?:vulnerability|cve|zero.day))\b",
            r"(?i)\b(?:drive.by|watering\s+hole|supply\s+chain)\b",
        ],
        "impact": [
            r"(?i)\b(?:ransomware|encrypt(?:ed|ing)?\s+files|ransom\s+demand)\b",
            r"(?i)\b(?:wiper|destruct(?:ion|ive)|data\s+destroy)\b",
            r"(?i)\b(?:ddos|denial.of.service|service\s+disrupt)\b",
        ],
    }
    
    # Known threat actors and malware families
    THREAT_ACTORS = [
        "APT28", "APT29", "APT32", "APT33", "APT34", "APT35", "APT37", "APT38", "APT39", "APT40", "APT41",
        "Lazarus", "Kimsuky", "Sandworm", "Turla", "Cozy Bear", "Fancy Bear", "Equation Group",
        "FIN7", "FIN8", "FIN11", "FIN12", "Carbanak", "Cobalt Group",
        "REvil", "DarkSide", "Conti", "LockBit", "BlackCat", "ALPHV", "Clop", "Hive",
        "Emotet", "TrickBot", "QakBot", "IcedID", "BazarLoader", "Bumblebee",
        "TA505", "TA551", "TA577", "TA578",
        "Wizard Spider", "Evil Corp", "Scattered Spider", "LAPSUS$",
    ]
    
    MALWARE_FAMILIES = [
        "Cobalt Strike", "Metasploit", "Mimikatz", "BloodHound",
        "Emotet", "TrickBot", "QakBot", "Dridex", "ZLoader",
        "Ryuk", "Conti", "REvil", "Sodinokibi", "LockBit", "BlackBasta",
        "Agent Tesla", "FormBook", "AsyncRAT", "RemcosRAT", "NjRAT",
        "Sliver", "Brute Ratel", "Mythic",
        "SolarWinds", "SUNBURST", "TEARDROP",
        "Log4Shell", "ProxyShell", "ProxyLogon",
    ]
    
    # Common legitimate/benign domains to exclude - COMPREHENSIVE LIST
    BENIGN_DOMAINS = {
        # ===== NEWS & SECURITY BLOGS =====
        "bleepingcomputer.com", "therecord.media", "thehackernews.com", "krebsonsecurity.com",
        "darkreading.com", "threatpost.com", "securityweek.com", "csoonline.com", "zdnet.com",
        "arstechnica.com", "wired.com", "techcrunch.com", "reuters.com", "bloomberg.com",
        "cnn.com", "bbc.com", "bbc.co.uk", "nytimes.com", "washingtonpost.com", "theguardian.com",
        "infosecurity-magazine.com", "scmagazine.com", "cyberscoop.com", "bankinfosecurity.com",
        "helpnetsecurity.com", "securityaffairs.com", "hackread.com", "gbhackers.com",
        "securityboulevard.com", "cybersecuritynews.com", "cyware.com", "theregister.com",
        "tripwire.com", "nakedsecurity.sophos.com", "welivesecurity.com", "blog.malwarebytes.com",
        "unit42.paloaltonetworks.com", "securelist.com", "blogs.cisco.com", "blog.talosintelligence.com",
        "proofpoint.com", "abnormalsecurity.com", "securityintelligence.com", "intel471.com",
        "flashpoint.io", "recordedfuture.com", "anomali.com", "threatconnect.com",
        
        # ===== TECH COMPANIES =====
        "microsoft.com", "google.com", "github.com", "apple.com", "amazon.com", "aws.amazon.com",
        "cloudflare.com", "akamai.com", "facebook.com", "meta.com", "twitter.com", "x.com",
        "linkedin.com", "youtube.com", "instagram.com", "tiktok.com", "reddit.com", "discord.com",
        "slack.com", "zoom.us", "dropbox.com", "box.com", "salesforce.com", "oracle.com",
        "ibm.com", "dell.com", "hp.com", "intel.com", "amd.com", "nvidia.com", "vmware.com",
        "atlassian.com", "jira.com", "confluence.com", "bitbucket.org", "gitlab.com",
        "stackoverflow.com", "docker.com", "kubernetes.io", "redhat.com", "ubuntu.com",
        
        # ===== SECURITY VENDORS =====
        "virustotal.com", "malwarebytes.com", "kaspersky.com", "symantec.com", "mcafee.com",
        "crowdstrike.com", "paloaltonetworks.com", "fortinet.com", "cisco.com", "sentinelone.com",
        "mandiant.com", "fireeye.com", "checkpoint.com", "sophos.com", "trendmicro.com",
        "carbonblack.com", "cybereason.com", "elastic.co", "splunk.com", "sumo.com",
        "rapid7.com", "qualys.com", "tenable.com", "nessus.org", "beyondtrust.com",
        "cyberark.com", "okta.com", "duo.com", "onelogin.com", "auth0.com", "ping.com",
        "zscaler.com", "netskope.com", "cloudflare.com", "imperva.com", "f5.com",
        "barracuda.com", "mimecast.com", "proofpoint.com", "agari.com",
        
        # ===== GOVERNMENT & STANDARDS =====
        "mitre.org", "attack.mitre.org", "cisa.gov", "nist.gov", "us-cert.gov", "cert.org",
        "ic3.gov", "fbi.gov", "dhs.gov", "ncsc.gov.uk", "enisa.europa.eu", "bsi.bund.de",
        "cyber.gov.au", "cccs-ccae.gc.ca", "first.org", "owasp.org", "sans.org",
        
        # ===== CDNs & INFRASTRUCTURE =====
        "googleapis.com", "gstatic.com", "azureedge.net", "cloudfront.net", "akamaized.net",
        "fastly.net", "edgecast.net", "stackpath.com", "jsdelivr.net", "unpkg.com",
        "cdnjs.com", "bootstrapcdn.com", "jquery.com", "fontawesome.com", "fonts.googleapis.com",
        
        # ===== BLOGGING & CMS =====
        "wordpress.com", "wordpress.org", "medium.com", "substack.com", "ghost.io", "blogger.com",
        "tumblr.com", "wix.com", "squarespace.com", "weebly.com", "hubspot.com",
        
        # ===== EMAIL PROVIDERS =====
        "gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "protonmail.com", "icloud.com",
        "mail.com", "aol.com", "zoho.com", "fastmail.com", "tutanota.com",
        
        # ===== TESTING & EXAMPLES =====
        "example.com", "example.org", "example.net", "test.com", "localhost", "local", "internal",
        "127.0.0.1", "0.0.0.0",
        
        # ===== URL SHORTENERS (legitimate ones) =====
        "bit.ly", "t.co", "goo.gl", "tinyurl.com", "ow.ly", "buff.ly", "lnkd.in",
    }
    
    # Common legitimate TLDs that are often false positives
    BENIGN_TLDS = {".gov", ".edu", ".mil", ".int"}
    
    @classmethod
    def _is_benign_domain(cls, domain: str) -> bool:
        """Check if domain is from a known benign/legitimate source."""
        domain_lower = domain.lower().strip()
        
        # Check exact match
        if domain_lower in cls.BENIGN_DOMAINS:
            return True
        
        # Check if it's a subdomain of benign domains
        for benign in cls.BENIGN_DOMAINS:
            if domain_lower.endswith(f".{benign}") or domain_lower == benign:
                return True
        
        # Check for benign TLDs (government, education, military)
        for tld in cls.BENIGN_TLDS:
            if domain_lower.endswith(tld):
                return True
        
        # Check for common benign patterns
        benign_patterns = [
            r'^www\.',  # www prefix only
            r'\.local$',  # local domains
            r'\.internal$',  # internal domains
            r'\.corp$',  # corporate domains
            r'\.lan$',  # LAN domains
        ]
        for pattern in benign_patterns:
            if re.search(pattern, domain_lower):
                return True
        
        return False
    
    @classmethod
    def _extract_source_indicators(cls, source_url: str) -> Set[str]:
        """Extract domains/URLs from the source feed URL to exclude them."""
        exclude = set()
        if source_url:
            try:
                parsed = urlparse(source_url)
                if parsed.netloc:
                    exclude.add(parsed.netloc.lower())
                    # Also add without www
                    exclude.add(parsed.netloc.lower().replace("www.", ""))
                exclude.add(source_url.lower())
            except Exception:
                pass
        return exclude
    
    @classmethod
    def extract_iocs(cls, text: str, source_url: str = None) -> List[Dict]:
        """Extract Indicators of Compromise (IOCs) - filtering out source metadata."""
        iocs = []
        
        # Get source URL indicators to exclude
        source_exclusions = cls._extract_source_indicators(source_url) if source_url else set()
        
        # Exclude common false positives
        fp_domains = {"example.com", "test.com", "localhost"} | cls.BENIGN_DOMAINS | source_exclusions
        fp_ips = {"127.0.0.1", "0.0.0.0", "255.255.255.255"}
        
        # Extract IPs
        for ip in set(re.findall(cls.IP_PATTERN, text)):
            if ip not in fp_ips and not ip.startswith(("127.", "192.168.", "10.", "172.16.", "172.17.", "172.18.")):
                iocs.append({
                    "type": "ip",
                    "value": ip,
                    "confidence": 80,
                    "intelligence_type": ExtractedIntelligenceType.IOC.value
                })
        
        # Extract domains - filtering out benign and source domains
        for domain in set(re.findall(cls.DOMAIN_PATTERN, text)):
            domain_lower = domain.lower()
            if len(domain) > 4 and domain_lower not in fp_domains:
                # Skip common non-malicious TLDs appearing in normal text
                if not domain_lower.endswith((".jpg", ".png", ".gif", ".pdf", ".doc")):
                    # Skip benign domains
                    if not cls._is_benign_domain(domain_lower):
                        iocs.append({
                            "type": "domain",
                            "value": domain,
                            "confidence": 75,
                            "intelligence_type": ExtractedIntelligenceType.IOC.value
                        })
        
        # Extract emails - only if they're from suspicious domains
        for email in set(re.findall(cls.EMAIL_PATTERN, text)):
            email_lower = email.lower()
            # Extract domain from email
            email_domain = email_lower.split("@")[-1] if "@" in email_lower else ""
            # Skip emails from benign domains
            if email_domain and not cls._is_benign_domain(email_domain):
                iocs.append({
                    "type": "email",
                    "value": email,
                    "confidence": 85,
                    "intelligence_type": ExtractedIntelligenceType.IOC.value
                })
        
        # Extract URLs - filtering out source and benign URLs
        for url in set(re.findall(cls.URL_PATTERN, text)):
            if len(url) > 10:
                url_lower = url.lower()
                # Check if URL is from source or benign domain
                is_benign = False
                try:
                    parsed = urlparse(url)
                    if parsed.netloc:
                        is_benign = cls._is_benign_domain(parsed.netloc) or parsed.netloc.lower() in source_exclusions
                except Exception:
                    pass
                
                if not is_benign:
                    iocs.append({
                        "type": "url",
                        "value": url,
                        "confidence": 90,
                        "intelligence_type": ExtractedIntelligenceType.IOC.value
                    })
        
        # Extract file hashes
        for hash_val in set(re.findall(cls.HASH_SHA256_PATTERN, text)):
            iocs.append({
                "type": "hash",
                "value": hash_val,
                "hash_type": "sha256",
                "confidence": 95,
                "intelligence_type": ExtractedIntelligenceType.IOC.value
            })
        
        for hash_val in set(re.findall(cls.HASH_SHA1_PATTERN, text)):
            if hash_val not in [h["value"] for h in iocs]:  # Avoid duplicates with SHA256
                iocs.append({
                    "type": "hash",
                    "value": hash_val,
                    "hash_type": "sha1",
                    "confidence": 90,
                    "intelligence_type": ExtractedIntelligenceType.IOC.value
                })
        
        for hash_val in set(re.findall(cls.HASH_MD5_PATTERN, text)):
            if hash_val not in [h["value"] for h in iocs]:
                iocs.append({
                    "type": "hash",
                    "value": hash_val,
                    "hash_type": "md5",
                    "confidence": 85,
                    "intelligence_type": ExtractedIntelligenceType.IOC.value
                })
        
        # Extract CVEs
        for cve in set(re.findall(cls.CVE_PATTERN, text)):
            iocs.append({
                "type": "cve",
                "value": cve,
                "confidence": 95,
                "intelligence_type": ExtractedIntelligenceType.IOC.value
            })
        
        # Extract registry keys
        for reg_key in set(re.findall(cls.REGISTRY_PATTERN, text)):
            iocs.append({
                "type": "registry",
                "value": reg_key,
                "confidence": 80,
                "intelligence_type": ExtractedIntelligenceType.IOC.value
            })
        
# Extract file paths
        for file_path in set(re.findall(cls.FILE_PATH_PATTERN, text)):
            if len(file_path) > 5:
                iocs.append({
                    "type": "filepath",
                    "value": file_path,
                    "confidence": 70,
                    "intelligence_type": ExtractedIntelligenceType.IOC.value
                })
        
        # Extract malicious filenames
        for filename in set(re.findall(cls.FILENAME_PATTERN, text, re.IGNORECASE)):
            if len(filename) > 4:
                iocs.append({
                    "type": "filename",
                    "value": filename,
                    "confidence": 75,
                    "intelligence_type": ExtractedIntelligenceType.IOC.value
                })
        
        # Extract SHA512 hashes
        for hash_val in set(re.findall(cls.HASH_SHA512_PATTERN, text)):
            if hash_val not in [h["value"] for h in iocs]:
                iocs.append({
                    "type": "hash",
                    "value": hash_val,
                    "hash_type": "sha512",
                    "confidence": 95,
                    "intelligence_type": ExtractedIntelligenceType.IOC.value
                })
        
        # Extract command line patterns
        for command in set(re.findall(cls.COMMAND_PATTERN, text, re.IGNORECASE)):
            if len(command) > 20:
                iocs.append({
                    "type": "command",
                    "value": command[:500],  # Limit length
                    "confidence": 80,
                    "intelligence_type": ExtractedIntelligenceType.IOC.value
                })
        
        # Extract certificate fingerprints
        for cert_match in re.finditer(cls.CERT_SHA256_PATTERN, text, re.IGNORECASE):
            cert_hash = cert_match.group(1) if cert_match.groups() else cert_match.group()
            iocs.append({
                "type": "certificate",
                "value": cert_hash,
                "cert_type": "sha256",
                "confidence": 90,
                "intelligence_type": ExtractedIntelligenceType.IOC.value
            })
        
        for cert_match in re.finditer(cls.CERT_SHA1_PATTERN, text, re.IGNORECASE):
            cert_hash = cert_match.group(1) if cert_match.groups() else cert_match.group()
            if cert_hash not in [h["value"] for h in iocs]:
                iocs.append({
                    "type": "certificate",
                    "value": cert_hash,
                    "cert_type": "sha1",
                    "confidence": 85,
                    "intelligence_type": ExtractedIntelligenceType.IOC.value
                })
        
        # Extract Bitcoin addresses
        for btc_addr in set(re.findall(cls.BITCOIN_PATTERN, text)):
            if len(btc_addr) > 25:
                iocs.append({
                    "type": "bitcoin_address",
                    "value": btc_addr,
                    "confidence": 90,
                    "intelligence_type": ExtractedIntelligenceType.IOC.value
                })
        
        # Extract Ethereum addresses
        for eth_addr in set(re.findall(cls.ETHEREUM_PATTERN, text)):
            iocs.append({
                "type": "ethereum_address",
                "value": eth_addr,
                "confidence": 90,
                "intelligence_type": ExtractedIntelligenceType.IOC.value
            })
        
        # Extract User-Agent strings
        for ua_match in re.finditer(cls.USER_AGENT_PATTERN, text):
            ua = ua_match.group(1).strip()
            if len(ua) > 10:
                iocs.append({
                    "type": "user_agent",
                    "value": ua[:200],  # Limit length
                    "confidence": 70,
                    "intelligence_type": ExtractedIntelligenceType.IOC.value
                })
        
        # Extract CIDR ranges
        for cidr in set(re.findall(cls.CIDR_PATTERN, text)):
            # Skip private ranges
            if not cidr.startswith(("10.", "192.168.", "172.")):
                iocs.append({
                    "type": "cidr",
                    "value": cidr,
                    "confidence": 85,
                    "intelligence_type": ExtractedIntelligenceType.IOC.value
                })
        
        # Extract ASN
        for asn in set(re.findall(cls.ASN_PATTERN, text)):
            iocs.append({
                "type": "asn",
                "value": asn,
                "confidence": 80,
                "intelligence_type": ExtractedIntelligenceType.IOC.value
            })
        
        # Extract MAC addresses
        for mac in set(re.findall(cls.MAC_PATTERN, text)):
            iocs.append({
                "type": "mac_address",
                "value": mac,
                "confidence": 65,
                "intelligence_type": ExtractedIntelligenceType.IOC.value
            })
        
        # Extract port numbers mentioned
        for port_match in re.finditer(cls.PORT_PATTERN, text, re.IGNORECASE):
            port = port_match.group(1)
            if port and 1 <= int(port) <= 65535:
                iocs.append({
                    "type": "port",
                    "value": port,
                    "confidence": 60,
                    "intelligence_type": ExtractedIntelligenceType.IOC.value
                })
        
        return iocs
    
    @classmethod
    def extract_ioas(cls, text: str) -> List[Dict]:
        """Extract Indicators of Attack (IOAs) - behavioral patterns."""
        ioas = []
        text_lower = text.lower()
        
        for category, patterns in cls.IOA_PATTERNS.items():
            for pattern in patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                if matches:
                    # Get unique matches
                    unique_matches = list(set([m if isinstance(m, str) else m[0] for m in matches]))
                    ioas.append({
                        "type": "ioa",
                        "category": category,
                        "value": category.replace("_", " ").title(),
                        "evidence": unique_matches[:3],  # First 3 matches as evidence
                        "confidence": 75,
                        "intelligence_type": ExtractedIntelligenceType.IOA.value
                    })
                    break  # One match per category is enough
        
        # Check for known threat actors
        for actor in cls.THREAT_ACTORS:
            if actor.lower() in text_lower or actor.upper() in text:
                ioas.append({
                    "type": "threat_actor",
                    "value": actor,
                    "confidence": 90,
                    "intelligence_type": ExtractedIntelligenceType.IOA.value
                })
        
        # Check for known malware families
        for malware in cls.MALWARE_FAMILIES:
            if malware.lower() in text_lower:
                ioas.append({
                    "type": "malware_family",
                    "value": malware,
                    "confidence": 85,
                    "intelligence_type": ExtractedIntelligenceType.IOA.value
                })
        
        return ioas
    
    @classmethod
    def extract_mitre_techniques(cls, text: str) -> List[Dict]:
        """Extract MITRE ATT&CK technique references."""
        techniques = []
        found_ids: Set[str] = set()
        
        # Look for Txxxx.xxxx patterns and technique names
        for technique_id, technique_name in cls.MITRE_TECHNIQUES.items():
            # Check for technique ID
            if technique_id in text:
                if technique_id not in found_ids:
                    techniques.append({
                        "type": "ttp",
                        "mitre_id": technique_id,
                        "name": technique_name,
                        "confidence": 95,
                        "intelligence_type": ExtractedIntelligenceType.TTP.value
                    })
                    found_ids.add(technique_id)
            # Check for technique name (case insensitive)
            elif technique_name.lower() in text.lower():
                if technique_id not in found_ids:
                    techniques.append({
                        "type": "ttp",
                        "mitre_id": technique_id,
                        "name": technique_name,
                        "confidence": 80,
                        "intelligence_type": ExtractedIntelligenceType.TTP.value
                    })
                    found_ids.add(technique_id)
        
        return techniques
    
    @classmethod
    def extract_atlas_techniques(cls, text: str) -> List[Dict]:
        """Extract MITRE ATLAS (AI/ML) technique references."""
        techniques = []
        found_ids: Set[str] = set()
        
        for technique_id, technique_name in cls.ATLAS_TECHNIQUES.items():
            # Check for technique ID
            if technique_id in text:
                if technique_id not in found_ids:
                    techniques.append({
                        "type": "atlas",
                        "mitre_id": technique_id,
                        "name": technique_name,
                        "framework": "ATLAS",
                        "confidence": 95,
                        "intelligence_type": ExtractedIntelligenceType.ATLAS.value
                    })
                    found_ids.add(technique_id)
            # Check for technique name
            elif technique_name.lower() in text.lower():
                if technique_id not in found_ids:
                    techniques.append({
                        "type": "atlas",
                        "mitre_id": technique_id,
                        "name": technique_name,
                        "framework": "ATLAS",
                        "confidence": 75,
                        "intelligence_type": ExtractedIntelligenceType.ATLAS.value
                    })
                    found_ids.add(technique_id)
        
        # Also check for general AI/ML attack patterns
        ai_ml_patterns = [
            (r"(?i)\b(?:adversarial\s+(?:attack|example|input|sample))\b", "AML.T0027", "Adversarial ML Attack"),
            (r"(?i)\b(?:model\s+(?:evasion|bypass))\b", "AML.T0028", "Model Evasion"),
            (r"(?i)\b(?:(?:data|training)\s+poison(?:ing)?)\b", "AML.T0037", "Data Poisoning"),
            (r"(?i)\b(?:model\s+(?:extraction|stealing|theft))\b", "AML.T0032", "Model Extraction"),
            (r"(?i)\b(?:membership\s+inference)\b", "AML.T0031", "Membership Inference"),
            (r"(?i)\b(?:model\s+inversion)\b", "AML.T0030", "Model Inversion"),
            (r"(?i)\b(?:backdoor(?:ed)?\s+(?:model|ml|ai))\b", "AML.T0018", "Backdoor ML Model"),
            (r"(?i)\b(?:prompt\s+injection)\b", "AML.T0051", "Prompt Injection"),
            (r"(?i)\b(?:jailbreak(?:ing)?)\b", "AML.T0052", "LLM Jailbreak"),
        ]
        
        for pattern, technique_id, technique_name in ai_ml_patterns:
            if re.search(pattern, text) and technique_id not in found_ids:
                techniques.append({
                    "type": "atlas",
                    "mitre_id": technique_id,
                    "name": technique_name,
                    "framework": "ATLAS",
                    "confidence": 70,
                    "intelligence_type": ExtractedIntelligenceType.ATLAS.value
                })
                found_ids.add(technique_id)
        
        return techniques
    
    @classmethod
    def extract_all(cls, text: str, source_url: str = None) -> Dict[str, List]:
        """Extract all types of intelligence from text (IOCs and TTPs only)."""
        return {
            "iocs": cls.extract_iocs(text, source_url),
            "ttps": cls.extract_mitre_techniques(text),
            "atlas": cls.extract_atlas_techniques(text)
            # Note: IOAs removed - only tracking IOCs and TTPs
        }
    
    @classmethod
    def extract_with_stats(cls, text: str, source_url: str = None) -> Dict:
        """Extract all intelligence with summary statistics."""
        intelligence = cls.extract_all(text, source_url)
        
        return {
            "intelligence": intelligence,
            "stats": {
                "total_iocs": len(intelligence["iocs"]),
                "total_ttps": len(intelligence["ttps"]),
                "total_atlas": len(intelligence["atlas"]),
                "ioc_types": list(set(i["type"] for i in intelligence["iocs"])),
                "ttp_tactics": list(set(t["mitre_id"].split(".")[0] for t in intelligence["ttps"])),
            }
        }
    
    @classmethod
    async def extract_with_genai(cls, text: str, source_url: str = None, db_session=None) -> Dict[str, List]:
        """Use GenAI to extract IOCs, IOAs, and TTPs with higher accuracy.
        
        This method uses the centralized PromptManager with expert personas, guardrails,
        and RAG context from the knowledge base to extract only genuine threat indicators.
        
        Args:
            text: Article text to extract from
            source_url: URL of the article (used for filtering)
            db_session: Optional database session for RAG and custom guardrails
        """
        from app.genai.provider import GenAIProvider
        from app.genai.prompts import PromptManager
        
        # First do regex-based extraction with filtering
        regex_results = cls.extract_all(text, source_url)
        
        # Use PromptManager for standardized prompts with guardrails AND RAG
        prompt_manager = PromptManager(db_session=db_session, enable_rag=db_session is not None)
        prompts = prompt_manager.build_extraction_prompt(
            content=text,
            source_url=source_url,
            persona_key="threat_intelligence"
        )
        
        system_prompt = prompts["system"]
        user_prompt = prompts["user"]

        try:
            provider = GenAIProvider()
            response = await provider.generate(system_prompt, user_prompt, temperature=0.1)
            
            # Parse JSON response
            try:
                # Try to extract JSON from response
                json_match = re.search(r'\{[\s\S]*\}', response)
                if json_match:
                    genai_results = json.loads(json_match.group())
                else:
                    genai_results = {}
            except json.JSONDecodeError:
                logger.warning("genai_extraction_parse_failed", response=response[:200])
                genai_results = {}
            
            # Merge GenAI results with regex results
            merged = {
                "iocs": [],
                "ttps": [],
                "atlas": regex_results.get("atlas", [])  # Keep ATLAS from regex
            }
            
            # Add GenAI IOCs
            for ioc in genai_results.get("iocs", []):
                merged["iocs"].append({
                    "type": ioc.get("type", "unknown"),
                    "value": ioc.get("value"),
                    "confidence": 90,  # Higher confidence from GenAI
                    "evidence": ioc.get("context"),
                    "intelligence_type": ExtractedIntelligenceType.IOC.value,
                    "source": "genai"
                })
            
            # Add GenAI TTPs
            for ttp in genai_results.get("ttps", []):
                merged["ttps"].append({
                    "type": "ttp",
                    "mitre_id": ttp.get("mitre_id"),
                    "name": ttp.get("name"),
                    "confidence": 85,
                    "evidence": ttp.get("context"),
                    "intelligence_type": ExtractedIntelligenceType.TTP.value,
                    "source": "genai"
                })
            
            # Note: IOAs removed - only tracking IOCs and TTPs
            
            # If GenAI didn't find much, supplement with filtered regex results
            if len(merged["iocs"]) < 2:
                for ioc in regex_results.get("iocs", []):
                    if ioc not in merged["iocs"]:
                        ioc["source"] = "regex"
                        merged["iocs"].append(ioc)
            
            if len(merged["ttps"]) < 1:
                for ttp in regex_results.get("ttps", []):
                    if ttp not in merged["ttps"]:
                        ttp["source"] = "regex"
                        merged["ttps"].append(ttp)
            
            logger.info("genai_extraction_complete", 
                       iocs=len(merged["iocs"]), 
                       ttps=len(merged["ttps"]))
            
            return merged
            
        except Exception as e:
            logger.error("genai_extraction_failed", error=str(e))
            # Fall back to regex results
            return regex_results

    @classmethod
    async def extract_with_model_comparison(
        cls, 
        text: str, 
        source_url: str = None, 
        db_session=None,
        primary_model: str = None,
        secondary_model: str = None
    ) -> Dict:
        """Extract IOCs using two models and compare results, using the best one.
        
        This method uses both primary and secondary GenAI models (if configured),
        compares the extraction results, and returns the result set with more IOCs.
        
        Args:
            text: Article text to extract from
            source_url: URL of the article (used for filtering)
            db_session: Optional database session for RAG and custom guardrails
            primary_model: Primary model ID (e.g., "ollama:llama3")
            secondary_model: Secondary model ID (e.g., "openai")
        
        Returns:
            Dict with extraction results, model used, and comparison stats
        """
        from app.genai.provider import GenAIProviderFactory, get_model_manager
        from app.genai.prompts import PromptManager
        
        # Get model manager for model info
        model_manager = get_model_manager()
        
        # Determine models to use
        if not primary_model:
            primary_model = model_manager.get_primary_model()
        if not secondary_model:
            secondary_model = model_manager.get_secondary_model()
        
        # Get regex-based results as baseline
        regex_results = cls.extract_all(text, source_url)
        
        # Build prompt
        prompt_manager = PromptManager(db_session=db_session, enable_rag=db_session is not None)
        prompts = prompt_manager.build_extraction_prompt(
            content=text,
            source_url=source_url,
            persona_key="threat_intelligence"
        )
        
        system_prompt = prompts["system"]
        user_prompt = prompts["user"]
        
        extraction_results = []
        
        # Extract with primary model
        try:
            logger.info("model_extraction_starting", model=primary_model)
            provider = GenAIProviderFactory.create(
                primary_model.split(":")[0] if ":" in primary_model else primary_model,
                model=primary_model.split(":")[1] if ":" in primary_model else None
            )
            response = await provider.generate(system_prompt, user_prompt, temperature=0.1)
            
            try:
                json_match = re.search(r'\{[\s\S]*\}', response)
                if json_match:
                    result = json.loads(json_match.group())
                    extraction_results.append({
                        "model": primary_model,
                        "iocs": result.get("iocs", []),
                        "ttps": result.get("ttps", []),
                        "atlas": result.get("atlas", []),
                        "ioc_count": len(result.get("iocs", [])),
                        "ttp_count": len(result.get("ttps", [])),
                        "total_score": len(result.get("iocs", [])) * 2 + len(result.get("ttps", []))
                    })
                    logger.info("model_extraction_complete", model=primary_model, 
                               iocs=len(result.get("iocs", [])), ttps=len(result.get("ttps", [])))
            except json.JSONDecodeError:
                logger.warning("model_extraction_parse_failed", model=primary_model)
        except Exception as e:
            logger.error("model_extraction_failed", model=primary_model, error=str(e))
        
        # Extract with secondary model if configured and different from primary
        if secondary_model and secondary_model != primary_model:
            try:
                logger.info("model_extraction_starting", model=secondary_model)
                provider = GenAIProviderFactory.create(
                    secondary_model.split(":")[0] if ":" in secondary_model else secondary_model,
                    model=secondary_model.split(":")[1] if ":" in secondary_model else None
                )
                response = await provider.generate(system_prompt, user_prompt, temperature=0.1)
                
                try:
                    json_match = re.search(r'\{[\s\S]*\}', response)
                    if json_match:
                        result = json.loads(json_match.group())
                        extraction_results.append({
                            "model": secondary_model,
                            "iocs": result.get("iocs", []),
                            "ttps": result.get("ttps", []),
                            "atlas": result.get("atlas", []),
                            "ioc_count": len(result.get("iocs", [])),
                            "ttp_count": len(result.get("ttps", [])),
                            "total_score": len(result.get("iocs", [])) * 2 + len(result.get("ttps", []))
                        })
                        logger.info("model_extraction_complete", model=secondary_model, 
                                   iocs=len(result.get("iocs", [])), ttps=len(result.get("ttps", [])))
                except json.JSONDecodeError:
                    logger.warning("model_extraction_parse_failed", model=secondary_model)
            except Exception as e:
                logger.error("model_extraction_failed", model=secondary_model, error=str(e))
        
        # Determine the best result
        if not extraction_results:
            # Fall back to regex if no GenAI results
            return {
                "iocs": regex_results.get("iocs", []),
                "ttps": regex_results.get("ttps", []),
                "atlas": regex_results.get("atlas", []),
                "model_used": "regex",
                "comparison": {
                    "models_compared": 0,
                    "winner_reason": "No GenAI models available, using regex extraction"
                }
            }
        
        # Sort by total score (IOCs weighted higher) and pick the best
        extraction_results.sort(key=lambda x: x["total_score"], reverse=True)
        best_result = extraction_results[0]
        
        # Format the best result
        formatted_iocs = []
        for ioc in best_result.get("iocs", []):
            formatted_iocs.append({
                "type": ioc.get("type", "unknown"),
                "value": ioc.get("value"),
                "confidence": ioc.get("confidence", 90),
                "evidence": ioc.get("context", ""),
                "intelligence_type": ExtractedIntelligenceType.IOC.value,
                "source": "genai",
                "extracted_by_model": best_result["model"]
            })
        
        formatted_ttps = []
        for ttp in best_result.get("ttps", []):
            formatted_ttps.append({
                "type": "ttp",
                "mitre_id": ttp.get("mitre_id"),
                "name": ttp.get("name"),
                "confidence": ttp.get("confidence", 85),
                "evidence": ttp.get("evidence", ""),
                "intelligence_type": ExtractedIntelligenceType.TTP.value,
                "source": "genai",
                "extracted_by_model": best_result["model"]
            })
        
        # Also add regex results that weren't found by GenAI
        genai_ioc_values = {i.get("value") for i in formatted_iocs}
        for regex_ioc in regex_results.get("iocs", []):
            if regex_ioc.get("value") not in genai_ioc_values:
                regex_ioc["source"] = "regex"
                regex_ioc["extracted_by_model"] = "regex"
                formatted_iocs.append(regex_ioc)
        
        genai_ttp_ids = {t.get("mitre_id") for t in formatted_ttps}
        for regex_ttp in regex_results.get("ttps", []):
            if regex_ttp.get("mitre_id") not in genai_ttp_ids:
                regex_ttp["source"] = "regex"
                regex_ttp["extracted_by_model"] = "regex"
                formatted_ttps.append(regex_ttp)
        
        # Build comparison info
        comparison = {
            "models_compared": len(extraction_results),
            "results": [
                {
                    "model": r["model"],
                    "ioc_count": r["ioc_count"],
                    "ttp_count": r["ttp_count"],
                    "score": r["total_score"]
                }
                for r in extraction_results
            ],
            "winner": best_result["model"],
            "winner_reason": f"{best_result['model']} extracted more IOCs ({best_result['ioc_count']}) and TTPs ({best_result['ttp_count']})"
        }
        
        logger.info("model_comparison_complete", 
                   winner=best_result["model"],
                   iocs=len(formatted_iocs),
                   ttps=len(formatted_ttps),
                   models_compared=len(extraction_results))
        
        return {
            "iocs": formatted_iocs,
            "ttps": formatted_ttps,
            "atlas": regex_results.get("atlas", []),
            "model_used": best_result["model"],
            "comparison": comparison
        }