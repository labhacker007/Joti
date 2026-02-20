# Joti

Threat intelligence news aggregator and hunting platform for SOC teams and threat analysts. Aggregates RSS/Atom feeds, extracts IOCs, maps MITRE ATT&CK TTPs, and generates hunt queries for XSIAM, Defender, Splunk, and Wiz.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)

That's it. No Python or Node.js install required.

## Quick Start

**1. Clone the repo**

```bash
git clone https://github.com/labhacker007/Joti.git
cd Joti
```

**2. Create your `.env` file**

```bash
cp .env.example .env
```

Open `.env` and replace the three `CHANGEME` values:

```env
POSTGRES_PASSWORD=your_db_password
SECRET_KEY=your_secret_key_min_32_chars
ADMIN_PASSWORD=your_admin_password
```

**3. Start the app**

```bash
docker-compose up -d
```

The first run builds images and may take 2–3 minutes.

**4. Access**

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env` (defaults: `admin@localhost`).

## Stopping

```bash
docker-compose down          # Stop and keep data
docker-compose down -v       # Stop and wipe all data
```

## Useful Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild after code changes
docker-compose up -d --build

# Run backend tests
docker-compose exec backend pytest -q

# Run database migrations
docker-compose exec backend alembic upgrade head
```

## User Management

Manage users from the CLI using `manage.py` (available inside the backend container):

```bash
# List all users
docker-compose exec backend python manage.py listusers

# Create an admin superuser (interactive)
docker-compose exec backend python manage.py createsuperuser

# Create an admin superuser (non-interactive)
docker-compose exec backend python manage.py createsuperuser \
  --email admin@example.com --password secret123

# Create a regular user
docker-compose exec backend python manage.py createuser \
  --email analyst@example.com --password secret123 --role ANALYST

# Available roles: ADMIN, ANALYST, ENGINEER, MANAGER, EXECUTIVE, VIEWER

# Change a user's password
docker-compose exec backend python manage.py changepassword \
  --email user@example.com --password newpassword

# Deactivate / reactivate a user
docker-compose exec backend python manage.py deactivateuser --email user@example.com
docker-compose exec backend python manage.py activateuser --email user@example.com
```

## GenAI Setup (Optional)

By default the app uses **Ollama** (local, free). To switch providers, edit `.env`:

```env
# OpenAI
GENAI_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Ollama (local)
GENAI_PROVIDER=ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3:latest
```

Configure models and function mappings in the Admin → GenAI panel after logging in.

## Ports

Default ports can be changed in `.env`:

```env
FRONTEND_PORT=3000
BACKEND_PORT=8000
```

## License

PolyForm Noncommercial 1.0.0 — free for non-commercial use.
