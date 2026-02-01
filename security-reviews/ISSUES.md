# Security Issues Inventory (Current)

We are **not** done reviewing the entire repo. This list contains issues found so far in the files reviewed to date, plus a short “next files to review” backlog.

## Issues Found (reviewed files)

| File | Severity | Issue | What to fix (summary) |
|---|---:|---|---|
| `docker-compose.yml` | High | Default DB creds + default `SECRET_KEY` | Remove insecure defaults; require explicit env/secrets; fail-fast on weak/missing secrets |
| `docker-compose.yml` | High | Postgres/Redis exposed on `0.0.0.0` | Remove host port publishing or bind to `127.0.0.1` only |
| `docker-compose.yml` | Medium | Debug/reload enabled by default | Split dev/prod compose or use profiles; ensure prod has `DEBUG=false` and no `--reload` |
| `docker-compose.yml` | Medium | Container → host access (`host-gateway`) | Make dev-only or run Ollama as a service container |
| `docker-compose.yml` | Medium | Missing container hardening | Add `no-new-privileges`, drop caps, non-root, read-only FS (where compatible) |
| `docker-compose.yml` | Low/Med | Supply-chain pinning (`latest`, no digests) | Pin by digest for prod; avoid `latest` model tags |
| `infra/Dockerfile.backend` | High | Runs as root | Add non-root user and switch with `USER` |
| `infra/Dockerfile.backend` | Med/High | Build toolchain shipped (e.g., `gcc`) | Use multi-stage build; keep runtime minimal |
| `infra/Dockerfile.backend` | Medium | Weak dependency provenance controls | Pin base image digest; lock Python deps (hashes/lockfile); add SCA in CI |
| `infra/Dockerfile.backend` | Low/Med | Tests copied into runtime image | Don’t copy tests into runtime image |
| `infra/Dockerfile.backend` | Medium | `config/` copied into image (potential secret leak) | Ensure config is non-sensitive; move secrets to env/secret manager; add guardrails |
| `backend/app/auth/page_permissions.py` | High | Multiple RBAC sources-of-truth (drift risk) | Consolidate permissions registry; add CI test to prevent drift |
| `backend/app/auth/page_permissions.py` | Medium | `default_roles` can be misused to grant manage perms | Separate nav vs action perms; add guardrails for low-priv roles |
| `backend/app/auth/page_permissions.py` | Low/Med | Roles are raw strings | Use a shared enum/validator; add tests |
| `backend/app/auth/dependencies.py` | High | Impersonation trusts token claims | Verify impersonation eligibility against DB/permissions; harden claim model |
| `backend/app/auth/dependencies.py` | Low/Med | Raw token error detail returned | Return generic 401; log details server-side |
| `backend/app/auth/dependencies.py` | Low/Med | Inconsistent JWT `sub` typing | Standardize `sub` as string and cast explicitly |
| `backend/app/genai/routes.py` | High | “Admin” endpoints not admin-protected | Lock down `/genai/admin/configs` and any `/admin/*` endpoints with `require_permission(...)` |
| `backend/app/genai/routes.py` | Medium | Provider status info leakage + raw error strings | Restrict to admin or redact; don’t return raw exception text |
| `backend/app/genai/routes.py` | Med/High | Potential SSRF via configurable provider base URL | Validate/allowlist base URLs; add egress controls |
| `backend/app/genai/routes.py` | Medium | User-controlled `model` without allowlist enforcement | Enforce enabled/approved model allowlist per role/quota |
| `backend/app/genai/routes.py` | Low/Med | Cost/DoS guardrails not clearly enforced at boundary | Add hard ceilings + rate limiting + quota checks before provider calls |
| `backend/app/core/config.py` | High | Hard-coded default DB creds + `SECRET_KEY` | Remove credential-bearing defaults from code; fail-fast unless explicit dev flag |
| `backend/app/core/config.py` | Medium | “Production mode” depends on `DEBUG` parsing | Use explicit `ENV` and let settings parse booleans |
| `backend/app/core/config.py` | Medium | SSRF allowlist may not be enforced consistently | Centralize safe fetch + tests; ensure all outbound fetches use it |
| `backend/app/core/config.py` | Medium | `OLLAMA_BASE_URL` default encourages host access | Make dev-only; require explicit config in prod |
| `backend/app/main.py` | High | Unauthenticated `/setup/*` endpoints | Remove/disable in prod; protect with admin perm/bootstrap token in dev |
| `backend/app/main.py` | Med/High | Startup schema mutation via raw SQL | Move to Alembic/deployment migrations |
| `backend/app/main.py` | Medium | Auto-seeding DB at startup | Make opt-in dev-only flag |
| `backend/app/main.py` | Medium | CSP includes `unsafe-eval`/`unsafe-inline` | Align CSP to UI needs; avoid `unsafe-eval` |
| `backend/app/core/rate_limit.py` | High | High-cardinality rate-limit keys (memory DoS) | Normalize paths (route template), cleanup keys, avoid per-ID buckets |
| `backend/app/core/rate_limit.py` | Medium | In-memory limiter doesn’t work in multi-worker | Use Redis/shared limiter |
| `backend/app/core/rate_limit.py` | Medium | Not proxy-aware client IP | Use trusted proxy headers middleware/config |

## Next high-risk areas to review (not yet reviewed)

If you want “review everything”, these are the next highest impact zones to audit:
- AuthN/AuthZ enforcement: `backend/app/auth/dependencies.py`, JWT/session code, admin RBAC service/routes.
- Data access / IDOR: routes under `backend/app/*/routes.py` that accept IDs (articles, reports, knowledge, users).
- GenAI execution layer: `backend/app/chatbot/service.py`, `backend/app/genai/provider.py`, prompt templates (`backend/app/genai/prompts.py`) for injection/exfiltration.
- SSRF/external fetchers: ingestion tasks (`backend/app/ingestion/tasks.py`), feed connectors, notifications/webhooks (`backend/app/notifications/*`).
- Secrets/config: `backend/app/core/config.py`, `env.example`, runtime secret loading patterns.
- Infra: other Dockerfiles, Kubernetes manifests under `infra/`, CI/CD scripts, `.env*` handling.
