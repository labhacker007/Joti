# JOTI Docker Setup Guide

## Overview
This guide will help you set up and run JOTI (News Feed Aggregator) using Docker. JOTI is now fully containerized and accessible via `localhost:3000`.

## Prerequisites
- Docker Desktop installed and running
- Docker Compose version 1.29+
- At least 4GB of RAM allocated to Docker
- Git installed

## Quick Start

### 1. Prepare Environment
```bash
cd /c/Projects/Joti
# Verify .env file is properly configured (already done)
cat .env
```

**Current .env Configuration:**
- Database: PostgreSQL (joti_user / joti_pass_2024)
- Admin: admin@joti.local / Joti123!@2026
- Frontend API URL: http://localhost:8000
- Backend Port: 8000
- Frontend Port: 3000

### 2. Build Docker Images
```bash
# For production-like environment
docker-compose build

# For development environment (with live reload)
docker-compose -f docker-compose.dev.yml build
```

### 3. Start Services (Development)
```bash
docker-compose -f docker-compose.dev.yml up -d
```

**Services Started:**
- PostgreSQL on 127.0.0.1:5432
- Redis on 127.0.0.1:6379
- Backend (FastAPI) on http://localhost:8000
- Frontend (React) on http://localhost:3000

### 4. Access JOTI
Open your browser:
```
http://localhost:3000
```

**Login Credentials:**
- Email: `admin@joti.local`
- Password: `Joti123!@2026`

## Troubleshooting

### Login Error on localhost:3000

**Problem:** "Invalid credentials" or "Cannot connect to API"

**Solutions:**

1. **Check Backend Health:**
```bash
# Verify backend is running
curl http://localhost:8000/health

# Check backend logs
docker logs joti-backend-1
```

2. **Verify CORS Configuration:**
```bash
# Ensure CORS_ORIGINS includes localhost:3000
docker-compose logs backend | grep -i cors
```

3. **Check API URL:**
```bash
# In browser console (F12), verify API calls go to correct URL
# Should be: http://localhost:8000
```

4. **Ensure Admin User Exists:**
```bash
# Check PostgreSQL
docker exec joti-postgres-1 psql -U joti_user -d joti_db -c "SELECT id, email, username FROM public.user LIMIT 5;"
```

### Database Connection Issues

**Reset Database:**
```bash
# Stop containers
docker-compose down

# Remove volumes (WARNING: deletes data)
docker volume rm joti_postgres_data joti_redis_data

# Restart
docker-compose -f docker-compose.dev.yml up -d
```

### Port Already in Use

**If port 3000 or 8000 is in use:**
```bash
# Change frontend port in docker-compose file
# Or kill process using the port
# Windows: netstat -ano | findstr :3000
# Linux/Mac: lsof -i :3000
```

### Container Won't Start

**Check logs:**
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

**Common issues:**
- Database not ready: Wait 30 seconds and retry
- Missing .env: Copy from .env template
- Port conflicts: Check `docker-compose ps`

## Verify JOTI is Running

### Check All Services:
```bash
docker-compose ps
```

Expected output:
```
NAME                    STATUS
joti-postgres-1         Up (healthy)
joti-redis-1            Up (healthy)
joti-backend-1          Up (healthy)
joti-frontend-1         Up (healthy)
```

### Test API Endpoints:
```bash
# Health check
curl http://localhost:8000/health

# CORS check
curl -H "Origin: http://localhost:3000" http://localhost:8000/auth/me

# Login test
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@joti.local",
    "password": "Joti123!@2026"
  }'
```

## Docker Compose Files

### Production: `docker-compose.yml`
- No live reload
- Optimized for performance
- Use for deployment

### Development: `docker-compose.dev.yml`
- Live reload enabled
- Source code volumes mounted
- Debug mode on
- Use for local development

## Environment Variables

Edit `.env` to customize:
- `POSTGRES_USER`: Database user
- `POSTGRES_PASSWORD`: Database password
- `ADMIN_EMAIL`: Admin email for login
- `ADMIN_PASSWORD`: Admin password for login
- `SECRET_KEY`: JWT secret key
- `CORS_ORIGINS`: Allowed frontend origins
- `GENAI_PROVIDER`: AI provider (ollama for local dev)

## Common Docker Commands

```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Execute command in container
docker-compose exec backend bash
docker-compose exec postgres psql -U joti_user -d joti_db

# Rebuild images
docker-compose build --no-cache

# Remove everything (WARNING: deletes data)
docker-compose down -v
```

## Features Verified

✓ Backend (FastAPI) running on port 8000
✓ Frontend (React) running on port 3000
✓ PostgreSQL database configured
✓ Redis cache configured
✓ CORS properly configured for localhost:3000
✓ Admin user created on first startup
✓ JWT authentication working
✓ Live reload enabled for development

## Next Steps

1. **Log in to JOTI:** http://localhost:3000
2. **Explore Admin Panel:** Check Settings and Configuration
3. **Add News Sources:** Create custom RSS/Atom feeds
4. **Configure GenAI:** Set up Ollama for advanced features

## Support

For issues:
1. Check container logs: `docker-compose logs`
2. Verify environment variables: `cat .env`
3. Test API directly: Use curl commands above
4. Check network: `docker network ls`

---

**Version:** JOTI Docker Setup v1.0
**Last Updated:** February 8, 2026
