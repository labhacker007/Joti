# J.O.T.I - Platform Features

> Enterprise-grade Threat Intelligence Platform for SOC teams, threat analysts, and incident responders.

---

## Core Capabilities

### Feed Aggregation & Ingestion
- RSS/Atom feed parsing from 20+ curated threat intelligence sources (CISA, BleepingComputer, SANS ISC, Dark Reading, SecurityWeek, etc.)
- Custom HTTP headers per source for authenticated feeds
- Per-source configurable refresh intervals (5 min to 24 hours)
- Content deduplication via SHA-256 hashing
- High-fidelity flag for automatic deep analysis on ingestion
- Manual "ingest now" trigger per source
- Custom document upload (PDF, HTML, text) and external URL fetch
- User-level source preferences with refresh overrides
- Background scheduler (APScheduler) for automated ingestion

### Intelligence Extraction
- **8+ IOC types**: IPv4/IPv6, domains, URLs, hashes (MD5/SHA1/SHA256), emails, CVEs, registry keys, file paths
- **Dual extraction pipeline**: regex-based (fast, reliable) + GenAI-enhanced (deeper analysis)
- **MITRE ATT&CK mapping**: automatic TTP identification from 149+ technique patterns
- **Threat actor identification**: 20+ named APT groups and aliases
- **Confidence scoring** (0-100) per extracted indicator
- **Evidence linking**: stores the sentence/paragraph containing each IOC
- **Review workflow**: mark as reviewed, flag false positives, bulk review

### Threat Intelligence View
- **Overview dashboard**: stats cards for IOCs, TTPs, threat actors with MITRE technique bar charts
- **IOCs tab**: filterable by type (IP, domain, hash, CVE, email, URL) with search and pagination
- **TTPs tab**: MITRE ATT&CK technique mapping with linked articles
- **Threat Actors tab**: named entity tracking with linked intelligence
- Expandable items showing evidence, linked articles, confidence scores
- Copy-to-clipboard and view-article actions
- Time range filtering: 24h, 7d, 30d, 90d, all time

### Hunt Query Generation
- AI-generated queries for 4 platforms:
  - **XSIAM** (XQL)
  - **Microsoft Defender** (KQL)
  - **Splunk** (SPL)
  - **Wiz** (GraphQL)
- Query versioning with full history (parent-child chain)
- Manual editing and review before execution
- Hunt execution tracking with results and findings
- ServiceNow ticket auto-creation from hunt findings

### Article Management
- **Status workflow**: NEW -> IN_ANALYSIS -> NEED_TO_HUNT -> HUNT_GENERATED -> REVIEWED -> ARCHIVED
- **Dual view modes**: list view with pagination, card view with infinite scroll
- **Article Detail Drawer**: slide-in panel with full content, AI summaries, IOCs, TTPs, related articles, hunt queries, comments
- Filter by status, source, date range, priority, analyst
- Full-text search across title and content
- Bookmark and read/unread tracking
- Analyst assignment
- High-priority flagging via watchlist match

### Watchlist & Alerting
- Global watchlist keywords managed by admins
- Personal user-level watchlist keywords
- Category filtering: TTP, Threat Actor, Attack Type, Vulnerability, Malware, Custom
- Automatic article scanning on keyword match
- Auto-extraction and summarization for matched articles
- High-priority flag with notifications

---

## GenAI Integration

### Multi-Model Support
- **OpenAI**: GPT-4, GPT-4-turbo, GPT-3.5-turbo
- **Claude**: claude-3-opus, claude-3-sonnet, claude-haiku
- **Gemini**: gemini-pro, gemini-ultra
- **Ollama**: any local model (mistral, llama3, phi3, etc.)
- In-app Ollama setup wizard with model library browser

### AI Features
- Executive summary generation (for C-level audience)
- Technical summary generation (for SOC analysts)
- IOC/TTP extraction with GenAI enrichment
- Hunt query generation across 4 platforms
- Configurable model per function

### Prompt Engineering
- Database-backed prompt library with versioning
- Template variables with typed slots
- Persona system (expert role instructions)
- Preview rendered prompts with sample values
- Per-function model selection

### Guardrails (7 types)
- **PII detection**: block personally identifiable information
- **Prompt injection**: detect injection attempts
- **Length validation**: min/max response length
- **Toxicity check**: keyword-based detection across hate/violence/sexual/self-harm
- **Keywords forbidden**: block specific words/phrases
- **Keywords required**: ensure required terms are present
- **Format validation**: enforce JSON or markdown output

### Execution Logging
- Every GenAI call tracked with: final prompt, response, model used, tokens, cost
- Guardrail pass/fail results per execution
- Admin "Execution Logs" tab with filtering (all / failed guardrails only)
- Expandable log entries with full metadata

---

## Admin Panel

### Consolidated Navigation (6 sections)
- **Sources**: Feed source management, add/edit/delete/ingest
- **Access Control**: User management + RBAC roles & permissions (tabbed)
- **Connectors**: External platform integrations
- **AI Engine**: GenAI models & functions + Guardrails & skills (tabbed)
- **Audit Logs**: Full audit trail with category and type filtering
- **Platform**: Analytics + System monitoring + Settings (tabbed)

### User Management
- Create/edit/delete users
- Role assignment (ADMIN, ANALYST, ENGINEER, MANAGER, EXECUTIVE, VIEWER)
- Per-user permission overrides (grant/deny)
- Force password reset
- Account activation/deactivation

### RBAC (Role-Based Access Control)
- **12 canonical permissions** across 3 groups:
  - Core Access: articles:read, articles:export, articles:analyze
  - Sources & Feeds: sources:read, sources:manage, watchlist:read, watchlist:manage
  - Administration: users:manage, audit:read, admin:genai, admin:rbac, admin:system
- Role cards UI with inline permission editing
- User-level overrides for fine-grained control
- Role impersonation for admin testing

### Platform Analytics
- **Clickable summary tiles**: Total Articles, Active Sources, IOCs, TTPs, Watchlist Hits, Active Users
  - Each tile navigates to the relevant view with filters applied
- Intelligence Pipeline flow visualization
- Daily article ingestion chart (bar chart, last 14 days)
- Articles by source breakdown (top 10, clickable bars navigate to filtered feeds)
- Article status breakdown (clickable chips filter feeds by status)
- User engagement table with search, sorting, and per-user drill-down
- **Data export**: date range selection, user filter, CSV download with popup notification

### Audit Logging
- **20 event types tracked**: LOGIN, LOGOUT, REGISTRATION, PASSWORD_CHANGE, ARTICLE_LIFECYCLE, BOOKMARK, EXTRACTION, CONNECTOR_CONFIG, HUNT_TRIGGER, NOTIFICATION, REPORT_GENERATION, RBAC_CHANGE, SYSTEM_CONFIG, GENAI_SUMMARIZATION, KNOWLEDGE_BASE, SCHEDULED_TASK, ADMIN_ACTION, WATCHLIST_CHANGE, FEED_MANAGEMENT, SEARCH
- **Category filters**: Authentication, Articles, Intelligence, GenAI, Admin, Content
- Sub-type filtering within each category
- Search across action text and user email/username
- Date range filtering
- Expandable log entries with: event ID, user, IP, correlation ID, timestamp, resource, JSON details
- IDOR protection: non-admins see only their own logs
- Correlation ID tracing for multi-step operations

### Connector Framework
- **Categories**: SIEM, EDR, Cloud Security, Sandbox, Enrichment, Notification
- **Platforms**: Microsoft Sentinel, Splunk, CrowdStrike, SentinelOne, Wiz, Prisma Cloud, VirusTotal, Shodan, Slack, PagerDuty, ServiceNow
- Template-based configuration with API key management
- Connection testing
- Execution logging per connector

---

## Authentication & Security

### Authentication Methods
- Local email/password login with Argon2 hashing
- **OAuth 2.0**: Google, Microsoft SSO
- **SAML**: Okta, Azure AD, ADFS
- **TOTP/MFA**: optional two-factor authentication
- JWT tokens (30min access, 7d refresh) with blacklist on logout

### Security Hardening
- CORS validation (allowed origins only)
- SSRF prevention (private IPs blocked, URL allowlists)
- Rate limiting
- Security headers (X-Content-Type-Options, X-Frame-Options, HSTS, CSP)
- OTP secrets AES-encrypted in database
- Connector API keys encrypted at rest
- Parameterized queries via SQLAlchemy ORM (SQL injection prevention)
- Pydantic validation on all API inputs

### Permission Caching
- Zustand-based permission cache with 5-minute TTL
- Instant page navigation without re-checking permissions API
- Cache invalidation on logout, role switch, or role restore

---

## Reports & Export

### Report Generation
- **PDF export**: single article or batch digest (up to 50 articles)
- **Word (DOCX) export**: structured report with summaries, IOCs, metadata
- **CSV export**: analytics data with date range and user filters
- Download notification popup when export starts
- Audit logging for all export actions

---

## Frontend Features

### UI/UX
- **Theme system**: multiple themes with dark mode support
- **Responsive sidebar**: collapsible with feed sections (Org Feeds, Custom Feeds)
- **Infinite scroll**: card view loads more articles automatically via IntersectionObserver
- **List + Card view modes**: toggle between table and grid layouts
- **Article Detail Drawer**: comprehensive slide-in panel
- Favicon auto-detection for feed sources
- Real-time search with debouncing

### Navigation
- Protected routes with permission-based page access
- Auto-redirect for unauthorized access
- Admin section toggle with scroll-to-section
- Deep linking via URL parameters (source, status, tab)

---

## Infrastructure

### Docker Compose Stack
- **PostgreSQL 15**: primary data store (44+ ORM models)
- **Redis 7**: session cache, rate limit state, token blacklist, feed dedup
- **FastAPI Backend**: async ASGI server on port 8000
- **Next.js 15 Frontend**: React 19 with App Router on port 3000
- Health checks on all services
- Non-root container users (appuser, nextjs)

### API
- 180+ endpoints across 20 routers
- Swagger UI at `/docs`, ReDoc at `/redoc`
- Structured JSON logging with structlog and correlation IDs
- Alembic database migrations

---

*Last updated: Feb 2026*
