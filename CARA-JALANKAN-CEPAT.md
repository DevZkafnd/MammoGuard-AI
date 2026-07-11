# 🚀 CARA JALANKAN MAMMOGUARD-AI (CEPAT!)

## ✅ Update Terbaru Sudah di Push ke Git!

Semua update sudah berhasil di-push ke branch `main`:

### 📝 Apa yang Sudah Diupdate?

1. **✅ Dropdown Koreksi AI** - Sudah fix! Hanya 2 pilihan: **Benign** dan **Malignant**
2. **✅ Sidebar Menu** - Sudah dibersihkan:
   - **Dokter**: Beranda, Riwayat Pasien, Logout
   - **Admin**: Manajemen Akun, Manajemen Model AI, Logout
3. **✅ Integrasi Real Data** - Backend sudah terintegrasi penuh dengan Frontend
4. **✅ Upload Model .pth** - Sudah bisa upload model PyTorch di halaman admin
5. **✅ AI Model Management** - Switch model dengan mekanisme unload/load sesuai instruksi
6. **✅ Cleanup Docker Script** - Script baru untuk hapus cache Docker

---

## 🎯 LANGKAH JALANKAN (3 STEP SAJA!)

### STEP 1: Buka Docker Desktop & Tunggu Ready

1. **Buka Docker Desktop** dari Start Menu
2. **Tunggu** sampai muncul status: **"Docker Desktop is running"**
3. **Tunggu lagi 30 detik** (biar Docker API benar-benar siap)

### STEP 2: (OPSIONAL) Clean Cache Docker Jika Memori Penuh

Jika memori Anda penuh atau ingin clean cache sebelum jalankan:

```powershell
# Right-click pada file ini → Run with PowerShell
CLEANUP-CACHE-DOCKER.ps1
```

Script ini akan:
- ✅ Hapus build cache Docker (yang bikin penuh!)
- ✅ Hapus dangling images
- ✅ Hapus unused volumes
- ✅ TIDAK menghapus images yang sudah di-build
- ✅ Build berikutnya akan lebih cepat karena pakai cached layers

### STEP 3: Jalankan Aplikasi

**Cara Termudah:**
```bat
# Double-click file ini
JALANKAN-SEKARANG.bat
```

**Atau:**
```powershell
# Right-click → Run with PowerShell
CLEANUP-DAN-START.ps1
```

**Atau Manual:**
```powershell
# Jalankan di PowerShell
cd d:\projekan\MammoGuard-AI
docker-compose up -d
```

### STEP 4: Buka Browser

Tunggu ~30 detik, lalu buka:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 🔐 Login Demo

### Akun Dokter:
- Username: `dr.sarah`
- Password: `dokter123`

### Akun Admin:
- Username: `admin.it`
- Password: `admin123`

---

## ✨ Fitur yang Sudah Ready

### 1. Dokter Dashboard
- ✅ Upload gambar mammogram (drag & drop atau pilih file)
- ✅ AI Analysis real-time (pakai model .pth yang aktif)
- ✅ Hasil prediksi: **Benign** atau **Malignant**
- ✅ Confidence score dari AI
- ✅ **Dropdown Koreksi AI**: Benign / Malignant (jika dokter koreksi)
- ✅ Kategori BI-RADS dropdown
- ✅ Validasi & simpan ke riwayat
- ✅ Grad-CAM heatmap visualization (mockup UI)

### 2. Riwayat Pasien
- ✅ List semua analisis yang pernah dilakukan
- ✅ Pagination support
- ✅ Detail per analisis

### 3. Admin - Manajemen Model AI
- ✅ Upload model .pth (PyTorch)
- ✅ List semua model yang tersedia
- ✅ Switch/Activate model dengan mekanisme:
  - **Unload** model lama dari memori
  - **Download** model baru dari R2 (atau local)
  - **Load** model baru ke memori
  - ⚠️ **HANYA 1 MODEL** yang ada di memori pada satu waktu!
- ✅ Delete model (tidak bisa delete model yang sedang aktif)
- ✅ Info model: nama, arsitektur, akurasi, ukuran

### 4. Admin - Manajemen Akun
- ✅ CRUD user accounts (mockup UI ready)

---

## 🎮 Cara Pakai Fitur Real AI Model

### 1. Upload Model .pth

1. Login sebagai **Admin IT**
2. Pilih menu **Manajemen Model AI**
3. Klik **Upload Model Baru**
4. Isi form:
   - **Model ID**: Contoh: `resnet50_v1`
   - **Arsitektur**: Contoh: `ResNet50`
   - **Nama Tampilan**: Contoh: `ResNet50 - Mammo v1`
   - **Akurasi**: Contoh: `92.5`
   - **File .pth**: Pilih file model PyTorch Anda
   - **Catatan**: (opsional) Deskripsi model
5. Klik **Upload**

### 2. Aktivasi Model

1. Di list model, klik **Activate** pada model yang ingin digunakan
2. Sistem akan:
   - Unload model lama (jika ada)
   - Download model dari R2 ke temp storage (jika pakai R2)
   - Load model baru ke memori
3. Model siap dipakai!

### 3. Analisis Citra dengan AI Model

1. Login sebagai **Dokter**
2. Di **Beranda**, upload gambar mammogram
3. Sistem akan:
   - Upload gambar ke backend
   - Preprocessing citra
   - Running AI inference dengan **model yang aktif**
   - Return hasil: Benign/Malignant + confidence score
4. Hasil muncul di workspace
5. Dokter bisa **koreksi hasil AI** jika perlu via dropdown
6. Klik **Validasi & Simpan** untuk simpan ke riwayat

---

## 🐳 Docker Status Check

Cek apakah semua container running:

```powershell
docker ps
```

Harus muncul 3 containers:
- ✅ `mammoguard_mongodb` (port 27017)
- ✅ `mammoguard_backend` (port 8000)
- ✅ `mammoguard_frontend` (port 3000)

Test backend:
```powershell
curl http://localhost:8000/kesehatan
```

Response:
```json
{"status":"sehat","layanan":"aktif"}
```

---

## 🛠️ Troubleshooting

### Docker Desktop Tidak Running?

1. Quit Docker Desktop (klik kanan icon → Quit)
2. Tunggu 15 detik
3. Buka lagi Docker Desktop
4. Tunggu status "running" + 30 detik lagi

### Container Conflict?

```powershell
# Stop semua
docker-compose down

# Clean cache
.\CLEANUP-CACHE-DOCKER.ps1

# Start lagi
docker-compose up -d
```

### Memori Penuh?

1. Jalankan **CLEANUP-CACHE-DOCKER.ps1**
2. Atau manual:
   ```powershell
   docker builder prune -af
   docker system prune -f
   ```

### AI Model Tidak Muncul di Dropdown?

Pastikan sudah:
1. Upload model .pth di halaman Admin
2. Klik **Activate** pada model tersebut
3. Refresh halaman dokter

### Hasil AI Selalu "Unknown" atau Error?

Cek:
1. Apakah ada model yang aktif? (di halaman Admin → Manajemen Model AI)
2. Apakah file .pth valid? (coba upload ulang)
3. Cek logs backend: `docker logs mammoguard_backend`

---

## 📚 File Dokumentasi Lengkap

- `!!! MULAI DISINI !!!.txt` - Panduan quick start
- `BACA-INI-PENTING.txt` - Troubleshooting lengkap
- `CARA-PENGGUNAAN.md` - Panduan detail semua fitur
- `CLEANUP-CACHE-DOCKER.ps1` - Script cleanup cache
- `VERIFIKASI-FINAL.md` - Checklist integrasi
- `SETUP-R2-CLOUDFLARE.md` - Setup Cloudflare R2 (opsional)

---

## ✅ Status Integrasi

| Komponen | Status |
|----------|--------|
| Backend API | ✅ Ready |
| Frontend UI | ✅ Ready |
| MongoDB | ✅ Ready |
| R2 Storage | ✅ Ready (opsional) |
| AI Model Management | ✅ Ready |
| Upload Model .pth | ✅ Ready |
| Real AI Inference | ✅ Ready |
| Dropdown Koreksi AI | ✅ Fixed (Benign/Malignant) |
| Sidebar Menu | ✅ Fixed (clean) |
| Docker Compose | ✅ Ready |
| Cache Cleanup Script | ✅ Ready |

---

## 🎉 SEMUA SUDAH SIAP!

**TIDAK PERLU BUILD LAGI!** 

Images Docker sudah pernah di-build sebelumnya dan masih tersimpan. Tinggal jalankan:

```powershell
docker-compose up -d
```

Jika memori penuh, clean cache dulu dengan `CLEANUP-CACHE-DOCKER.ps1`, lalu jalankan lagi.

---

**Happy Coding! 🚀**
