# J.O.T.I — Threat Intelligence Platform

> **J.O.T.I** (Jyoti Open Threat Intelligence) is an enterprise-grade Threat Intelligence Platform (TIP) for SOC teams, threat analysts, and incident responders. It aggregates 230+ curated threat intelligence feeds, extracts IOCs/TTPs/threat actors with GenAI, maps to MITRE ATT&CK and ATLAS, and generates hunt queries across XSIAM, Defender, Splunk, and Wiz — all in one unified workspace.

**License**: PolyForm Noncommercial 1.0.0 (community/non-commercial use only)

---

## What It Does

| Capability | Description |
|------------|-------------|
| **Feed Aggregation** | 230+ curated RSS/Atom feeds across 15+ categories — government advisories, vendor TI, ISAC feeds, dark web trackers, and more |
| **Intel Extraction** | Dual pipeline (regex + GenAI): extracts IOCs (12 types), MITRE ATT&CK TTPs, MITRE ATLAS techniques, threat actors, and CVEs from every article |
| **Threat Actor Profiles** | Rich actor profiles with alias resolution (Scattered Spider = UNC3944 = Roasted 0ktapus), TTPs, tools, target sectors, origin country — built from extracted intel and enriched by GenAI |
| **MITRE Heatmaps** | Full ATT&CK Enterprise heatmap (695+ techniques) and MITRE ATLAS heatmap (42 AI-specific techniques) — accurate lookup-based tactic mapping |
| **Hunt Query Generation** | AI-generated queries for Palo Alto XSIAM (XQL), Microsoft Defender (KQL), Splunk (SPL), and Wiz (GraphQL) |
| **Cross-Source Correlation** | Finds IOCs appearing in multiple articles, clusters related articles by shared indicators to surface coordinated campaigns |
| **AI Threat Landscape** | On-demand AI briefs across 8 focus areas: Ransomware, APT, Vulnerabilities, Phishing, Supply Chain, Cloud, Malware, Full Landscape |
| **Intel Ingestion** | Upload PDFs, Word docs, CSVs, HTML files for GenAI-powered extraction; add feed URLs for continuous ingestion |
| **GenAI Security** | 51 attack protections across 11 categories — prompt injection, jailbreaking, token smuggling, encoding attacks, hallucination detection, payload embedding |
| **Enterprise Auth** | JWT + OAuth 2.0 (Google/Microsoft) + SAML 2.0 (Okta/Azure AD/ADFS) + TOTP/MFA |
| **RBAC** | 12 canonical permissions, 6 roles (Admin, Analyst, Engineer, Manager, Executive, Viewer), per-user overrides |
| **Audit Logging** | 20+ event types, immutable append-only log, full correlation IDs |

---

## Quick Start

### Prerequisites
- Docker + Docker Compose
- 4 GB RAM minimum

### Start the Platform

```bash
# 1. Clone the repo
git clone https://github.com/your-org/joti.git
cd joti

# 2. Set admin credentials (required)
export ADMIN_EMAIL="admin@yourcompany.com"
export ADMIN_PASSWORD="YourSecurePassword123!"

# 3. Start all services
docker-compose up -d

# 4. Access the platform
# Frontend:  http://localhost:3000
# API Docs:  http://localhost:8000/docs
# Health:    http://localhost:8000/health
```

The database is **auto-seeded** on first launch — admin user and 230+ feed sources are created automatically. The background scheduler starts ingesting articles immediately.

### Environment Variables

Copy and edit the environment file:

```bash
cp .env.docker .env
```

Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_EMAIL` | ✅ | Initial admin account email |
| `ADMIN_PASSWORD` | ✅ | Initial admin password (min 12 chars) |
| `SECRET_KEY` | ✅ | JWT signing key — change before production |
| `DATABASE_URL` | auto | PostgreSQL connection string |
| `REDIS_URL` | auto | Redis connection string |
| `OPENAI_API_KEY` | optional | OpenAI API key for GPT-4 |
| `ANTHROPIC_API_KEY` | optional | Claude API key |
| `GEMINI_API_KEY` | optional | Google Gemini API key |
| `OLLAMA_BASE_URL` | optional | Ollama endpoint (default: `http://host.docker.internal:11434`) |
| `CORS_ORIGINS` | auto | Allowed frontend origins |

### Add a GenAI Provider

Navigate to **Admin → AI Engine → Provider Setup** and configure one of:
- **OpenAI**: Paste your `OPENAI_API_KEY`
- **Claude**: Paste your `ANTHROPIC_API_KEY`
- **Gemini**: Paste your `GEMINI_API_KEY`
- **Ollama** (free, local): Uses the Ollama setup wizard — click "Test Connection", browse model library, pull a model

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                  Next.js 15 Frontend  :3000                    │
│  Feeds · Threat Intel Center · Admin · Reports · Knowledge Base│
└────────────────────────────┬───────────────────────────────────┘
                             │ REST API
┌────────────────────────────▼───────────────────────────────────┐
│                FastAPI Backend  :8000                          │
│                                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Articles │ │ Ingestion│ │Extraction│ │  Threat Actors   │  │
│  │  + Hunts │ │ Scheduler│ │IOC/TTP/TA│ │  + Alias Resolve │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  GenAI   │ │Guardrails│ │   RBAC   │ │  Audit + Reports │  │
│  │ Multi-LLM│ │ 51 checks│ │ 12 perms │ │  Admin Analytics │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
└──────────┬──────────────────────────┬──────────────────────────┘
           │                          │
┌──────────▼──────────┐  ┌───────────▼───────────┐
│  PostgreSQL  :5432  │  │   Redis  :6379         │
│  45+ ORM models     │  │  Sessions, Rate Limits │
│  Alembic migrations │  │  Dedup cache           │
└─────────────────────┘  └───────────────────────┘
```

---

## Key Workflows

### 1. Article Triage
```
Feed Scheduler (hourly)
  → Fetch RSS/Atom from 230+ sources
  → Parse & deduplicate (SHA-256)
  → Match against watchlist keywords
  → Auto-flag high-priority matches
  → Auto-extract IOCs/TTPs for high-fidelity sources
```

### 2. Intelligence Extraction
```
Article selected for analysis
  → Regex pipeline (fast, reliable)
  → GenAI pipeline (context-aware, deep)
      • Source domain filtering (never extract publisher domain as IOC)
      • Anti-hallucination: only extract explicitly mentioned indicators
  → Store in ExtractedIntelligence with confidence + evidence
  → Map TTPs → MITRE ATT&CK or ATLAS tactic/technique
```

### 3. Threat Actor Profiling
```
Threat actors extracted from articles
  → Sync: group by canonical name (alias resolution)
      e.g. "Scattered Spider" = "UNC3944" = "Roasted 0ktapus" = "Muddled Libra"
  → Create/update ThreatActorProfile with article count
  → Enrich with GenAI: aliases, origin, motivation, TTPs, tools, target sectors
```

### 4. Hunt Query Generation
```
Article contains extracted IOCs + TTPs
  → AI generates platform-specific queries
  → XSIAM (XQL) · Defender (KQL) · Splunk (SPL) · Wiz (GraphQL)
  → Analyst reviews, edits, executes
  → Results tracked with finding notes
```

---

## Platform Structure

```
/
├── backend/                     # FastAPI (Python 3.11)
│   ├── app/
│   │   ├── main.py              # App entry, middleware, router registration
│   │   ├── models.py            # 45+ SQLAlchemy ORM models
│   │   ├── seeds.py             # DB seeder (admin + 230 feed sources)
│   │   ├── articles/            # Article CRUD, bookmarks, reports, summarization
│   │   ├── admin/               # Admin panel: sources, guardrails, prompts, skills
│   │   ├── audit/               # Audit logging (20+ event types)
│   │   ├── auth/                # JWT, OAuth, SAML, RBAC (12 permissions)
│   │   ├── automation/          # Feed scheduler (thread-based daemon)
│   │   ├── extraction/          # IOC/TTP/ATLAS extraction + mitre_data.py
│   │   ├── genai/               # Multi-model service (OpenAI/Claude/Gemini/Ollama)
│   │   ├── guardrails/          # 51-attack GenAI security catalog
│   │   ├── ingestion/           # RSS/Atom parser + document ingestor
│   │   ├── threat_actors/       # Threat actor profiles + alias resolution
│   │   ├── users/               # User management, feeds, watchlist
│   │   └── watchlist/           # Keyword watchlists
│   ├── migrations/              # Alembic (021 versions)
│   └── tests/                   # pytest (17 test files)
│
├── frontend-nextjs/             # Next.js 15 (TypeScript)
│   ├── app/
│   │   ├── (auth)/              # Login, register, SSO callback
│   │   └── (protected)/         # All authenticated pages
│   ├── components/              # Shared UI components
│   ├── views/                   # Full page views
│   │   ├── Feeds.tsx            # Article feed with sidebar filter
│   │   ├── ThreatIntelligence.tsx  # 7-panel TI Center
│   │   └── ...
│   ├── api/client.ts            # Axios API client (all endpoints)
│   └── store/                   # Zustand state stores
│
├── config/
│   └── seed-sources.json        # 230 curated feed sources
│
├── docker-compose.yml           # 4 services: backend, frontend, postgres, redis
└── .env.docker                  # Default environment variables
```

---

## Common Commands

```bash
# Start all services
docker-compose up -d

# Rebuild after code changes
docker-compose up -d --build

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Run backend tests
docker-compose exec backend pytest -q

# Run Alembic migrations
docker-compose exec backend alembic upgrade head

# Seed database manually (if needed)
curl -X POST http://localhost:8000/setup/seed

# Stop everything
docker-compose down

# Full clean rebuild (resets DB)
docker-compose down -v && docker-compose up -d --build
```

### Local Development (without Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend-nextjs
npm install
npm run dev
```

---

## Ports

| Port | Service | URL |
|------|---------|-----|
| 3000 | Frontend (Next.js) | http://localhost:3000 |
| 8000 | Backend (FastAPI) | http://localhost:8000 |
| 8000 | Swagger API Docs | http://localhost:8000/docs |
| 8000 | Health check | http://localhost:8000/health |
| 8000 | Prometheus metrics | http://localhost:8000/metrics |

---

## API Overview

All endpoints are under the `/api` prefix. Full interactive docs at `/docs`.

| Router | Prefix | Key Endpoints |
|--------|--------|---------------|
| Auth | `/api/auth` | login, register, logout, refresh, me |
| Articles | `/api/articles` | CRUD, triage, status, intelligence, summarize |
| Sources | `/api/sources` | CRUD, ingest-now, refresh settings |
| Intelligence | `/api/articles/intelligence` | list, summary, MITRE matrix, correlation, landscape |
| Threat Actors | `/api/threat-actors` | CRUD, sync, enrich, get-intelligence |
| Hunt Queries | `/api/hunts` | generate, list, execute, executions |
| Users | `/api/users` | CRUD, feeds, watchlist, categories |
| Admin | `/api/admin` | sources, guardrails, prompts, skills, analytics |
| GenAI | `/api/genai` | providers, models, functions, logs, quotas |
| Audit | `/api/audit` | logs with filtering |
| Reports | `/api/articles/reports` | generate PDF/DOCX |
| Watchlist | `/api/watchlist` | keywords, categories |

---

## Security Notes

- Change `SECRET_KEY` before any production deployment
- `ADMIN_PASSWORD` must be at least 12 characters
- CORS wildcard (`*`) is blocked — always set explicit `CORS_ORIGINS`
- SSRF protection: feed URLs are checked against private IP ranges
- All connector API keys are AES-encrypted at rest
- Rate limiting via Redis on all API endpoints
- Append-only audit log — no delete or update operations

---

## License

**PolyForm Noncommercial 1.0.0** — Free for community and non-commercial use. Commercial sale or SaaS deployment prohibited.

See [LICENSE](LICENSE).
