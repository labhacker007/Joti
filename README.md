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

Open `.env` and replace the two `CHANGEME` values:

```env
POSTGRES_PASSWORD=your_db_password
SECRET_KEY=your_secret_key_min_32_chars
```

**3. Start the app**

```bash
docker-compose up -d
```

The first run builds images and may take 2–3 minutes.

**4. Create your admin user**

```bash
docker-compose exec backend python manage.py createsuperuser
```

You will be prompted for email, username, and password.

**5. Access**

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

Log in with the credentials you set in step 4.

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

Configure AI providers (Ollama, OpenAI, Claude, Gemini) through the web UI after logging in:

**Admin → AI Engine → Models**

No environment variables are needed for GenAI — all API keys, model selections, and function mappings are managed in the admin panel.

### Using Ollama (local models)

The backend runs inside Docker and connects to Ollama on your host machine via `host.docker.internal:11434`.

By default, Ollama on Windows and macOS only listens on `127.0.0.1` (loopback), which Docker containers cannot reach. You must configure Ollama to listen on all interfaces before starting it.

**Windows:**

1. Open **Start → Edit the system environment variables → Environment Variables**
2. Under *User variables*, click **New**:
   - Variable name: `OLLAMA_HOST`
   - Variable value: `0.0.0.0:11434`
3. Click OK, then **quit Ollama from the system tray** and reopen it.

**macOS:**

```bash
launchctl setenv OLLAMA_HOST "0.0.0.0:11434"
# Then restart Ollama from Applications or:
pkill ollama && ollama serve &
```

**Linux (systemd):**

```bash
sudo systemctl edit ollama.service
# Add under [Service]:
# Environment="OLLAMA_HOST=0.0.0.0:11434"
sudo systemctl restart ollama
```

**Verify it worked** — after restarting Ollama, check it is now bound to all interfaces:

```powershell
# Windows PowerShell
netstat -ano | findstr 11434
# Should show 0.0.0.0:11434, not 127.0.0.1:11434
```

```bash
# macOS / Linux
ss -tlnp | grep 11434
# Should show 0.0.0.0:11434
```

No changes to the Joti codebase or `.env` are needed — `OLLAMA_BASE_URL` defaults to `http://host.docker.internal:11434` which is correct once Ollama is bound to `0.0.0.0`.

## Ports

Default ports can be changed in `.env`:

```env
FRONTEND_PORT=3000
BACKEND_PORT=8000
```

## License

PolyForm Noncommercial 1.0.0 — free for non-commercial use.
