# J.O.T.I — Threat Intelligence Platform
## Complete Technical Documentation

> **Version**: Current (Feb 2026) · **License**: PolyForm Noncommercial 1.0.0

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Data Model](#4-data-model)
5. [API Reference](#5-api-reference)
6. [Feature Deep-Dives](#6-feature-deep-dives)
   - [Feed Aggregation](#61-feed-aggregation)
   - [Intelligence Extraction](#62-intelligence-extraction)
   - [Hunt Query Generation](#63-hunt-query-generation)
   - [GenAI Integration](#64-genai-integration)
   - [RBAC & Auth](#65-rbac--authentication)
   - [Connectors](#66-connector-framework)
   - [Audit & Compliance](#67-audit--compliance)
   - [Knowledge Base](#68-knowledge-base)
   - [Notifications](#69-notifications)
   - [Analytics](#610-analytics)
7. [Page-by-Page Frontend Guide](#7-page-by-page-frontend-guide)
8. [Workflows](#8-workflows)
9. [Security Model](#9-security-model)
10. [Infrastructure & Deployment](#10-infrastructure--deployment)
11. [Improvement Roadmap](#11-improvement-roadmap)

---

## 1. Platform Overview

J.O.T.I is an enterprise-grade **Threat Intelligence Platform (TIP)** designed for SOC teams, threat analysts, and incident responders. It combines:

- **Feed Aggregation** — RSS/Atom ingestion from 20+ curated threat intelligence sources
- **Automated IOC Extraction** — regex + GenAI-powered extraction of 8+ indicator types
- **MITRE ATT&CK Mapping** — automatic technique and tactic identification
- **Hunt Query Generation** — AI-generated queries for XSIAM, Defender, Splunk, Wiz
- **Multi-Model GenAI** — OpenAI, Claude, Gemini, Ollama for analysis and summarization
- **Connector Framework** — extensible integration layer for SIEMs, EDRs, and enrichment platforms
- **Enterprise Auth** — JWT, OAuth 2.0, SAML/SSO, TOTP/MFA
- **Full RBAC** — 6 roles, 12 canonical permissions, per-user overrides

### Who Is It For?

| Persona | Primary Use |
|---|---|
| **Threat Analyst** | Read intel feeds, extract IOCs, generate hunt queries, write reports |
| **Security Engineer** | Configure connectors, manage sources, execute hunts, review TTPs |
| **SOC Manager** | Dashboard metrics, assign articles to analysts, review team activity |
| **CISO / Executive** | High-level reports, executive summaries, audit trail |
| **Admin** | User management, GenAI config, RBAC, system settings |

---

## 2. Architecture

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
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Auth Router │  │Article Router│  │  Admin Router│               │
│  │ /auth       │  │ /articles    │  │  /admin      │               │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                │                 │                        │
│  ┌──────▼──────────────────────────────────▼───────┐                │
│  │              Core Services Layer                 │                │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌───────┐ │                │
│  │  │  RBAC   │ │  Audit   │ │  Rate  │ │ SSRF  │ │                │
│  │  │Middleware│ │ Manager  │ │ Limit  │ │ Guard │ │                │
│  │  └─────────┘ └──────────┘ └────────┘ └───────┘ │                │
│  └───────────────────────────────────────────────┬─┘                │
│                                                  │                  │
│  ┌──────────────┐  ┌────────────┐  ┌────────────▼───────────────┐  │
│  │  Ingestion   │  │ Extraction │  │      GenAI Service         │  │
│  │  Scheduler   │  │  Engine    │  │  ┌────┐ ┌──────┐ ┌──────┐  │  │
│  │  (APSched)   │  │ (regex+AI) │  │  │OAI │ │Claude│ │Gemini│  │  │
│  └──────────────┘  └────────────┘  │  └────┘ └──────┘ └──────┘  │  │
│                                    │  ┌──────────────────────┐   │  │
│                                    │  │       Ollama         │   │  │
│                                    │  └──────────────────────┘   │  │
│                                    └───────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
             ┌───────────────┴───────────────┐
             ▼                               ▼
┌─────────────────────┐         ┌────────────────────┐
│   PostgreSQL 15     │         │      Redis 7        │
│                     │         │                     │
│  44+ ORM Models     │         │  Session Cache      │
│  Articles           │         │  Rate Limit State   │
│  IOCs               │         │  Token Blacklist    │
│  Hunt Queries       │         │  Feed Dedup Cache   │
│  Audit Logs         │         │                     │
│  Users + RBAC       │         └────────────────────┘
│  Connectors         │
│  Knowledge Base     │
└─────────────────────┘
```

### Module Dependency Graph

```
main.py
  ├── auth/           JWT · OAuth · SAML · TOTP · RBAC
  ├── articles/       CRUD · Bookmarks · Reports · Summarization · Analytics
  ├── extraction/     IOC/IOA/TTP Extraction (regex + GenAI)
  ├── ingestion/      RSS/Atom Parser · Background Scheduler
  ├── genai/          Multi-provider Service · Testing · Quotas · Models
  ├── integrations/   Feed Sources · Refresh Settings · Connectors
  ├── watchlist/      Global + Personal Keywords · Article Matching
  ├── users/          User CRUD · Preferences · Custom Feeds · Permissions
  ├── audit/          Event Logger · Middleware · Log Viewer
  ├── admin/          Settings · RBAC · Prompts · Guardrails · Ollama
  ├── knowledge/      Document CRUD · Semantic Search Chunks
  ├── notifications/  Email · Slack · ServiceNow
  ├── automation/     APScheduler · Feed Ingestion Jobs
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
      │
      ├── On error: AuditManager.log_event(SYSTEM_ERROR)
      └── On success: AuditManager.log_event(relevant_event_type)
```

---

## 3. Technology Stack

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

## 4. Data Model

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
ReportStatus:     DRAFT | PUBLISHED
KnowledgeScope:   PRIVATE | TEAM | ORGANIZATION
```

### Entity Relationship Overview

```
User ──────────────────────────────────────────────────┐
  │ (assigned_analyst_id)                               │
  ▼                                                     │
FeedSource ──────▶ Article ──────▶ ExtractedIntelligence│
                      │                  (IOC/TTP/TA)   │
                      │                                  │
                      ├──▶ ArticleIOC ◀────── IOC        │
                      │                                  │
                      ├──▶ Hunt ──────▶ HuntExecution    │
                      │                                  │
                      ├──▶ ArticleComment                │
                      │                                  │
                      └──▶ ArticleReadStatus ◀───────────┘

ConnectorPlatform ──▶ ConnectorTemplate
ConnectorConfig ──▶ ConnectorExecution

Prompt ──▶ PromptVariable
       ──▶ PromptGuardrail ◀── Guardrail
       ──▶ PromptSkill ◀────── Skill
       ──▶ PromptExecutionLog

KnowledgeDocument ──▶ KnowledgeChunk (for semantic search)

AuditLog ──▶ User
```

### Key Model Definitions

#### User
```
id, email, username, hashed_password, full_name
role (UserRole), additional_roles (JSON), custom_permissions (JSON)
is_active, is_saml_user, saml_nameid
oauth_provider, oauth_subject, oauth_email, oauth_picture
otp_enabled, otp_secret (encrypted)
last_login, created_at, updated_at
```

#### Article
```
id, source_id, external_id, title, raw_content, normalized_content
summary, url, image_url, published_at, status (ArticleStatus)
assigned_analyst_id, genai_analysis_remarks
executive_summary, technical_summary
reviewed_by_id, reviewed_at, analyzed_by_id, analyzed_at
is_high_priority, watchlist_match_keywords (JSON)
hunt_generated_count, hunt_launched_count
content_hash (for dedup), ingested_at, created_at, updated_at
```

#### ExtractedIntelligence
```
id, article_id, hunt_execution_id
intelligence_type (IOC|IOA|TTP|ATLAS|THREAT_ACTOR)
value, confidence (0-100), evidence, mitre_id
metadata (JSON), is_reviewed, reviewed_by_id
is_false_positive, notes, created_at
```

#### Hunt
```
id, article_id, platform (xsiam|defender|wiz|splunk)
query_logic, title, initiated_by_id
status (HuntStatus), generated_by_model
prompt_template_version, response_hash
parent_hunt_id (versioning), query_version
is_manual, manual_notes, created_at, updated_at
```

#### ConnectorPlatform
```
id, platform_id (unique slug), name, description, vendor
category (siem|edr|cloud_security|sandbox|enrichment|notification)
subcategory, icon_url, color
capabilities (JSON: hunt/enrich/notify/ingest/export)
query_language (KQL|SPL|XQL|SQL|GraphQL)
query_syntax (JSON), documentation_url
config_schema (JSON), api_definition (JSON)
is_builtin, is_active, is_beta
```

---

## 5. API Reference

### Summary Table (180+ endpoints across 20 routers)

| Router | Prefix | Endpoints | Permission Required |
|---|---|---|---|
| Auth | `/auth` | 15 | Public / current_user |
| SAML | `/auth/saml` | 5 | Public / SAML IdP |
| Articles | `/articles` | 60+ | `articles:read` minimum |
| Bookmarks | `/bookmarks` | 6 | `articles:read` |
| Reports | `/reports` | 3 | `articles:export` |
| Summarization | `/summarization` | 6 | `articles:analyze` |
| Sources | `/sources` | 10 | `sources:read` / `sources:manage` |
| Refresh Settings | `/refresh-settings` | 14 | `sources:read` |
| Watchlist | `/watchlist` | 10 | `watchlist:read` / `watchlist:manage` |
| Users | `/users` | 11 | `users:manage` |
| Audit | `/audit` | 3 | `audit:read` |
| Admin Core | `/admin` | 40+ | `users:manage` / `admin:*` |
| Admin Feeds | `/admin/default-feeds` | 5 | `sources:manage` |
| Admin GenAI Funcs | `/admin/genai-functions` | 8 | `admin:genai` |
| Admin Guardrails | `/admin/guardrails` | 15 | `admin:genai` |
| Admin Ollama | `/admin/ollama` | 8 | `admin:genai` |
| Admin Prompts | `/admin/prompts` | 12 | `admin:genai` |
| Admin Skills | `/admin/skills` | 5 | `admin:genai` |
| GenAI | `/genai` | 25+ | `admin:genai` |
| GenAI Testing | `/genai/testing` | 3 | `admin:genai` |
| Analytics | `/analytics` | 4 | `articles:read` / `users:manage` |

### Permission → Endpoint Mapping

```
articles:read    → GET /articles, /articles/{id}, /articles/search,
                   /analytics/me, /bookmarks
articles:export  → GET /articles/{id}/export/*, /reports/*, /admin/export/*
articles:analyze → POST /articles/{id}/extract-intelligence,
                   POST /articles/{id}/summarize, /summarization/*
sources:read     → GET /sources, /refresh-settings
sources:manage   → POST/PATCH/DELETE /sources, POST /sources/{id}/ingest
watchlist:read   → GET /watchlist, /watchlist/mine
watchlist:manage → POST/PATCH/DELETE /watchlist, /watchlist/mine
users:manage     → CRUD /users, /admin/* (most endpoints)
audit:read       → GET /audit, /audit/{id}
admin:genai      → /admin/prompts, /admin/guardrails, /admin/skills,
                   /admin/ollama, /admin/genai-functions, /genai/*
admin:rbac       → GET/PUT /admin/rbac/*
admin:system     → /admin/configurations, /admin/connectors, /retention-settings
```

---

## 6. Feature Deep-Dives

### 6.1 Feed Aggregation

**How it works:**

```
APScheduler (every N min)
    │
    ▼
For each active FeedSource where next_fetch <= now:
    │
    ├── HTTP GET feed URL (with SSRF validation)
    │
    ├── feedparser.parse(content)
    │
    ├── For each entry:
    │       content_hash = sha256(title + url)
    │       if content_hash not in DB: (dedup)
    │           Article.create(status=NEW)
    │           if source.high_fidelity:
    │               trigger IOC extraction
    │           check_watchlist_match(article)
    │
    └── FeedSource.last_fetched = now
        FeedSource.next_fetch = now + refresh_interval
```

**Capabilities:**
- RSS and Atom formats
- Custom HTTP headers per source (for authenticated feeds)
- Per-source refresh intervals (5 min to 24 hours)
- High-fidelity flag triggers automatic deep analysis
- User-level source preferences (override refresh interval)
- 20+ default curated TI feeds (CISA, BleepingComputer, SANS ISC, Dark Reading, SecurityWeek, etc.)
- Manual "ingest now" trigger via API
- Custom document upload (PDF, HTML, text)
- External URL fetch on demand

---

### 6.2 Intelligence Extraction

**Extraction Pipeline:**

```
Article.raw_content
    │
    ▼
[Regex Extraction]
    ├── IPs          → \b(?:\d{1,3}\.){3}\d{1,3}\b
    ├── Domains      → pattern + TLD validation
    ├── Hashes       → MD5 (32), SHA1 (40), SHA256 (64) hex
    ├── CVEs         → CVE-\d{4}-\d{4,7}
    ├── Emails       → RFC 5322 pattern
    ├── Registry     → HKEY_LOCAL_MACHINE\... patterns
    ├── File paths   → C:\..., /etc/..., etc.
    ├── URLs         → http/https/ftp full URLs
    └── Threat Actors → named entity list + pattern matching
    │
    ▼
[GenAI Enhancement] (if configured)
    ├── LLM validates and enriches extracted IOCs
    ├── Extracts IOAs (behaviors, not just static indicators)
    ├── Maps TTPs to MITRE ATT&CK technique IDs
    └── Identifies threat actor mentions
    │
    ▼
[Storage]
    ├── ExtractedIntelligence records per article
    ├── IOC dedup: same value across articles → ArticleIOC junction
    ├── confidence score (0-100) per indicator
    └── evidence field: the sentence/paragraph containing the IOC
```

**Review Workflow:**
- Analyst marks indicators as reviewed or false positive
- Bulk review for efficiency
- False positives persist to avoid re-flagging

---

### 6.3 Hunt Query Generation

**Flow:**

```
Analyst clicks "Generate Hunt" on article
    │
    ▼
Select platform (XSIAM | Defender | Splunk | Wiz)
    │
    ▼
GenAI Service receives:
    - Article content
    - Extracted IOCs (IPs, domains, hashes)
    - TTPs (MITRE technique IDs)
    - Selected platform + its query syntax
    - System prompt template (from Prompts library)
    │
    ▼
GenAI generates hunt query
    │
    ▼
Hunt record created:
    - query_logic (the generated query text)
    - platform, generated_by_model, prompt_template_version
    - response_hash (for change detection)
    │
    ▼
Analyst reviews, edits, or launches query
    │
    ▼
HuntExecution created:
    - results (JSON), findings_summary, hits_count
    - execution_time_ms, servicenow_ticket_id
    │
    ▼
Optional: ServiceNow ticket auto-created
Optional: Email/Slack notification sent
```

**Query Versioning:**
- Each regeneration creates a new Hunt with `parent_hunt_id` pointing to previous
- `query_version` increments
- Full history preserved for audit

---

### 6.4 GenAI Integration

**Provider Architecture:**

```
GenAI Unified Service
    │
    ├── OpenAI Provider   → GPT-4, GPT-4-turbo, GPT-3.5-turbo
    ├── Claude Provider   → claude-3-opus, claude-3-sonnet, claude-haiku
    ├── Gemini Provider   → gemini-pro, gemini-ultra
    └── Ollama Provider   → mistral, llama3, phi3, any local model
```

**GenAI Functions (configurable per function):**

| Function | Purpose | Default Model |
|---|---|---|
| `summarize_article` | Generate concise article summary | GPT-4 |
| `extract_iocs` | Extract IOCs from text | GPT-4 |
| `analyze_content` | Deep threat analysis | GPT-4 |
| `generate_hunt_xsiam` | XQL hunt query | GPT-4 |
| `generate_hunt_defender` | KQL hunt query | GPT-4 |
| `generate_hunt_splunk` | SPL hunt query | GPT-4 |
| `generate_hunt_wiz` | GraphQL hunt query | GPT-4 |
| `generate_executive_summary` | Executive-level summary | GPT-4 |

**Prompt System:**
- Prompts stored in DB with name, template, persona, version
- Variables: typed template slots (`{{article_content}}`, `{{iocs}}`, etc.)
- Personas: expert role instructions prepended to system prompt
- Guardrails: post-generation validation rules
- Execution logs: every call tracked with tokens, latency, status

**Guardrail Types:**
```
regex_blocklist  → Block responses matching patterns
keyword_blocklist → Block specific words/phrases
length_check     → Min/max response length
json_format      → Enforce JSON output structure
toxicity_check   → Block harmful content
```

**Usage Quotas:**
- Per-user daily/monthly token limits
- Per-function rate limits
- Admin can view quota usage

**Testing Console:**
- Test any model with custom prompts
- Compare up to N models side-by-side
- View token count, latency, cost estimate
- Test history persisted

**Ollama Local Setup:**
- In-app guided Ollama installation
- Model library browser (pull any Hugging Face / Ollama model)
- Health check and status monitoring

---

### 6.5 RBAC & Authentication

**Permission Model:**

```
12 Canonical Permissions:
┌─────────────────────────────────────────────────────────────────┐
│ GROUP: Core Access                                              │
│   articles:read    — View feeds, articles, intelligence         │
│   articles:export  — Export articles, PDF, CSV, reports         │
│   articles:analyze — AI summarize, extract IOCs, change status  │
├─────────────────────────────────────────────────────────────────┤
│ GROUP: Sources & Feeds                                          │
│   sources:read     — View feed sources                          │
│   sources:manage   — Create/edit/delete/ingest sources          │
│   watchlist:read   — View watchlists                            │
│   watchlist:manage — Create/edit/delete watchlist keywords      │
├─────────────────────────────────────────────────────────────────┤
│ GROUP: Administration                                           │
│   users:manage     — Create/edit/delete users, assign roles     │
│   audit:read       — View audit logs                            │
│   admin:genai      — Configure GenAI, prompts, guardrails       │
│   admin:rbac       — Edit role permissions                      │
│   admin:system     — System config, connectors, monitoring      │
└─────────────────────────────────────────────────────────────────┘
```

**Role → Permission Matrix:**

| Permission | ADMIN | ANALYST | ENGINEER | MANAGER | EXECUTIVE | VIEWER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| articles:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| articles:export | ✓ | ✓ | ✓ | ✓ | ✓ | |
| articles:analyze | ✓ | ✓ | ✓ | | | |
| sources:read | ✓ | ✓ | ✓ | ✓ | | ✓ |
| sources:manage | ✓ | ✓ | ✓ | | | |
| watchlist:read | ✓ | ✓ | ✓ | ✓ | | ✓ |
| watchlist:manage | ✓ | ✓ | ✓ | | | |
| users:manage | ✓ | | ✓ | | | |
| audit:read | ✓ | | ✓ | ✓ | ✓ | |
| admin:genai | ✓ | | ✓ | | | |
| admin:rbac | ✓ | | | | | |
| admin:system | ✓ | | ✓ | | | |

**Auth Flows:**

```
Local Login:
Browser → POST /auth/login {email, password}
        → argon2.verify(password, hashed_password)
        → if otp_enabled: verify TOTP code
        → return {access_token, refresh_token}

OAuth Login:
Browser → GET /auth/{provider}/login
        → redirect to Google/Microsoft
        → GET /auth/{provider}/callback?code=...
        → exchange code → user profile
        → find/create User → return tokens

SAML Login:
Browser → GET /auth/saml/login
        → redirect to IdP (Okta, Azure AD)
        → POST /auth/saml/acs (SAML assertion)
        → validate + find/create User → return tokens

Token Refresh:
Browser → POST /auth/refresh {refresh_token}
        → validate, blacklist old, issue new pair
        → return {access_token, refresh_token}

Role Impersonation (ADMIN only):
Admin → POST /users/switch-role {role: "ANALYST"}
     → JWT gets impersonation_context embedded
     → all permission checks use assumed role
     → POST /users/restore-role → reverts
```

---

### 6.6 Connector Framework

**Architecture:**

```
ConnectorPlatform (registry)
    │ 1:many
    ▼
ConnectorTemplate (endpoint definitions)
    │
    ▼ instantiated by
ConnectorConfig (user-created instances with secrets)
    │
    ▼ execution tracked in
ConnectorExecution (audit/debug log)
```

**Connector Categories:**
- **SIEM**: Microsoft Sentinel, Splunk, IBM QRadar, Elastic
- **EDR**: CrowdStrike, SentinelOne, Defender for Endpoint
- **Cloud Security**: Wiz, Prisma Cloud, AWS Security Hub
- **Sandbox**: Any.run, VirusTotal, Hybrid Analysis
- **Enrichment**: Shodan, GreyNoise, Censys, AbuseIPDB
- **Notification**: Slack, PagerDuty, ServiceNow

**Template Configuration:**
- `http_method`: GET/POST/PUT/DELETE
- `endpoint_path`: `/api/v1/iocs/{ioc_value}`
- `request_template`: Jinja2 template for request body
- `response_parser`: JSONPath expressions to extract results
- `success_condition`: Condition to determine success
- `rate_limit_requests` / `rate_limit_window_seconds`
- `retry_on_status`: HTTP status codes to retry on
- `max_retries`, `retry_delay_seconds`

---

### 6.7 Audit & Compliance

**Event Capture:**

```
Every API call that modifies data:
    AuditManager.log_event(
        db=db,
        user_id=current_user.id,
        event_type=AuditEventType.ARTICLE_LIFECYCLE,
        action="Updated article status to IN_ANALYSIS",
        resource_type="article",
        resource_id=article.id,
        details={"old_status": "NEW", "new_status": "IN_ANALYSIS"},
        correlation_id=request.state.correlation_id,
        ip_address=request.client.host
    )
```

**20 Tracked Event Types:**
```
LOGIN, LOGOUT, REGISTRATION, PASSWORD_CHANGE, ARTICLE_LIFECYCLE,
BOOKMARK, EXTRACTION, CONNECTOR_CONFIG, HUNT_TRIGGER, NOTIFICATION,
REPORT_GENERATION, RBAC_CHANGE, SYSTEM_CONFIG, GENAI_SUMMARIZATION,
KNOWLEDGE_BASE, SCHEDULED_TASK, ADMIN_ACTION, WATCHLIST_CHANGE,
FEED_MANAGEMENT, SEARCH
```

**Access Control on Logs:**
- ADMINs and ENGINEERs see all logs
- MANAGER and EXECUTIVE see all logs (audit:read permission)
- Other roles see only their own logs (IDOR protection)

**Correlation IDs:**
- UUID generated per request in middleware
- Stored in AuditLog.correlation_id
- Allows tracing all events from a single request chain
- Query: `GET /audit/correlation/{id}` returns full trace

---

### 6.8 Knowledge Base

**Document Types:**
- `PROCEDURE` — step-by-step operational procedures
- `RUNBOOK` — incident response playbooks
- `TACTIC` — attack tactic documentation
- `TECHNIQUE` — specific technique breakdown
- `ACTOR` — threat actor profiles
- `TOOL` — malware/tool documentation
- `MALWARE` — malware analysis reports

**Semantic Search:**
- Documents split into `KnowledgeChunk` records
- Each chunk stores an embedding vector
- Search by semantic similarity to find related documents
- Scopes: PRIVATE (author only), TEAM, ORGANIZATION

---

### 6.9 Notifications

**Channels:**
- **Email** (SMTP): Article assignments, hunt results, watchlist alerts
- **Slack** (Webhook): Real-time alerts to channels
- **ServiceNow**: Auto-create ITSM tickets from hunt findings

**Notification Triggers:**
- New high-priority article (watchlist match)
- Article assigned to analyst
- Hunt execution completed with hits
- Hunt results exceed threshold
- System health alerts

**Idempotency:**
- `HuntExecution.email_sent` flag prevents duplicate emails
- `HuntExecution.servicenow_ticket_id` prevents duplicate tickets

---

### 6.10 Analytics

**User Analytics (`GET /analytics/me`):**
- Articles read (last 7/30/90 days)
- Hunts executed
- Intelligence items reviewed
- Bookmarks created
- Comments posted

**Admin Overview (`GET /analytics/admin/overview`):**
- Total articles by status
- Active sources count
- IOC/TTP extraction counts
- Watchlist match rate
- Per-user activity breakdown
- Top threat actors/techniques

**Export:**
- `GET /analytics/admin/export` → JSON (convert to CSV on frontend)
- Date range filtering with `start_date` / `end_date` params

---

## 7. Page-by-Page Frontend Guide

### `/login` — Authentication Page
- Two-panel layout: branded left panel, login form right
- Local auth: email + password fields
- OAuth buttons: Google, Microsoft
- OTP/TOTP field appears if 2FA is enabled for the user
- Error messages for locked accounts, invalid credentials
- Redirect to dashboard on success

### `/news` — Main Feed (Feedly-Style)
- 4-column card grid of articles
- Filter bar: status, source, date range, priority, analyst
- Search bar: full-text search across title + content
- Article cards show: title, source, published date, status badge, IOC count, priority indicator
- Click card → opens `ArticleDetailDrawer` slide-in
- Mark all read button
- Keyboard navigation

### Article Detail Drawer (Side Panel)
- Full article title, source, published date
- Article content (normalized HTML)
- **Status controls**: dropdown to change workflow status
- **AI Summary**: one-click summarize button, displays result
- **IOCs section**: grouped by type (IPs, domains, hashes, CVEs) with copy buttons
- **TTPs section**: MITRE ATT&CK technique IDs with links
- **Threat Actors section**: named actors (purple badges)
- **Related Articles**: top N similar articles with match score and reasons
- **Hunt Queries**: tabs per platform (XSIAM/Defender/Splunk/Wiz), generate button
- **Comments**: threaded analyst discussion
- **Export**: PDF, HTML, CSV buttons
- **Bookmark**: toggle bookmark
- **Assignment**: assign to analyst dropdown

### `/watchlist` — Watchlist Keywords
- Global keyword table: keyword, category, active toggle, edit/delete
- User personal keywords tab
- Category filter: TTP, Threat Actor, Attack Type, Vulnerability, Malware, Custom
- Add keyword modal with category selector
- "Refresh matching" button re-scans all articles

### `/feeds` — Feed Sources (Admin)
- Table of all feed sources with: name, URL, type, last fetched, article count, status
- Add source button → form with URL, name, type, refresh interval
- Per-source actions: edit, delete, ingest now, toggle active
- Source health indicators (last fetch error display)

### `/admin/users` — User Management
- Searchable user table: name, email, role, last login, status
- Add user button → form with all user fields
- Edit user → modal with role selector, active toggle
- Impersonation: "Switch to role" for testing (admins only)

### `/admin/rbac` — Access Control
- **Roles tab**: 2-column role cards
  - Each card: role badge, description, permission count
  - Expand → inline permission checkboxes grouped into 3 categories
  - Save/Reset per role
- **User Overrides tab**:
  - User search list (left panel)
  - Override editor (right panel): add grant/deny overrides per permission
  - Shows existing overrides with remove button

### `/admin/genai` — GenAI Management
- Provider status cards (OpenAI, Claude, Gemini, Ollama)
- Model list with enable/disable toggles
- Usage quota management
- Test console: prompt input → model response
- Model preferences (global default model)

### `/admin/prompts` — Prompt Library
- Prompt list with name, version, model recommendations
- Create/edit prompt modal:
  - Template editor with variable syntax
  - Variable definitions (name, type, required, default)
  - Persona selector
  - Guardrail attachments
- Preview rendered prompt with sample values
- Version history

### `/admin/guardrails` — Guardrail Rules
- Guardrail list by function
- Rule types: regex_blocklist, keyword_blocklist, length_check, json_format, toxicity_check
- Toggle per guardrail, edit rule expression
- Test guardrail against sample text
- Global guardrails (apply to all functions)

### `/admin/connectors` — Connector Registry
- Platform list with category icons
- Click platform → view templates
- Create connector instance → fill config (API keys, base URLs, etc.)
- Test connection button
- Execution log viewer per connector

### `/admin/audit` — Audit Log Viewer
- Filterable table: event type, user, date range, resource type
- Correlation ID column (clickable → view full trace)
- Export audit logs
- IDOR enforced: non-admins see only their events

### `/admin/monitoring` — System Health
- Service status indicators (backend, DB, Redis, scheduler)
- GenAI provider connectivity
- Scheduled job status (next run times)
- System statistics: user count, article count, IOC count

### `/profile` — User Profile
- Edit display name, email
- Change password form
- OTP setup: QR code display, verification step, backup codes
- Watchlist preferences
- Feed source preferences (per-source refresh overrides)
- Theme toggle

---

## 8. Workflows

### Workflow 1: New Threat Article → Hunt Query

```
[RSS Feed]
    │
    ▼ (automated, every N minutes)
Article ingested, status = NEW
    │
    ▼ (if source.high_fidelity)
IOC extraction triggered automatically
    │
    ▼ (if watchlist match)
article.is_high_priority = True → notification sent
    │
    ▼ (analyst opens article)
Reads content, AI summary viewed
    │
    ▼
Analyst clicks "Extract Intelligence"
    │
    ▼
IOCs + TTPs displayed, false positives flagged
    │
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
Status → HUNT_GENERATED
    │
    ▼
Analyst reviews query, optionally edits
    │
    ▼
Hunt executed in XSIAM (via connector or manual)
    │
    ▼ (if hits found)
ServiceNow ticket created, email/Slack alert sent
    │
    ▼
Analyst documents findings in article comments
    │
    ▼
Status → REVIEWED
```

### Workflow 2: Analyst Collaboration

```
Senior Analyst ingests article
    │
    ▼
Assigns to Junior Analyst (POST /articles/{id}/assign)
    │
    ▼
Junior Analyst receives notification
    │
    ▼
Opens article, adds comments: "Looks like APT29 TTPs"
    │
    ▼
Senior Analyst reviews comments, adds reply
    │
    ▼
Both analysts extract intelligence collaboratively
    │
    ▼
Senior Analyst generates executive report (PDF)
    │
    ▼
Report shared with CISO
```

### Workflow 3: GenAI Testing & Prompt Tuning

```
Admin opens /admin/prompts
    │
    ▼
Edits "generate_hunt_defender" system prompt
    │
    ▼
Previews rendered output with sample variables
    │
    ▼
Opens GenAI Testing Console
    │
    ▼
Compare GPT-4 vs Claude 3 Opus on same article
    │
    ▼
Reviews side-by-side: quality, tokens, latency
    │
    ▼
Sets preferred model for this function
    │
    ▼
Applies guardrail: "block_non_json_output"
```

### Workflow 4: New User Onboarding

```
Admin creates user → POST /users {email, role: ANALYST}
    │
    ▼
User receives registration email
    │
    ▼
User logs in with temporary password
    │
    ▼
Prompted to change password
    │
    ▼
Optional: User sets up TOTP 2FA in /profile
    │
    ▼
User's sidebar shows only permitted pages (from my-permissions)
    │
    ▼
Analyst-scoped feeds, articles, watchlist visible
Admin pages not shown (no admin:rbac permission)
```

---

## 9. Security Model

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
  - Account lockout after N failures
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
  - System configuration secrets encrypted
  - SECRET_KEY required 32+ chars in production

Layer 6: Security Headers
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: geolocation=(), microphone=(), camera=()
  - HSTS (production)

Layer 7: Audit
  - 20 event types tracked
  - Immutable append-only log
  - Correlation IDs for distributed tracing
  - IP address logging
```

---

## 10. Infrastructure & Deployment

### Docker Compose Services

```yaml
services:
  postgres:    image: postgres:15-alpine   port: 5432
  redis:       image: redis:7-alpine       port: 6379
  backend:     build: backend/             port: 8000
  frontend:    build: frontend-nextjs/     port: 3000
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/joti
REDIS_URL=redis://redis:6379/0

# Security
SECRET_KEY=<32+ random chars>
DEBUG=false
ENV=production

# Admin
ADMIN_EMAIL=admin@company.com
ADMIN_PASSWORD=<strong-password>

# CORS
CORS_ORIGINS=https://your-domain.com

# Frontend
NEXT_PUBLIC_API_URL=https://your-domain.com/api

# GenAI (optional)
OPENAI_API_KEY=sk-...
GENAI_PROVIDER=openai

# Features
ENABLE_AUTOMATION_SCHEDULER=true
ARTICLE_RETENTION_DAYS=365
AUDIT_RETENTION_DAYS=730
HUNT_RETENTION_DAYS=180
```

### API Documentation
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

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

# Rebuild single service
docker compose build --no-cache backend
docker compose up -d backend
```

---

## 11. Improvement Roadmap

> Benchmarked against: **Recorded Future**, **Mandiant Advantage**, **ThreatQ**, **Anomali ThreatStream**, **MISP**, **Feedly for Threat Intelligence**, **Fletch.ai**, **Google Threat Intelligence**.

---

### Tier 1 — High Impact, Near-Term

#### 1.1 Threat Scoring & Prioritization Engine
**Gap**: Articles are prioritized only by watchlist keyword match. No threat scoring model.

**What best platforms do**: Recorded Future scores every IOC with a `Criticality Score` (1-100) combining recency, source reliability, context, and prevalence. Feedly TI assigns `Critical Threat` tags automatically.

**Implementation**:
- Score each article on ingestion: source reliability × recency × IOC severity × TTP impact
- Score each IOC: prevalence (how many articles mention it) × source reliability × age
- Threat actor known-bad score (from external feeds like AlienVault OTX, VirusTotal)
- Surface scores in feed cards with color-coded severity badges

#### 1.2 IOC Enrichment Pipeline
**Gap**: IOCs are extracted but not enriched. An IP is just an IP — no reputation, geolocation, or context.

**What best platforms do**: Anomali ThreatStream auto-enriches every IOC with VirusTotal, Shodan, GreyNoise, PassiveTotal scores.

**Implementation**:
- After extraction, async-enrich IOCs via connector framework (already exists!)
- VirusTotal: malicious score, detections
- GreyNoise: internet scanner / malicious / benign classification
- Shodan: open ports, services, ASN, geolocation
- AbuseIPDB: abuse confidence score
- Store enrichment results in IOC.metadata JSON field
- Display in drawer: "IP: 1.2.3.4 — VirusTotal: 45/72 detections, GreyNoise: Malicious"

#### 1.3 Threat Actor Profiles
**Gap**: Threat actors are extracted as text strings but no structured profiles exist.

**What best platforms do**: Mandiant Advantage has structured actor profiles with TTPs, targets, tools, history, attribution confidence.

**Implementation**:
- Knowledge base documents of type `ACTOR` (model already exists)
- Auto-link extracted `THREAT_ACTOR` intelligence to actor profiles
- Actor profile page: aliases, associated TTPs, targeted sectors, active timeframe, tools used
- "Articles mentioning this actor" backlink
- MISP galaxy integration for actor data import

#### 1.4 Trend Analysis & Threat Landscape Dashboard
**Gap**: No time-series analysis. No way to see "CVE mentions spiking this week."

**What best platforms do**: Feedly has "Trends" showing rising topics, emerging threats, IOC frequency over time.

**Implementation**:
- Track IOC/TTP/actor mention counts over rolling windows
- Dashboard widgets: "Top emerging TTPs (7d)", "Trending threat actors", "CVE spike alerts"
- Bar/line charts with Recharts
- Alert when metric exceeds threshold (e.g., domain mentioned 5× in 24h → high priority)

#### 1.5 Full-Text Article Search with Semantic Similarity
**Gap**: Current search is basic keyword matching. No semantic search.

**What best platforms do**: Recorded Future and Feedly use semantic search to find conceptually similar articles even without keyword overlap.

**Implementation**:
- Generate embeddings for articles on ingestion (OpenAI `text-embedding-3-small` or local model)
- Store in `pgvector` extension (PostgreSQL) or dedicated vector DB
- Semantic search endpoint with cosine similarity ranking
- Hybrid search: keyword + semantic combined score
- "Find articles like this one" feature in drawer (upgrade current similar articles)

---

### Tier 2 — Medium Impact, Medium Complexity

#### 2.1 MISP Integration (Bi-directional)
**Gap**: MISP is the de-facto open standard for TI sharing. No integration exists.

**Implementation**:
- Pull MISP events → ingest as articles + IOCs
- Push Joti IOCs to MISP as events
- MISP galaxy support for actor/malware/tool categorization
- Connector template for MISP REST API

#### 2.2 STIX/TAXII Support
**Gap**: STIX 2.1 / TAXII 2.1 is the industry standard for TI exchange. Not supported.

**Implementation**:
- TAXII 2.1 server: expose Joti intelligence as TAXII collections
- TAXII client: ingest from external TAXII feeds (CISA, ISACs, commercial feeds)
- STIX 2.1 bundle export: articles → STIX Reports, IOCs → STIX Indicators

#### 2.3 Automated Triage with AI Classification
**Gap**: Analysts manually review every article. No AI-assisted triage.

**What best platforms do**: Fletch.ai autonomously triages alerts, reducing analyst workload by 90%.

**Implementation**:
- On ingestion, AI classifies: relevance to your environment, severity, recommended action
- Skip obviously irrelevant articles (auto-archive)
- Auto-assign high-severity articles to senior analysts
- Triage reasoning displayed to analyst for transparency

#### 2.4 Analyst Performance & Team Metrics
**Gap**: No team-level analytics. Managers can't measure analyst throughput.

**Implementation**:
- Articles processed per analyst per week
- Mean time from ingestion to REVIEWED status
- Hunt-to-hit ratio (how often generated hunts find actual threats)
- Team comparison dashboard for managers
- Individual analyst productivity trends

#### 2.5 Custom Feed Integrations via No-Code Builder
**Gap**: Adding new feed sources requires knowing the exact RSS URL.

**Implementation**:
- Visual connector builder: paste any URL → auto-detect RSS/Atom/HTML
- HTML scraper mode: CSS selector-based extraction for non-RSS sites
- Email ingestion: ingest threat intel from email subscriptions via IMAP
- API-based sources: configure REST API sources with pagination

#### 2.6 Environment Context & Applicability Scoring
**Gap**: `EnvironmentContext` model exists but isn't used for relevance scoring.

**What best platforms do**: Recorded Future and ThreatQ filter intel by relevance to YOUR environment (your ASNs, tech stack, industry sector).

**Implementation**:
- Admins define environment: tech stack (Windows, Azure, Kubernetes), industry sector, IP ranges
- On ingestion, score article relevance to this environment
- "Applies to your environment" flag with reason: "Uses CVE affecting your Azure AD version"
- Filter feed by "relevant to us" toggle

#### 2.7 Autonomous Hunt Execution
**Gap**: Hunt queries are generated but executed manually.

**What best platforms do**: Fletch.ai, Palo Alto XSIAM execute hunts automatically on schedule.

**Implementation**:
- Connector executes hunt query in SIEM/EDR via API
- Results parsed and stored in `HuntExecution.results`
- Findings summary generated by AI
- Automatic alert if hits > 0
- Scheduled recurring hunts (re-run every 24h)

#### 2.8 Intelligence Deduplication & Correlation
**Gap**: Same IOC from 5 different articles is stored 5 times with no correlation.

**What best platforms do**: Anomali correlates IOCs across sources, showing "this domain appears in 12 reports over 6 months."

**Implementation**:
- IOC deduplication: same value → single IOC record linked to multiple articles (ArticleIOC already exists)
- Correlation view: click IOC → see all articles mentioning it
- IOC timeline: first seen, last seen, frequency over time
- Related IOC clustering: group IOCs that appear together frequently

---

### Tier 3 — Strategic / Longer-Term

#### 3.1 Autonomous AI Threat Analyst Agent
**Gap**: AI assists analysts but doesn't work autonomously. Every action requires human initiation.

**What's emerging**: Fletch.ai, Google Threat Intelligence, and Microsoft Copilot for Security are building autonomous AI agents that independently research, correlate, and respond to threats.

**Implementation (using Claude Agents SDK)**:
- `ThreatAnalysisAgent`: Given a new article, autonomously:
  1. Extracts IOCs and enriches each one
  2. Searches internal knowledge base for related context
  3. Correlates with previous articles mentioning same actors/TTPs
  4. Generates hunt queries for all relevant platforms
  5. Produces structured report with confidence scores
  6. Assigns to appropriate analyst based on specialty
- Human-in-the-loop: agent produces draft, analyst approves
- Agent audit trail: every decision logged with reasoning

#### 3.2 Natural Language Query Interface
**Gap**: All search and filtering requires understanding the data model.

**What best platforms do**: "Ask Recorded Future" accepts natural language: "Show me articles about APT28 from last month targeting financial sector."

**Implementation**:
- NL → structured query translation via LLM
- Understands: time ranges, threat actors, industries, IOC types, article status
- Returns: filtered article list with explanation of how query was interpreted
- Chat-style interface in sidebar

#### 3.3 Detection Engineering Pipeline
**Gap**: Hunt queries are ad-hoc. No structured detection rule management.

**What best platforms do**: Elastic Security, Chronicle, and Splunk ES manage detection rules with version control, testing, and deployment pipelines.

**Implementation**:
- Detection rule library (Sigma, YARA, KQL, SPL templates)
- Rule versioning and change tracking
- Rule testing against historical data
- Auto-convert extracted TTPs → detection rule stubs
- Deploy rules to connected SIEMs via connector

#### 3.4 Threat Intelligence Sharing (ISAC Integration)
**Gap**: Intelligence is consumed but not shared with the broader community.

**Implementation**:
- Publish vetted IOCs to community sharing platforms (ISAC, MISP communities)
- TLP (Traffic Light Protocol) tags: RED/AMBER/GREEN/CLEAR on all intelligence
- Sharing policies: auto-share GREEN, manual approval for AMBER
- Receive shared intelligence from ISAC peers

#### 3.5 Adversary Simulation Planning
**Gap**: Hunt queries target known IOCs. No adversary emulation capability.

**What best platforms do**: Mandiant Advantage links TTPs to adversary playbooks for simulation planning.

**Implementation**:
- Given article TTPs, generate adversary emulation plan
- Map techniques to CALDERA/Atomic Red Team tests
- "Test your defenses" mode: generate simulation scenarios
- Link hunt queries to specific technique tests

#### 3.6 Mobile App / PWA
**Gap**: No mobile access. SOC analysts are often away from desk.

**Implementation**:
- Progressive Web App (PWA) support with offline article caching
- Push notifications for high-priority alerts
- Quick triage interface optimized for mobile
- Biometric authentication

#### 3.7 Dark Web Monitoring Integration
**Gap**: Platform only monitors open web sources.

**What best platforms do**: Recorded Future, Flashpoint, Intel 471 monitor dark web forums, paste sites, Telegram channels.

**Implementation**:
- Integrate dark web monitoring APIs (Flashpoint, SpyCloud)
- Credential leak detection for organization domains
- Dark web mention alerts for company/product names
- Dark web IOC enrichment

#### 3.8 API-First / Headless Mode
**Gap**: Platform requires the full UI. No programmatic-first integration.

**Implementation**:
- GraphQL API layer for flexible querying
- Webhooks: POST to configurable URLs on events (new article, IOC extracted, hunt hit)
- API keys: generate per-user/per-service API keys (separate from JWTs)
- Terraform/Ansible provider for infrastructure-as-code management

---

### Quick Wins (Can be done in days)

| # | Feature | Effort | Impact |
|---|---|---|---|
| 1 | IOC copy-to-clipboard button in drawer | XS | High (daily analyst friction) |
| 2 | Keyboard shortcuts (J/K for next/prev article) | S | Medium |
| 3 | "Mark as read on scroll" option | S | Medium |
| 4 | Article feed density toggle (compact / comfortable / card) | S | Medium |
| 5 | Saved search filters (save current filter as named preset) | S | High |
| 6 | Bulk article status update from feed view | S | High |
| 7 | Browser push notifications for watchlist matches | M | High |
| 8 | Article age indicator ("ingested 2 hours ago") | XS | Low |
| 9 | IOC prevalence count in drawer ("seen in 7 articles") | S | High |
| 10 | Export watchlist to CSV/STIX | S | Medium |
| 11 | Dark mode refinements (color contrast accessibility) | S | Low |
| 12 | Right-click IOC → "Search in VirusTotal/Shodan" | S | High |
| 13 | Drag-and-drop article assignment | M | Medium |
| 14 | Article flagging / false positive reporting | S | Medium |
| 15 | RSS feed health dashboard (fetch errors over time) | S | Medium |

---

*Generated: Feb 2026 · Joti Platform Documentation v1.0*
