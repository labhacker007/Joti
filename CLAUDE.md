# CLAUDE.md - Joti Project Guide

## Project Overview

Joti is an enterprise-grade threat intelligence news aggregator and hunting platform for SOC teams, threat analysts, and incident responders. It combines RSS/Atom feed aggregation with IOC extraction, MITRE ATT&CK mapping, and automated hunt query generation.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | FastAPI + Uvicorn | 0.115.12 / 0.34.0 |
| Frontend | Next.js (App Router) + React | 15.1.6 / 19.0.0 |
| Database | PostgreSQL | 15 |
| Cache | Redis | 7 |
| ORM | SQLAlchemy + Alembic | 2.0.37 / 1.15.1 |
| Language (BE) | Python | 3.11 |
| Language (FE) | TypeScript | 5 |
| Styling | Tailwind CSS + Ant Design | 3.4.19 / 5.23.6 |
| State Mgmt | Zustand | 4.4.0 |
| GenAI | OpenAI SDK | 1.59.8 |
| Auth | JWT + OAuth 2.0 + SAML | passlib/argon2, authlib, pysaml2 |
| Deployment | Docker Compose | 3.8 |

## Project Structure

```
/
├── backend/                     # FastAPI backend (Python 3.11)
│   ├── app/
│   │   ├── main.py              # App entry point
│   │   ├── models.py            # SQLAlchemy ORM models
│   │   ├── seeds.py             # Database seeding
│   │   ├── admin/               # Admin panel & settings
│   │   ├── articles/            # Article CRUD, bookmarks, reports
│   │   ├── audit/               # Audit logging (14 event types)
│   │   ├── auth/                # Auth, RBAC (50+ permissions), OAuth, SAML
│   │   ├── automation/          # Scheduled tasks
│   │   ├── core/                # Config, DB, logging, rate limiting, SSRF
│   │   ├── extraction/          # IOC/IOA/TTP extraction
│   │   ├── genai/               # Multi-model GenAI service
│   │   ├── ingestion/           # RSS/Atom feed parsing
│   │   ├── integrations/        # External connectors
│   │   ├── knowledge/           # Knowledge base
│   │   ├── notifications/       # Email/Slack notifications
│   │   ├── routers/             # API route definitions
│   │   ├── services/            # Business logic layer
│   │   ├── users/               # User management
│   │   └── watchlist/           # Keyword watchlists
│   ├── tests/                   # Pytest tests (17 files)
│   ├── migrations/              # Alembic migrations
│   ├── requirements.txt         # Python dependencies
│   └── Dockerfile
│
├── frontend-nextjs/             # Next.js 15 frontend (ACTIVE)
│   ├── app/
│   │   ├── (auth)/              # Public auth routes (login, register)
│   │   ├── (protected)/         # Protected routes with navbar
│   │   ├── layout.tsx           # Root layout
│   │   └── globals.css          # Global styles
│   ├── components/              # Shared React components
│   │   └── ui/                  # Base UI components
│   ├── contexts/                # React contexts (theme, timezone)
│   ├── pages/                   # Reusable page components
│   ├── store/                   # Zustand state stores
│   ├── types/                   # TypeScript type definitions
│   ├── api/                     # API client utilities
│   ├── package.json
│   └── Dockerfile
│
├── frontend/                    # Legacy CRA frontend (not actively used)
├── config/                      # Seed data (feed sources)
├── scripts/                     # Admin & startup scripts
├── docker-compose.yml           # All 4 services
├── .env.docker                  # Docker environment variables
└── .env.production.example      # Production env template
```

## Common Commands

### Docker (preferred)

```bash
# Start all services
docker-compose up -d

# Rebuild and start
docker-compose up -d --build

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Run backend tests
docker-compose exec backend pytest -q

# Run database migrations
docker-compose exec backend alembic upgrade head

# Stop everything
docker-compose down

# Full clean rebuild
docker-compose down -v && docker-compose up -d --build
```

### Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (Next.js)
cd frontend-nextjs
npm install
npm run dev

# Backend tests
cd backend
pytest -q
pytest tests/ -v --cov=app

# Frontend tests
cd frontend-nextjs
npm test                  # Jest unit tests
npx playwright test       # E2E tests
```

### Ports

- **3000** - Frontend (Next.js)
- **8000** - Backend (FastAPI), Swagger at `/docs`
- **5432** - PostgreSQL (internal)
- **6379** - Redis (internal)

## Architecture Patterns

### Backend

- **Module layout**: `routers/ -> services/ -> models/ -> database`
- **Validation**: Pydantic models for all request/response schemas
- **Auth**: JWT tokens with RBAC decorator-based permission checks
- **Logging**: structlog with correlation IDs
- **Error handling**: `HTTPException` with appropriate status codes
- **Database**: SQLAlchemy ORM with relationship cascades, UTC timestamps (`created_at`, `updated_at`)
- **Migrations**: Alembic (files in `backend/migrations/`)
- **Config**: Pydantic `Settings` class in `backend/app/core/config.py` reading from env vars

### Frontend

- **Routing**: Next.js App Router with route groups `(auth)` and `(protected)`
- **State**: Zustand stores in `store/`
- **API calls**: Axios with interceptors in `api/`
- **Components**: Functional components with hooks, Tailwind + Ant Design
- **Protected routes**: `ProtectedRoute` wrapper component
- **Types**: TypeScript definitions in `types/`

## Key Domain Concepts

- **Articles**: News items from RSS/Atom feeds with status workflow (NEW -> IN_ANALYSIS -> NEED_TO_HUNT -> HUNT_GENERATED -> REVIEWED -> ARCHIVED)
- **IOC Extraction**: Automatically extracts 8+ indicator types (IP, domain, hash, CVE, email, registry keys, file paths)
- **MITRE ATT&CK**: Auto-maps extracted intelligence to ATT&CK TTPs
- **Hunt Queries**: Generates queries for XSIAM (XQL), Defender (KQL), Splunk (SPL), Wiz (GraphQL)
- **RBAC**: 50+ granular permissions with role-based access control
- **Audit Logging**: 14 event types tracking all user and system activity
- **GenAI**: Supports OpenAI, Claude, Gemini, and Ollama for summarization and analysis

## Environment Variables

Key env vars (see `.env.docker` and `backend/.env.example` for full list):

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `SECRET_KEY` - JWT signing key (change in production)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` - Initial admin credentials
- `CORS_ORIGINS` - Allowed frontend origins
- `NEXT_PUBLIC_API_URL` - Backend API URL for frontend
- `OPENAI_API_KEY` - GenAI provider key (optional)
- `ENABLE_AUTOMATION_SCHEDULER` - Enable background feed ingestion

## Testing

- **Backend**: pytest with SQLite test DB, 17 test files covering auth, models, connectors, GenAI guardrails, hunts, reports, permissions, feed parsing
- **Frontend E2E**: Playwright (headless, 1280x720 viewport, 30s timeout)
- **Frontend Unit**: Jest + React Testing Library

## Important Notes

- The `frontend/` directory is a **legacy** CRA app; active frontend work is in `frontend-nextjs/`
- Docker images use non-root users (`appuser` for backend, `nextjs` for frontend)
- All services have health checks in docker-compose
- License: PolyForm Noncommercial 1.0.0 (community/non-commercial use only)
