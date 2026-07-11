@echo off
color 0B
echo ========================================
echo    MammoGuard-AI - Safe Start
echo ========================================
echo.

echo [0/6] Checking Docker Desktop...
docker version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo.
    echo ERROR: Docker Desktop is not running!
    echo.
    echo Please do this FIRST:
    echo 1. Open Docker Desktop from Start Menu
    echo 2. Wait until it says "Docker Desktop is running"
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)
echo OK: Docker Desktop is running
timeout /t 2 >nul

echo.
echo [1/6] Force stopping containers...
docker stop mammoguard_mongodb mammoguard_backend mammoguard_frontend >nul 2>&1
echo OK: Containers stopped
timeout /t 2 >nul

echo.
echo [2/6] Force removing containers...
docker rm -f mammoguard_mongodb mammoguard_backend mammoguard_frontend >nul 2>&1
echo OK: Containers removed
timeout /t 2 >nul

echo.
echo [3/6] Docker compose down...
docker-compose down >nul 2>&1
echo OK: Compose down completed
timeout /t 2 >nul

echo.
echo [4/6] Cleaning dangling containers...
for /f "delims=" %%i in ('docker ps -aq --filter "name=mammoguard" 2^>nul') do docker rm -f %%i >nul 2>&1
echo OK: Cleanup completed
timeout /t 2 >nul

echo.
echo [5/6] Starting all services...
echo This may take a moment...
docker-compose up -d
if errorlevel 1 (
    echo.
    echo WARNING: Some errors during startup
    echo Waiting and checking status...
    timeout /t 5 >nul
)
echo OK: Services started
timeout /t 10 >nul

echo.
echo [6/6] Verifying services...
docker-compose ps

echo.
echo ========================================
echo    Service Verification
echo ========================================
docker inspect -f "{{.State.Running}}" mammoguard_mongodb >nul 2>&1
if errorlevel 1 (
    echo MongoDB: Not running yet
) else (
    echo MongoDB: OK
)

docker inspect -f "{{.State.Running}}" mammoguard_backend >nul 2>&1
if errorlevel 1 (
    echo Backend: Not running yet
) else (
    echo Backend: OK
)

docker inspect -f "{{.State.Running}}" mammoguard_frontend >nul 2>&1
if errorlevel 1 (
    echo Frontend: Not running yet
) else (
    echo Frontend: OK
)

echo.
echo ========================================
echo    SUCCESS! Access:
echo ========================================
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo ========================================
echo.
echo Opening browser...
timeout /t 3 >nul
start http://localhost:3000

echo.
pause
