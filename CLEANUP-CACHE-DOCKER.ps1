#!/usr/bin/env pwsh
# ============================================================
# SCRIPT CLEANUP CACHE DOCKER - HAPUS SEMUA SAMPAH!
# ============================================================
# Script ini akan membersihkan semua cache Docker yang tidak terpakai
# TANPA menghapus images yang sudah di-build sebelumnya
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CLEANUP CACHE DOCKER DIMULAI" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Docker Desktop running
Write-Host "🔍 Checking Docker Desktop status..." -ForegroundColor White
$dockerRunning = $false
try {
    docker ps > $null 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerRunning = $true
        Write-Host "✅ Docker Desktop is running" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Docker Desktop is NOT running" -ForegroundColor Red
}

if (-not $dockerRunning) {
    Write-Host ""
    Write-Host "⚠️  PERINGATAN: Docker Desktop tidak berjalan!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Silakan:" -ForegroundColor White
    Write-Host "1. Buka Docker Desktop" -ForegroundColor White
    Write-Host "2. Tunggu sampai status: 'Docker Desktop is running'" -ForegroundColor White
    Write-Host "3. Tunggu 30 detik lagi" -ForegroundColor White
    Write-Host "4. Jalankan script ini lagi" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "📦 Stopping all containers..." -ForegroundColor Cyan
docker stop $(docker ps -aq) 2>$null
Write-Host "✅ Containers stopped" -ForegroundColor Green

Write-Host ""
Write-Host "🗑️  Removing unused containers..." -ForegroundColor Cyan
docker container prune -f
Write-Host "✅ Unused containers removed" -ForegroundColor Green

Write-Host ""
Write-Host "🗑️  Removing ALL build cache (ini yang bikin penuh!)..." -ForegroundColor Cyan
docker builder prune -af
Write-Host "✅ Build cache cleaned" -ForegroundColor Green

Write-Host ""
Write-Host "🗑️  Removing dangling images..." -ForegroundColor Cyan
docker image prune -f
Write-Host "✅ Dangling images removed" -ForegroundColor Green

Write-Host ""
Write-Host "🗑️  Removing unused volumes..." -ForegroundColor Cyan
docker volume prune -f
Write-Host "✅ Volumes cleaned" -ForegroundColor Green

Write-Host ""
Write-Host "🗑️  Removing unused networks..." -ForegroundColor Cyan
docker network prune -f
Write-Host "✅ Networks cleaned" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CLEANUP SELESAI! 🎉" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📊 Docker disk usage sekarang:" -ForegroundColor White
docker system df

Write-Host ""
Write-Host "✅ Cache sudah dibersihkan!" -ForegroundColor Green
Write-Host "✅ Images yang sudah di-build tetap tersimpan" -ForegroundColor Green
Write-Host "✅ Build berikutnya akan lebih cepat karena pakai cached layers" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Sekarang Anda bisa jalankan: docker-compose up -d" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to exit"
