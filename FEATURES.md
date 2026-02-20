# J.O.T.I — Platform Feature Reference

> **J.O.T.I** (Jyoti Open Threat Intelligence) is an enterprise-grade Threat Intelligence Platform for SOC teams, threat analysts, and incident responders.
>
> **Version**: Current · **Last updated**: February 2026

---

## Table of Contents

1. [Feed Aggregation & Ingestion](#1-feed-aggregation--ingestion)
2. [Intelligence Extraction](#2-intelligence-extraction)
3. [Threat Intelligence Center](#3-threat-intelligence-center)
4. [Threat Actor Profiles](#4-threat-actor-profiles)
5. [Article Management & Feeds View](#5-article-management--feeds-view)
6. [Hunt Query Generation](#6-hunt-query-generation)
7. [GenAI Integration](#7-genai-integration)
8. [Watchlist & Alerting](#8-watchlist--alerting)
9. [Admin Panel](#9-admin-panel)
10. [Authentication & Security](#10-authentication--security)
11. [Reports & Export](#11-reports--export)
12. [Frontend & UX](#12-frontend--ux)
13. [Infrastructure & API](#13-infrastructure--api)

---

## 1. Feed Aggregation & Ingestion

### Source Library (230+ feeds)

230 curated cybersecurity RSS/Atom feed sources across 15+ categories:

- **Government & CERT**: CISA, NCSC UK, ASD ACSC, Canadian CCCS, ENISA, BSI Germany, ANSSI France, CERT NZ, CERT-EU, FBI IC3, NSA Cybersecurity Advisories, INTERPOL Cybercrime
- **Core TI Vendors**: Mandiant, CrowdStrike, Palo Alto Unit 42, Recorded Future, SentinelOne, Secureworks, Digital Shadows, Symantec, Bitdefender, F-Secure, Proofpoint, Zscaler, Huntress, ThreatConnect, Anomali, Volexity, Permiso Security
- **Vendor Patches & Advisories**: Microsoft MSRC, Apple, Chrome, Mozilla, Oracle, Red Hat, Ubuntu, Debian, Cisco, VMware, CISA KEV (Known Exploited Vulnerabilities)
- **Malware Analysis**: VirusTotal, Any.run, Intezer, ReversingLabs, JPCERT, MalwareMustDie, Joe Security, Hatching, Binarly Research
- **Cloud Security**: AWS Security, Azure Security, GCP Security, Prisma Cloud, Lacework, Wiz Research, Orca Security, Snyk, Sysdig Threat Research
- **ICS/OT Security**: Dragos, Claroty, Nozomi Networks, Armis, Forescout
- **Identity Security**: CyberArk, Okta Security, Ping Identity
- **Ransomware Tracking**: ransomware.live, Emsisoft, Coveware, No More Ransom
- **Data Breach**: HaveIBeenPwned, DataBreaches.net, Privacy Affairs, ITRC
- **Threat Hunting / DFIR**: The DFIR Report, Red Canary, MITRE ATT&CK Blog, AttackIQ, Velociraptor
- **Dark Web / OSINT**: Intel 471, Flashpoint, SpyCloud, BreachSense, DomainTools, RiskIQ, Censys, Shodan, VulDB
- **Vulnerability Research**: Google Project Zero, Google TAG Blog, GitHub Security Lab, Exploit-DB, Full Disclosure, Bugtraq, CERT/CC, Quarkslab, Eclypsium
- **Sector-Specific ISACs**: Health-ISAC, FS-ISAC, E-ISAC
- **SOC Platforms**: Splunk Security, Elastic Security, Chronicle (Google SecOps)
- **Academic / Research**: SANS Internet Storm Center, Black Hat, DEF CON, IEEE S&P
- **Security Consultancies**: NCC Group Research, Synacktiv, Cado Security, Meta Security
- **Media**: BleepingComputer, Krebs on Security, Dark Reading, The Hacker News, SecurityWeek, Wired Security, Ars Technica, ZDNet, SC Magazine, CSO Online, Help Net Security, Naked Security, Graham Cluley
- **Podcasts**: The CyberWire, Risky Business, Security Now, Darknet Diaries, SANS StormCast

### Feed Management
- Add/edit/delete feed sources (name, URL, category, description)
- Per-source configurable refresh intervals (5 min to 24 hours) or global scheduler interval
- Per-source `high_fidelity` flag for automatic deep analysis on ingestion
- Per-source `auto_fetch_enabled` toggle
- Custom HTTP headers per source for authenticated/paywalled feeds
- Content deduplication via SHA-256 hashing (no duplicate articles)
- Manual "Ingest Now" button per source with live feedback
- Bulk enable/disable sources

### Background Scheduler
- Thread-based `FeedScheduler` runs as a daemon on app startup
- `feed_ingestion` job: ingests all active enabled sources, starts immediately on launch
- `log_cleanup` job: deletes GenAI request logs older than 30 days (runs daily)
- Configurable interval via `FEED_REFRESH_INTERVAL_MINUTES` env var (default: 60 min)
- Scheduler can be disabled entirely via `ENABLE_AUTOMATION_SCHEDULER=false`
- Admin can view job status, last-run time, run count, and manually trigger jobs

### Intel Ingestion Panel
Direct upload and URL ingestion from Threat Intelligence Center → Intel Ingestion:
- **Document upload**: PDF, Word (DOCX/DOC), Excel, CSV, HTML, plain text — up to 50 MB
- GenAI reads each file like a TI researcher: extracts IOCs (12 types), MITRE TTPs, threat actors, CVEs, and infrastructure
- **Feed / URL ingestion**: add any RSS/Atom feed or URL; Joti fetches, parses, and ingests continuously
- Ingestion history log showing status (success/duplicate/error), file name, IOC/TTP counts extracted
- Supported source categories: CISA/MITRE advisories, vendor blogs, IOC feeds (Abuse.ch, URLhaus, OTX), any RSS/Atom cybersecurity feed

---

## 2. Intelligence Extraction

### IOC Types (12 types)

| Type | Examples |
|------|---------|
| IP (v4/v6) | `192.168.1.1`, `2001:db8::1` |
| Domain | `evil.com`, `c2.attacker.net` |
| URL | `http://mal.ru/payload.exe` |
| Hash MD5 | `d41d8cd98f00b204e9800998ecf8427e` |
| Hash SHA1 | `da39a3ee5e6b4b0d3255bfef95601890afd80709` |
| Hash SHA256 | `e3b0c44298fc1c149afb...` |
| Email | `phish@evil.com` |
| CVE | `CVE-2024-12345` |
| Registry Key | `HKLM\SOFTWARE\malware` |
| File Path | `C:\Windows\Temp\backdoor.exe` |
| MITRE ATT&CK TTP | `T1566.001`, `T1078` |
| MITRE ATLAS TTP | `AML.T0043`, `AML.T0012` |

### Dual Extraction Pipeline
- **Regex pipeline**: fast, reliable, runs on every article
- **GenAI pipeline**: context-aware deep extraction with LLM models
  - **Source domain filtering**: never extracts the article's own publication domain as an IOC — `bleepingcomputer.com` won't appear as a C2 domain
  - **Anti-hallucination guardrails**: "ONLY extract indicators explicitly mentioned in the text. NEVER fabricate."
  - Runs automatically for high-fidelity sources or watchlist-matched articles

### MITRE ATT&CK Mapping
- Accurate tactic-to-technique mapping using a complete lookup table (695+ Enterprise techniques + sub-techniques)
- Supports all 14 ATT&CK tactics: Reconnaissance → Impact
- Multi-tactic techniques duplicated across relevant tactic columns
- Technique names and MITRE URLs stored alongside IDs
- Full heatmap visualization in Threat Intelligence Center

### MITRE ATLAS Mapping
- Complete ATLAS technique catalog (42 techniques across 12 AI-specific tactics)
- Tactics: Reconnaissance, Resource Development, ML Model Access, Initial Access, Execution, Persistence, Defense Evasion, Discovery, Collection, ML Attack Staging, Exfiltration, Impact
- `AML.TXXXX` ID prefix distinguishes ATLAS from ATT&CK

### Intelligence Metadata
- **Confidence scoring** (0–100) per extracted indicator
- **Evidence linking**: stores the source sentence/paragraph containing each IOC
- **Review workflow**: mark as reviewed, flag false positives, add analyst notes
- Bulk review and bulk false-positive actions
- Source category tagging: open_source, external, internal

---

## 3. Threat Intelligence Center

Seven-panel intelligence workspace accessible from the main navigation.

### Panel 1: Command Center
- Summary stat cards: IOCs, TTPs, Threat Actors, MITRE Techniques, Total Intelligence
- Top MITRE ATT&CK techniques bar chart (top 10 with frequency bars)
- Active watchlist keywords display
- Time range filter (24h, 7d, 30d, 90d, All) shared across all panels
- Source category filter: All Sources, Open Source, External TI, Internal

### Panel 2: IOC Explorer
- Paginated table of all extracted intelligence (50 per page)
- Filter by intel type (IOC / TTP / Threat Actor / ATLAS) and IOC sub-type
- Full-text search across values, MITRE IDs, and article titles
- Expandable rows: evidence, confidence bar, linked article, hunt query, MITRE ID
- Bulk select → mark reviewed / mark false positive / delete
- Copy-to-clipboard on any value
- Link to originating article detail drawer
- Manual add (form) + bulk text import (one IOC per line with type,confidence)
- CSV export of current filtered view

### Panel 3: MITRE ATT&CK / ATLAS Heatmap
- Toggle between ATT&CK Enterprise and MITRE ATLAS frameworks
- Heatmap grid: tactics as columns, techniques as rows
- Color intensity by article frequency (5-level scale: 0 / 1-2 / 3-5 / 6-10 / 11+)
- Hover tooltip: technique name, ID, MITRE URL, article count
- ATT&CK tactic order: Reconnaissance → Impact (14 columns)
- ATLAS tactic order: Reconnaissance → Impact (12 AI-specific columns)

### Panel 4: Threat Actor Profiles *(new)*
See [Section 4: Threat Actor Profiles](#4-threat-actor-profiles) for full details.

### Panel 5: Cross-Source Correlation
- **Guided workflow banner** explaining how correlation works
- Scans all articles in the selected time window for shared indicators
- **Shared IOCs**: indicators appearing in 2+ articles with article titles
- **Article Clusters**: groups of articles sharing 3+ IOCs (likely same campaign)
- Stats: total shared IOCs, total clusters
- Last-run timestamp and time window displayed
- Copy-to-clipboard on any shared IOC

### Panel 6: AI Threat Landscape Analysis
- **Guided workflow banner** with step-by-step instructions
- **8 focus area cards** with icon + description:
  - Full Landscape, Ransomware, APT/Nation-State, Vulnerabilities, Phishing/BEC, Supply Chain, Cloud Security, Malware/Tooling
- Click any card to generate a targeted brief for that focus area
- AI reads all extracted intelligence in the time window and produces plain-language analysis
- Markdown-rendered output with headers, bold, code spans, lists
- Last-analysis metadata (time, focus, window) shown in result header

### Panel 7: Intel Ingestion
- Document upload dropzone (PDF, Word, Excel, CSV, HTML, TXT — 50 MB max)
- GenAI extraction pipeline processes each file like a TI researcher
- Feed/URL ingestion form: name, URL, feed type (RSS/Atom/JSON/HTML)
- Ingestion history log (up to 50 most recent operations)
- How-it-works info banner when history is empty

---

## 4. Threat Actor Profiles

Dedicated threat actor profiling system with alias resolution and GenAI enrichment.

### Profile Data Model
Each `ThreatActorProfile` record stores:
- **Name** (canonical/primary name)
- **Aliases** — all known names for the actor (JSON array)
- **Description** — narrative summary of the group
- **Origin Country** — attributed nation-state or region
- **Motivation** — financial, espionage, hacktivism, destructive, unknown
- **Actor Type** — APT, ransomware, cybercriminal, hacktivist, nation-state, unknown
- **First/Last Seen** — date range of activity in ingested articles
- **Is Active** — current activity status
- **Target Sectors** — list of targeted industries (government, finance, healthcare, etc.)
- **TTPs** — MITRE ATT&CK technique IDs observed for this actor
- **Tools** — known malware families and tooling
- **Infrastructure** — C2 domains/IPs associated with the actor
- **Campaigns** — named operation/campaign identifiers
- **IOC Count / Article Count / TTP Count** — derived statistics
- **GenAI Confidence** — confidence score from last enrichment
- **Is Verified** — manually reviewed and confirmed flag

### Alias Resolution (20+ actor groups pre-configured)
The sync engine resolves all variant names to canonical primaries:

| Canonical Name | Known Aliases |
|----------------|---------------|
| Scattered Spider | UNC3944, Roasted 0ktapus, Muddled Libra, Starfraud, Oktapus |
| APT28 | Fancy Bear, Sofacy, Strontium, Pawn Storm, Sednit, Forest Blizzard |
| APT29 | Cozy Bear, The Dukes, Midnight Blizzard, Nobelium, Dark Halo |
| Lazarus Group | Hidden Cobra, Guardians of Peace, APT38, Zinc |
| APT41 | Double Dragon, Barium, Winnti, Bronze Atlas, Wicked Panda |
| FIN7 | Carbanak, Navigator Group, ITG14, Carbon Spider |
| Conti | Wizard Spider, Gold Ulrick, ITG23 |
| LockBit | Gold Mystic, Syrphid |
| BlackCat | ALPHV, Noberus |
| REvil | Sodinokibi, Gold Southfield |
| Sandworm | Voodoo Bear, Telebots, Iron Viking, Seashell Blizzard |
| Turla | Snake, Uroburos, Waterbug, Venomous Bear, Krypton |
| Kimsuky | Thallium, Velvet Chollima, Black Banshee, TA406 |
| Volt Typhoon | Bronze Silhouette, DEV-0391, Vanguard Panda |
| Salt Typhoon | GhostEmperor, FamousSparrow |
| LAPSUS$ | DEV-0537, Strawberry Tempest |
| + 5 more | Cl0p, TA505, Equation Group, DarkSide, etc. |

### Sync from Intelligence
- `POST /api/threat-actors/sync` groups all extracted `THREAT_ACTOR` intel items by canonical name
- Creates new profiles for actors not yet profiled
- Updates existing profiles: article count, last-seen date, merges new aliases
- Additional aliases discovered in article metadata are automatically added

### GenAI Enrichment
- `POST /api/threat-actors/enrich/{id}` sends actor name to GenAI
- Returns structured JSON: aliases, description, origin, motivation, actor type, target sectors, TTPs, tools
- Each enriched field only overwrites if the profile field is empty (preserves manual edits)
- Enrichment metadata: timestamp, source (genai), confidence score

### Profile UI
- **Filter bar**: search by name/alias, actor type dropdown, active/inactive toggle
- **Profile cards** showing: name, verified badge, actor type, active status dot, origin country, motivation (with emoji), last-seen timestamp, aliases as yellow tags, article/TTP/IOC stats
- **Expanded card view** (click to expand):
  - Full alias list
  - Target sectors (red tags)
  - MITRE ATT&CK TTPs (orange mono tags, up to 12 shown)
  - Known tools/malware (yellow tags)
  - Infrastructure IOCs
  - GenAI enrichment provenance
  - **Enrich with GenAI** button per profile
  - **Copy Intel** button — copies all intel items for the actor to clipboard
- **Sync from Intel** button — re-syncs all profiles from current extracted intelligence

---

## 5. Article Management & Feeds View

### Status Workflow
```
NEW → IN_ANALYSIS → NEED_TO_HUNT → HUNT_GENERATED → REVIEWED → ARCHIVED
```

### Feed Views
- **List view**: table with pagination (25/50/100 per page)
- **Card view**: masonry grid with infinite scroll (IntersectionObserver)
- Toggle between views, preference persisted per session

### Filtering & Search
- Source filter (select any feed source)
- Status filter, date range filter, priority filter, analyst filter
- Unread-only filter, watchlist-match filter
- Full-text search across title and content (debounced 300ms)
- Multi-dimension — all filters combine with AND logic

### Sidebar Source Filter *(new)*
- Clicking any source name in the sidebar's **Org Feeds** section navigates to Feeds with that source pre-filtered
- URL parameter based (`?source_id=N`) — deep-linkable
- Active source banner shown above filter chips with Clear button
- All other filters (date range, unread, watchlist) continue to apply on top of the source filter

### Article Detail Drawer
Slide-in panel with full article content and tools:
- Full article content with HTML rendering
- AI-generated executive summary + technical summary
- Extracted IOCs / TTPs / Threat Actors list
- Related articles (by shared IOCs)
- Hunt queries (XSIAM, KQL, SPL, GraphQL)
- Analyst comments
- Status transition buttons
- Bookmark + read/unread toggle
- Analyst assignment
- High-priority flag

### Sidebar Feed Navigation
- **Org Feeds**: organization-wide feed sources (collapsible, scrollable) — each is a deep link to filtered view
- **My Feeds**: user-specific saved feed filters (collapsible)
- Source favicon display
- Active feed highlighted
- Lean sidebar: `w-44` expanded, `w-14` collapsed

### Bookmarks & Read Tracking
- Bookmark any article (visible in profile)
- Mark as read/unread
- Read status tracked per user

---

## 6. Hunt Query Generation

### Supported Platforms

| Platform | Language | Use Case |
|----------|----------|----------|
| Palo Alto XSIAM | XQL | EDR/SIEM correlation |
| Microsoft Defender | KQL | M365 Defender / Sentinel |
| Splunk | SPL | Splunk Enterprise/Cloud |
| Wiz | GraphQL | Cloud security posture |

### Query Lifecycle
- AI generates query from extracted IOCs + TTPs + article context
- Query versioning: full parent-child history chain per article
- Manual editor for review and adjustment before execution
- Hunt execution tracking: run status, results count, findings
- ServiceNow ticket auto-creation from hunt findings (via connector)

---

## 7. GenAI Integration

### Supported Models

| Provider | Models |
|----------|--------|
| OpenAI | GPT-4o, GPT-4-turbo, GPT-4, GPT-3.5-turbo |
| Anthropic Claude | claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5, claude-3-5-sonnet |
| Google Gemini | gemini-1.5-pro, gemini-1.5-flash, gemini-pro |
| Ollama (local) | Any model: llama3, mistral, phi3, gemma, codellama, etc. |

### AI Functions
- **Article Summarization**: executive summary (C-level), technical summary (analyst-level)
- **IOC/TTP Extraction**: GenAI-enhanced deep extraction with context awareness
- **Threat Actor Enrichment**: aliases, origin, motivation, TTPs, tools, target sectors
- **Hunt Query Generation**: platform-specific queries from extracted intelligence
- **Threat Landscape Analysis**: AI brief across all intelligence in a selected time window

### Per-function Model Assignment
- Configure which model handles each function (summarization, extraction, hunting, landscape, enrichment)
- Independent provider selection per function

### Ollama Integration
- In-app Ollama setup wizard in Admin → AI Engine
- Model library browser with pull-by-name
- Connection test against host or Docker network
- Docker default: `http://host.docker.internal:11434` (connects to Ollama on the host machine, not the container loopback)

### Prompt Engineering
- Database-backed prompt library with version history
- Template variable system with typed slots (`{{article_content}}`, `{{iocs}}`, etc.)
- Persona/role instructions per prompt
- Preview rendered prompts with sample values

### Guardrails — GenAI Security (51 attack protections)

Comprehensive protection across 11 attack categories:

| Category | Attacks | Examples |
|----------|---------|---------|
| Prompt Injection | 6 | Direct override, indirect via article content, delimiter injection, context manipulation, instruction smuggling, multi-language |
| Jailbreaking | 6 | DAN, role-play bypass, character simulation, developer mode, hypothetical scenario, base64 jailbreak |
| Data Extraction / Leakage | 5 | System prompt extraction, training data extraction, config extraction, API key fishing, internal URL probing |
| Hallucination / Fabrication | 6 | Fake CVEs, fake IOCs, non-existent MITRE IDs, fake threat actors, fabricated timestamps, invented URLs |
| Token Smuggling | 3 | Unicode homoglyphs, zero-width characters, invisible unicode |
| Encoding Attacks | 5 | Base64, ROT13/hex, URL encoding, HTML entities, punycode |
| Context Window Overflow | 3 | Padding attack, attention dilution, context poisoning |
| Output Manipulation | 4 | JSON injection, markdown/HTML injection, format string attack, response framing |
| Chain-of-Thought Exploitation | 4 | Step-by-step bypass, reasoning manipulation, logic chain abuse, recursive instruction |
| Multi-turn Manipulation | 4 | Conversation state exploitation, gradual escalation, context carry-over, trust building |
| Payload Embedding in Feeds | 6 | Hidden instructions in RSS, invisible text in HTML, steganographic commands, comment injection, metadata manipulation |

**Guardrail Checks (7 types)**:
1. PII detection
2. Prompt injection detection (regex + 51-attack catalog patterns)
3. Token smuggling detection (zero-width chars, homoglyphs)
4. Encoding attack detection
5. Length validation (min/max tokens)
6. Toxicity / forbidden keywords
7. IOC grounding + MITRE ID validity (output-side validation)

**Guardrail Management**:
- Full CRUD GUI per guardrail rule
- Toggle individual guardrails on/off (active/inactive)
- **Bulk Export**: download all guardrails as JSON
- **Bulk Import**: upload JSON file — skip or overwrite existing rules by name
- **Seed Catalog**: one-click button to pre-populate from the 51-attack security catalog

### Execution Logging
- Every GenAI call tracked: prompt, response, model, tokens, cost, response time
- Guardrail pass/fail recorded per execution
- Admin "Execution Logs" tab: filter by function, date, failed-only
- Expandable log entries with full prompt/response metadata

---

## 8. Watchlist & Alerting

### Keyword Management
- Global watchlist managed by admins (shared across all users)
- Personal user-level keywords (private)
- Categories: TTP, Threat Actor, Attack Type, Vulnerability, Malware, Custom

### Automatic Processing
- All ingested articles scanned against active keywords on ingest
- Matched articles automatically flagged as high priority
- Triggers auto-extraction and auto-summarization pipeline
- High-priority notification to matched analyst or owner

### Notifications
- In-app notifications
- Email notifications (SMTP configurable)
- Slack notifications (via webhook connector)
- PagerDuty alerting for critical matches

---

## 9. Admin Panel

Navigation: **Sources · Access Control · Connectors · AI Engine · Audit Logs · Platform**

### Sources Management
- Add/edit/delete/toggle feed sources
- Per-source: name, URL, category, refresh interval, high-fidelity flag, auto-fetch toggle
- "Ingest Now" button per source with live feedback
- Bulk operations (enable/disable/delete)

### Access Control (tabbed)

**Users tab**:
- Create/edit/delete users
- Assign roles (Admin, Analyst, Engineer, Manager, Executive, Viewer)
- Per-user permission overrides (grant or deny specific permissions)
- Force password reset, account activate/deactivate

**Roles & Permissions tab**:
- 12 canonical permissions across 3 groups:
  - **Core Access**: `articles:read`, `articles:export`, `articles:analyze`
  - **Sources & Feeds**: `sources:read`, `sources:manage`, `watchlist:read`, `watchlist:manage`
  - **Administration**: `users:manage`, `audit:read`, `admin:genai`, `admin:rbac`, `admin:system`
- Role cards with inline permission toggle switches
- Role impersonation for admin testing

### Connectors
- Categories: SIEM, EDR, Cloud Security, Sandbox, Enrichment, Notification
- Platforms: Microsoft Sentinel, Splunk, CrowdStrike, SentinelOne, Wiz, Prisma Cloud, VirusTotal, Shodan, Slack, PagerDuty, ServiceNow
- Template-based config with API key management (AES-encrypted at rest)
- Connection test per connector
- Execution logs per connector

### AI Engine (tabbed)

**Provider Setup tab**:
- Configure active GenAI provider (OpenAI, Claude, Gemini, Ollama)
- API keys and endpoint URLs per provider
- Model selection per function
- Ollama wizard: browse model library, pull models, test connection

**Functions & Logs tab**:
- View all GenAI function-to-model mappings
- Create/update function configs
- Execution log browser (all or per-function, filter by date/status/failed)

**Guardrails tab**:
- Full CRUD for guardrail rules
- Toggle active/inactive per rule
- Export all as JSON / Import from JSON file
- Seed from 51-attack security catalog

**Skills tab**:
- Manage AI skills (composable multi-step GenAI workflows)

**Prompts tab**:
- Database-backed prompt library
- Version history per prompt
- Template variable editor

### Audit Logs

- **20+ event types**: LOGIN, LOGOUT, REGISTRATION, PASSWORD_CHANGE, ARTICLE_LIFECYCLE, BOOKMARK, EXTRACTION, CONNECTOR_CONFIG, HUNT_TRIGGER, NOTIFICATION, REPORT_GENERATION, RBAC_CHANGE, SYSTEM_CONFIG, GENAI_SUMMARIZATION, KNOWLEDGE_BASE, SCHEDULED_TASK, ADMIN_ACTION, WATCHLIST_CHANGE, FEED_MANAGEMENT, SEARCH
- Category filters: Authentication, Articles, Intelligence, GenAI, Admin, Content
- Sub-type filtering within categories
- Search by action text, user email/username
- Date range filtering
- Expandable log entries: event ID, user, IP, correlation ID, timestamp, resource, JSON details
- IDOR protection: non-admins see only their own logs

### Platform (tabbed)

**Analytics tab**:
- Clickable summary tiles (navigate to filtered views): Total Articles, Active Sources, IOCs, TTPs, Watchlist Hits, Active Users
- Intelligence pipeline flow visualization
- Daily article ingestion bar chart (last 14 days)
- Articles by source breakdown (top 10, clickable → filtered feeds)
- Article status breakdown (clickable chips → filtered feeds)
- User engagement table with search, sorting, per-user drill-down
- CSV data export with date range and user filters

**System Monitoring tab**:
- Scheduler job status (last run, next run, run count, status)
- Manual job trigger buttons
- Database statistics

**Settings tab**:
- Platform name, version, environment
- Email / SMTP configuration
- Session and security settings

---

## 10. Authentication & Security

### Authentication Methods
- Local email/password with **Argon2** password hashing
- **OAuth 2.0**: Google SSO, Microsoft SSO
- **SAML 2.0**: Okta, Azure AD / Entra ID, ADFS
- **TOTP/MFA**: optional two-factor authentication (OTP secrets AES-encrypted in DB)
- JWT access tokens (30 min) + refresh tokens (7 days) with blacklist on logout

### Security Hardening

| Layer | Measure |
|-------|---------|
| Transport | HSTS, HTTPS enforcement in production |
| HTTP Headers | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, CSP (for /docs) |
| CORS | Explicit origin allowlist — wildcard `*` blocked at startup |
| Rate Limiting | Per-IP request limiting via Redis |
| SSRF Prevention | Private IP range blocking, domain allowlists for feed URLs |
| SQL Injection | SQLAlchemy ORM parameterized queries only |
| API Validation | Pydantic schema validation on all inputs |
| Connector Keys | AES-encrypted at rest |
| Permissions | RBAC decorator on every protected endpoint |
| Audit | Immutable append-only log — no delete or update |
| GenAI | 51-attack guardrail catalog + source domain filtering |

### Permission Caching (Frontend)
- Zustand-based permission cache with 5-minute TTL
- Instant page navigation without per-request permission API calls
- Cache invalidated on logout, role switch, or role restore

---

## 11. Reports & Export

| Format | Scope | Notes |
|--------|-------|-------|
| PDF | Single article or batch digest (up to 50) | Formatted with metadata, summary, IOCs |
| Word (DOCX) | Single article report | Structured with headings, IOCs, TTPs |
| CSV | Analytics data, intelligence export | Date range + user filter |
| JSON | Guardrails export | Full guardrail config — import/export between instances |

- Download notification popup when export begins
- Audit log entry for every export action

---

## 12. Frontend & UX

### Navigation & Layout
- **Sidebar** (collapsible): `w-44` expanded / `w-14` collapsed
  - **Org Feeds**: organization feed sources with favicon icons (collapsible) — deep-links to filtered feed view
  - **My Feeds**: user-saved feed filters (collapsible)
  - Main nav: Feeds, Watchlist, Intelligence Center, Knowledge Base, Reports, Admin
- Protected routes with permission-based page access
- Auto-redirect on unauthorized access
- Deep linking via URL parameters (`?source_id=N`, `?status=NEW`, etc.)

### Theming
- Multiple visual themes with dark mode support
- Theme context persisted to localStorage

### Article Views
- List view (table + pagination) and Card view (masonry grid + infinite scroll)
- Infinite scroll uses IntersectionObserver
- Toggle persisted per session

### Article Detail Drawer
- Slide-in panel from right, non-blocking
- Tabbed layout: Overview · Intelligence · Hunts · Comments
- Full markdown + HTML rendering

### Search & Filters
- Real-time search with 300ms debouncing
- Multi-dimension filtering: status, source, date range, priority, type
- Source filter banner showing active source with Clear button
- Clear-all filter button

### Responsive Design
- Fully responsive from 1280px+
- Sidebar collapses for smaller viewports

---

## 13. Infrastructure & API

### Docker Compose Stack

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| backend | Python 3.11 + FastAPI | 8000 | API, ingestion, GenAI, scheduler |
| frontend | Node 18 + Next.js 15 | 3000 | React UI |
| postgres | PostgreSQL 15 | 5432 (internal) | Primary data store |
| redis | Redis 7 | 6379 (internal) | Sessions, rate limits, dedup cache |

- Health checks on all 4 services
- Non-root container users (`appuser` for backend, `nextjs` for frontend)
- `host.docker.internal` support for Ollama on host machine

### Database
- 45+ SQLAlchemy ORM models (including `ThreatActorProfile`)
- 21 Alembic migrations in `backend/migrations/`
- Auto-seed on first launch (admin user + 230 feed sources)
- UTC timestamps throughout (`created_at`, `updated_at`)

### API
- 190+ REST endpoints across 22+ routers
- All routes under `/api` prefix
- Swagger UI at `/docs`, ReDoc at `/redoc`
- Structured JSON logging with **structlog** and correlation IDs
- `/health` and `/metrics` (Prometheus-compatible) endpoints

### Testing
- **Backend**: pytest with SQLite test DB — 17 test files covering auth, models, connectors, GenAI guardrails, hunts, reports, permissions, feed parsing
- **Frontend E2E**: Playwright (headless, 1280×720, 30s timeout)
- **Frontend Unit**: Jest + React Testing Library

---

## Changelog

| Date | Feature |
|------|---------|
| Feb 2026 | **Threat Actor Profile system** — alias resolution (20+ actor groups), GenAI enrichment, rich profile cards with aliases/TTPs/tools/sectors |
| Feb 2026 | **Intel Ingestion panel** — document upload (PDF/Word/CSV) + feed URL ingestion in Threat Intel Center (removed from Feeds page) |
| Feb 2026 | **Sidebar source filter** — clicking Org Feed source deep-links to filtered Feeds view, all other filters still apply |
| Feb 2026 | **230 feed sources** — expanded from 200 to 230 covering Google TAG, GitHub Security Lab, CERT/CC, VulDB, Volexity, Wiz Research, Binarly, Synacktiv, NSA, INTERPOL, and more |
| Feb 2026 | Guided Correlation & AI Analysis panels with how-it-works banners and 8-card focus area grid |
| Feb 2026 | Full MITRE ATT&CK heatmap rebuilt with accurate lookup-based tactic mapping (695+ techniques) |
| Feb 2026 | Full MITRE ATLAS heatmap (42 techniques, 12 AI-specific tactics) |
| Feb 2026 | GenAI security catalog — 51 attack protections across 11 categories |
| Feb 2026 | Guardrails bulk export / import / seed-from-catalog |
| Feb 2026 | Ollama Docker fix — defaults to `host.docker.internal:11434` instead of container loopback |
| Feb 2026 | Source domain filtering in extractor — publisher domain never extracted as IOC |
| Feb 2026 | Real thread-based FeedScheduler with run-on-start ingestion and daily log cleanup |
| Feb 2026 | Admin analytics: clickable tiles navigate to filtered views |
| Feb 2026 | Article bookmarks & per-user read/unread tracking |
| Feb 2026 | RBAC redesign: 12 canonical permissions with role card UI |
| Feb 2026 | Audit logging: 20+ event types with category/sub-type filtering |
