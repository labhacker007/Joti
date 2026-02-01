# Threat Intelligence Command Center

## Complete Product Specification

**Version:** 1.0  
**Last Updated:** January 2026  
**Purpose:** Comprehensive specification enabling AI agents or developers to rebuild this application

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Database Models](#4-database-models)
5. [User Roles & Permissions (RBAC)](#5-user-roles--permissions-rbac)
6. [Pages & Views](#6-pages--views)
7. [Backend API Endpoints](#7-backend-api-endpoints)
8. [Features & Functionality](#8-features--functionality)
9. [Integrations](#9-integrations)
10. [GenAI Integration](#10-genai-integration)
11. [Frontend Components](#11-frontend-components)
12. [State Management](#12-state-management)
13. [Deployment](#13-deployment)
14. [Configuration](#14-configuration)

---

## 1. Product Overview

### What is this Platform?

This is an **AI-powered Threat Intelligence Command Center** designed for Security Operations Centers (SOC). It automates the entire threat intelligence lifecycle:

1. **Ingestion** - RSS/Atom feeds from security blogs, vendor advisories, threat intel sources
2. **Analysis** - AI-powered extraction of IOCs (Indicators of Compromise) and TTPs (Tactics, Techniques, Procedures)
3. **Hunt Generation** - Automatic creation of hunt queries for SIEM/XDR platforms
4. **Execution** - Execute hunts against connected security platforms
5. **Reporting** - Generate executive and technical reports with MITRE ATT&CK mapping

### Key Value Propositions

- **Automation**: Reduces manual triage time by 80%+ using GenAI
- **Multi-Platform**: Supports Microsoft Defender, Palo Alto XSIAM, Splunk, Wiz, Sentinel, CrowdStrike
- **RAG-Enhanced**: Knowledge base for context-aware query generation
- **RBAC**: Role-based access for different SOC personas (TI, TH, IR, Executive)
- **Audit Trail**: Complete logging of all actions for compliance

---

## 2. Technology Stack

### Backend
```
Framework:       FastAPI (Python 3.11+)
Database:        PostgreSQL 15 (primary) / SQLite (development)
Cache:           Redis 7
ORM:             SQLAlchemy 2.0
Migrations:      Alembic
Auth:            JWT (jose) + SAML 2.0 (optional)
Scheduler:       APScheduler
GenAI:           OpenAI, Anthropic Claude, Google Gemini, Ollama (local)
Logging:         Structlog
```

### Frontend
```
Framework:       React 18
UI Library:      Ant Design 5.x
State:           Zustand
HTTP Client:     Axios
Router:          React Router 6
Theming:         Custom CSS variables (light/dark themes)
```

### Infrastructure
```
Container:       Docker & Docker Compose
Orchestration:   Kubernetes (optional)
Reverse Proxy:   Nginx (production)
```

---

## 3. Architecture

### Directory Structure

```
threat-intel-platform/
├── backend/
│   └── app/
│       ├── admin/          # Admin routes & RBAC service
│       ├── analytics/      # Analytics endpoints
│       ├── articles/       # Article CRUD, extraction, summarization
│       ├── audit/          # Audit logging middleware & routes
│       ├── auth/           # Authentication, RBAC, SAML
│       ├── automation/     # Scheduler, automation engine
│       ├── chatbot/        # AI assistant service
│       ├── connectors/     # SIEM/XDR connector configs
│       ├── core/           # Config, database, logging
│       ├── extraction/     # IOC/TTP extraction logic
│       ├── genai/          # Multi-provider GenAI abstraction
│       ├── hunts/          # Hunt generation & execution
│       ├── ingestion/      # Feed parsing & ingestion
│       ├── integrations/   # Source refresh settings
│       ├── iocs/           # IOC management
│       ├── knowledge/      # RAG knowledge base
│       ├── notifications/  # Email, Slack, ServiceNow
│       ├── reports/        # Report generation & export
│       ├── users/          # User management, custom feeds
│       ├── watchlist/      # Keyword watchlist
│       ├── models.py       # SQLAlchemy models
│       └── main.py         # FastAPI application
├── frontend/
│   └── src/
│       ├── api/            # Axios client & API modules
│       ├── components/     # Reusable React components
│       ├── context/        # Theme & Timezone contexts
│       ├── hooks/          # Custom hooks
│       ├── pages/          # Page components
│       ├── store/          # Zustand stores
│       └── styles/         # Theme CSS
├── infra/                  # Dockerfiles, K8s manifests
├── config/                 # Seed data
└── docs/                   # Documentation
```

### Request Flow

```
Browser → NavBar (JWT in header) → FastAPI → SQLAlchemy → PostgreSQL
                                      ↓
                              Redis (caching)
                                      ↓
                              GenAI Provider (Ollama/OpenAI/etc)
                                      ↓
                              SIEM Connector (Defender/XSIAM/etc)
```

---

## 4. Database Models

### Core Enums

```python
class ArticleStatus(str, Enum):
    NEW = "NEW"                    # Just ingested
    IN_ANALYSIS = "IN_ANALYSIS"    # Being analyzed
    NEED_TO_HUNT = "NEED_TO_HUNT"  # Requires threat hunting
    HUNT_GENERATED = "HUNT_GENERATED"  # Hunt query created
    REVIEWED = "REVIEWED"          # Fully reviewed
    ARCHIVED = "ARCHIVED"          # Archived

class HuntStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PARTIAL = "PARTIAL"

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    EXECUTIVE = "EXECUTIVE"
    MANAGER = "MANAGER"
    TI = "TI"           # Threat Intelligence
    TH = "TH"           # Threat Hunter
    IR = "IR"           # Incident Response
    VIEWER = "VIEWER"

class ExtractedIntelligenceType(str, Enum):
    IOC = "IOC"         # Indicator of Compromise
    IOA = "IOA"         # Indicator of Attack
    TTP = "TTP"         # MITRE ATT&CK
    ATLAS = "ATLAS"     # MITRE ATLAS (AI/ML threats)

class AuditEventType(str, Enum):
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    ARTICLE_LIFECYCLE = "ARTICLE_LIFECYCLE"
    EXTRACTION = "EXTRACTION"
    CONNECTOR_CONFIG = "CONNECTOR_CONFIG"
    HUNT_TRIGGER = "HUNT_TRIGGER"
    NOTIFICATION = "NOTIFICATION"
    REPORT_GENERATION = "REPORT_GENERATION"
    RBAC_CHANGE = "RBAC_CHANGE"
    SYSTEM_CONFIG = "SYSTEM_CONFIG"
    GENAI_SUMMARIZATION = "GENAI_SUMMARIZATION"
    KNOWLEDGE_BASE = "KNOWLEDGE_BASE"
```

### Entity Models

#### User
```python
class User:
    id: int (PK)
    email: str (unique)
    username: str (unique)
    hashed_password: str (nullable for SAML)
    full_name: str
    role: UserRole
    is_active: bool
    is_saml_user: bool
    saml_nameid: str (nullable)
    otp_enabled: bool
    otp_secret: str (nullable)
    last_login: datetime
    created_at: datetime
    updated_at: datetime
```

#### FeedSource
```python
class FeedSource:
    id: int (PK)
    name: str (unique)
    description: str
    url: str (unique)
    feed_type: str  # rss, atom, html
    is_active: bool
    high_fidelity: bool  # Auto-triage and hunt
    headers: JSON  # Auth headers
    last_fetched: datetime
    next_fetch: datetime
    fetch_error: str
    refresh_interval_minutes: int (nullable)
    auto_fetch_enabled: bool
    created_at: datetime
    updated_at: datetime
```

#### Article
```python
class Article:
    id: int (PK)
    source_id: int (FK → feed_sources)
    external_id: str  # Deduplication key
    title: str
    raw_content: str
    normalized_content: str
    summary: str
    url: str
    image_url: str
    published_at: datetime
    status: ArticleStatus
    assigned_analyst_id: int (FK → users)
    genai_analysis_remarks: str
    executive_summary: str
    technical_summary: str
    reviewed_by_id: int (FK → users)
    reviewed_at: datetime
    analyzed_by_id: int (FK → users)
    analyzed_at: datetime
    is_high_priority: bool
    watchlist_match_keywords: JSON
    created_at: datetime
    updated_at: datetime
```

#### ExtractedIntelligence
```python
class ExtractedIntelligence:
    id: int (PK)
    article_id: int (FK → articles)
    hunt_execution_id: int (FK → hunt_executions, nullable)
    intelligence_type: ExtractedIntelligenceType
    value: str  # IOC value or TTP name
    confidence: int (0-100)
    evidence: str
    mitre_id: str (nullable)  # T1059.001, AML.T0001
    meta: JSON  # Type-specific metadata
    is_reviewed: bool
    reviewed_by: int (FK → users)
    reviewed_at: datetime
    is_false_positive: bool
    notes: str
    created_at: datetime
```

#### Hunt
```python
class Hunt:
    id: int (PK)
    article_id: int (FK → articles)
    platform: str  # xsiam, defender, splunk, wiz
    query_logic: str
    title: str
    initiated_by_id: int (FK → users)
    initiated_by_type: str  # USER, AUTO, GENAI
    status: str
    generated_by_model: str  # gpt-4, llama3
    prompt_template_version: str
    response_hash: str
    parent_hunt_id: int (FK → hunts, nullable)  # Versioning
    created_at: datetime
    updated_at: datetime
```

#### HuntExecution
```python
class HuntExecution:
    id: int (PK)
    hunt_id: int (FK → hunts)
    trigger_type: HuntTriggerType  # MANUAL, AUTO
    status: HuntStatus
    executed_by_id: int (FK → users)
    executed_at: datetime
    results: JSON
    findings_summary: str
    hits_count: int
    error_message: str
    execution_time_ms: int
    email_sent: bool
    servicenow_ticket_id: str
    created_at: datetime
    updated_at: datetime
```

#### Report
```python
class Report:
    id: int (PK)
    title: str
    article_ids: JSON  # [1, 2, 3]
    content: str
    executive_summary: str
    technical_summary: str
    key_findings: JSON
    recommendations: JSON
    report_type: str  # comprehensive, executive, technical
    status: ReportStatus  # DRAFT, PUBLISHED
    generated_by_id: int (FK → users)
    generated_at: datetime
    edited_by_id: int (FK → users)
    edited_at: datetime
    published_by_id: int (FK → users)
    published_at: datetime
    version: int
    shared_with_emails: JSON
    created_at: datetime
    updated_at: datetime
```

#### Additional Models

- **IOC**: Central IOC table (value, type, confidence, occurrence_count)
- **ArticleIOC**: Junction table for Article-IOC many-to-many
- **WatchListKeyword**: Keywords for priority flagging
- **AuditLog**: Complete audit trail
- **ConnectorConfig**: SIEM/notification connector configs
- **ArticleReadStatus**: User read tracking per article
- **ArticleComment**: Threaded comments on articles
- **SystemConfiguration**: Dynamic settings (key-value with category)
- **KnowledgeDocument**: RAG documents (files/URLs)
- **KnowledgeChunk**: Chunked embeddings for retrieval
- **EnvironmentAsset**: Company-specific context (IP ranges, domains)
- **UserSourcePreference**: Per-user feed preferences
- **UserCustomFeed**: User-created RSS feeds
- **RolePermission**: RBAC permission overrides

---

## 5. User Roles & Permissions (RBAC)

### Unified Permission System

Located in: `backend/app/auth/unified_permissions.py`

#### Role → Page Access

| Role | Accessible Pages |
|------|------------------|
| **ADMIN** | All pages |
| **EXECUTIVE** | Dashboard, Reports |
| **MANAGER** | Dashboard, Feed, Articles, Reports, Audit |
| **TI** | Dashboard, Feed, Articles, Intelligence, Hunts, Reports, Sources, Watchlist |
| **TH** | Dashboard, Feed, Articles, Intelligence, Hunts, Sources |
| **IR** | Dashboard, Feed, Articles, Intelligence, Hunts, Reports |
| **VIEWER** | Feed only |

#### Role → API Permissions

```python
ROLE_API_PERMISSIONS = {
    "ADMIN": ["read:*", "write:*", "delete:*", "manage:*"],
    
    "EXECUTIVE": [
        "read:dashboard",
        "read:reports",
    ],
    
    "MANAGER": [
        "read:dashboard", "read:articles", "read:feed",
        "read:reports", "create:reports", "read:audit",
    ],
    
    "TI": [
        "read:dashboard",
        "read:articles", "triage:articles", "analyze:articles",
        "read:feed",
        "read:intelligence", "extract:intelligence",
        "read:hunts", "create:hunts",
        "read:reports", "create:reports", "share:reports",
        "read:sources", "manage:sources",
        "read:watchlist", "manage:watchlist",
    ],
    
    "TH": [
        "read:dashboard", "read:articles", "read:feed",
        "read:intelligence",
        "read:hunts", "create:hunts", "execute:hunts", "manage:hunts",
        "read:sources",
    ],
    
    "IR": [
        "read:dashboard",
        "read:articles", "triage:articles",
        "read:feed", "read:intelligence",
        "read:hunts", "execute:hunts",
        "read:reports", "share:reports",
    ],
    
    "VIEWER": [
        "read:feed", "read:articles",
    ],
}
```

### Admin Impersonation ("Test as Role")

Admins can impersonate any role to test permissions:

1. Admin selects role from profile dropdown
2. Backend issues new JWT with impersonation context:
   - `is_impersonating: true`
   - `role: <assumed_role>`
   - `original_role: ADMIN`
   - `impersonator_id: <admin_user_id>`
3. All API calls respect assumed role permissions
4. Audit logs attribute actions to admin (impersonator)
5. Admin can restore to original role at any time

---

## 6. Pages & Views

### 1. Login (`/login`)
- Email/password authentication
- SAML SSO support (optional)
- OTP/2FA support (optional)
- Session management

### 2. Dashboard / Operations (`/dashboard`)
- **Stats Tiles**: Total articles, New, In Analysis, Reviewed, High Priority
- **Feed Sources**: Active sources with article counts
- **Intelligence Summary**: IOCs extracted, TTPs mapped
- **Hunt Stats**: Total, Completed, Failed, Pending
- **Recent Articles**: Last 8 articles with quick actions
- **Connector Status**: SIEM/XDR connection health
- **Time Range Filter**: 24h, 7d, 30d, 90d, All
- **Auto-Refresh**: Configurable interval

### 3. News & Feeds (`/news`)
- **Feedly-style Reader**: Three-pane layout (sources | articles | reader)
- **Source Navigation**: Filter by source, custom feeds
- **Article List**: Unread/All toggle, priority filter, search
- **View Modes**: List, Cards, Compact
- **Article Reader**: 
  - Executive Summary (AI-generated)
  - Technical Summary (AI-generated)
  - Original content
  - IOCs & TTPs extracted
  - Quick actions (Save, Priority, Hunt)
- **Custom Feeds**: Users can add personal RSS feeds
- **Settings**: Auto-mark read, default tab, sort order

### 4. Article Queue (`/articles`)
- **Triage Workflow**: Status-based filtering
- **Status Tiles**: NEW → IN_ANALYSIS → NEED_TO_HUNT → HUNT_GENERATED → REVIEWED
- **SLA Tracking**: Breach alerts (NEW > 4h, In Analysis > 24h)
- **Article Detail Drawer**:
  - Status progression
  - AI summaries with regeneration
  - IOC/TTP extraction with review
  - Hunt query generation
  - Comments (threaded)
  - Export (PDF, CSV, HTML)
- **Bulk Operations**: Multi-select status change, delete
- **Assignment**: Claim articles, assign to analysts

### 5. Intelligence (`/intelligence`)
- **Intelligence Queue**: All extracted IOCs and TTPs
- **Filters**: Type (IOC/TTP/ATLAS), Status, Confidence
- **Review Workflow**: Approve or mark as false positive
- **MITRE ATT&CK Matrix**: Heatmap visualization
- **MITRE ATLAS**: AI/ML threat techniques
- **Export**: CSV with MITRE mapping

### 6. Threat Hunts (`/hunts`)
- **Hunt Workbench**:
  - Articles Pending Hunt (left panel)
  - Query Preview with GenAI (right panel)
  - Platform selection (Defender, XSIAM, Splunk, etc.)
- **Generated Hunts Table**:
  - Hunt ID, Article, Platform, Query, Status
  - Actions: View, Edit, Execute, Delete
  - Bulk delete
- **Hunt Executions & API Responses**:
  - Status filter buttons (All, Completed, Running, Failed)
  - Execution details, hits count, duration
  - API response viewer
- **Sorting**: Newest first throughout

### 7. Reports (`/reports`)
- **Analytics Dashboard Tab**:
  - Overview metrics
  - SLA compliance charts
  - Efficiency metrics
  - Team performance
  - MITRE coverage
- **Reports Tab**:
  - Create report from selected articles
  - Report types: Executive, Technical, Comprehensive
  - AI-generated content (editable)
  - Version control
  - Publish workflow (Draft → Published)
- **Export**: PDF, CSV, Word, HTML
- **Sharing**: Email distribution

### 8. Sources (`/sources`)
- **Feed Source Management**:
  - Add/Edit/Delete sources
  - RSS/Atom URL configuration
  - Headers (authentication)
  - High fidelity flag (auto-triage)
- **Refresh Settings**:
  - System defaults
  - Per-source overrides
  - Manual trigger
- **Statistics**: Articles per source, last fetch time

### 9. Watchlist (`/watchlist`)
- **Keywords**: Add keywords for priority flagging
- **High Priority Articles**: Matching articles
- **Suggested Keywords**: AI-suggested based on trends
- **Toggle Active/Inactive**: Per keyword

### 10. Audit Logs (`/audit`)
- **Event Log**: All system events with filters
- **Event Types**: Login, Article lifecycle, Extraction, etc.
- **User Filter**: By specific user
- **Date Range**: Custom date filtering
- **Export**: CSV download

### 11. Admin (`/admin`)
- **Tabs**:
  1. **Users**: CRUD, role assignment
  2. **Role Permissions**: RBAC matrix editor
  3. **Page Access**: Page-level permissions
  4. **User Overrides**: Per-user permission grants
  5. **Reference Guide**: Permission documentation
  6. **Connectors**: SIEM/XDR configuration
  7. **GenAI**: Model configuration, Ollama setup
  8. **Knowledge Base**: RAG document management
  9. **Scheduler**: Automated job configuration
  10. **System Config**: Database settings

### 12. Chatbot (Floating Dialog)
- **AI Assistant**: Natural language queries
- **Context-Aware**: Uses knowledge base
- **Capabilities**:
  - Explain IOCs/TTPs
  - Generate hunt queries
  - Summarize articles
  - Answer security questions

---

## 7. Backend API Endpoints

### Authentication (`/auth`)
```
POST /auth/login           - Email/password login
POST /auth/register        - User registration
POST /auth/refresh         - Token refresh
GET  /auth/me              - Current user info
POST /auth/logout          - Logout
```

### Users (`/users`)
```
GET  /users/               - List users (admin)
GET  /users/{id}           - Get user
POST /users/               - Create user
PATCH /users/{id}          - Update user
DELETE /users/{id}         - Delete user
GET  /users/my-permissions - Current user permissions (RBAC)
GET  /users/available-roles - Roles for impersonation
POST /users/switch-role    - Impersonate role (admin)
POST /users/restore-role   - Restore original role
GET  /users/feeds/         - User's custom feeds
POST /users/feeds/         - Create custom feed
```

### Articles (`/articles`)
```
GET  /articles/triage           - Triage queue with filters
GET  /articles/{id}             - Article detail
PATCH /articles/{id}/status     - Update status
PATCH /articles/{id}/analysis   - Update summaries
POST /articles/{id}/extract-intelligence - Extract IOCs/TTPs
POST /articles/{id}/summarize   - Generate AI summaries
GET  /articles/{id}/comments    - Get comments
POST /articles/{id}/comments    - Add comment
POST /articles/{id}/assign      - Assign to analyst
POST /articles/{id}/claim       - Claim article
GET  /articles/{id}/export/pdf  - Export as PDF
GET  /articles/{id}/export/csv  - Export as CSV
GET  /articles/intelligence/list - All extracted intelligence
GET  /articles/intelligence/summary - Intelligence stats
POST /articles/intelligence/{id}/review - Review intelligence
DELETE /articles/intelligence/{id} - Delete intelligence
```

### Hunts (`/hunts`)
```
POST /hunts/generate         - Generate hunt query
GET  /hunts/                 - List hunts
GET  /hunts/{id}             - Hunt detail
POST /hunts/{id}/execute     - Execute hunt
GET  /hunts/{id}/executions  - Hunt executions
PATCH /hunts/{id}            - Update hunt
DELETE /hunts/{id}           - Delete hunt
POST /hunts/batch            - Batch hunt generation
POST /hunts/preview-query    - Preview query without saving
GET  /hunts/stats            - Hunt statistics
GET  /hunts/articles/reviewed - Articles ready for hunting
```

### Reports (`/reports`)
```
POST /reports/               - Create report
GET  /reports/               - List reports
GET  /reports/{id}           - Report detail
PATCH /reports/{id}          - Update report
POST /reports/{id}/publish   - Publish report
POST /reports/{id}/share     - Share via email
GET  /reports/{id}/export/pdf - Export PDF
DELETE /reports/{id}         - Delete report
POST /reports/generate/auto  - Auto-generate report
```

### Sources (`/sources`)
```
GET  /sources/               - List sources
POST /sources/               - Create source
PATCH /sources/{id}          - Update source
DELETE /sources/{id}         - Delete source
POST /sources/{id}/ingest    - Trigger ingestion
POST /sources/ingest-all     - Ingest all sources
GET  /sources/stats/summary  - Source statistics
GET  /sources/refresh/system - System refresh settings
PUT  /sources/refresh/system - Update refresh settings
```

### Watchlist (`/watchlist`)
```
GET  /watchlist/             - List keywords
POST /watchlist/             - Add keyword
DELETE /watchlist/{id}       - Delete keyword
PATCH /watchlist/{id}        - Toggle active
POST /watchlist/refresh      - Re-scan articles
```

### Connectors (`/connectors`)
```
GET  /connectors/            - List connectors
POST /connectors/            - Create connector
PATCH /connectors/{id}       - Update connector
DELETE /connectors/{id}      - Delete connector
POST /connectors/{id}/test   - Test connectivity
```

### Admin (`/admin`)
```
GET  /admin/settings         - System settings
GET  /admin/stats            - Admin statistics
GET  /admin/genai/status     - GenAI status
GET  /admin/genai/models     - Available models
POST /admin/genai/test       - Test GenAI
GET  /admin/rbac/matrix      - Permission matrix
PUT  /admin/rbac/roles/{role}/permissions - Update role
GET  /admin/rbac/pages/role/{role} - Page access for role
```

### Audit (`/audit`)
```
GET  /audit/                 - List audit events
GET  /audit/{id}             - Audit event detail
```

### Analytics (`/analytics`)
```
GET  /analytics/dashboard    - Dashboard metrics
POST /analytics/report       - Generate analytics report
GET  /analytics/mitre-csv    - Export MITRE mapping
```

### Chatbot (`/chatbot`)
```
POST /chatbot/message        - Send message
GET  /chatbot/history        - Conversation history
DELETE /chatbot/history      - Clear history
```

### Knowledge Base (`/knowledge`)
```
GET  /knowledge/documents    - List documents
POST /knowledge/documents    - Upload document
POST /knowledge/documents/url - Add URL for crawling
DELETE /knowledge/documents/{id} - Delete document
POST /knowledge/search       - Semantic search
```

---

## 8. Features & Functionality

### 8.1 Feed Ingestion

**Flow:**
1. FeedParser fetches RSS/Atom URLs
2. Parses entries with feedparser library
3. Deduplicates by external_id + source_id
4. Extracts image URLs from content
5. Normalizes HTML content
6. Creates Article records with status=NEW
7. Runs watchlist matching for priority flagging

**High Fidelity Sources:**
- Auto-extract IOCs/TTPs on ingestion
- Auto-generate summaries
- Auto-create hunt queries

### 8.2 Intelligence Extraction

**IOC Types Supported:**
- IPv4, IPv6 addresses
- Domain names, URLs
- Hash values (MD5, SHA1, SHA256)
- Email addresses
- CVE identifiers
- File paths
- Registry keys

**TTP Extraction:**
- MITRE ATT&CK techniques (T1xxx)
- MITRE ATLAS techniques (AML.Txxx)
- Confidence scoring
- Evidence extraction

**Methods:**
1. **GenAI**: LLM-based extraction with prompts
2. **Regex**: Pattern-based IOC detection
3. **Hybrid**: GenAI + Regex comparison

### 8.3 Hunt Query Generation

**Supported Platforms:**

| Platform | Query Language | Connector |
|----------|---------------|-----------|
| Microsoft Defender | KQL | ATP API |
| Palo Alto XSIAM | XQL | XSIAM API |
| Splunk | SPL | Splunk REST |
| Microsoft Sentinel | KQL | Azure API |
| CrowdStrike | FQL | Falcon API |
| Wiz | WQL | Wiz GraphQL |

**Process:**
1. Extract article content + intelligence
2. Load RAG context (platform docs, query syntax)
3. Generate query via GenAI
4. User review/edit query
5. Execute against connected platform
6. Capture results and hits count
7. Update article status to HUNT_GENERATED

### 8.4 Summarization

**Executive Summary:**
- Business impact focus
- Non-technical language
- 2-3 paragraphs
- Key indicators highlighted

**Technical Summary:**
- MITRE ATT&CK mapping
- IOC breakdown by type
- Detection opportunities
- Remediation steps

### 8.5 Reporting

**Report Types:**
- **Executive**: High-level for CISO/C-suite
- **Technical**: Detailed for SOC analysts
- **Comprehensive**: Full analysis

**Workflow:**
1. Select articles (or auto-select by date range)
2. Choose report type
3. GenAI generates content
4. User edits sections
5. Publish (locks report)
6. Export (PDF/CSV/Word)
7. Share via email

### 8.6 SLA Tracking

**Thresholds:**
- NEW: 4 hours
- IN_ANALYSIS: 24 hours
- NEED_TO_HUNT: 8 hours

Visual indicators for breaching articles.

### 8.7 Watchlist

- Add keywords to monitor
- Articles matching keywords flagged as high priority
- Suggested keywords from trend analysis

---

## 9. Integrations

### 9.1 SIEM/XDR Connectors

**Configuration (ConnectorConfig model):**
```json
{
  "name": "Microsoft Defender",
  "connector_type": "defender",
  "config": {
    "tenant_id": "xxx",
    "client_id": "xxx",
    "client_secret": "***",
    "api_url": "https://api.security.microsoft.com"
  },
  "is_active": true
}
```

### 9.2 Notification Connectors

**Email:**
- SMTP configuration
- Template support
- Hunt result notifications

**Slack:**
- Webhook integration
- Channel notifications
- Interactive messages

**ServiceNow:**
- Ticket creation on hunt hits
- Incident linking

### 9.3 SAML SSO

**Configuration:**
- IdP metadata URL
- SP entity ID
- Attribute mapping (email, name, role)
- Certificate management

---

## 10. GenAI Integration

### 10.1 Provider Abstraction

**Supported Providers:**
1. **OpenAI** (GPT-4, GPT-3.5-turbo)
2. **Anthropic** (Claude 3 Opus/Sonnet)
3. **Google** (Gemini 1.5 Pro)
4. **Ollama** (Local: Llama3, Mistral, CodeLlama)

### 10.2 Model Manager

**Features:**
- Primary model selection
- Fallback chain for resilience
- Function-specific model assignment
- Cost tracking (token usage)
- Response caching

### 10.3 GenAI Functions

| Function | Use Case |
|----------|----------|
| IOC Extraction | Extract indicators from article text |
| TTP Mapping | Map behaviors to MITRE techniques |
| Executive Summary | Business-focused summary |
| Technical Summary | SOC analyst-focused summary |
| Hunt Query | Platform-specific query generation |
| Chatbot | Natural language Q&A |
| Report Generation | Compile multi-article report |

### 10.4 RAG (Retrieval Augmented Generation)

**Knowledge Base:**
- Admin-managed (global scope)
- User-managed (personal scope)

**Document Types:**
- Product documentation
- Query syntax guides
- Threat intel reports
- Playbooks
- Policies

**Process:**
1. Document upload (file or URL)
2. Content extraction
3. Chunking (512 tokens)
4. Embedding generation
5. Semantic search retrieval
6. Context injection into prompts

---

## 11. Frontend Components

### Core Components

| Component | Purpose |
|-----------|---------|
| NavBar | Navigation + role switching |
| ProtectedRoute | Route-level RBAC |
| Chatbot | Floating AI assistant |
| FormattedContent | Markdown/HTML renderer |

### Admin Components

| Component | Purpose |
|-----------|---------|
| UnifiedUserManagement | User CRUD + roles |
| ComprehensiveRBACManager | Permission matrix |
| PageAccessManager | Page-level RBAC |
| ConnectorsManager | SIEM config |
| KnowledgeBaseManager | RAG documents |
| SchedulerManager | Automated jobs |
| ConfigurationManager | System settings |
| GenAITester | Model testing |

### Feature Components

| Component | Purpose |
|-----------|---------|
| AnalyticsDashboard | Metrics & charts |
| SourceRefreshSettings | Feed intervals |
| ThemeManager | Light/dark themes |
| TimezoneSettings | User timezone |
| ReportVersionControl | Report history |

---

## 12. State Management

### Zustand Stores

**useAuthStore:**
```javascript
{
  user: User | null,
  accessToken: string | null,
  refreshToken: string | null,
  isAdmin: boolean,
  isImpersonating: boolean,
  assumedRole: string | null,
  originalRole: string | null,
  
  setAuth(user, access, refresh),
  setTokens(access, refresh),
  logout(),
  switchRole(token, assumedRole, originalRole),
  restoreRole(token, originalRole),
}
```

**useArticleStore:**
```javascript
{
  articles: Article[],
  selectedArticle: Article | null,
  loading: boolean,
  total: number,
  
  setArticles(articles, total),
  setSelectedArticle(article),
}
```

### Context Providers

**ThemeContext:**
- Current theme (light/dark)
- Theme toggle
- CSS variable injection

**TimezoneContext:**
- User timezone
- Date formatting functions
- Relative time display

---

## 13. Deployment

### Docker Compose (Development)

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: app_pass
      POSTGRES_DB: app_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
      
  backend:
    build: ./infra/Dockerfile.backend
    environment:
      DATABASE_URL: postgresql://app_user:app_pass@postgres:5432/app_db
      REDIS_URL: redis://redis:6379/0
      GENAI_PROVIDER: ollama
      OLLAMA_BASE_URL: http://host.docker.internal:11434
    ports:
      - "8000:8000"
    volumes:
      - ./backend/app:/app/app  # Live reload
      
  frontend:
    build: ./infra/Dockerfile.frontend.dev
    environment:
      REACT_APP_API_URL: http://localhost:8000
    ports:
      - "3000:3000"
    volumes:
      - ./frontend/src:/app/src  # Live reload
```

### Commands

```bash
# Start all services
docker-compose up -d

# Rebuild after changes
docker-compose up --build -d

# View logs
docker-compose logs -f backend

# Stop services (preserve data)
docker-compose down

# Full reset (deletes data)
docker-compose down -v
```

---

## 14. Configuration

### Environment Variables

**Backend (.env):**
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/app_db

# Security
SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=http://localhost:3000

# GenAI
GENAI_PROVIDER=ollama  # ollama, openai, anthropic, gemini
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3:latest
OPENAI_API_KEY=sk-xxx  # If using OpenAI
ANTHROPIC_API_KEY=sk-xxx  # If using Claude

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASSWORD=pass
SMTP_FROM=noreply@example.com

# Redis
REDIS_URL=redis://localhost:6379/0

# Scheduler
ENABLE_AUTOMATION_SCHEDULER=true
```

**Frontend (.env):**
```bash
REACT_APP_API_URL=http://localhost:8000
```

### Initial Admin User Setup

The admin user is created on first startup if the following environment variables are set:

```bash
# Required - must be at least 12 characters
ADMIN_PASSWORD=your-secure-password-here

# Optional - defaults to admin@localhost
ADMIN_EMAIL=admin@yourcompany.com
```

**Security Best Practices:**
- Never commit passwords to version control
- Use a strong password (12+ characters, mixed case, numbers, symbols)
- Rotate the admin password after initial setup
- Consider using SSO for production environments

---

## Summary

This is a comprehensive threat intelligence platform that:

1. **Ingests** security feeds automatically
2. **Extracts** IOCs and TTPs using AI
3. **Generates** hunt queries for multiple SIEM platforms
4. **Executes** hunts and tracks results
5. **Reports** findings with MITRE mapping
6. **Controls access** with granular RBAC
7. **Audits** all actions for compliance

The modular architecture supports extension via:
- Additional GenAI providers
- New SIEM connectors
- Custom extractors
- Webhook integrations

For questions or contributions, refer to the docs/ directory.
