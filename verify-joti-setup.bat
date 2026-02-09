@echo off
REM JOTI Setup Verification Script for Windows

setlocal enabledelayedexpansion

echo.
echo ====================================================
echo   JOTI Docker Setup Verification Script
echo ====================================================
echo.

set check_count=0
set pass_count=0

REM Helper function
set "GREEN=[OK]"
set "RED=[FAIL]"
set "WARN=[WARN]"

REM 1. Check .env exists
set /a check_count+=1
echo [!check_count!] Checking: .env file exists...
if exist .env (
    echo %GREEN%
    set /a pass_count+=1
) else (
    echo %RED% .env file not found
    exit /b 1
)

REM 2. Check JOTI branding
set /a check_count+=1
echo [!check_count!] Checking: JOTI branding in .env...
findstr /M "huntsphere HuntSphere" .env >nul 2>&1
if errorlevel 1 (
    findstr /M "joti JOTI" .env >nul 2>&1
    if not errorlevel 1 (
        echo %GREEN%
        set /a pass_count+=1
    ) else (
        echo %RED% JOTI references not found
    )
) else (
    echo %RED% Old HuntSphere references found
    exit /b 1
)

REM 3. Check POSTGRES_USER
set /a check_count+=1
echo [!check_count!] Checking: POSTGRES_USER configured...
findstr /C:"POSTGRES_USER=joti_user" .env >nul 2>&1
if not errorlevel 1 (
    echo %GREEN%
    set /a pass_count+=1
) else (
    echo %RED% POSTGRES_USER not set to joti_user
)

REM 4. Check ADMIN_EMAIL
set /a check_count+=1
echo [!check_count!] Checking: ADMIN_EMAIL configured...
findstr /C:"ADMIN_EMAIL=admin@joti.local" .env >nul 2>&1
if not errorlevel 1 (
    echo %GREEN%
    set /a pass_count+=1
) else (
    echo %RED% ADMIN_EMAIL not set correctly
)

REM 5. Check docker-compose files
set /a check_count+=1
echo [!check_count!] Checking: docker-compose.yml exists...
if exist docker-compose.yml (
    echo %GREEN%
    set /a pass_count+=1
) else (
    echo %RED% docker-compose.yml not found
)

set /a check_count+=1
echo [!check_count!] Checking: docker-compose.dev.yml exists...
if exist docker-compose.dev.yml (
    echo %GREEN%
    set /a pass_count+=1
) else (
    echo %RED% docker-compose.dev.yml not found
)

REM 6. Check Dockerfiles
set /a check_count+=1
echo [!check_count!] Checking: Backend Dockerfile exists...
if exist infra\Dockerfile.backend (
    echo %GREEN%
    set /a pass_count+=1
) else (
    echo %RED% Backend Dockerfile not found
)

set /a check_count+=1
echo [!check_count!] Checking: Frontend Dockerfile exists...
if exist infra\Dockerfile.frontend (
    echo %GREEN%
    set /a pass_count+=1
) else (
    echo %RED% Frontend Dockerfile not found
)

REM 7. Check old files removed
set /a check_count+=1
echo [!check_count!] Checking: Parshu.code-workspace removed...
if not exist "Parshu.code-workspace" (
    echo %GREEN%
    set /a pass_count+=1
) else (
    echo %RED% Parshu.code-workspace still exists
)

REM 8. Check documentation
set /a check_count+=1
echo [!check_count!] Checking: DOCKER-SETUP.md exists...
if exist DOCKER-SETUP.md (
    echo %GREEN%
    set /a pass_count+=1
) else (
    echo %RED% DOCKER-SETUP.md not found
)

set /a check_count+=1
echo [!check_count!] Checking: Startup scripts exist...
if exist JOTI-DOCKER-START.bat (
    echo %GREEN%
    set /a pass_count+=1
) else (
    echo %RED% Startup script not found
)

REM 9. Check Docker installed
set /a check_count+=1
echo [!check_count!] Checking: Docker is installed...
docker --version >nul 2>&1
if not errorlevel 1 (
    echo %GREEN%
    set /a pass_count+=1
) else (
    echo %RED% Docker is not installed
)

set /a check_count+=1
echo [!check_count!] Checking: Docker Compose is installed...
docker-compose --version >nul 2>&1
if not errorlevel 1 (
    echo %GREEN%
    set /a pass_count+=1
) else (
    echo %RED% Docker Compose is not installed
)

echo.
echo ====================================================
echo   VERIFICATION RESULTS
echo ====================================================
echo.
echo Total Checks: !check_count!
echo Passed: !pass_count!
set /a failed=check_count-pass_count
echo Failed: !failed!
echo.

if !pass_count! equ !check_count! (
    echo [OK] ALL CHECKS PASSED!
    echo.
    echo JOTI is ready to deploy. Start with:
    echo.
    echo   JOTI-DOCKER-START.bat
    echo.
    echo or
    echo.
    echo   docker-compose -f docker-compose.dev.yml up -d
    echo.
    echo Then open: http://localhost:3000
    echo.
    pause
    exit /b 0
) else (
    echo [FAIL] SOME CHECKS FAILED
    echo.
    echo Please fix the issues above and run this script again.
    echo.
    pause
    exit /b 1
)
