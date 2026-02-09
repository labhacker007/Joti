#!/bin/bash

# ==================================================================
# JOTI AUTOHEAL - Automatically detect and fix common JOTI issues
# Run this when something doesn't work. It checks everything.
# ==================================================================

set -e

cd "$(dirname "$0")"

echo ""
echo "=============================================================="
echo "  JOTI AUTOHEAL - Diagnosing and fixing issues..."
echo "=============================================================="
echo ""

ISSUES_FOUND=0
FIXES_APPLIED=0

# ─── Check 1: Docker running? ─────────────────────────────────
echo "[1/10] Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo "  ❌ FAIL: Docker is not running!"
    echo "  FIX:  Start Docker and run this again."
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    exit 1
else
    echo "  ✅ OK: Docker is running"
fi

# ─── Check 2: Containers running? ─────────────────────────────
echo "[2/10] Checking containers..."
if ! docker ps --format '{{.Names}}' | grep -q "joti-backend-1"; then
    echo "  ⚠️  WARN: Backend container not running. Starting..."
    docker-compose -f docker-compose.dev.yml up -d
    sleep 30
    FIXES_APPLIED=$((FIXES_APPLIED + 1))
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "  ✅ OK: Backend container running"
fi

if ! docker ps --format '{{.Names}}' | grep -q "joti-frontend-1"; then
    echo "  ⚠️  WARN: Frontend container not running. Starting..."
    docker-compose -f docker-compose.dev.yml up -d
    sleep 30
    FIXES_APPLIED=$((FIXES_APPLIED + 1))
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "  ✅ OK: Frontend container running"
fi

# ─── Check 3: Backend responding? ─────────────────────────────
echo "[3/10] Checking backend health..."
if ! curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo "  ⚠️  WARN: Backend not responding. Restarting..."
    docker restart joti-backend-1
    sleep 15
    FIXES_APPLIED=$((FIXES_APPLIED + 1))
    ISSUES_FOUND=$((ISSUES_FOUND + 1))

    if ! curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        echo "  ❌ FAIL: Backend still not responding after restart."
        echo "  FIX:  Check logs: docker logs joti-backend-1"
    else
        echo "  ✅ OK: Backend recovered after restart"
    fi
else
    echo "  ✅ OK: Backend is healthy"
fi

# ─── Check 4: Frontend responding? ─────────────────────────────
echo "[4/10] Checking frontend..."
if ! curl -sf http://localhost:3000 > /dev/null 2>&1; then
    echo "  ⚠️  WARN: Frontend not responding. Restarting..."
    docker restart joti-frontend-1
    sleep 15
    FIXES_APPLIED=$((FIXES_APPLIED + 1))
    ISSUES_FOUND=$((ISSUES_FOUND + 1))

    if ! curl -sf http://localhost:3000 > /dev/null 2>&1; then
        echo "  ❌ FAIL: Frontend still not responding."
        echo "  FIX:  Check logs: docker logs joti-frontend-1"
    else
        echo "  ✅ OK: Frontend recovered after restart"
    fi
else
    echo "  ✅ OK: Frontend is responding"
fi

# ─── Check 5: Database responding? ────────────────────────────
echo "[5/10] Checking database connection..."
if ! docker exec joti-postgres-1 pg_isready -U joti_user > /dev/null 2>&1; then
    echo "  ⚠️  WARN: Database not responding. Restarting..."
    docker restart joti-postgres-1
    sleep 10
    FIXES_APPLIED=$((FIXES_APPLIED + 1))
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    echo "  ✅ OK: Database restarted"
else
    echo "  ✅ OK: Database is responding"
fi

# ─── Check 6: Redis responding? ───────────────────────────────
echo "[6/10] Checking Redis cache..."
if ! docker exec joti-redis-1 redis-cli ping > /dev/null 2>&1; then
    echo "  ⚠️  WARN: Redis not responding. Restarting..."
    docker restart joti-redis-1
    sleep 5
    FIXES_APPLIED=$((FIXES_APPLIED + 1))
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    echo "  ✅ OK: Redis restarted"
else
    echo "  ✅ OK: Redis is responding"
fi

# ─── Check 7: Admin user exists? ──────────────────────────────
echo "[7/10] Checking admin user..."
if docker exec joti-postgres-1 psql -U joti_user -d joti_db -c "SELECT COUNT(*) FROM public.user WHERE email='admin@joti.local';" > /dev/null 2>&1; then
    echo "  ✅ OK: Admin user exists"
else
    echo "  ⚠️  WARN: Admin user check failed. Database may need init."
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# ─── Check 8: API responding? ─────────────────────────────────
echo "[8/10] Checking API endpoints..."
if curl -sf http://localhost:8000/docs > /dev/null 2>&1; then
    echo "  ✅ OK: API endpoints responding"
else
    echo "  ⚠️  WARN: API docs not accessible"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# ─── Check 9: Login page loads? ───────────────────────────────
echo "[9/10] Checking login page..."
if curl -sf http://localhost:3000 | grep -q "login"; then
    echo "  ✅ OK: Frontend loading correctly"
else
    echo "  ⚠️  WARN: Frontend content not loading properly"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# ─── Check 10: Git status ───────────────────────────────────
echo "[10/10] Checking git..."
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "  Branch: $GIT_BRANCH"
if git status --short 2>/dev/null | grep -q ""; then
    echo "  NOTE: You have uncommitted changes"
fi

# ─── Summary ─────────────────────────────────────────────────
echo ""
echo "=============================================================="
if [ $ISSUES_FOUND -eq 0 ]; then
    echo "  ✅ All checks passed! JOTI is healthy."
    echo "  Status: READY TO USE"
else
    echo "  ⚠️  Issues found: $ISSUES_FOUND  |  Auto-fixes applied: $FIXES_APPLIED"
    echo "  Status: Please review errors above"
fi
echo "=============================================================="
echo ""
echo "  🌐 Frontend:  http://localhost:3000"
echo "  🔌 Backend:   http://localhost:8000"
echo "  📚 API Docs:  http://localhost:8000/docs"
echo "  👤 Login:     admin@joti.local / Joti123!@2026"
echo ""
echo "  Useful commands:"
echo "    docker-compose ps                 - Show container status"
echo "    docker-compose logs -f backend    - Watch backend logs"
echo "    docker-compose logs -f frontend   - Watch frontend logs"
echo "    docker-compose down -v            - Reset everything"
echo ""
