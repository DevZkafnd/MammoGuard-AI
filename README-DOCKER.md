# MammoGuard-AI - Panduan Docker Setup

Panduan lengkap untuk menjalankan MammoGuard-AI menggunakan Docker.

## Prerequisites

- Docker Desktop terinstall dan berjalan
- Port 3000, 8000, dan 27017 tersedia
- Minimal 4GB RAM untuk Docker

## Quick Start

### 1. Clone dan Masuk ke Direktori Proyek

```bash
cd d:\projekan\MammoGuard-AI
```

### 2. Konfigurasi Environment (Opsional)

Jika ingin menggunakan Cloudflare R2 Storage, edit file `.env` di root proyek:

```bash
# Copy dari example
copy .env.example .env
```

Edit `.env` dan isi kredensial R2:
```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=mammoguard-storage
R2_ENDPOINT_URL=https://your_account.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://your-cdn-domain.com
```

**Note:** Jika tidak diisi, sistem akan menggunakan storage lokal secara otomatis.

### 3. Build dan Jalankan dengan Docker Compose

```bash
docker-compose up --build
```

Atau untuk menjalankan di background:

```bash
docker-compose up -d --build
```

### 4. Akses Aplikasi

- **Frontend (Next.js):** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs
- **MongoDB:** localhost:27017

## Perintah Docker yang Berguna

### Melihat Log

```bash
# Semua services
docker-compose logs -f

# Service tertentu
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Stop Services

```bash
docker-compose down
```

### Stop dan Hapus Volumes (Reset Database)

```bash
docker-compose down -v
```

### Restart Service Tertentu

```bash
docker-compose restart backend
docker-compose restart frontend
```

### Masuk ke Container

```bash
# Backend
docker exec -it mammoguard_backend bash

# Frontend
docker exec -it mammoguard_frontend sh

# MongoDB
docker exec -it mammoguard_mongodb mongosh -u admin_medis -p password_lokal_123
```

## Struktur Layanan

### 1. MongoDB (Database)
- **Container:** mammoguard_mongodb
- **Port:** 27017
- **Username:** admin_medis
- **Password:** password_lokal_123
- **Database:** mammoguard_db

### 2. Backend (FastAPI)
- **Container:** mammoguard_backend
- **Port:** 8000
- **Framework:** FastAPI + PyTorch
- **Features:**
  - Upload dan analisis citra mammogram
  - Integrasi R2 Cloudflare (opsional)
  - Storage lokal sebagai fallback
  - AI inference dengan PyTorch

### 3. Frontend (Next.js)
- **Container:** mammoguard_frontend
- **Port:** 3000
- **Framework:** Next.js 16.2.9 + React 19
- **Features:**
  - Login page
  - Dashboard dokter
  - Manajemen model AI
  - Riwayat pasien

## Troubleshooting

### Port Sudah Digunakan

Jika mendapat error "port already in use", edit `docker-compose.yml` dan ubah port mapping:

```yaml
ports:
  - "3001:3000"  # Frontend
  - "8001:8000"  # Backend
  - "27018:27017"  # MongoDB
```

### MongoDB Connection Failed

Tunggu beberapa detik hingga MongoDB selesai inisialisasi. Cek health check:

```bash
docker-compose ps
```

### Backend Error Loading Model

Pastikan file model ada di `backend/storage/models/ResNetDemo_1782708575_9063396e.pth`

### Frontend Build Failed

Hapus folder `.next` dan rebuild:

```bash
docker-compose down
Remove-Item -Recurse -Force frontend\.next
docker-compose up --build
```

## Environment Variables

### Backend (.env)

```env
# Database
MONGODB_URL=mongodb://admin_medis:password_lokal_123@mongodb:27017
NAMA_DATABASE=mammoguard_db

# Model AI
JALUR_MODEL=./storage/models/ResNetDemo_1782708575_9063396e.pth

# Server
HOST=0.0.0.0
PORT=8000

# R2 Storage (opsional)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=mammoguard-storage
R2_ENDPOINT_URL=
R2_PUBLIC_URL=
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API Endpoints

### Health Check
```
GET http://localhost:8000/kesehatan
```

### Upload Citra
```
POST http://localhost:8000/analisis/unggah
Content-Type: multipart/form-data
Body: berkas (file)
```

### Riwayat Analisis
```
GET http://localhost:8000/analisis/riwayat?limit=10
```

## Development Mode

Untuk development dengan hot reload:

1. **Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:aplikasi --reload --host 0.0.0.0 --port 8000
```

2. **Frontend:**
```bash
cd frontend
npm install
npm run dev
```

3. **MongoDB** (tetap gunakan Docker):
```bash
docker-compose up mongodb
```

## Production Deployment

Untuk production, sebaiknya:

1. Ubah password MongoDB di `docker-compose.yml`
2. Gunakan environment variables untuk secrets
3. Setup HTTPS dengan reverse proxy (nginx/traefik)
4. Gunakan volume yang persistent
5. Setup backup otomatis untuk MongoDB

## Support

Jika mengalami masalah, cek:
1. Docker Desktop berjalan
2. Log containers: `docker-compose logs`
3. Status services: `docker-compose ps`
4. Resource Docker (RAM/CPU) mencukupi
