# 🚀 Local Launch Guide

## Prerequisites

- Docker Desktop installed and running
- Ports available: 3000, 8000, 5432, 6379
- At least 4GB RAM allocated to Docker

---

## Quick Start (5 Minutes)

### 1. Start the Application

```bash
cd threat-intel-platform
docker compose up -d
```

### 2. Wait for Services (30 seconds)

```bash
docker-compose ps
```

All services should show `(healthy)` status.

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 4. Login Credentials

```
Username: admin
Password: admin123
```

---

## Services Overview

| Service | Port | Status Check |
|---------|------|--------------|
| Frontend (React) | 3000 | http://localhost:3000 |
| Backend (FastAPI) | 8000 | http://localhost:8000/health |
| PostgreSQL | 5432 | `docker-compose exec postgres pg_isready` |
| Redis | 6379 | `docker-compose exec redis redis-cli ping` |

---

## Initial Setup (Already Done)

The database has been seeded with:

✅ **Admin User**
- Email: admin@localhost
- Username: admin
- Password: admin123

✅ **20 Threat Intelligence Feed Sources**
- CISA Cybersecurity Advisories
- SANS Internet Storm Center
- BleepingComputer
- Dark Reading
- The Hacker News
- Krebs on Security
- Threatpost
- Recorded Future
- FireEye Threat Research
- Talos Intelligence
- Kaspersky Securelist
- Symantec Threat Intelligence
- Trend Micro Security News
- IBM X-Force Exchange
- AlienVault OTX
- CrowdStrike Blog
- Palo Alto Unit 42
- Microsoft Security Blog
- Google Project Zero
- Malwarebytes Labs

✅ **Watchlist Keywords**
- ransomware
- malware
- zero-day
- critical vulnerability
- data breach
- APT
- supply chain attack
- phishing

✅ **Connector Configs**
- XSIAM (Palo Alto Cortex XDR)
- Microsoft Defender
- Wiz
- Splunk
- Slack
- Email (SMTP)

---

## Common Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart Services

```bash
# All services
docker-compose restart

# Specific service
docker-compose restart backend
```

### Stop Application

```bash
docker-compose down
```

### Stop and Remove Data (Fresh Start)

```bash
docker-compose down -v
docker-compose up -d
# Re-seed database
docker-compose exec backend python -m app.seeds
```

### Rebuild After Code Changes

```bash
docker-compose up -d --build
```

---

## Configuration

### Environment Variables

Edit `.env` file in the project root to configure:

#### GenAI Providers (for Hunt Query Generation)

```bash
# Choose provider: openai, gemini, claude, ollama
GENAI_PROVIDER=openai

# API Keys
OPENAI_API_KEY=your-key-here
GEMINI_API_KEY=your-key-here
CLAUDE_API_KEY=your-key-here
```

#### Hunt Platform Connectors

**XSIAM (Palo Alto Cortex XDR)**
```bash
XSIAM_TENANT_ID=your-tenant-id
XSIAM_API_KEY=your-api-key
XSIAM_FQDN=api.xdr.paloaltonetworks.com
```

**Microsoft Defender**
```bash
DEFENDER_TENANT_ID=your-tenant-id
DEFENDER_CLIENT_ID=your-client-id
DEFENDER_CLIENT_SECRET=your-client-secret
```

**Wiz**
```bash
WIZ_CLIENT_ID=your-client-id
WIZ_CLIENT_SECRET=your-client-secret
```

**Splunk**
```bash
SPLUNK_HOST=your-splunk-host
SPLUNK_PORT=8089
SPLUNK_USERNAME=your-username
SPLUNK_PASSWORD=your-password
```

#### Notifications

**Email (SMTP)**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

**Slack**
```bash
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_DEFAULT_CHANNEL=#threat-intel
```

---

## Application Workflow

### 1. **Feed Ingestion**
- Go to **Feed Sources** page
- Click "Fetch All Sources" or trigger individual sources
- New articles appear in **Article Queue**

### 2. **Article Triage**
- Go to **Articles** page
- Review new articles
- High-priority articles are auto-flagged based on watchlist keywords
- Mark articles as REVIEWED when done

### 3. **Intelligence Extraction**
- Go to **Threat Hunt Workbench**
- Select reviewed articles
- Click "Extract Intelligence"
- System extracts:
  - IOCs (IPs, domains, hashes, URLs, CVEs)
  - TTPs (MITRE ATT&CK techniques)
  - IOAs (behavioral indicators)

### 4. **Hunt Generation & Execution**
- Select platforms (Defender, XSIAM, Splunk, Wiz)
- Click "Generate Hunts"
- AI creates platform-specific queries
- Execute hunts on target platforms
- View results and AI analysis

### 5. **Report Generation**
- Go to **Reports** page
- Generate daily/weekly reports automatically
- Reports include:
  - Reviewed articles
  - Extracted intelligence
  - Hunt results
  - AI analysis
- Export as CSV or DOCX

---

## Troubleshooting

### Frontend Shows Blank Page

```bash
# Clear browser cache
# Or rebuild frontend
docker-compose up -d --build frontend
```

### Backend Not Starting

```bash
# Check logs
docker-compose logs backend

# Common issue: Database not ready
docker-compose restart backend
```

### No Articles in Queue

```bash
# Trigger feed ingestion
# Go to Feed Sources page → Click "Fetch All Sources"
# Or via API:
curl -X POST http://localhost:8000/sources/ingest-all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Database Connection Error

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Restart database
docker-compose restart postgres
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000
lsof -i :8000

# Kill process or change port in docker-compose.yml
```

---

## API Testing

### Get Access Token

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

### Test Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Get articles
curl http://localhost:8000/articles/triage \
  -H "Authorization: Bearer YOUR_TOKEN"

# Generate hunt
curl -X POST http://localhost:8000/hunts/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"article_id": 1, "platform": "defender"}'
```

---

## Development

### Hot Reload

Backend has hot reload enabled. Changes to Python files will auto-restart the server.

Frontend requires rebuild:

```bash
docker-compose up -d --build frontend
```

### Database Migrations

```bash
# Create migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Apply migration
docker-compose exec backend alembic upgrade head
```

### Add New Feed Source

```bash
# Via UI: Feed Sources → Add Source
# Or via API
curl -X POST http://localhost:8000/sources/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Feed",
    "url": "https://example.com/feed.xml",
    "feed_type": "rss",
    "is_active": true
  }'
```

---

## Performance Tips

1. **Limit Feed Fetch Frequency**: Adjust `FEED_CHECK_INTERVAL_MINUTES` in `.env`
2. **Archive Old Articles**: Regularly archive reviewed articles
3. **Monitor Resource Usage**: `docker stats`
4. **Database Cleanup**: Periodically delete old audit logs and archived articles

---

## Security Notes

⚠️ **This is a development setup. For production:**

1. Change all default passwords
2. Use strong `SECRET_KEY` and `JWT_SECRET_KEY`
3. Enable HTTPS
4. Configure proper firewall rules
5. Use environment-specific `.env` files
6. Enable SAML/SSO for authentication
7. Rotate API keys regularly
8. Review CORS settings

---

## Support

- **Documentation**: http://localhost:8000/docs
- **Logs**: `docker-compose logs -f`
- **Health Check**: http://localhost:8000/health

---

## Next Steps

1. ✅ Application is running
2. ✅ Database is seeded
3. ⏭️ Configure GenAI API keys (OpenAI, Gemini, etc.)
4. ⏭️ Configure hunt platform connectors (XSIAM, Defender, etc.)
5. ⏭️ Fetch feeds from sources
6. ⏭️ Start triaging articles
7. ⏭️ Run your first threat hunt!

---

**🎉 Your application is ready to use!**

Access it at: http://localhost:3000
