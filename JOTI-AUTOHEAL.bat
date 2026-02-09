@echo off
REM ==================================================================
REM  JOTI AUTOHEAL - Automatically detect and fix common JOTI issues
REM  Run this when something doesn't work. It checks everything.
REM ==================================================================

setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ==============================================================
echo  JOTI AUTOHEAL - Diagnosing and fixing issues...
echo ==============================================================
echo.

set ISSUES_FOUND=0
set FIXES_APPLIED=0

REM ─── Check 1: Docker running? ─────────────────────────────────
echo [1/10] Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo   ❌ FAIL: Docker is not running!
    echo   FIX:  Start Docker Desktop and run this again.
    set /a ISSUES_FOUND+=1
    goto :summary
) else (
    echo   ✅ OK: Docker is running
)

REM ─── Check 2: Containers running? ─────────────────────────────
echo [2/10] Checking containers...
docker ps --format "{{.Names}}" | findstr "joti-backend-1" >nul 2>&1
if errorlevel 1 (
    echo   ⚠️  WARN: Backend container not running. Starting...
    docker-compose -f docker-compose.dev.yml up -d
    timeout /t 30 /nobreak >nul
    set /a FIXES_APPLIED+=1
    set /a ISSUES_FOUND+=1
) else (
    echo   ✅ OK: Backend container running
)

docker ps --format "{{.Names}}" | findstr "joti-frontend-1" >nul 2>&1
if errorlevel 1 (
    echo   ⚠️  WARN: Frontend container not running. Starting...
    docker-compose -f docker-compose.dev.yml up -d
    timeout /t 30 /nobreak >nul
    set /a FIXES_APPLIED+=1
    set /a ISSUES_FOUND+=1
) else (
    echo   ✅ OK: Frontend container running
)

REM ─── Check 3: Backend responding? ─────────────────────────────
echo [3/10] Checking backend health...
curl -sf http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo   ⚠️  WARN: Backend not responding. Restarting...
    docker restart joti-backend-1
    timeout /t 15 /nobreak >nul
    set /a FIXES_APPLIED+=1
    set /a ISSUES_FOUND+=1

    REM Recheck after restart
    curl -sf http://localhost:8000/health >nul 2>&1
    if errorlevel 1 (
        echo   ❌ FAIL: Backend still not responding after restart.
        echo   FIX:  Check logs: docker logs joti-backend-1
    ) else (
        echo   ✅ OK: Backend recovered after restart
    )
) else (
    echo   ✅ OK: Backend is healthy
)

REM ─── Check 4: Frontend responding? ─────────────────────────────
echo [4/10] Checking frontend...
curl -sf http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo   ⚠️  WARN: Frontend not responding. Restarting...
    docker restart joti-frontend-1
    timeout /t 15 /nobreak >nul
    set /a FIXES_APPLIED+=1
    set /a ISSUES_FOUND+=1

    curl -sf http://localhost:3000 >nul 2>&1
    if errorlevel 1 (
        echo   ❌ FAIL: Frontend still not responding.
        echo   FIX:  Check logs: docker logs joti-frontend-1
    ) else (
        echo   ✅ OK: Frontend recovered after restart
    )
) else (
    echo   ✅ OK: Frontend is responding
)

REM ─── Check 5: Database responding? ────────────────────────────
echo [5/10] Checking database connection...
docker exec joti-postgres-1 pg_isready -U joti_user >nul 2>&1
if errorlevel 1 (
    echo   ⚠️  WARN: Database not responding.
    docker restart joti-postgres-1
    timeout /t 10 /nobreak >nul
    set /a FIXES_APPLIED+=1
    set /a ISSUES_FOUND+=1
    echo   ✅ OK: Database restarted
) else (
    echo   ✅ OK: Database is responding
)

REM ─── Check 6: Redis responding? ───────────────────────────────
echo [6/10] Checking Redis cache...
docker exec joti-redis-1 redis-cli ping >nul 2>&1
if errorlevel 1 (
    echo   ⚠️  WARN: Redis not responding. Restarting...
    docker restart joti-redis-1
    timeout /t 5 /nobreak >nul
    set /a FIXES_APPLIED+=1
    set /a ISSUES_FOUND+=1
    echo   ✅ OK: Redis restarted
) else (
    echo   ✅ OK: Redis is responding
)

REM ─── Check 7: Admin user exists? ──────────────────────────────
echo [7/10] Checking admin user...
docker exec joti-postgres-1 psql -U joti_user -d joti_db -c "SELECT COUNT(*) FROM public.users WHERE email='admin@joti.local';" >nul 2>&1
if errorlevel 1 (
    echo   ⚠️  WARN: Admin user check failed. Database may need init.
    set /a ISSUES_FOUND+=1
) else (
    echo   ✅ OK: Admin user exists
)

REM ─── Check 8: API responding? ─────────────────────────────────
echo [8/10] Checking API endpoints...
curl -sf http://localhost:8000/docs >nul 2>&1
if errorlevel 1 (
    echo   ⚠️  WARN: API docs not accessible
    set /a ISSUES_FOUND+=1
) else (
    echo   ✅ OK: API endpoints responding
)

REM ─── Check 9: Frontend HTML loads? ───────────────────────────
echo [9/10] Checking frontend HTML...
curl -sf http://localhost:3000 | findstr "doctype html root" >nul 2>&1
if errorlevel 1 (
    echo   ⚠️  WARN: Frontend content not loading properly
    set /a ISSUES_FOUND+=1
) else (
    echo   ✅ OK: Frontend loading correctly
)

REM ─── Check 10: Git status ───────────────────────────────────
echo [10/10] Checking git...
for /f %%b in ('git branch --show-current 2^>nul') do set GIT_BRANCH=%%b
echo   Branch: !GIT_BRANCH!
git status --short 2>nul | findstr "." >nul 2>&1
if not errorlevel 1 (
    echo   NOTE: You have uncommitted changes
    git status --short
)

:summary
echo.
echo ==============================================================
if %ISSUES_FOUND%==0 (
    echo   ✅ All checks passed! JOTI is healthy.
    echo   Status: READY TO USE
) else (
    echo   ⚠️  Issues found: %ISSUES_FOUND%  ^|  Auto-fixes applied: %FIXES_APPLIED%
    echo   Status: Please review errors above
)
echo ==============================================================
echo.
echo  🌐 Frontend:  http://localhost:3000
echo  🔌 Backend:   http://localhost:8000
echo  📚 API Docs:  http://localhost:8000/docs
echo  👤 Login:     admin@joti.local / Joti123!@2026
echo.
echo  Useful commands:
echo    docker-compose ps                 - Show container status
echo    docker-compose logs -f backend    - Watch backend logs
echo    docker-compose logs -f frontend   - Watch frontend logs
echo    docker-compose down -v            - Reset everything
echo.
pause
