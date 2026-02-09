# 🚀 JOTI Docker Deployment Guide

**Status:** ✅ Production Ready
**Version:** v1.0
**Updated:** February 8, 2026

---

## 🎯 Quick Start (30 seconds)

### Windows
```bash
JOTI-DOCKER-START.bat
```

### Linux/macOS
```bash
bash JOTI-DOCKER-START.sh
```

Then open: **http://localhost:3000**

**Login:**
- Email: `admin@joti.local`
- Password: `Joti123!@2026`

---

## 📋 What is JOTI?

JOTI is a powerful **News Feed Aggregator** that helps you:
- ✅ Aggregate multiple RSS/Atom feeds in one place
- ✅ Organize feeds by custom categories
- ✅ Use AI-powered features (with Ollama)
- ✅ Track important news items with watchlists
- ✅ Export articles to PDF/Word
- ✅ Manage user permissions with RBAC

---

## 🔧 Prerequisites

Before starting, ensure you have:

- ✅ **Docker Desktop** installed ([Download](https://www.docker.com/products/docker-desktop))
- ✅ **Docker Compose** 1.29+ (included with Docker Desktop)
- ✅ **4GB+ RAM** allocated to Docker
- ✅ **Ports 3000 and 8000** available (frontend and backend)

Check with:
```bash
docker --version
docker-compose --version
```

---

## 🚀 Starting JOTI

### Option 1: Automated Script (Recommended)

**Windows:**
```bash
JOTI-DOCKER-START.bat
```

**Linux/macOS:**
```bash
bash JOTI-DOCKER-START.sh
```

This script will:
1. ✅ Verify Docker is running
2. ✅ Check .env configuration
3. ✅ Build Docker images
4. ✅ Start all services
5. ✅ Wait for health checks
6. ✅ Show access information

### Option 2: Docker Compose (Manual)

**Development environment (with live reload):**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

**Production environment:**
```bash
docker-compose up -d
```

### Option 3: Full Control

```bash
# Build images
docker-compose build --no-cache

# Start services
docker-compose -f docker-compose.dev.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

---

## 🌐 Access JOTI

Once running (wait ~60 seconds for full startup):

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:8000 |
| **API Docs** | http://localhost:8000/docs |
| **API Health** | http://localhost:8000/health |

### Default Credentials
```
Email:    admin@joti.local
Password: Joti123!@2026
```

---

## 📁 Project Structure

```
C:\Projects\Joti\
├── backend/                    # Python FastAPI backend
│   ├── app/                   # Main application code
│   ├── migrations/            # Database migrations
│   └── Dockerfile             # Backend container
├── frontend/                   # React frontend
│   ├── src/                   # React source code
│   ├── public/                # Static files
│   └── Dockerfile             # Frontend container
├── infra/                      # Docker infrastructure
│   ├── Dockerfile.backend     # Production backend
│   ├── Dockerfile.frontend    # Production frontend
│   └── Dockerfile.frontend.dev# Development frontend
├── docker-compose.yml         # Production compose
├── docker-compose.dev.yml     # Development compose
├── .env                       # Environment configuration
├── JOTI-DOCKER-START.bat      # Windows startup script
├── JOTI-DOCKER-START.sh       # Linux/macOS startup script
├── DOCKER-SETUP.md            # Complete setup guide
├── QUICK-DOCKER-REFERENCE.txt # Command reference
└── README-DOCKER.md           # This file
```

---

## ⚙️ Configuration

All configuration is in the `.env` file:

```env
# Database
POSTGRES_USER=joti_user
POSTGRES_PASSWORD=joti_pass_2024
POSTGRES_DB=joti_db

# Admin Account
ADMIN_EMAIL=admin@joti.local
ADMIN_PASSWORD=Joti123!@2026

# Security
SECRET_KEY=joti-dev-secret-key-32chars-min-length-required

# Environment
ENV=dev
DEBUG=true

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8000

# GenAI (Optional)
GENAI_PROVIDER=ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3:latest
```

To change settings:
1. Edit `.env`
2. Rebuild: `docker-compose build --no-cache`
3. Restart: `docker-compose down && docker-compose up -d`

---

## 🛠️ Common Commands

### View Status
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Execute Command in Container
```bash
# Connect to backend shell
docker-compose exec backend bash

# Connect to database
docker-compose exec postgres psql -U joti_user -d joti_db
```

### Stop Services
```bash
docker-compose down
```

### Clean Start (removes all data)
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

---

## 🔍 Troubleshooting

### Problem: Can't access localhost:3000
**Solution:**
```bash
# 1. Verify Docker is running
docker ps

# 2. Check containers are running
docker-compose ps

# 3. Wait 60 seconds for startup
sleep 60

# 4. Check frontend logs
docker-compose logs -f frontend

# 5. Test backend
curl http://localhost:8000/health
```

### Problem: Login fails
**Solution:**
```bash
# 1. Verify backend is running
curl http://localhost:8000/health

# 2. Check environment variables
grep ADMIN .env

# 3. Verify database has admin user
docker exec joti-postgres-1 psql -U joti_user -d joti_db \
  -c "SELECT email, role FROM public.user;"

# 4. Check for API errors (open browser F12 console)
```

### Problem: Port 3000 or 8000 in use
**Solution:**
```bash
# Windows - find process
netstat -ano | findstr :3000

# Linux/macOS - find process
lsof -i :3000

# Kill process or change docker-compose ports
```

### Problem: Services won't start
**Solution:**
```bash
# Check logs for errors
docker-compose logs

# Ensure .env exists
cat .env

# Clean restart
docker-compose down -v
docker-compose build --no-cache
docker-compose -f docker-compose.dev.yml up -d
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **DOCKER-SETUP.md** | Comprehensive setup and troubleshooting guide |
| **QUICK-DOCKER-REFERENCE.txt** | Quick command reference card |
| **JOTI-DOCKER-STATUS.md** | Detailed status report and verification |
| **JOTI-DEPLOYMENT-SUMMARY.md** | Executive summary of changes |
| **README-DOCKER.md** | This file |

---

## 🔒 Security

### Development
Current setup uses development credentials. Fine for local testing.

### Production
Before deploying to production:

1. **Change default credentials:**
   ```env
   ADMIN_EMAIL=your-admin@company.com
   ADMIN_PASSWORD=your-secure-password
   SECRET_KEY=generate-new-key
   POSTGRES_PASSWORD=strong-db-password
   ```

2. **Use production config:**
   ```bash
   docker-compose up -d  # Uses docker-compose.yml
   ```

3. **Enable HTTPS:**
   - Set up reverse proxy (nginx, Traefik)
   - Obtain SSL certificate (Let's Encrypt)
   - Update CORS_ORIGINS to https://

4. **Secure database:**
   - Use network isolation
   - Change PostgreSQL password
   - Enable PostgreSQL SSL

---

## 💾 Database

### View Database
```bash
# Connect to PostgreSQL
docker exec -it joti-postgres-1 psql -U joti_user -d joti_db

# List tables
\dt

# View users
SELECT id, email, username, role FROM public.user;
```

### Backup Database
```bash
docker exec joti-postgres-1 pg_dump -U joti_user joti_db > backup.sql
```

### Restore Database
```bash
docker exec -i joti-postgres-1 psql -U joti_user joti_db < backup.sql
```

---

## 🚢 Deployment Options

### Local Development
```bash
docker-compose -f docker-compose.dev.yml up -d
```
- Live reload enabled
- Debug mode on
- Perfect for development

### Local Production-like
```bash
docker-compose up -d
```
- Optimized builds
- No live reload
- Good for testing

### Cloud Deployment
- Copy files to cloud server
- Update `.env` with production values
- Run: `docker-compose up -d`

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────┐
│                    JOTI Stack                       │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────────┐      ┌──────────────────┐    │
│  │  React Frontend  │      │   FastAPI Backend │    │
│  │  localhost:3000  │◄────►│  localhost:8000   │    │
│  └──────────────────┘      └──────────────────┘    │
│         │                           │                │
│         │         ┌─────────────────┤                │
│         │         │                 │                │
│         ▼         ▼                 ▼                │
│    ┌────────────────────┐    ┌──────────────┐      │
│    │  PostgreSQL :5432  │    │  Redis :6379 │      │
│    │  (Database)        │    │  (Cache)     │      │
│    └────────────────────┘    └──────────────┘      │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## 🎓 Next Steps

1. **Get Started:**
   - Run startup script
   - Login to frontend
   - Explore the interface

2. **Add Content:**
   - Add RSS/Atom feeds
   - Create categories
   - Organize sources

3. **Configure:**
   - Set user preferences
   - Create watchlists
   - Adjust refresh rates

4. **Advanced:**
   - Set up GenAI features
   - Configure automation
   - Create custom rules

---

## ✅ Verification Checklist

Run verification before deployment:

**Windows:**
```bash
verify-joti-setup.bat
```

**Linux/macOS:**
```bash
bash verify-joti-setup.sh
```

---

## 🆘 Support

### Quick Reference
- Command help: See `QUICK-DOCKER-REFERENCE.txt`
- Setup guide: See `DOCKER-SETUP.md`
- Status check: See `JOTI-DOCKER-STATUS.md`

### Check Logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Test API
```bash
# Health check
curl http://localhost:8000/health

# Login test
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@joti.local","password":"Joti123!@2026"}'
```

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | Feb 8, 2026 | Initial JOTI Docker setup, environment migration from Parshu |

---

## 📄 License

See `LICENSE` file in project root

---

## 🎯 Summary

JOTI is now **fully containerized and ready to deploy**. All services are configured, documented, and tested.

**Start in 30 seconds:**
```bash
JOTI-DOCKER-START.bat    # Windows
bash JOTI-DOCKER-START.sh # Linux/macOS
```

**Then visit:** http://localhost:3000

**Enjoy JOTI! 🚀**

---

**Last Updated:** February 8, 2026
**Status:** ✅ Production Ready
