@echo off
setlocal enabledelayedexpansion
REM ==================================================================
REM  MOVE-PROJECT - Move Joti from OneDrive to C:\Projects for speed
REM  This script: stops Docker, copies project, rebuilds, starts
REM ==================================================================

set SRC=C:\Users\tarun\OneDrive\Master\Tarun\Documents\Pulser\Parshu
set DST=C:\Projects\Joti

echo.
echo ==============================================================
echo  JOTI - Moving project to %DST%
echo ==============================================================
echo.

REM ─── Step 1: Stop Docker containers ────────────────────────────
echo [1/5] Stopping Docker containers...
cd /d "%SRC%"
docker-compose down >nul 2>&1
echo   Done.

REM ─── Step 2: Create target directory ───────────────────────────
echo [2/5] Creating %DST%...
if not exist "C:\Projects" mkdir "C:\Projects"
if exist "%DST%" (
    echo   WARNING: %DST% already exists.
    echo   Press any key to OVERWRITE or Ctrl+C to cancel.
    pause >nul
)

REM ─── Step 3: Fast copy with robocopy ───────────────────────────
echo [3/5] Copying project (excluding node_modules, build, caches)...
echo   This takes ~30 seconds...

robocopy "%SRC%" "%DST%" /MIR /MT:16 /NFL /NDL /NJH /NJS /NC /NS ^
    /XD node_modules build dist .next __pycache__ .pytest_cache .mypy_cache ^
        "%SRC%\frontend\node_modules" ^
        "%SRC%\backend\__pycache__" ^
        "%SRC%\.git\objects\pack" ^
    /XF *.pyc *.pyo orion_dev.db-journal ^
    /R:1 /W:1

if errorlevel 8 (
    echo   ERROR: Copy failed. Check permissions.
    pause
    exit /b 1
)
echo   Copy complete.

REM ─── Step 4: Rebuild from new location ─────────────────────────
echo [4/5] Rebuilding Docker containers from %DST%...
cd /d "%DST%"
docker-compose up -d --build --force-recreate 2>&1

REM ─── Step 5: Verify ────────────────────────────────────────────
echo [5/5] Waiting for services to start...
timeout /t 15 /nobreak >nul

curl -sf http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo   Backend: STARTING (may need more time)
) else (
    echo   Backend: HEALTHY
)

curl -sf http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo   Frontend: STARTING (may need more time)
) else (
    echo   Frontend: UP
)

echo.
echo ==============================================================
echo  DONE! Project moved to: %DST%
echo ==============================================================
echo.
echo  Next steps:
echo  1. Open VS Code: code "%DST%"
echo  2. cd %DST%
echo  3. Frontend: http://localhost:3000
echo  4. Backend:  http://localhost:8000
echo.
echo  The OneDrive copy is still at:
echo  %SRC%
echo  You can delete it after verifying everything works.
echo.
pause
