# J.O.T.I — Threat Intelligence Platform
## Platform Documentation & Feature Reference

> **J.O.T.I** (Jyoti Open Threat Intelligence) · Version: Current (Feb 2026) · License: PolyForm Noncommercial 1.0.0

---

## Table of Contents

**Part 1 — Feature Reference**
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

**Part 2 — Technical Reference**
13. [Architecture](#13-architecture)
14. [Technology Stack](#14-technology-stack)
15. [Data Model](#15-data-model)
16. [API Reference](#16-api-reference)
17. [Workflows](#17-workflows)
18. [Security Model](#18-security-model)
19. [Infrastructure & Deployment](#19-infrastructure--deployment)
20. [Improvement Roadmap](#20-improvement-roadmap)
21. [Changelog](#21-changelog)

---

# Part 1 — Feature Reference

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
- **Media**: BleepingComputer, Krebs on Security, Dark Reading, The Hacker News, SecurityWeek, Wired Security, Ars Technica, ZDNet, SC Magazine, CSO Online, Help Net Security, Naked Security, Graham Cluley

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
  - Source domain filtering: never extracts the article's own publication domain as an IOC
  - Anti-hallucination guardrails: "ONLY extract indicators explicitly mentioned in the text. NEVER fabricate."
  - Runs automatically for high-fidelity sources or watchlist-matched articles

### MITRE ATT&CK Mapping
- Accurate tactic-to-technique mapping using a complete lookup table (695+ Enterprise techniques + sub-techniques)
- Supports all 14 ATT&CK tactics: Reconnaissance → Impact
- Full heatmap visualization in Threat Intelligence Center

### MITRE ATLAS Mapping
- Complete ATLAS technique catalog (42 techniques across 12 AI-specific tactics)
- `AML.TXXXX` ID prefix distinguishes ATLAS from ATT&CK

### Intelligence Metadata
- **Confidence scoring** (0–100) per extracted indicator
- **Evidence linking**: stores the source sentence/paragraph containing each IOC
- **Review workflow**: mark as reviewed, flag false positives, add analyst notes
- Bulk review and bulk false-positive actions

---

## 3. Threat Intelligence Center

Seven-panel intelligence workspace accessible from the main navigation.

### Panel 1: Command Center
- Summary stat cards: IOCs, TTPs, Threat Actors, MITRE Techniques, Total Intelligence
- Top MITRE ATT&CK techniques bar chart (top 10 with frequency bars)
- Active watchlist keywords display
- Time range filter (24h, 7d, 30d, 90d, All) shared across all panels

### Panel 2: IOC Explorer
- Paginated table of all extracted intelligence (50 per page)
- Filter by intel type (IOC / TTP / Threat Actor / ATLAS) and IOC sub-type
- Full-text search across values, MITRE IDs, and article titles
- Expandable rows: evidence, confidence bar, linked article, hunt query, MITRE ID
- Bulk select → mark reviewed / mark false positive / delete
- Manual add (form) + bulk text import (one IOC per line with type,confidence)
- CSV export of current filtered view

### Panel 3: MITRE ATT&CK / ATLAS Heatmap
- Toggle between ATT&CK Enterprise and MITRE ATLAS frameworks
- Heatmap grid: tactics as columns, techniques as rows
- Color intensity by article frequency (5-level scale: 0 / 1-2 / 3-5 / 6-10 / 11+)
- Hover tooltip: technique name, ID, MITRE URL, article count

### Panel 4: Threat Actor Profiles
See [Section 4](#4-threat-actor-profiles) for full details.

### Panel 5: Cross-Source Correlation
- Scans all articles in the selected time window for shared indicators
- **Shared IOCs**: indicators appearing in 2+ articles with article titles
- **Article Clusters**: groups of articles sharing 3+ IOCs (likely same campaign)

### Panel 6: AI Threat Landscape Analysis
- **8 focus area cards**: Full Landscape, Ransomware, APT/Nation-State, Vulnerabilities, Phishing/BEC, Supply Chain, Cloud Security, Malware/Tooling
- Click any card to generate a targeted brief for that focus area
- Markdown-rendered output with headers, bold, code spans, lists

### Panel 7: Intel Ingestion
- Document upload dropzone (PDF, Word, Excel, CSV, HTML, TXT — 50 MB max)
- Feed/URL ingestion form: name, URL, feed type (RSS/Atom/JSON/HTML)
- Ingestion history log (up to 50 most recent operations)

---

## 4. Threat Actor Profiles

Dedicated threat actor profiling system with alias resolution and GenAI enrichment.

### Alias Resolution (20+ actor groups pre-configured)

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
| + more | Cl0p, TA505, Equation Group, DarkSide, etc. |

### Profile Fields
Name, aliases, description, origin country, motivation, actor type, first/last seen, is active, target sectors, TTPs, tools, infrastructure, campaigns, IOC/article/TTP counts, GenAI confidence, is verified.

### GenAI Enrichment
- Sends actor name to GenAI, returns structured JSON: aliases, description, origin, motivation, actor type, target sectors, TTPs, tools
- Non-destructive: only overwrites empty fields (preserves manual edits)

---

## 5. Article Management & Feeds View

### Status Workflow
```
NEW → IN_ANALYSIS → NEED_TO_HUNT → HUNT_GENERATED → REVIEWED → ARCHIVED
```

### Feed Views
- **List view**: table with pagination (25/50/100 per page)
- **Card view**: masonry grid with infinite scroll (IntersectionObserver)

### Filtering & Search
- Source, status, date range, priority, analyst, unread-only, watchlist-match filters
- Full-text search across title and content (debounced 300ms)
- All filters combine with AND logic

### Article Detail Drawer
- Full article content with HTML rendering
- AI-generated executive summary + technical summary
- Extracted IOCs / TTPs / Threat Actors list
- Related articles (by shared IOCs)
- Hunt queries (XSIAM, KQL, SPL, GraphQL)
- Analyst comments, status transitions, bookmark, assignment, high-priority flag

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
| Anthropic Claude | claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5 |
| Google Gemini | gemini-1.5-pro, gemini-1.5-flash, gemini-pro |
| Ollama (local) | Any model: llama3, mistral, phi3, gemma, codellama, etc. |

### AI Functions
- **Article Summarization**: executive summary (C-level), technical summary (analyst-level)
- **IOC/TTP Extraction**: GenAI-enhanced deep extraction with context awareness
- **Threat Actor Enrichment**: aliases, origin, motivation, TTPs, tools, target sectors
- **Hunt Query Generation**: platform-specific queries from extracted intelligence
- **Threat Landscape Analysis**: AI brief across all intelligence in a selected time window

### Per-function Model Assignment
Configure which model handles each function independently.

### Ollama Integration
- In-app Ollama setup wizard in Admin → AI Engine
- Model library browser with pull-by-name
- Docker default: `http://host.docker.internal:11434`

### Prompt Engineering
- Database-backed prompt library with version history
- Template variable system with typed slots (`{{article_content}}`, `{{iocs}}`, etc.)

### Guardrails — GenAI Security (51 attack protections)

| Category | Attacks |
|----------|---------|
| Prompt Injection | 6 |
| Jailbreaking | 6 |
| Data Extraction / Leakage | 5 |
| Hallucination / Fabrication | 6 |
| Token Smuggling | 3 |
| Encoding Attacks | 5 |
| Context Window Overflow | 3 |
| Output Manipulation | 4 |
| Chain-of-Thought Exploitation | 4 |
| Multi-turn Manipulation | 4 |
| Payload Embedding in Feeds | 6 |

**7 guardrail check types**: PII detection, prompt injection, token smuggling, encoding attacks, length validation, toxicity/forbidden keywords, IOC grounding + MITRE ID validity.

**Guardrail Management**: Full CRUD GUI, toggle on/off, bulk export/import JSON, seed from 51-attack catalog.

### Execution Logging
Every GenAI call tracked: prompt, response, model, tokens, cost, response time, guardrail pass/fail.

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
- "Ingest Now" button per source with live feedback
- Bulk operations (enable/disable/delete)

### Access Control

**Users tab**: Create/edit/delete users, assign roles (Admin, Analyst, Engineer, Manager, Executive, Viewer), per-user permission overrides, force password reset.

**Roles & Permissions tab**: 12 canonical permissions across 3 groups:
- **Core Access**: `articles:read`, `articles:export`, `articles:analyze`
- **Sources & Feeds**: `sources:read`, `sources:manage`, `watchlist:read`, `watchlist:manage`
- **Administration**: `users:manage`, `audit:read`, `admin:genai`, `admin:rbac`, `admin:system`

### Connectors
- Categories: SIEM, EDR, Cloud Security, Sandbox, Enrichment, Notification
- Platforms: Microsoft Sentinel, Splunk, CrowdStrike, SentinelOne, Wiz, Prisma Cloud, VirusTotal, Shodan, Slack, PagerDuty, ServiceNow
- API key management (AES-encrypted at rest), connection test per connector

### AI Engine (tabbed)
- **Provider Setup**: Configure GenAI provider, API keys, model selection, Ollama wizard
- **Functions & Logs**: Function-to-model mappings, execution log browser
- **Guardrails**: Full CRUD, toggle, export/import, seed from catalog
- **Skills**: Manage AI skills (composable multi-step GenAI workflows)
- **Prompts**: Database-backed prompt library with version history

### Audit Logs
20+ event types with category/sub-type filtering, search by action/user, date range, expandable entries with full JSON details. IDOR protection for non-admins.

### Platform
- **Analytics**: Summary tiles, daily ingestion chart, articles by source, user engagement table, CSV export
- **System Monitoring**: Scheduler job status, manual job triggers, database statistics
- **Settings**: Platform name, SMTP configuration, session/security settings

---

## 10. Authentication & Security

### Authentication Methods
- Local email/password with **Argon2** password hashing
- **OAuth 2.0**: Google SSO, Microsoft SSO
- **SAML 2.0**: Okta, Azure AD / Entra ID, ADFS
- **TOTP/MFA**: optional two-factor authentication
- JWT access tokens (30 min) + refresh tokens (7 days) with blacklist on logout

### Security Hardening

| Layer | Measure |
|-------|---------|
| Transport | HSTS, HTTPS enforcement in production |
| HTTP Headers | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy |
| CORS | Explicit origin allowlist — wildcard `*` blocked at startup |
| Rate Limiting | Per-IP request limiting via Redis |
| SSRF Prevention | Private IP range blocking, domain allowlists for feed URLs |
| SQL Injection | SQLAlchemy ORM parameterized queries only |
| API Validation | Pydantic schema validation on all inputs |
| Connector Keys | AES-encrypted at rest |
| Permissions | RBAC decorator on every protected endpoint |
| Audit | Immutable append-only log — no delete or update |
| GenAI | 51-attack guardrail catalog + source domain filtering |

---

## 11. Reports & Export

| Format | Scope | Notes |
|--------|-------|-------|
| PDF | Single article or batch digest (up to 50) | Formatted with metadata, summary, IOCs |
| Word (DOCX) | Single article report | Structured with headings, IOCs, TTPs |
| CSV | Analytics data, intelligence export | Date range + user filter |
| JSON | Guardrails export | Full guardrail config — import/export between instances |

---

## 12. Frontend & UX

### Navigation & Layout
- Collapsible sidebar (`w-44` expanded / `w-14` collapsed)
- **Org Feeds**: organization feed sources with deep-links to filtered feed view
- **My Feeds**: user-saved feed filters
- Protected routes with permission-based page access, deep linking via URL parameters

### Article Views
- List view (table + pagination) and Card view (masonry grid + infinite scroll)
- Article Detail Drawer: slide-in panel, tabbed layout (Overview · Intelligence · Hunts · Comments)
- Real-time search with 300ms debouncing, multi-dimension filtering

### Theming
- Multiple visual themes with dark mode support, persisted to localStorage

---

# Part 2 — Technical Reference

## 13. Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                               │
│                    Next.js 15 / React 19                            │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│   │  Feeds   │ │Watchlist │ │ Articles │ │  Admin   │ │  GenAI  │ │
│   │  View    │ │  View    │ │  Drawer  │ │  Panel   │ │ Console │ │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
│                    Zustand State · Axios HTTP Client                │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ HTTPS (port 3000)
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       FASTAPI BACKEND (port 8000)                   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Auth Router │  │Article Router│  │  Admin Router│               │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                │                 │                        │
│  ┌──────▼──────────────────────────────────▼───────┐                │
│  │              Core Services Layer                 │                │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌───────┐ │                │
│  │  │  RBAC   │ │  Audit   │ │  Rate  │ │ SSRF  │ │                │
│  │  │Middleware│ │ Manager  │ │ Limit  │ │ Guard │ │                │
│  │  └─────────┘ └──────────┘ └────────┘ └───────┘ │                │
│  └────────────────────────────────────────────────┘                │
│  ┌──────────────┐  ┌────────────┐  ┌────────────────────────────┐  │
│  │  Ingestion   │  │ Extraction │  │      GenAI Service         │  │
│  │  Scheduler   │  │  Engine    │  │  OpenAI · Claude · Gemini  │  │
│  │  (APSched)   │  │ (regex+AI) │  │  Ollama                    │  │
│  └──────────────┘  └────────────┘  └────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
             ┌───────────────┴───────────────┐
             ▼                               ▼
┌─────────────────────┐         ┌────────────────────┐
│   PostgreSQL 15     │         │      Redis 7        │
│  45+ ORM Models     │         │  Session Cache      │
│  Articles / IOCs    │         │  Rate Limit State   │
│  Hunt Queries       │         │  Token Blacklist    │
│  Audit Logs         │         │  Feed Dedup Cache   │
│  Users + RBAC       │         └────────────────────┘
└─────────────────────┘
```

### Module Dependency Graph

```
main.py
  ├── auth/           JWT · OAuth · SAML · TOTP · RBAC
  ├── articles/       CRUD · Bookmarks · Reports · Summarization · Analytics
  ├── extraction/     IOC/IOA/TTP/ATLAS Extraction (regex + GenAI) · mitre_data.py
  ├── ingestion/      RSS/Atom Parser · Document Ingestor · Background Scheduler
  ├── genai/          Multi-provider Service · Testing · Quotas · Models
  ├── guardrails/     51-attack GenAI Security Catalog · Validation Engine
  ├── threat_actors/  Profile CRUD · Alias Resolution · GenAI Enrichment
  ├── integrations/   Feed Sources · Refresh Settings · Connectors
  ├── watchlist/      Global + Personal Keywords · Article Matching
  ├── users/          User CRUD · Preferences · Custom Feeds · Permissions
  ├── audit/          Event Logger · Middleware · Log Viewer
  ├── admin/          Settings · RBAC · Prompts · Guardrails · Ollama · Skills
  ├── knowledge/      Document CRUD · Semantic Search Chunks
  ├── notifications/  Email · Slack · ServiceNow
  ├── automation/     Thread-based FeedScheduler · Feed Ingestion · Log Cleanup
  └── core/           Config · DB · Logging · Rate Limiting · SSRF · Crypto
```

### Request Lifecycle

```
Browser Request
      │
      ▼
CORS Middleware ──▶ Rate Limit ──▶ JWT Decode ──▶ require_permission()
      │                                                    │
      │                               ┌─────── FORBIDDEN (403)
      │                               │
      ▼                               ▼ OK
Route Handler ──▶ Service / DB ──▶ Audit Log ──▶ Response
```

---

## 14. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Backend Runtime** | Python + Uvicorn | 3.11 / 0.34.0 | Async ASGI server |
| **Web Framework** | FastAPI | 0.115.12 | API routing, validation, docs |
| **ORM** | SQLAlchemy (sync) | 2.0.37 | Database models and queries |
| **Migrations** | Alembic | 1.15.1 | Schema versioning |
| **Database** | PostgreSQL | 15 | Primary data store |
| **Cache** | Redis | 7 | Sessions, rate limits, dedup |
| **Task Scheduler** | APScheduler | — | Background feed ingestion |
| **Validation** | Pydantic v2 | — | Request/response schemas |
| **Auth** | PyJWT + Argon2 | — | Tokens + password hashing |
| **OAuth** | Authlib | — | Google / Microsoft SSO |
| **SSO** | pysaml2 | — | Enterprise SAML |
| **2FA** | pyotp | — | TOTP authentication |
| **Feed Parsing** | feedparser | — | RSS/Atom ingestion |
| **GenAI** | OpenAI SDK | 1.59.8 | Multi-model AI calls |
| **Logging** | structlog | — | Structured JSON logs |
| **Frontend** | Next.js + React | 15.1.6 / 19 | App router, SSR |
| **Language** | TypeScript | 5 | Type safety |
| **State** | Zustand | 4.4.0 | Client state management |
| **HTTP Client** | Axios | — | API calls with interceptors |
| **Styling** | Tailwind CSS + Ant Design | 3.4 / 5.23 | UI components |
| **E2E Testing** | Playwright | — | Browser automation |
| **Unit Testing** | Jest + RTL / pytest | — | Unit + integration tests |
| **Containerization** | Docker Compose | 3.8 | 4-service orchestration |

---

## 15. Data Model

### Core Enumerations

```
ArticleStatus:    NEW → IN_ANALYSIS → NEED_TO_HUNT → HUNT_GENERATED → REVIEWED → ARCHIVED
HuntStatus:       PENDING → RUNNING → COMPLETED | FAILED | PARTIAL
UserRole:         ADMIN | ANALYST | ENGINEER | MANAGER | EXECUTIVE | VIEWER
IntelType:        IOC | IOA | TTP | ATLAS | THREAT_ACTOR
IOCType:          ip | domain | hash_md5 | hash_sha1 | hash_sha256 | email |
                  registry_key | file_path | url | cve
AuditEventType:   LOGIN | LOGOUT | REGISTRATION | PASSWORD_CHANGE |
                  ARTICLE_LIFECYCLE | BOOKMARK | EXTRACTION | CONNECTOR_CONFIG |
                  HUNT_TRIGGER | NOTIFICATION | REPORT_GENERATION | RBAC_CHANGE |
                  SYSTEM_CONFIG | GENAI_SUMMARIZATION | KNOWLEDGE_BASE |
                  SCHEDULED_TASK | ADMIN_ACTION | WATCHLIST_CHANGE |
                  FEED_MANAGEMENT | SEARCH
```

### Entity Relationship Overview

```
User ──────────────────────────────────────────────────┐
  │ (assigned_analyst_id)                               │
  ▼                                                     │
FeedSource ──────▶ Article ──────▶ ExtractedIntelligence│
                      │                  (IOC/TTP/TA)   │
                      │                  (sync) ▼        │
                      │          ThreatActorProfile      │
                      │          (aliases, TTPs, tools)  │
                      │                                  │
                      ├──▶ Hunt ──────▶ HuntExecution    │
                      ├──▶ ArticleComment                │
                      └──▶ ArticleReadStatus ◀───────────┘

ConnectorPlatform ──▶ ConnectorTemplate ──▶ ConnectorConfig ──▶ ConnectorExecution
Prompt ──▶ PromptVariable · PromptGuardrail · PromptSkill · PromptExecutionLog
KnowledgeDocument ──▶ KnowledgeChunk
AuditLog ──▶ User
```

### Key Models

**Article**: `id, source_id, title, raw_content, normalized_content, summary, url, published_at, status, assigned_analyst_id, executive_summary, technical_summary, is_high_priority, watchlist_match_keywords, content_hash`

**ExtractedIntelligence**: `id, article_id, intelligence_type, value, confidence (0-100), evidence, mitre_id, metadata, is_reviewed, is_false_positive`

**Hunt**: `id, article_id, platform, query_logic, title, status, generated_by_model, parent_hunt_id (versioning), query_version`

**ThreatActorProfile**: `id, name, aliases, description, origin_country, motivation, actor_type, first_seen, last_seen, is_active, target_sectors, ttps, tools, infrastructure, genai_confidence, is_verified`

---

## 16. API Reference

### Summary (190+ endpoints across 22 routers)

| Router | Prefix | Permission Required |
|---|---|---|
| Auth | `/auth` | Public / current_user |
| Articles | `/articles` | `articles:read` minimum |
| Bookmarks | `/bookmarks` | `articles:read` |
| Reports | `/reports` | `articles:export` |
| Sources | `/sources` | `sources:read` / `sources:manage` |
| Watchlist | `/watchlist` | `watchlist:read` / `watchlist:manage` |
| Threat Actors | `/threat-actors` | `articles:read` / `articles:analyze` |
| Users | `/users` | `users:manage` |
| Audit | `/audit` | `audit:read` |
| Admin Core | `/admin` | `users:manage` / `admin:*` |
| Admin GenAI Funcs | `/admin/genai-functions` | `admin:genai` |
| Admin Guardrails | `/admin/guardrails` | `admin:genai` |
| Admin Prompts | `/admin/prompts` | `admin:genai` |
| GenAI | `/genai` | `admin:genai` |
| Analytics | `/analytics` | `articles:read` / `users:manage` |

API Docs available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

---

## 17. Workflows

### Workflow 1: New Threat Article → Hunt Query

```
RSS Feed ingested (automated, every N minutes)
    │
    ▼ (if source.high_fidelity)
IOC extraction triggered automatically
    │
    ▼ (if watchlist match)
article.is_high_priority = True → notification sent
    │
    ▼
Analyst opens article, reads AI summary
    │
    ▼
Analyst clicks "Extract Intelligence" → IOCs + TTPs displayed
    ▼
Status → IN_ANALYSIS
    │
    ▼
Analyst clicks "Generate Hunt" → selects XSIAM
    │
    ▼
GenAI creates XQL query from IOCs + TTPs
    │
    ▼
Status → HUNT_GENERATED → analyst reviews → executes
    │
    ▼ (if hits found)
ServiceNow ticket created, Slack alert sent → Status → REVIEWED
```

### Workflow 2: Threat Actor Profiling

```
Articles ingested over time → ExtractedIntelligence records with type=THREAT_ACTOR
    │
    ▼
Analyst clicks "Sync from Intel"
    │
    ▼
/api/threat-actors/sync resolves aliases:
    "UNC3944" → "Scattered Spider"
    "Forest Blizzard" → "APT28"
    │
    ▼
Analyst clicks "Enrich with GenAI" on a profile card
    │
    ▼
GenAI returns: origin, motivation, target_sectors, TTPs, tools
    │
    ▼
Profile updated → analyst expands card → copies intel for hunt/report
```

### Workflow 3: GenAI Testing & Prompt Tuning

```
Admin edits "generate_hunt_defender" system prompt
    │
    ▼
Previews rendered output with sample variables
    │
    ▼
Opens GenAI Testing Console → compares GPT-4 vs Claude on same article
    │
    ▼
Reviews side-by-side: quality, tokens, latency
    │
    ▼
Sets preferred model for this function → applies guardrail
```

---

## 18. Security Model

### Defense in Depth

```
Layer 1: Network
  - CORS validation (allowed origins only)
  - SSRF prevention (private IPs blocked, allowlist enforced)
  - TLS enforced in production

Layer 2: Authentication
  - Argon2 password hashing (memory-hard, tunable)
  - JWT tokens (short-lived access: 30min, refresh: 7d)
  - Token blacklist on logout/password change
  - TOTP/MFA support
  - OAuth + SAML for federated identity

Layer 3: Authorization
  - RBAC on every endpoint (require_permission dependency)
  - IDOR protection on audit logs and user data
  - Permission validated server-side (never trust client)

Layer 4: Input Validation
  - Pydantic schemas on all request bodies
  - SQLAlchemy ORM (parameterized queries, no raw SQL)
  - File upload validation (type, size limits)

Layer 5: Secrets & Encryption
  - OTP secrets AES-encrypted in DB
  - Connector API keys encrypted
  - SECRET_KEY required 32+ chars in production

Layer 6: Security Headers
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
  - HSTS (production)

Layer 7: Audit
  - 20 event types tracked
  - Immutable append-only log
  - Correlation IDs for distributed tracing
  - IP address logging
```

---

## 19. Infrastructure & Deployment

### Docker Compose Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| backend | Python 3.11 + FastAPI | 8000 | API, ingestion, GenAI, scheduler |
| frontend | Node 18 + Next.js 15 | 3000 | React UI |
| postgres | PostgreSQL 15 | 5432 (internal) | Primary data store |
| redis | Redis 7 | 6379 (internal) | Sessions, rate limits, dedup cache |

### Key Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@postgres:5432/joti
REDIS_URL=redis://redis:6379/0
SECRET_KEY=<32+ random chars>
ADMIN_EMAIL=admin@company.com
ADMIN_PASSWORD=<strong-password>
CORS_ORIGINS=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api
OPENAI_API_KEY=sk-...          # optional
GENAI_PROVIDER=openai          # openai | ollama | claude | gemini
ENABLE_AUTOMATION_SCHEDULER=true
```

### Common Operations

```bash
# Start
docker compose up -d --build

# View logs
docker compose logs -f backend

# Run migrations
docker compose exec backend alembic upgrade head

# Seed database
docker compose exec backend python -c "from app.seeds import seed_all; seed_all()"

# Run tests
docker compose exec backend pytest -q
```

---

## 20. Improvement Roadmap

> Benchmarked against: Recorded Future, Mandiant Advantage, ThreatQ, Anomali ThreatStream, MISP, Feedly for Threat Intelligence, Fletch.ai, Google Threat Intelligence.

### Tier 1 — High Impact, Near-Term

| # | Feature | Description |
|---|---------|-------------|
| 1.1 | **Threat Scoring Engine** | Score articles/IOCs on ingestion: source reliability × recency × IOC severity × TTP impact |
| 1.2 | **IOC Enrichment Pipeline** | Auto-enrich IOCs via VirusTotal, GreyNoise, Shodan, AbuseIPDB (connector framework exists) |
| 1.3 | **Trend Analysis Dashboard** | Time-series IOC/TTP/actor mention counts, "CVE spike alerts", rising topics |
| 1.4 | **Semantic Article Search** | pgvector embeddings for "find articles like this one" and hybrid keyword+semantic search |

### Tier 2 — Medium Impact

| # | Feature | Description |
|---|---------|-------------|
| 2.1 | **MISP Integration** | Bi-directional: pull MISP events → Joti, push Joti IOCs → MISP |
| 2.2 | **STIX/TAXII Support** | TAXII 2.1 server/client, STIX 2.1 bundle export |
| 2.3 | **AI Auto-Triage** | AI classifies relevance/severity on ingestion, auto-assigns high-severity articles |
| 2.4 | **Analyst Performance Metrics** | Articles processed per analyst, mean time to REVIEWED, hunt-to-hit ratio |
| 2.5 | **Autonomous Hunt Execution** | Connector executes queries in SIEM/EDR via API, AI summarizes findings |
| 2.6 | **Environment Context Scoring** | Score intel relevance against your tech stack, industry, IP ranges |

### Tier 3 — Strategic

| # | Feature | Description |
|---|---------|-------------|
| 3.1 | **Autonomous AI Analyst Agent** | Agent autonomously extracts, enriches, correlates, hunts, and reports (Claude Agents SDK) |
| 3.2 | **Natural Language Query Interface** | "Show me articles about APT28 targeting finance last month" → structured query |
| 3.3 | **Detection Engineering Pipeline** | Sigma/YARA/KQL rule library with versioning, testing, SIEM deployment |
| 3.4 | **TI Sharing (ISAC Integration)** | Publish vetted IOCs to community platforms with TLP tagging |
| 3.5 | **Dark Web Monitoring** | Integrate Flashpoint/SpyCloud APIs, credential leak detection |

### Quick Wins

| Feature | Impact |
|---------|--------|
| Bulk article status update from feed view | High |
| Saved search filter presets | High |
| IOC prevalence count in drawer ("seen in 7 articles") | High |
| Right-click IOC → "Search in VirusTotal/Shodan" | High |
| Browser push notifications for watchlist matches | High |
| Keyboard shortcuts (J/K for next/prev article) | Medium |
| Export watchlist to CSV/STIX | Medium |

---

## 21. Changelog

| Date | Feature |
|------|---------|
| Feb 2026 | Threat Actor Profile system — alias resolution (20+ actor groups), GenAI enrichment, rich profile cards |
| Feb 2026 | Intel Ingestion panel — document upload (PDF/Word/CSV) + feed URL ingestion in Threat Intel Center |
| Feb 2026 | Sidebar source filter — clicking Org Feed source deep-links to filtered Feeds view |
| Feb 2026 | 230 feed sources — expanded from 200 to 230 |
| Feb 2026 | Guided Correlation & AI Analysis panels |
| Feb 2026 | Full MITRE ATT&CK heatmap rebuilt with accurate lookup-based tactic mapping (695+ techniques) |
| Feb 2026 | Full MITRE ATLAS heatmap (42 techniques, 12 AI-specific tactics) |
| Feb 2026 | GenAI security catalog — 51 attack protections across 11 categories |
| Feb 2026 | Guardrails bulk export / import / seed-from-catalog |
| Feb 2026 | Ollama Docker fix — defaults to `host.docker.internal:11434` |
| Feb 2026 | Source domain filtering in extractor — publisher domain never extracted as IOC |
| Feb 2026 | Real thread-based FeedScheduler with run-on-start ingestion and daily log cleanup |

---

*Joti Platform Documentation · Feb 2026*
