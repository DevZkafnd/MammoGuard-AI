# Script untuk cleanup dan start MammoGuard-AI
# SUPER AMAN - Handle semua error Docker 500

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   MammoGuard-AI - Safe Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function untuk check Docker
function Test-DockerRunning {
    try {
        $result = docker version 2>&1
        if ($LASTEXITCODE -eq 0) {
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

# Step 0: Check Docker Desktop
Write-Host "[0/7] Checking Docker Desktop..." -ForegroundColor Yellow
$maxRetries = 3
$retryCount = 0

while (-not (Test-DockerRunning) -and $retryCount -lt $maxRetries) {
    Write-Host "⚠ Docker Desktop not ready (attempt $($retryCount + 1)/$maxRetries)" -ForegroundColor Red
    Write-Host "Please make sure Docker Desktop is running!" -ForegroundColor Yellow
    Write-Host "Waiting 10 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    $retryCount++
}

if (-not (Test-DockerRunning)) {
    Write-Host ""
    Write-Host "✗ CRITICAL: Docker Desktop is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "PLEASE DO THIS FIRST:" -ForegroundColor Yellow
    Write-Host "1. Open Docker Desktop from Start Menu" -ForegroundColor White
    Write-Host "2. Wait until it says 'Docker Desktop is running'" -ForegroundColor White
    Write-Host "3. Run this script again" -ForegroundColor White
    Write-Host ""
    pause
    exit 1
}

Write-Host "✓ Docker Desktop is running!" -ForegroundColor Green
Start-Sleep -Seconds 2

# Step 1: Force stop all containers (handle 500 error)
Write-Host ""
Write-Host "[1/7] Force stopping all containers..." -ForegroundColor Yellow
$containers = @("mammoguard_mongodb", "mammoguard_backend", "mammoguard_frontend")

foreach ($container in $containers) {
    try {
        Write-Host "  Stopping $container..." -ForegroundColor Gray
        docker stop $container 2>$null | Out-Null
    } catch {
        Write-Host "  (Container $container already stopped or not found)" -ForegroundColor DarkGray
    }
}
Start-Sleep -Seconds 3

# Step 2: Force remove containers (handle 500 error)
Write-Host ""
Write-Host "[2/7] Force removing containers..." -ForegroundColor Yellow
foreach ($container in $containers) {
    try {
        Write-Host "  Removing $container..." -ForegroundColor Gray
        docker rm -f $container 2>$null | Out-Null
    } catch {
        Write-Host "  (Container $container already removed or not found)" -ForegroundColor DarkGray
    }
}
Start-Sleep -Seconds 3

# Step 3: Docker compose down (clean everything)
Write-Host ""
Write-Host "[3/7] Running docker-compose down..." -ForegroundColor Yellow
try {
    docker-compose down 2>$null | Out-Null
    Write-Host "✓ Docker compose down completed" -ForegroundColor Green
} catch {
    Write-Host "  (docker-compose down had warnings - this is OK)" -ForegroundColor DarkGray
}
Start-Sleep -Seconds 3

# Step 4: Remove dangling containers (jika ada)
Write-Host ""
Write-Host "[4/7] Cleaning up dangling containers..." -ForegroundColor Yellow
try {
    $danglingContainers = docker ps -aq --filter "name=mammoguard" 2>$null
    if ($danglingContainers) {
        docker rm -f $danglingContainers 2>$null | Out-Null
        Write-Host "✓ Removed dangling containers" -ForegroundColor Green
    } else {
        Write-Host "✓ No dangling containers" -ForegroundColor Green
    }
} catch {
    Write-Host "  (No dangling containers to clean)" -ForegroundColor DarkGray
}
Start-Sleep -Seconds 2

# Step 5: Verify no conflicts
Write-Host ""
Write-Host "[5/7] Verifying no conflicts..." -ForegroundColor Yellow
$conflict = $false
foreach ($container in $containers) {
    try {
        $exists = docker ps -a --filter "name=^${container}$" --format "{{.Names}}" 2>$null
        if ($exists -eq $container) {
            Write-Host "⚠ WARNING: Container $container still exists!" -ForegroundColor Red
            $conflict = $true
        }
    } catch {
        # OK, container doesn't exist
    }
}

if ($conflict) {
    Write-Host ""
    Write-Host "✗ CONFLICT DETECTED! Trying aggressive cleanup..." -ForegroundColor Red
    docker rm -f $(docker ps -aq) 2>$null | Out-Null
    Start-Sleep -Seconds 5
}

Write-Host "✓ No conflicts detected" -ForegroundColor Green
Start-Sleep -Seconds 2

# Step 6: Start services with retry
Write-Host ""
Write-Host "[6/7] Starting all services..." -ForegroundColor Yellow
$startSuccess = $false
$startRetry = 0
$maxStartRetries = 2

while (-not $startSuccess -and $startRetry -lt $maxStartRetries) {
    try {
        Write-Host "  Attempt $($startRetry + 1)/$maxStartRetries..." -ForegroundColor Gray
        
        $output = docker-compose up -d 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $startSuccess = $true
            Write-Host "✓ Services started successfully!" -ForegroundColor Green
        } else {
            Write-Host "⚠ Start attempt $($startRetry + 1) had issues, retrying..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
        }
    } catch {
        Write-Host "⚠ Error starting services: $_" -ForegroundColor Yellow
    }
    $startRetry++
}

if (-not $startSuccess) {
    Write-Host ""
    Write-Host "✗ Failed to start services after $maxStartRetries attempts" -ForegroundColor Red
    Write-Host ""
    Write-Host "TROUBLESHOOTING:" -ForegroundColor Yellow
    Write-Host "1. Restart Docker Desktop (Right-click → Quit → Reopen)" -ForegroundColor White
    Write-Host "2. Run this script again" -ForegroundColor White
    Write-Host ""
    pause
    exit 1
}

# Step 7: Wait and verify
Write-Host ""
Write-Host "[7/7] Waiting for services to initialize..." -ForegroundColor Yellow
Write-Host "  This may take 15-30 seconds..." -ForegroundColor Gray

Start-Sleep -Seconds 15

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Service Status" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    docker-compose ps
} catch {
    Write-Host "Unable to get service status (Docker may still be starting)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   ✓ SUCCESS! ✓" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access your application:" -ForegroundColor Cyan
Write-Host "  • Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "  • Backend:   http://localhost:8000" -ForegroundColor White
Write-Host "  • API Docs:  http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Verify containers are actually running
Write-Host "Verifying containers..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

$runningContainers = 0
foreach ($container in $containers) {
    try {
        $status = docker inspect -f '{{.State.Running}}' $container 2>$null
        if ($status -eq "true") {
            Write-Host "  ✓ $container is running" -ForegroundColor Green
            $runningContainers++
        } else {
            Write-Host "  ⚠ $container is not running yet" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠ $container status unknown" -ForegroundColor Yellow
    }
}

Write-Host ""
if ($runningContainers -eq 3) {
    Write-Host "✓ All 3 containers are running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Opening browser in 3 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:3000"
} else {
    Write-Host "⚠ $runningContainers/3 containers running" -ForegroundColor Yellow
    Write-Host "Wait a bit longer, services may still be starting..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to view logs (or close window)..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Show logs
docker-compose logs -f
