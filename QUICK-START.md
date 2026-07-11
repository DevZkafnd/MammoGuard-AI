# 🚀 Quick Start Guide - MammoGuard-AI

Panduan cepat untuk menjalankan MammoGuard-AI. Pilih metode yang sesuai dengan kebutuhan Anda.

## ⚡ Metode 1: Docker (Rekomendasi untuk Production)

### Prerequisites
- Docker Desktop terinstall dan berjalan
- Port 3000, 8000, dan 27017 tersedia
- Minimal 4GB RAM
- Koneksi internet stabil (untuk download images pertama kali)

### Step-by-Step

1. **Buka Terminal di folder proyek:**
   ```powershell
   cd d:\projekan\MammoGuard-AI
   ```

2. **Pastikan Docker Desktop berjalan:**
   - Buka Docker Desktop dari Start Menu
   - Tunggu hingga status "Docker Desktop is running"
   - Verify: `docker ps` (harus tidak ada error)

3. **Jalankan dengan script:**
   ```powershell
   .\start-docker.bat
   ```
   
   Atau manual:
   ```powershell
   docker-compose up --build
   ```

4. **Tunggu proses build (pertama kali ~10-15 menit):**
   - MongoDB pull image
   - Backend build (install PyTorch ~2GB)
   - Frontend build (install dependencies + build Next.js)

5. **Akses aplikasi:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Troubleshooting Docker

**Error: "Error reading from server: EOF"**
- Restart Docker Desktop
- Run: `docker system prune -f`
- Try build again

**Error: "I/O error downloading CUDA"**
- Koneksi internet terputus saat download
- Restart build: `docker-compose down && docker-compose up --build`
- Atau gunakan Metode 2 (Development Manual)

**Error: "Port already in use"**
- Cek aplikasi yang menggunakan port 3000/8000
- Atau edit `docker-compose.yml` untuk gunakan port lain

---

## 🔧 Metode 2: Development Manual (Rekomendasi untuk Development)

Metode ini lebih cepat dan mudah di-debug untuk development.

### Prerequisites
- Python 3.11+ terinstall
- Node.js 20+ terinstall
- MongoDB terinstall atau gunakan MongoDB di Docker saja

### Step 1: Setup MongoDB (dengan Docker)

```powershell
docker run -d \
  --name mammoguard_mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin_medis \
  -e MONGO_INITDB_ROOT_PASSWORD=password_lokal_123 \
  -e MONGO_INITDB_DATABASE=mammoguard_db \
  mongo:7.0
```

Verify MongoDB running:
```powershell
docker ps | findstr mongodb
```

### Step 2: Setup Backend (FastAPI)

1. **Buka terminal baru, masuk ke folder backend:**
   ```powershell
   cd d:\projekan\MammoGuard-AI\backend
   ```

2. **Buat virtual environment:**
   ```powershell
   python -m venv venv
   venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```
   
   **Note:** Ini akan download PyTorch (~2GB). Jika lambat atau error, gunakan CPU-only version:
   ```powershell
   pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
   ```

4. **Update .env file:**
   ```env
   MONGODB_URL=mongodb://admin_medis:password_lokal_123@localhost:27017
   NAMA_DATABASE=mammoguard_db
   JALUR_MODEL=./storage/models/ResNetDemo_1782708575_9063396e.pth
   HOST=0.0.0.0
   PORT=8000
   ```

5. **Jalankan backend:**
   ```powershell
   uvicorn app.main:aplikasi --reload --host 0.0.0.0 --port 8000
   ```

6. **Verify backend berjalan:**
   Buka browser: http://localhost:8000
   Should see: `{"pesan": "Selamat datang di MammoGuard-AI API", ...}`

### Step 3: Setup Frontend (Next.js)

1. **Buka terminal baru, masuk ke folder frontend:**
   ```powershell
   cd d:\projekan\MammoGuard-AI\frontend
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Update .env.local:**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. **Jalankan frontend:**
   ```powershell
   npm run dev
   ```

5. **Akses aplikasi:**
   Buka browser: http://localhost:3000

### Step 4: Test Upload Citra

1. Buka http://localhost:3000
2. Navigate ke form upload atau beranda dokter
3. Upload file citra mammogram (.png, .jpg)
4. Lihat hasil analisis

---

## 📊 Verifikasi Setup Berhasil

### Check Backend Health
```powershell
curl http://localhost:8000/kesehatan
```

Expected output:
```json
{
  "status": "sehat",
  "layanan": "aktif"
}
```

### Check MongoDB Connection
```powershell
docker exec -it mammoguard_mongodb mongosh -u admin_medis -p password_lokal_123
```

Then in MongoDB shell:
```javascript
show dbs
use mammoguard_db
show collections
```

### Check Frontend
- Open: http://localhost:3000
- Should see login page or dashboard
- No console errors in browser (F12)

### Test Upload API
```powershell
curl -X POST "http://localhost:8000/analisis/unggah" \
  -H "Content-Type: multipart/form-data" \
  -F "berkas=@path/to/test/image.png"
```

---

## 🎯 Metode 3: Hybrid (MongoDB Docker + Manual Backend/Frontend)

Gunakan metode ini jika:
- Docker Desktop terlalu lambat atau error
- Ingin development dengan hot-reload
- Lebih familiar dengan Python/Node development

### Setup:
1. Jalankan hanya MongoDB dengan Docker:
   ```powershell
   docker-compose up mongodb
   ```

2. Ikuti Step 2 dan 3 dari "Metode 2: Development Manual"

---

## 🔐 Konfigurasi R2 Cloudflare (Optional)

Jika ingin menggunakan R2 Storage untuk menyimpan citra:

1. **Dapatkan credentials dari Cloudflare:**
   - Login ke Cloudflare Dashboard
   - Go to R2 Object Storage
   - Create API Token
   - Copy Account ID, Access Key, Secret Key

2. **Update .env file:**
   ```env
   R2_ACCOUNT_ID=your_account_id
   R2_ACCESS_KEY_ID=your_access_key
   R2_SECRET_ACCESS_KEY=your_secret_key
   R2_BUCKET_NAME=mammoguard-storage
   R2_ENDPOINT_URL=https://your_account.r2.cloudflarestorage.com
   R2_PUBLIC_URL=https://your-cdn-domain.com
   ```

3. **Restart backend**

**Note:** Jika tidak dikonfigurasi, sistem akan otomatis fallback ke storage lokal.

---

## 🐛 Common Issues

### Python ModuleNotFoundError
```powershell
# Make sure venv is activated
venv\Scripts\activate

# Reinstall requirements
pip install -r requirements.txt
```

### npm ERR! peer dependencies
```powershell
# Use force install
npm install --force

# Or delete and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### MongoDB connection refused
```powershell
# Check MongoDB running
docker ps

# Check credentials match in .env
MONGODB_URL=mongodb://admin_medis:password_lokal_123@localhost:27017
```

### Port already in use
```powershell
# Find process using port
netstat -ano | findstr :8000
netstat -ano | findstr :3000

# Kill process by PID
taskkill /PID <PID> /F
```

###  Model file not found
- Pastikan file model ada di: `backend/storage/models/ResNetDemo_1782708575_9063396e.pth`
- Update JALUR_MODEL di .env jika lokasi berbeda

---

## 📚 Next Steps

Setelah setup berhasil:

1. **Baca dokumentasi lengkap:**
   - `README-DOCKER.md` - Full Docker guide
   - `CARA-PENGGUNAAN.md` - User guide
   - `RINGKASAN-SETUP.md` - Setup summary

2. **Test semua fitur:**
   - Upload citra mammogram
   - Lihat riwayat analisis
   - Test dengan berbagai format file

3. **Development:**
   - Customize model AI
   - Enhance frontend UI
   - Add new features

4. **Production:**
   - Setup HTTPS dengan SSL
   - Configure proper authentication
   - Use production-grade database
   - Deploy to cloud

---

## 🎉 Selamat!

Jika semua step di atas berhasil, aplikasi MammoGuard-AI sudah berjalan!

**Akses:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Support:**
Jika ada masalah, check logs:
```powershell
# Docker logs
docker-compose logs -f

# Backend logs (manual)
# Check terminal where uvicorn is running

# Frontend logs (manual)
# Check terminal where npm run dev is running
```

---

**Pilih metode yang paling cocok untuk Anda dan happy coding! 🚀**
