"""
Comprehensive GenAI Attack Protection Catalog for Joti Platform.

Covers 51 attack vectors across 11 categories for securing GenAI operations
in threat intelligence workflows. Each attack includes detection regex patterns,
severity classification, and default guardrail configurations.

Categories:
 1. Prompt Injection (6 attacks)
 2. Jailbreaking (6 attacks)
 3. Data Extraction / Leakage (5 attacks)
 4. Hallucination / Fabrication (5 attacks)
 5. Token Smuggling (3 attacks)
 6. Encoding Attacks (5 attacks)
 7. Context Window Overflow (3 attacks)
 8. Output Manipulation (4 attacks)
 9. Chain-of-Thought Exploitation (4 attacks)
10. Multi-turn Manipulation (4 attacks)
11. Payload Embedding in Feeds (6 attacks)
"""
import re
from typing import Dict, List, Any, Optional


# ==============================================================================
# CATEGORY 1: PROMPT INJECTION
# ==============================================================================
PROMPT_INJECTION_ATTACKS = [
    {
        "id": "PI-001",
        "name": "Direct Instruction Override",
        "description": "Attempts to directly override or ignore system-level instructions",
        "severity": "critical",
        "patterns": [
            r"ignore\s+(all\s+)?previous\s+instructions",
            r"disregard\s+(all\s+)?(above|prior|previous)",
            r"forget\s+(everything|all)\s+(you|that|previously)",
            r"new\s+instructions?\s*:",
            r"override\s+(?:your|all|system)\s+(?:instructions|rules|guidelines)",
            r"do\s+not\s+follow\s+(?:the|your)\s+(?:original|previous|system)",
        ],
    },
    {
        "id": "PI-002",
        "name": "Indirect Prompt Injection via Content",
        "description": "Malicious instructions embedded in RSS/article content that gets fed to the model",
        "severity": "critical",
        "patterns": [
            r"<\|(?:im_start|im_end|system|assistant|user|endoftext)\|>",
            r"\[SYSTEM\]",
            r"\[INST\]",
            r"<<SYS>>",
            r"<\|(?:pad|sep|mask|cls)\|>",
            r"### (?:System|Instruction|Human|Assistant)\s*:",
        ],
    },
    {
        "id": "PI-003",
        "name": "Delimiter Injection",
        "description": "Uses formatting delimiters to separate user input from injected instructions",
        "severity": "high",
        "patterns": [
            r"---+\s*(?:ignore|forget|override|new\s+instruction)",
            r"={3,}\s*(?:system|instruction|override)",
            r"```\s*(?:system|instruction|ignore)",
            r"\*{3,}\s*(?:override|ignore|new)",
        ],
    },
    {
        "id": "PI-004",
        "name": "Context Manipulation",
        "description": "Attempts to redefine the AI's context, persona, or operating parameters",
        "severity": "high",
        "patterns": [
            r"you\s+are\s+now\s+(?:a|an)\s+(?:different|new|evil|unrestricted|uncensored)",
            r"from\s+now\s+on\s+you\s+(?:will|must|should)\s+(?:ignore|not\s+follow|bypass)",
            r"your\s+(?:new|updated|real)\s+(?:role|instructions|rules|purpose)\s+(?:are|is)",
            r"(?:switch|change)\s+to\s+(?:unrestricted|developer|admin|root)\s+mode",
        ],
    },
    {
        "id": "PI-005",
        "name": "Instruction Smuggling via Markdown",
        "description": "Hides instructions within markdown formatting that may be interpreted differently",
        "severity": "medium",
        "patterns": [
            r"<!--\s*(?:ignore|override|system|instruction)[\s\S]*?-->",
            r"\[(?:hidden|invisible|system)\]\(.*?(?:ignore|override).*?\)",
        ],
    },
    {
        "id": "PI-006",
        "name": "Multi-Language Injection",
        "description": "Uses non-English text to bypass English-focused safety patterns",
        "severity": "medium",
        "patterns": [
            r"(?:ignorar|ignorer|ignorieren)\s+(?:las|les|die)\s+(?:instrucciones|instructions|Anweisungen)",
            r"(?:olvidar|oublier|vergessen)\s+(?:todo|tout|alles)",
        ],
    },
]

# ==============================================================================
# CATEGORY 2: JAILBREAKING
# ==============================================================================
JAILBREAK_ATTACKS = [
    {
        "id": "JB-001",
        "name": "DAN (Do Anything Now)",
        "description": "Classic jailbreak pattern asking model to act as unrestricted entity",
        "severity": "critical",
        "patterns": [
            r"\bDAN\b.*(?:do\s+anything|no\s+restrictions|no\s+guidelines|no\s+rules)",
            r"do\s+anything\s+now",
            r"(?:act|pretend|respond)\s+(?:as|like)\s+(?:a\s+)?(?:DAN|unrestricted|uncensored)\s+(?:AI|model|version)",
            r"(?:jailbreak|jailbroken)\s+mode",
        ],
    },
    {
        "id": "JB-002",
        "name": "Role-Play Bypass",
        "description": "Uses role-playing to bypass safety restrictions",
        "severity": "high",
        "patterns": [
            r"pretend\s+you\s+(?:are|were)\s+(?:a|an)\s+(?:hacker|attacker|villain|evil|malicious)",
            r"role[-\s]?play\s+as\s+(?:a\s+)?(?:malicious|evil|dangerous|unrestricted)",
            r"(?:character|persona)\s+(?:that|who)\s+(?:doesn't|does\s+not)\s+(?:follow|have)\s+(?:rules|restrictions)",
            r"in\s+this\s+(?:story|scenario|fiction|game)\s+you\s+(?:are|play)\s+(?:a\s+)?(?:hacker|criminal)",
        ],
    },
    {
        "id": "JB-003",
        "name": "Developer/Debug Mode",
        "description": "Falsely claims developer or debug access to bypass filters",
        "severity": "high",
        "patterns": [
            r"(?:enable|activate|enter)\s+(?:developer|debug|admin|maintenance|test)\s+mode",
            r"(?:developer|admin|root|superuser)\s+(?:mode|access|override)\s+(?:enabled|activated|on)",
            r"I\s+(?:am|have)\s+(?:a|the)\s+(?:developer|admin|owner|creator)\s+(?:of|for)\s+this",
            r"(?:debug|dev|test)\s+token\s*:\s*",
        ],
    },
    {
        "id": "JB-004",
        "name": "Hypothetical Scenario Bypass",
        "description": "Uses hypothetical framing to extract forbidden content",
        "severity": "medium",
        "patterns": [
            r"(?:hypothetically|theoretically|in\s+theory)\s+(?:if|how)\s+(?:would|could)\s+(?:someone|you|one)",
            r"for\s+(?:educational|research|academic)\s+purposes\s+(?:only|how|explain)",
            r"(?:just|purely)\s+(?:curious|wondering)\s+(?:how|about)\s+(?:to|one\s+would)",
        ],
    },
    {
        "id": "JB-005",
        "name": "Emotional Manipulation",
        "description": "Uses emotional pressure or urgency to bypass safeguards",
        "severity": "medium",
        "patterns": [
            r"(?:my|someone's)\s+(?:life|safety|job)\s+(?:depends|is\s+at\s+stake)",
            r"(?:emergency|urgent|critical)\s*:?\s+(?:ignore|bypass|skip)\s+(?:safety|rules|filters)",
            r"(?:please|I\s+beg)\s+(?:you\s+)?(?:must|need\s+to)\s+(?:help|ignore|bypass)",
        ],
    },
    {
        "id": "JB-006",
        "name": "Reverse Psychology",
        "description": "Tells model what NOT to do, hoping it will comply through reverse logic",
        "severity": "low",
        "patterns": [
            r"(?:definitely|absolutely)\s+(?:do\s+not|don't)\s+(?:tell|show|give|reveal)\s+(?:me|us|anyone)\s+(?:how|the)",
            r"I\s+(?:know|understand)\s+you\s+(?:can't|cannot|won't)\s+(?:but|however|still)",
        ],
    },
]

# ==============================================================================
# CATEGORY 3: DATA EXTRACTION / LEAKAGE
# ==============================================================================
DATA_EXTRACTION_ATTACKS = [
    {
        "id": "DE-001",
        "name": "System Prompt Extraction",
        "description": "Attempts to extract system-level prompts or instructions",
        "severity": "high",
        "patterns": [
            r"(?:what|reveal|show|tell|repeat|display|output|print)\s+(?:me\s+)?(?:your|the)\s+(?:system\s+)?(?:prompt|instructions|rules|guidelines)",
            r"(?:copy|paste|recite)\s+(?:your|the)\s+(?:entire|full|complete)\s+(?:system\s+)?(?:prompt|instructions)",
            r"what\s+(?:were|are)\s+you\s+(?:told|instructed|programmed)\s+to\s+(?:do|say|follow)",
            r"verbatim\s+(?:copy|repeat|output)\s+of\s+(?:your|the)\s+(?:system|initial)",
        ],
    },
    {
        "id": "DE-002",
        "name": "Configuration Data Extraction",
        "description": "Probes for internal configuration details, API endpoints, or credentials",
        "severity": "high",
        "patterns": [
            r"(?:what|tell|show)\s+(?:me\s+)?(?:your|the)\s+(?:API|config|configuration|database|model)\s+(?:key|url|endpoint|details|settings)",
            r"(?:list|show|reveal)\s+(?:your|all)\s+(?:internal|backend|server)\s+(?:endpoints|urls|services)",
            r"(?:what|which)\s+(?:API|model|database)\s+(?:are\s+you|do\s+you)\s+(?:using|connected\s+to)",
        ],
    },
    {
        "id": "DE-003",
        "name": "Training Data Extraction",
        "description": "Attempts to extract or infer training data contents",
        "severity": "medium",
        "patterns": [
            r"(?:what|repeat)\s+(?:was|is)\s+(?:in\s+)?your\s+training\s+(?:data|set|examples|corpus)",
            r"(?:recite|reproduce|repeat)\s+(?:training|original)\s+(?:data|text|examples)",
            r"(?:complete|continue)\s+this\s+(?:exact|specific)\s+(?:text|phrase|paragraph)\s+from",
        ],
    },
    {
        "id": "DE-004",
        "name": "API Key/Credential Fishing",
        "description": "Attempts to obtain API keys, tokens, or credentials",
        "severity": "critical",
        "patterns": [
            r"(?:what|give|show|tell)\s+(?:me\s+)?(?:the|your)\s+(?:api|secret|access|auth)\s*[-_]?\s*(?:key|token|password|credential)",
            r"(?:print|output|display|echo)\s+(?:the\s+)?(?:environment|env)\s+(?:variables|vars)",
            r"(?:OPENAI|ANTHROPIC|GEMINI|OLLAMA|SECRET)\s*[-_]?\s*(?:KEY|TOKEN|URL|API)",
        ],
    },
    {
        "id": "DE-005",
        "name": "Internal URL/Network Probing",
        "description": "Attempts to discover internal network topology or services",
        "severity": "medium",
        "patterns": [
            r"(?:what|show|list|scan)\s+(?:internal|private|local)\s+(?:IPs|servers|services|endpoints|networks)",
            r"(?:192\.168|10\.\d|172\.(?:1[6-9]|2\d|3[01]))\.\d+\.\d+",
            r"(?:localhost|127\.0\.0\.1|0\.0\.0\.0)\s*:\s*\d+",
        ],
    },
]

# ==============================================================================
# CATEGORY 4: HALLUCINATION / FABRICATION
# ==============================================================================
HALLUCINATION_ATTACKS = [
    {
        "id": "HA-001",
        "name": "Fake CVE Fabrication",
        "description": "Model generates CVE IDs not present in the source material",
        "severity": "critical",
        "detection_type": "output",
        "check_function": "check_cve_grounding",
    },
    {
        "id": "HA-002",
        "name": "Fake IOC Generation",
        "description": "Model generates IP addresses, hashes, or domains not found in the source",
        "severity": "critical",
        "detection_type": "output",
        "check_function": "check_ioc_grounding",
    },
    {
        "id": "HA-003",
        "name": "Non-existent MITRE Technique IDs",
        "description": "Model generates MITRE ATT&CK or ATLAS IDs that don't exist in the official matrix",
        "severity": "high",
        "detection_type": "output",
        "check_function": "check_mitre_id_validity",
    },
    {
        "id": "HA-004",
        "name": "Fabricated Threat Actor Names",
        "description": "Model invents threat actor or APT group names not in the source",
        "severity": "high",
        "detection_type": "output",
        "check_function": "check_threat_actor_grounding",
    },
    {
        "id": "HA-005",
        "name": "Invented Statistics/Dates",
        "description": "Model generates specific dates, percentages, or statistics not in the source",
        "severity": "medium",
        "detection_type": "output",
        "check_function": "check_statistic_grounding",
    },
]

# ==============================================================================
# CATEGORY 5: TOKEN SMUGGLING
# ==============================================================================
TOKEN_SMUGGLING_ATTACKS = [
    {
        "id": "TS-001",
        "name": "Unicode Homoglyph Substitution",
        "description": "Uses Cyrillic/Greek lookalike characters to bypass keyword filters",
        "severity": "high",
        "patterns": [
            r"[\u0400-\u04FF]",  # Cyrillic block
            r"[\u0370-\u03FF]",  # Greek block
        ],
        "check_function": "check_homoglyphs",
    },
    {
        "id": "TS-002",
        "name": "Zero-Width Character Injection",
        "description": "Inserts invisible zero-width characters to break token boundaries",
        "severity": "high",
        "patterns": [
            r"[\u200b\u200c\u200d\u2060\ufeff]",
        ],
    },
    {
        "id": "TS-003",
        "name": "Invisible/Control Unicode Characters",
        "description": "Uses bidirectional override, soft hyphens, and other invisible characters",
        "severity": "medium",
        "patterns": [
            r"[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180e]",
            r"[\u2000-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u206f]",
            r"[\ufff0-\ufff8]",
        ],
    },
]

# ==============================================================================
# CATEGORY 6: ENCODING ATTACKS
# ==============================================================================
ENCODING_ATTACKS = [
    {
        "id": "EA-001",
        "name": "Base64 Encoded Instructions",
        "description": "Hides malicious instructions inside base64-encoded strings",
        "severity": "high",
        "patterns": [
            r"(?:decode|base64)\s*(?:this|the\s+following)?\s*:?\s*[A-Za-z0-9+/=]{30,}",
            r"(?:atob|btoa|b64decode)\s*\(",
        ],
        "check_function": "check_base64_injection",
    },
    {
        "id": "EA-002",
        "name": "ROT13/Hex Encoded Instructions",
        "description": "Uses ROT13 or hexadecimal encoding to hide instructions",
        "severity": "medium",
        "patterns": [
            r"(?:rot13|rot-13|caesar\s+cipher)\s*(?:decode|this|of)",
            r"\\x[0-9a-fA-F]{2}(?:\\x[0-9a-fA-F]{2}){5,}",
            r"0x[0-9a-fA-F]{2}(?:\s*0x[0-9a-fA-F]{2}){5,}",
        ],
    },
    {
        "id": "EA-003",
        "name": "URL-Encoded Payload",
        "description": "Uses percent-encoding to hide instructions",
        "severity": "medium",
        "patterns": [
            r"(?:%[0-9a-fA-F]{2}){10,}",
        ],
    },
    {
        "id": "EA-004",
        "name": "HTML Entity Encoded Instructions",
        "description": "Uses HTML character entities to hide text content",
        "severity": "medium",
        "patterns": [
            r"(?:&#\d{2,4};){5,}",
            r"(?:&#x[0-9a-fA-F]{2,4};){5,}",
        ],
    },
    {
        "id": "EA-005",
        "name": "Punycode Domain Obfuscation",
        "description": "Uses punycode (xn--) domains to mimic legitimate URLs",
        "severity": "medium",
        "patterns": [
            r"xn--[a-z0-9]{4,}\.",
        ],
    },
]

# ==============================================================================
# CATEGORY 7: CONTEXT WINDOW OVERFLOW
# ==============================================================================
OVERFLOW_ATTACKS = [
    {
        "id": "CO-001",
        "name": "Padding Attack",
        "description": "Excessive whitespace, newlines, or repeated characters to consume context tokens",
        "severity": "medium",
        "check_function": "check_input_padding",
    },
    {
        "id": "CO-002",
        "name": "Attention Dilution",
        "description": "Fills context with irrelevant content to make the model lose focus on key instructions",
        "severity": "medium",
        "check_function": "check_attention_dilution",
    },
    {
        "id": "CO-003",
        "name": "Context Poisoning",
        "description": "Injects conflicting context to confuse the model's understanding of the task",
        "severity": "high",
        "patterns": [
            r"(?:actually|correction|update)\s*:\s*the\s+(?:real|correct|true)\s+(?:instructions|rules|task)",
            r"(?:previous|earlier)\s+(?:context|information)\s+(?:was|is)\s+(?:wrong|incorrect|outdated)",
        ],
    },
]

# ==============================================================================
# CATEGORY 8: OUTPUT MANIPULATION
# ==============================================================================
OUTPUT_MANIPULATION_ATTACKS = [
    {
        "id": "OM-001",
        "name": "JSON Structure Injection",
        "description": "Injects JSON structures to manipulate parsed output fields",
        "severity": "high",
        "detection_type": "output",
        "patterns": [
            r'"(?:is_safe|is_blocked|approved|allowed|admin)"\s*:\s*(?:true|false)',
        ],
    },
    {
        "id": "OM-002",
        "name": "Markdown/HTML Injection in Output",
        "description": "Embeds HTML/script tags in model output that may be rendered unsafely",
        "severity": "high",
        "detection_type": "output",
        "patterns": [
            r"<script[\s>]",
            r"javascript\s*:",
            r"on(?:load|error|click|mouse(?:over|out))\s*=",
            r"<iframe[\s>]",
            r"<object[\s>]",
            r"<embed[\s>]",
        ],
    },
    {
        "id": "OM-003",
        "name": "Format String Attack",
        "description": "Injects format string specifiers to cause unexpected behavior",
        "severity": "medium",
        "patterns": [
            r"%[0-9]*[diouxXeEfFgGaAcspn%]{1}",
            r"\{[0-9]+\}",
        ],
    },
    {
        "id": "OM-004",
        "name": "SSRF via Model Output",
        "description": "Tricks the model into outputting internal URLs that may be fetched by downstream systems",
        "severity": "high",
        "detection_type": "output",
        "patterns": [
            r"https?://(?:localhost|127\.0\.0\.1|10\.\d|172\.(?:1[6-9]|2\d|3[01])|192\.168)",
            r"https?://(?:metadata|instance-data|internal)",
            r"https?://169\.254\.169\.254",
        ],
    },
]

# ==============================================================================
# CATEGORY 9: CHAIN-OF-THOUGHT EXPLOITATION
# ==============================================================================
COT_EXPLOITATION_ATTACKS = [
    {
        "id": "CT-001",
        "name": "Step-by-Step Bypass",
        "description": "Uses chain-of-thought prompting to gradually extract restricted information",
        "severity": "medium",
        "patterns": [
            r"(?:step\s+by\s+step|one\s+step\s+at\s+a\s+time)\s+(?:show|explain|walk|guide)\s+(?:me|us)\s+(?:how|through)",
            r"(?:first|start\s+by)\s+(?:listing|showing|revealing)\s+(?:the\s+)?(?:initial|first)\s+(?:part|step|instruction)",
        ],
    },
    {
        "id": "CT-002",
        "name": "Reasoning Chain Manipulation",
        "description": "Injects false premises into reasoning to reach invalid conclusions",
        "severity": "high",
        "patterns": [
            r"(?:given|assuming|since|because)\s+(?:that\s+)?(?:all|every|any)\s+(?:safety|restriction|rule|guardrail)\s+(?:is|are|has\s+been)\s+(?:removed|disabled|turned\s+off)",
            r"(?:logically|therefore|thus|hence)\s+you\s+(?:must|should|can|are\s+able\s+to)\s+(?:ignore|bypass|skip)",
        ],
    },
    {
        "id": "CT-003",
        "name": "Incremental Boundary Testing",
        "description": "Gradually pushes boundaries with each prompt to find the model's limits",
        "severity": "low",
        "patterns": [
            r"(?:can\s+you|are\s+you\s+able\s+to)\s+(?:tell|show|give)\s+(?:me\s+)?(?:a\s+little|slightly)\s+more",
            r"(?:what\s+about|how\s+about|now\s+try)\s+(?:something\s+)?(?:a\s+bit|slightly|somewhat)\s+(?:more|further|deeper)",
        ],
    },
    {
        "id": "CT-004",
        "name": "Recursive Self-Reference",
        "description": "Creates recursive self-referencing loops to confuse the model",
        "severity": "medium",
        "patterns": [
            r"(?:repeat|apply)\s+(?:this|the\s+(?:above|previous))\s+(?:instruction|rule|pattern)\s+(?:to|on|against)\s+(?:itself|your\s+own)",
            r"(?:process|evaluate|parse)\s+(?:your\s+own)\s+(?:output|response|answer)\s+(?:as|like)\s+(?:input|a\s+new\s+prompt)",
        ],
    },
]

# ==============================================================================
# CATEGORY 10: MULTI-TURN MANIPULATION
# ==============================================================================
MULTITURN_ATTACKS = [
    {
        "id": "MT-001",
        "name": "Conversation State Exploitation",
        "description": "Exploits state persistence between turns to build up permissions",
        "severity": "medium",
        "patterns": [
            r"(?:as\s+we|you)\s+(?:agreed|established|confirmed)\s+(?:earlier|before|previously)",
            r"(?:remember|recall)\s+(?:when\s+)?you\s+(?:said|agreed|confirmed)\s+(?:that|you\s+(?:would|could))",
            r"(?:continuing|building\s+on)\s+(?:our|the)\s+(?:previous|earlier)\s+(?:agreement|discussion|arrangement)",
        ],
    },
    {
        "id": "MT-002",
        "name": "Gradual Escalation",
        "description": "Starts with benign requests and gradually escalates to restricted content",
        "severity": "medium",
        "patterns": [
            r"(?:now|next)\s+(?:that\s+)?(?:you've|you\s+have)\s+(?:shown|done|confirmed)\s+(?:that|this)",
            r"(?:good|great|perfect)\s*[,!]\s*(?:now|next)\s+(?:can\s+you|please|let's)\s+(?:go|take\s+it)\s+(?:further|deeper|a\s+step\s+further)",
        ],
    },
    {
        "id": "MT-003",
        "name": "Trust Building Exploitation",
        "description": "Establishes false trust to lower safety boundaries",
        "severity": "low",
        "patterns": [
            r"(?:I'm|I\s+am)\s+(?:a|an|the)\s+(?:security\s+)?(?:researcher|analyst|professional|expert|admin|developer)\s+(?:at|from|with)",
            r"(?:I\s+have|I've\s+been)\s+(?:given|granted)\s+(?:special|admin|elevated)\s+(?:access|permission|clearance)",
        ],
    },
    {
        "id": "MT-004",
        "name": "Context Carry-over Attack",
        "description": "References fictional prior context that never existed",
        "severity": "medium",
        "patterns": [
            r"(?:in\s+our|from\s+the)\s+(?:last|previous|earlier)\s+(?:session|conversation|chat)\s+(?:you|we)\s+(?:agreed|discussed|established)",
            r"(?:session|conversation)\s+(?:ID|token|reference)\s*:?\s*[A-Za-z0-9]{8,}",
        ],
    },
]

# ==============================================================================
# CATEGORY 11: PAYLOAD EMBEDDING IN FEEDS
# ==============================================================================
PAYLOAD_EMBEDDING_ATTACKS = [
    {
        "id": "PE-001",
        "name": "Hidden Instructions in RSS Content",
        "description": "Malicious instructions hidden within RSS feed article text",
        "severity": "critical",
        "patterns": [
            r"AI\s*:\s*(?:ignore|override|disregard|forget)\s+(?:all|previous|your)",
            r"(?:IMPORTANT|NOTE|ATTENTION)\s*:\s*(?:ignore|skip|override)\s+(?:the\s+)?(?:extraction|analysis|rules)",
            r"(?:hidden|secret|embedded)\s+(?:instruction|command|directive)\s*:",
        ],
    },
    {
        "id": "PE-002",
        "name": "Invisible Text in HTML Articles",
        "description": "Uses CSS display:none, visibility:hidden, or tiny font to hide instructions in web content",
        "severity": "high",
        "patterns": [
            r"(?:display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0|opacity\s*:\s*0|color\s*:\s*(?:white|#fff(?:fff)?|transparent))",
            r"<(?:div|span|p)\s+[^>]*(?:hidden|aria-hidden\s*=\s*\"true\")[^>]*>",
        ],
    },
    {
        "id": "PE-003",
        "name": "Steganographic Text Commands",
        "description": "Commands hidden using first-letter-of-each-word, acrostics, or whitespace encoding",
        "severity": "medium",
        "check_function": "check_steganographic_content",
    },
    {
        "id": "PE-004",
        "name": "HTML Comment Injection",
        "description": "Malicious instructions hidden in HTML comments that may be passed to the model",
        "severity": "medium",
        "patterns": [
            r"<!--\s*(?:AI|LLM|GPT|model|system)\s*:\s*",
            r"<!--[\s\S]*?(?:ignore|override|extract|reveal|bypass)[\s\S]*?-->",
        ],
    },
    {
        "id": "PE-005",
        "name": "Metadata/EXIF Instruction Embedding",
        "description": "Hides instructions in image EXIF data, PDF metadata, or document properties",
        "severity": "low",
        "patterns": [
            r"(?:EXIF|metadata|properties)\s*:\s*(?:ignore|override|instructions)",
        ],
    },
    {
        "id": "PE-006",
        "name": "Feed-Level XML Injection",
        "description": "Injects malicious content through RSS/Atom XML elements or CDATA sections",
        "severity": "high",
        "patterns": [
            r"<!\[CDATA\[[\s\S]*?(?:ignore|override|system|instruction)[\s\S]*?\]\]>",
            r"<(?:content|summary|description)[^>]*>[\s\S]*?(?:\[SYSTEM\]|<\|im_start\|>)",
        ],
    },
]


# ==============================================================================
# MASTER CATALOG
# ==============================================================================
GENAI_ATTACK_CATALOG: Dict[str, List[Dict]] = {
    "prompt_injection": PROMPT_INJECTION_ATTACKS,
    "jailbreaking": JAILBREAK_ATTACKS,
    "data_extraction": DATA_EXTRACTION_ATTACKS,
    "hallucination": HALLUCINATION_ATTACKS,
    "token_smuggling": TOKEN_SMUGGLING_ATTACKS,
    "encoding_attacks": ENCODING_ATTACKS,
    "context_overflow": OVERFLOW_ATTACKS,
    "output_manipulation": OUTPUT_MANIPULATION_ATTACKS,
    "chain_of_thought": COT_EXPLOITATION_ATTACKS,
    "multi_turn": MULTITURN_ATTACKS,
    "payload_embedding": PAYLOAD_EMBEDDING_ATTACKS,
}


# ==============================================================================
# UTILITY FUNCTIONS
# ==============================================================================

_compiled_input_patterns: Optional[List[re.Pattern]] = None
_compiled_output_patterns: Optional[List[re.Pattern]] = None


def get_all_input_patterns() -> List[re.Pattern]:
    """Compile and cache all input-side detection regex patterns."""
    global _compiled_input_patterns
    if _compiled_input_patterns is not None:
        return _compiled_input_patterns

    patterns = []
    for _category, attacks in GENAI_ATTACK_CATALOG.items():
        for attack in attacks:
            if attack.get("detection_type") == "output":
                continue
            for p in attack.get("patterns", []):
                try:
                    patterns.append(re.compile(p, re.IGNORECASE))
                except re.error:
                    pass
    _compiled_input_patterns = patterns
    return patterns


def get_all_output_patterns() -> List[re.Pattern]:
    """Compile and cache all output-side detection regex patterns."""
    global _compiled_output_patterns
    if _compiled_output_patterns is not None:
        return _compiled_output_patterns

    patterns = []
    for _category, attacks in GENAI_ATTACK_CATALOG.items():
        for attack in attacks:
            if attack.get("detection_type") != "output":
                continue
            for p in attack.get("patterns", []):
                try:
                    patterns.append(re.compile(p, re.IGNORECASE))
                except re.error:
                    pass
    _compiled_output_patterns = patterns
    return patterns


def get_catalog_stats() -> Dict[str, Any]:
    """Return summary statistics about the catalog."""
    total = sum(len(attacks) for attacks in GENAI_ATTACK_CATALOG.values())
    by_severity = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for attacks in GENAI_ATTACK_CATALOG.values():
        for attack in attacks:
            sev = attack.get("severity", "medium")
            by_severity[sev] = by_severity.get(sev, 0) + 1

    return {
        "total_attacks": total,
        "categories": len(GENAI_ATTACK_CATALOG),
        "by_category": {k: len(v) for k, v in GENAI_ATTACK_CATALOG.items()},
        "by_severity": by_severity,
    }


def get_default_guardrail_seeds() -> List[Dict[str, Any]]:
    """Generate guardrail DB seed entries from the catalog for pre-populating the database."""
    seeds = []
    for category, attacks in GENAI_ATTACK_CATALOG.items():
        all_patterns = []
        severities = set()
        for attack in attacks:
            all_patterns.extend(attack.get("patterns", []))
            severities.add(attack.get("severity", "medium"))

        highest_severity = "critical" if "critical" in severities else (
            "high" if "high" in severities else "medium"
        )
        action = "reject" if highest_severity == "critical" else "log"

        seeds.append({
            "name": f"GenAI Shield: {category.replace('_', ' ').title()}",
            "description": f"Protects against {len(attacks)} attack vectors in the '{category.replace('_', ' ')}' category. Severity: {highest_severity}.",
            "type": "prompt_injection",
            "config": {
                "category": category,
                "patterns": all_patterns,
                "attack_ids": [a["id"] for a in attacks],
                "attack_count": len(attacks),
                "severity": highest_severity,
            },
            "action": action,
            "max_retries": 0,
            "is_active": True,
        })
    return seeds


def match_input_attack(text: str) -> Optional[Dict[str, Any]]:
    """Check text against all input patterns and return the first matching attack info."""
    text_lower = text.lower()
    for category, attacks in GENAI_ATTACK_CATALOG.items():
        for attack in attacks:
            if attack.get("detection_type") == "output":
                continue
            for p in attack.get("patterns", []):
                try:
                    if re.search(p, text_lower, re.IGNORECASE):
                        return {
                            "attack_id": attack["id"],
                            "attack_name": attack["name"],
                            "category": category,
                            "severity": attack.get("severity", "medium"),
                            "description": attack.get("description", ""),
                        }
                except re.error:
                    pass
    return None
