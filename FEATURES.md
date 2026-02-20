# J.O.T.I — Platform Feature Reference

> **J.O.T.I** (Jyoti Open Threat Intelligence) is an enterprise-grade Threat Intelligence Platform for SOC teams, threat analysts, and incident responders.
>
> **Version**: Current · **Last updated**: February 2026

---

## Table of Contents

1. [Feed Aggregation & Ingestion](#1-feed-aggregation--ingestion)
2. [Intelligence Extraction](#2-intelligence-extraction)
3. [Threat Intelligence Center](#3-threat-intelligence-center)
4. [Article Management & Feeds View](#4-article-management--feeds-view)
5. [Hunt Query Generation](#5-hunt-query-generation)
6. [GenAI Integration](#6-genai-integration)
7. [Watchlist & Alerting](#7-watchlist--alerting)
8. [Admin Panel](#8-admin-panel)
9. [Authentication & Security](#9-authentication--security)
10. [Reports & Export](#10-reports--export)
11. [Frontend & UX](#11-frontend--ux)
12. [Infrastructure & API](#12-infrastructure--api)

---

## 1. Feed Aggregation & Ingestion

### Source Library (200+ feeds)
- 200+ curated cybersecurity RSS/Atom feed sources across 15+ categories:
  - **Government & CERT**: CISA, NCSC UK, ASD ACSC, Canadian CCCS, ENISA, BSI Germany, ANSSI France, CERT NZ, CERT-EU, FBI IC3
  - **Core TI Vendors**: Mandiant, CrowdStrike, Palo Alto Unit 42, Recorded Future, SentinelOne, Secureworks, Digital Shadows, Symantec, Bitdefender, F-Secure, Proofpoint, Zscaler, Huntress, ThreatConnect, Anomali
  - **Vendor Patches & Advisories**: Microsoft MSRC, Apple, Chrome, Mozilla, Oracle, Red Hat, Ubuntu, Debian, Cisco, VMware
  - **Malware Analysis**: VirusTotal, Any.run, Intezer, ReversingLabs, JPCERT, MalwareMustDie, Joe Security, Hatching
  - **Cloud Security**: AWS Security, Azure Security, GCP Security, Prisma Cloud, Lacework, Wiz, Orca Security, Snyk
  - **ICS/OT Security**: Dragos, Claroty, Nozomi Networks, Armis, Forescout
  - **Identity Security**: CyberArk, Okta Security, Ping Identity
  - **Ransomware Tracking**: ransomware.live, Emsisoft, Coveware, No More Ransom
  - **Data Breach**: HaveIBeenPwned, DataBreaches.net, Privacy Affairs, ITRC
  - **Threat Hunting / DFIR**: The DFIR Report, Red Canary, MITRE ATT&CK Blog, AttackIQ, Velociraptor
  - **Dark Web / OSINT**: Intel 471, Flashpoint, SpyCloud, BreachSense, DomainTools, RiskIQ, Censys, Shodan
  - **Sector-Specific ISACs**: Health-ISAC, FS-ISAC, E-ISAC
  - **SOC Platforms**: Splunk Security, Elastic Security, Chronicle (Google SecOps)
  - **Academic / Research**: SANS Internet Storm Center, Black Hat, DEF CON, IEEE S&P
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
- Source favicon auto-detection

### Background Scheduler
- Thread-based `FeedScheduler` runs as a daemon on app startup
- `feed_ingestion` job: ingests all active enabled sources, starts immediately on launch
- `log_cleanup` job: deletes GenAI request logs older than 30 days (runs daily)
- Configurable interval via `FEED_REFRESH_INTERVAL_MINUTES` env var (default: 60 min)
- Scheduler can be disabled entirely via `ENABLE_AUTOMATION_SCHEDULER=false`
- Admin can view job status, last-run time, run count, and manually trigger jobs

### Document & URL Ingestion
- Custom document upload: PDF, HTML, plain text
- External URL fetch-and-parse
- Normalized content extraction from raw HTML

---

## 2. Intelligence Extraction

### IOC Types (8+)
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

### Dual Extraction Pipeline
- **Regex pipeline**: fast, reliable, runs on every article
- **GenAI pipeline**: deeper context-aware extraction with LLM models
  - Source domain filtering: never extracts the article's own publication domain as an IOC
  - Anti-hallucination guardrails: only extracts explicitly mentioned indicators
  - Runs automatically for high-fidelity sources or watchlist-matched articles

### MITRE ATT&CK Mapping
- Accurate tactic-to-technique mapping using a complete lookup table (~200 Enterprise techniques + ~400 sub-techniques)
- Supports all 14 ATT&CK tactics: Reconnaissance → Impact
- Multi-tactic techniques duplicated across relevant columns
- Technique names and MITRE URLs stored alongside IDs

### MITRE ATLAS Mapping
- Full ATLAS technique catalog (~35 techniques across 12 AI-specific tactics)
- Tactics: Reconnaissance, Resource Development, ML Model Access, Initial Access, Execution, Persistence, Defense Evasion, Discovery, Collection, ML Attack Staging, Exfiltration, Impact
- `AML.TXXXX` ID prefix distinguishes ATLAS from ATT&CK

### Intelligence Metadata
- **Confidence scoring** (0–100) per extracted indicator
- **Evidence linking**: stores the source sentence/paragraph containing each IOC
- **Review workflow**: mark as reviewed, flag false positives, add analyst notes
- Bulk review and bulk false-positive actions
- Attribution metadata for threat actors (aliases, country, motivation, first seen)

---

## 3. Threat Intelligence Center

Six-panel intelligence workspace accessible from the main navigation.

### Panel 1: Command Center
- Summary stat cards: Total IOCs, TTPs, Threat Actors, High Confidence (>80%), Reviewed, False Positives
- Recent activity timeline with collapsible items
- Quick-add manual IOC / bulk import modal
- Time range filter (24h, 7d, 30d, 90d, All) shared across all panels
- Source category filter: All Sources, Open Source, External TI, Internal

### Panel 2: IOC Explorer
- Paginated table of all extracted intelligence (50 per page)
- Filter by intel type (IOC / TTP / Threat Actor) and IOC sub-type
- Full-text search across values
- Expandable rows: evidence, confidence bar, linked article, hunt query, MITRE ID
- Bulk select → mark reviewed / mark false positive / delete
- Copy-to-clipboard on any value
- Link to originating article drawer
- Manual add + bulk text import (one IOC per line)

### Panel 3: MITRE ATT&CK / ATLAS Heatmap
- Toggle between ATT&CK Enterprise and MITRE ATLAS frameworks
- Heatmap grid: tactics as columns, techniques as rows
- Color intensity by article frequency (1–5+ mentions scale)
- Hover tooltip: technique name, ID, MITRE URL, article count
- Click cell to view associated articles
- ATT&CK tactic order: Reconnaissance → Impact (14 columns)
- ATLAS tactic order: Reconnaissance → Impact (12 AI-specific columns)

### Panel 4: Threat Actors
- Full list of extracted threat actor entities
- Expandable rows with attribution metadata:
  - Aliases, country of origin, motivation, first-seen date
  - Associated TTPs and IOCs
  - Linked articles
- Filter, search, and pagination

### Panel 5: Cross-Source Correlation
- **Guided workflow banner** explaining how correlation works
- Scans all articles in the selected time window for shared indicators
- **Shared IOCs**: indicators appearing in 2+ articles with article list
- **Article Clusters**: groups of articles sharing 3+ IOCs (likely same campaign)
- Last-run timestamp and time window displayed
- Recommended next steps guide after results
- Copy-to-clipboard on any shared IOC

### Panel 6: AI Threat Landscape Analysis
- **Guided workflow banner** with step-by-step instructions
- **8 focus area cards** with icon + description:
  - Full Landscape, Ransomware, APT/Nation-State, Vulnerabilities, Phishing/BEC, Supply Chain, Cloud Security, Malware/Tooling
- Click any card to generate a targeted brief for that focus
- AI reads all extracted intelligence in the time window and produces plain-language analysis
- Markdown-rendered output with headers, bold, code spans, lists
- Last-analysis metadata (time, focus, window) shown in result header
- Clear button to reset and run a new analysis
- Admin guidance note linking to GenAI provider config if no model is configured

---

## 4. Article Management & Feeds View

### Status Workflow
```
NEW → IN_ANALYSIS → NEED_TO_HUNT → HUNT_GENERATED → REVIEWED → ARCHIVED
```

### Feed Views
- **List view**: table with pagination (25/50/100 per page)
- **Card view**: masonry grid with infinite scroll (IntersectionObserver)
- Toggle between views, preference persisted per session
- Source filter, status filter, date range filter, priority filter, analyst filter
- Full-text search across title and content (debounced)

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
- **Org Feeds**: organization-wide feed sources (collapsible, scrollable)
- **My Feeds**: user-specific saved feed filters (collapsible)
- Source favicon display
- Active feed highlighted
- Lean sidebar: `w-44` expanded, `w-14` collapsed

### Bookmarks & Read Tracking
- Bookmark any article (visible in profile)
- Mark as read/unread
- Read status tracked per user

---

## 5. Hunt Query Generation

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

## 6. GenAI Integration

### Supported Models
| Provider | Models |
|----------|--------|
| OpenAI | GPT-4o, GPT-4-turbo, GPT-4, GPT-3.5-turbo |
| Anthropic Claude | claude-3-opus, claude-3-sonnet, claude-haiku, claude-3-5-sonnet |
| Google Gemini | gemini-1.5-pro, gemini-1.5-flash, gemini-pro |
| Ollama (local) | Any model: llama3, mistral, phi3, gemma, codellama, etc. |

### AI Functions
- **Article Summarization**: executive summary (C-level), technical summary (analyst-level)
- **IOC/TTP Extraction**: GenAI-enhanced deep extraction with context
- **Hunt Query Generation**: platform-specific queries from intelligence
- **Threat Landscape Analysis**: AI brief across all intelligence in a time window
- **Per-function model assignment**: configure which model handles each function

### Ollama Integration
- In-app Ollama setup wizard
- Model library browser with pull-by-name
- Connection test against host or Docker network
- Falls back to `http://host.docker.internal:11434` in Docker environments

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
| Payload Embedding in Feeds | 5 | Hidden instructions in RSS, invisible text in HTML, steganographic commands, comment injection, metadata manipulation |

**Guardrail Checks (7 types)**:
- PII detection
- Prompt injection detection (regex + catalog patterns)
- Token smuggling detection (zero-width chars, homoglyphs)
- Encoding attack detection
- Length validation (min/max)
- Toxicity / forbidden keywords
- IOC grounding + MITRE ID validity (output validation)

**Guardrail Management**:
- Full CRUD GUI per guardrail
- Toggle individual guardrails on/off
- Bulk Export (download all as JSON)
- Bulk Import (upload JSON, skip/overwrite by name)
- Seed Catalog button: pre-populate from 51-attack security catalog

### Execution Logging
- Every GenAI call tracked: prompt, response, model, tokens, cost, response time
- Guardrail pass/fail per execution
- Admin "Execution Logs" tab: filter by function, date, failed-only
- Expandable log entries with full metadata

---

## 7. Watchlist & Alerting

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

## 8. Admin Panel

Navigation: **Sources · Access Control · Connectors · AI Engine · Audit Logs · Platform**

### Sources Management
- Add/edit/delete/toggle feed sources
- Per-source: name, URL, category, refresh interval, high-fidelity flag, auto-fetch toggle
- "Ingest Now" button per source
- Bulk operations

### Access Control (tabbed)
**Users tab**:
- Create/edit/delete users
- Assign roles (Admin, Analyst, Engineer, Manager, Executive, Viewer)
- Per-user permission overrides (grant or deny specific permissions)
- Force password reset
- Account activate/deactivate

**Roles & Permissions tab**:
- 12 canonical permissions across 3 groups:
  - **Core Access**: `articles:read`, `articles:export`, `articles:analyze`
  - **Sources & Feeds**: `sources:read`, `sources:manage`, `watchlist:read`, `watchlist:manage`
  - **Administration**: `users:manage`, `audit:read`, `admin:genai`, `admin:rbac`, `admin:system`
- Role cards with inline permission toggles
- Role impersonation for admin testing

### Connectors
- Categories: SIEM, EDR, Cloud Security, Sandbox, Enrichment, Notification
- Platforms: Microsoft Sentinel, Splunk, CrowdStrike, SentinelOne, Wiz, Prisma Cloud, VirusTotal, Shodan, Slack, PagerDuty, ServiceNow
- Template-based config with API key management (encrypted at rest)
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
- Execution log browser (all or per-function, filter by date/status)

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
- Database stats

**Settings tab**:
- Platform name, version, environment
- Email / SMTP configuration
- Session and security settings

---

## 9. Authentication & Security

### Authentication Methods
- Local email/password with **Argon2** password hashing
- **OAuth 2.0**: Google SSO, Microsoft SSO
- **SAML 2.0**: Okta, Azure AD / Entra ID, ADFS
- **TOTP/MFA**: optional FIDO-compatible two-factor authentication (OTP secrets AES-encrypted in DB)
- JWT access tokens (30 min) + refresh tokens (7 days) with blacklist on logout

### Security Hardening
| Layer | Measure |
|-------|---------|
| Transport | HSTS, HTTPS enforcement in production |
| HTTP Headers | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, CSP (for /docs) |
| CORS | Explicit origin allowlist, no wildcard with credentials |
| Rate Limiting | Per-IP request limiting via Redis |
| SSRF Prevention | Private IP blocking, domain allowlists for feed URLs |
| SQL Injection | SQLAlchemy ORM parameterized queries only |
| API Validation | Pydantic schema validation on all inputs |
| Connector Keys | AES-encrypted at rest |
| Permissions | RBAC decorator on every protected endpoint |

### Permission Caching (Frontend)
- Zustand-based permission cache with 5-minute TTL
- Instant page navigation without per-request permission API calls
- Cache invalidated on logout, role switch, or role restore

---

## 10. Reports & Export

| Format | Scope | Notes |
|--------|-------|-------|
| PDF | Single article or batch digest (up to 50) | Formatted with metadata, summary, IOCs |
| Word (DOCX) | Single article report | Structured with headings, IOCs, TTPs |
| CSV | Analytics data | Date range + user filter |
| JSON | Guardrails export | Full guardrail config export/import |

- Download notification popup when export begins
- Audit log entry for every export action

---

## 11. Frontend & UX

### Navigation & Layout
- **Sidebar** (collapsible): `w-44` expanded / `w-14` collapsed
  - **Org Feeds**: organization feed sources with favicon icons (collapsible)
  - **My Feeds**: user-saved feed filters (collapsible)
  - Main nav: Feeds, Watchlist, Intelligence Center, Knowledge Base, Reports, Admin
- Protected routes with permission-based page access
- Auto-redirect on unauthorized access
- Deep linking via URL parameters

### Theming
- Multiple visual themes with dark mode support
- Theme context persisted to localStorage

### Article Views
- List view (table + pagination) and Card view (masonry grid + infinite scroll)
- Infinite scroll uses IntersectionObserver, no button click needed
- Toggle persisted per session

### Article Detail Drawer
- Slide-in panel from right, non-blocking
- Tabbed layout: Overview · Intelligence · Hunts · Comments
- Full markdown + HTML rendering

### Search & Filters
- Real-time search with debouncing (300ms)
- Multi-dimension filtering: status, source, date range, priority, type
- Clear-all filter button

### Responsive Design
- Fully responsive from 1280px+
- Sidebar collapse for smaller screens

---

## 12. Infrastructure & API

### Docker Compose Stack
| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| backend | Python 3.11 + FastAPI | 8000 | API, ingestion, GenAI |
| frontend | Node 18 + Next.js 15 | 3000 | React UI |
| postgres | PostgreSQL 15 | 5432 (internal) | Primary data store |
| redis | Redis 7 | 6379 (internal) | Sessions, rate limits, dedup cache |

- Health checks on all 4 services
- Non-root container users (`appuser` for backend, `nextjs` for frontend)
- `host.docker.internal` support for Ollama on host machine

### Database
- 44+ SQLAlchemy ORM models
- Alembic migrations in `backend/migrations/`
- Auto-seed on first launch (admin user + 200+ feed sources)
- UTC timestamps throughout (`created_at`, `updated_at`)

### API
- 180+ REST endpoints across 20+ routers
- All routes under `/api` prefix
- Swagger UI at `/docs`, ReDoc at `/redoc`
- Structured JSON logging with **structlog** and correlation IDs
- `/health` and `/metrics` (Prometheus-compatible) endpoints

### Testing
- **Backend**: pytest with SQLite test DB — 17 test files covering auth, models, connectors, GenAI guardrails, hunts, reports, permissions, feed parsing
- **Frontend E2E**: Playwright (headless, 1280×720, 30s timeout)
- **Frontend Unit**: Jest + React Testing Library

---

## Changelog (Recent Additions)

| Date | Feature |
|------|---------|
| Feb 2026 | Guided Correlation & AI Analysis panels with how-it-works banners and 8-card focus grid |
| Feb 2026 | Expanded feed sources from 50 → 200+ across 15+ categories |
| Feb 2026 | Real thread-based FeedScheduler with run-on-start ingestion and daily log cleanup |
| Feb 2026 | MITRE ATT&CK heatmap rebuilt with accurate lookup-based tactic mapping |
| Feb 2026 | Full MITRE ATLAS heatmap (35 techniques, 12 AI-specific tactics) |
| Feb 2026 | GenAI security catalog with 51 attack protections across 11 categories |
| Feb 2026 | Guardrails bulk export/import/seed-from-catalog |
| Feb 2026 | Sidebar: Org Feeds + My Feeds collapsible sections with lean layout |
| Feb 2026 | Threat Actor API fix: attribution metadata now returned from `/intelligence/all` |
| Feb 2026 | Admin analytics: clickable tiles navigate to filtered views |
| Feb 2026 | Article bookmarks & read/unread tracking |
| Feb 2026 | RBAC redesign: 12 canonical permissions with role card UI |
