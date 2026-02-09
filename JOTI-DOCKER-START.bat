@echo off
REM JOTI Docker Startup Script for Windows
REM This script starts JOTI with proper configuration

setlocal enabledelayedexpansion

echo.
echo ============================================
echo   JOTI Docker Environment Startup
echo ============================================
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running. Please start Docker Desktop.
    exit /b 1
)
echo [OK] Docker is running

REM Check if .env exists
if not exist .env (
    echo ERROR: .env file not found
    exit /b 1
)
echo [OK] .env file found

REM Display environment
echo.
echo Environment Configuration:
echo.
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if not "%%a"=="" (
        if not "%%a:~0,1%"=="#" (
            echo   %%a=%%b
        )
    )
)
echo.

REM Stop existing containers
echo.
echo Stopping existing containers...
docker-compose down 2>nul

REM Build and start
echo.
echo Building Docker images...
docker-compose -f docker-compose.dev.yml build --no-cache
if errorlevel 1 (
    echo ERROR: Failed to build Docker images
    exit /b 1
)

echo.
echo Starting services...
docker-compose -f docker-compose.dev.yml up -d
if errorlevel 1 (
    echo ERROR: Failed to start Docker services
    exit /b 1
)

REM Wait for backend
echo.
echo Waiting for backend to be ready...
setlocal enabledelayedexpansion
set "count=0"
:wait_backend
if %count% gtr 30 (
    echo WARNING: Backend took too long. Check logs:
    echo   docker-compose logs -f backend
    goto frontend_wait
)
curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo Attempt %count%/30...
    timeout /t 1 /nobreak >nul
    set /a count=count+1
    goto wait_backend
)
echo [OK] Backend is ready!

REM Wait for frontend
:frontend_wait
echo.
echo Waiting for frontend to be ready...
timeout /t 5 /nobreak >nul
set "count=0"
:wait_frontend
if %count% gtr 30 (
    echo WARNING: Frontend took too long. Starting anyway.
    goto startup_complete
)
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    set /a count=count+1
    goto wait_frontend
)
echo [OK] Frontend is ready!

:startup_complete
echo.
echo ============================================
echo   JOTI is Ready!
echo ============================================
echo.
echo Web Access: http://localhost:3000
echo API Server: http://localhost:8000
echo API Docs:   http://localhost:8000/docs
echo.
echo Login Credentials:
echo.
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="ADMIN_EMAIL" echo   Email: %%b
    if "%%a"=="ADMIN_PASSWORD" echo   Password: %%b
)
echo.
echo Useful Commands:
echo   docker-compose logs -f backend    - View backend logs
echo   docker-compose logs -f frontend   - View frontend logs
echo   docker-compose ps                 - Show running containers
echo   docker-compose down                - Stop all services
echo.
pause
