# Script untuk memulai MammoGuard-AI dengan Docker

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   MammoGuard-AI - Docker Startup Script" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Cek apakah Docker Desktop sedang berjalan
Write-Host "[1/5] Memeriksa Docker Desktop..." -ForegroundColor Yellow
$dockerRunning = $false
try {
    docker ps | Out-Null
    $dockerRunning = $true
    Write-Host "✓ Docker Desktop sudah berjalan" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker Desktop belum berjalan" -ForegroundColor Red
    Write-Host ""
    Write-Host "Memulai Docker Desktop..." -ForegroundColor Yellow
    
    # Path default Docker Desktop
    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    if (Test-Path $dockerPath) {
        Start-Process $dockerPath
        Write-Host "Menunggu Docker Desktop siap..."
        
        # Tunggu hingga Docker siap (maksimal 60 detik)
        $timeout = 60
        $elapsed = 0
        
        while (-not $dockerRunning -and $elapsed -lt $timeout) {
            Start-Sleep -Seconds 2
            $elapsed += 2
            
            try {
                docker ps | Out-Null
                $dockerRunning = $true
                Write-Host "✓ Docker Desktop siap!" -ForegroundColor Green
            } catch {
                Write-Host "." -NoNewline
            }
        }
        
        if (-not $dockerRunning) {
            Write-Host ""
            Write-Host "✗ Timeout: Docker Desktop tidak siap dalam 60 detik" -ForegroundColor Red
            Write-Host "Silakan buka Docker Desktop secara manual dan jalankan script ini lagi" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "✗ Docker Desktop tidak ditemukan di: $dockerPath" -ForegroundColor Red
        Write-Host "Silakan buka Docker Desktop secara manual dan jalankan script ini lagi" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "[2/5] Memeriksa file konfigurasi..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    Write-Host "⚠ File .env tidak ditemukan, membuat dari template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ File .env telah dibuat" -ForegroundColor Green
} else {
    Write-Host "✓ File .env ditemukan" -ForegroundColor Green
}

if (-not (Test-Path "frontend\.env.local")) {
    Write-Host "⚠ File frontend\.env.local tidak ditemukan, membuat dari template..." -ForegroundColor Yellow
    Copy-Item "frontend\.env.local.example" "frontend\.env.local"
    Write-Host "✓ File frontend\.env.local telah dibuat" -ForegroundColor Green
} else {
    Write-Host "✓ File frontend\.env.local ditemukan" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/5] Membersihkan containers lama (jika ada)..." -ForegroundColor Yellow
docker-compose down 2>$null
Write-Host "✓ Cleanup selesai" -ForegroundColor Green

Write-Host ""
Write-Host "[4/5] Building Docker images..." -ForegroundColor Yellow
Write-Host "Ini mungkin memakan waktu beberapa menit untuk pertama kali..." -ForegroundColor Cyan
docker-compose build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "✗ Build gagal!" -ForegroundColor Red
    Write-Host "Cek error di atas untuk detail" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Build selesai" -ForegroundColor Green

Write-Host ""
Write-Host "[5/5] Menjalankan containers..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "✗ Gagal menjalankan containers!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Containers berhasil dijalankan" -ForegroundColor Green

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   MammoGuard-AI Berhasil Dijalankan!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Akses aplikasi di:" -ForegroundColor Cyan
Write-Host "  • Frontend (Next.js):  http://localhost:3000" -ForegroundColor White
Write-Host "  • Backend API:         http://localhost:8000" -ForegroundColor White
Write-Host "  • API Docs:            http://localhost:8000/docs" -ForegroundColor White
Write-Host "  • MongoDB:             localhost:27017" -ForegroundColor White
Write-Host ""
Write-Host "Perintah berguna:" -ForegroundColor Cyan
Write-Host "  • Lihat logs:          docker-compose logs -f" -ForegroundColor White
Write-Host "  • Stop containers:     docker-compose down" -ForegroundColor White
Write-Host "  • Restart:             docker-compose restart" -ForegroundColor White
Write-Host ""
Write-Host "Tunggu beberapa detik untuk inisialisasi..." -ForegroundColor Yellow
Write-Host ""

# Tunggu services siap
Start-Sleep -Seconds 5

# Cek status containers
Write-Host "Status containers:" -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "Tekan Ctrl+C untuk melihat logs, atau tutup window ini" -ForegroundColor Yellow
Write-Host ""

# Tampilkan logs
docker-compose logs -f
