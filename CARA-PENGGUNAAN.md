# 🚀 Cara Penggunaan MammoGuard-AI

Panduan lengkap untuk menggunakan aplikasi MammoGuard-AI setelah setup Docker selesai.

## 📋 Prerequisites

Pastikan semua containers sudah berjalan:
```bash
docker-compose ps
```

Output harus menunjukkan 3 services running:
- mammoguard_mongodb (healthy)
- mammoguard_backend (healthy)
- mammoguard_frontend (running)

## 🌐 Akses Aplikasi

### 1. Buka Frontend
```
http://localhost:3000
```

### 2. Halaman Login
- Anda akan melihat halaman login
- Gunakan demo account atau credentials yang tersedia
- **Note:** Jika belum ada sistem autentikasi, Anda bisa langsung akses dashboard

### 3. Dashboard Dokter
Setelah login, Anda akan masuk ke dashboard dokter dengan menu:
- **Beranda Dokter** - Overview dan statistik
- **Upload Citra** - Untuk analisis mammogram baru
- **Riwayat Pasien** - Melihat hasil analisis sebelumnya
- **Manajemen Model AI** - Konfigurasi model (admin only)
- **User Management** - Manajemen pengguna (admin only)

## 📤 Upload dan Analisis Citra

### Step 1: Navigasi ke Form Upload
- Klik menu "Upload Citra" atau "Beranda Dokter"
- Cari komponen form unggah citra

### Step 2: Pilih File Citra
- Klik tombol "Pilih File Citra"
- Pilih file mammogram dari komputer Anda
- **Format yang didukung:** JPG, JPEG, PNG
- **Ukuran maksimal:** 10MB

### Step 3: Upload dan Tunggu Analisis
- Klik tombol "Analisis Citra"
- Sistem akan:
  1. Upload citra ke server
  2. Simpan ke storage (R2 atau lokal)
  3. Preprocessing citra
  4. Jalankan model AI PyTorch
  5. Ekstrak hasil prediksi
  6. Simpan ke database MongoDB
  7. Tampilkan hasil

### Step 4: Lihat Hasil
Hasil analisis akan menampilkan:
- **Kelas prediksi:** Normal atau Abnormal
- **Confidence score:** Tingkat keyakinan AI (%)
- **Waktu upload:** Timestamp analisis
- **URL citra:** Link ke citra yang diupload

## 📊 Melihat Riwayat Analisis

### Via Frontend:
1. Klik menu "Riwayat Pasien"
2. Lihat daftar semua analisis yang pernah dilakukan
3. Filter atau search hasil tertentu

### Via API (untuk testing):
```bash
curl http://localhost:8000/analisis/riwayat?limit=10
```

Response JSON:
```json
{
  "status": "berhasil",
  "jumlah_data": 3,
  "data": [
    {
      "_id": "...",
      "nama_berkas": "mammogram_sample.png",
      "storage_info": {
        "storage_type": "local",
        "filename": "20260711_a1b2c3d4.png",
        "url": "/storage/images/raw/20260711_a1b2c3d4.png"
      },
      "hasil_analisis": {
        "kelas": "Normal",
        "confidence": "95.23%"
      },
      "waktu_unggah": "2026-07-11T13:45:00"
    }
  ]
}
```

## 🔍 Testing API Secara Manual

### 1. Health Check
```bash
curl http://localhost:8000/kesehatan
```

Expected Response:
```json
{
  "status": "sehat",
  "layanan": "aktif"
}
```

### 2. Upload Citra via cURL
```bash
curl -X POST "http://localhost:8000/analisis/unggah" \
  -H "Content-Type: multipart/form-data" \
  -F "berkas=@path/to/your/mammogram.png"
```

### 3. API Documentation (Swagger)
Buka browser:
```
http://localhost:8000/docs
```

Di sini Anda bisa:
- Lihat semua endpoint
- Test API langsung dari browser
- Lihat request/response schema

## 🗂️ Storage Files

### Lokasi Penyimpanan

#### Jika menggunakan R2 Cloudflare:
- Files akan diupload ke bucket R2
- URL publik akan dikembalikan
- Akses via R2_PUBLIC_URL yang dikonfigurasi

#### Jika menggunakan storage lokal:
- Files tersimpan di: `backend/storage/images/raw/`
- Akses via: `http://localhost:8000/storage/images/raw/[filename]`

### Struktur Storage
```
backend/storage/
├── images/
│   ├── raw/          # Citra asli yang diupload
│   └── heatmaps/     # Grad-CAM visualization (jika diimplementasikan)
└── models/
    └── ResNetDemo_1782708575_9063396e.pth  # Model PyTorch
```

## 🔧 Konfigurasi R2 Cloudflare

Jika ingin mengaktifkan R2 Storage:

### 1. Dapatkan Credentials dari Cloudflare
- Login ke Cloudflare Dashboard
- Navigate to R2 Object Storage
- Create API Token dengan permissions:
  - Object Read & Write
- Copy Account ID, Access Key, Secret Key

### 2. Update File .env
Edit `d:\projekan\MammoGuard-AI\.env`:
```env
R2_ACCOUNT_ID=abc123xyz
R2_ACCESS_KEY_ID=1234567890abcdef
R2_SECRET_ACCESS_KEY=fedcba0987654321secretkey
R2_BUCKET_NAME=mammoguard-storage
R2_ENDPOINT_URL=https://abc123xyz.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://cdn.mammoguard.com
```

### 3. Restart Backend Container
```bash
docker-compose restart backend
```

### 4. Verify
Check logs:
```bash
docker-compose logs backend | findstr "R2"
```

Expected output:
```
✓ R2 Storage berhasil dikonfigurasi
```

## 📱 User Flow Lengkap

### Scenario 1: Dokter Melakukan Analisis Baru

1. **Login** → Masukkan credentials
2. **Dashboard** → Lihat overview
3. **Upload Citra** → Pilih menu upload
4. **Select File** → Browse dan pilih mammogram
5. **Submit** → Klik "Analisis Citra"
6. **Wait** → Tunggu proses (2-5 detik)
7. **View Result** → Lihat hasil analisis
8. **History** → Hasil tersimpan di riwayat

### Scenario 2: Review Riwayat Pasien

1. **Login** → Masukkan credentials
2. **Riwayat Pasien** → Klik menu
3. **Browse** → Scroll lihat semua analisis
4. **Filter** → Cari berdasarkan tanggal/pasien
5. **Detail** → Klik untuk lihat detail lengkap
6. **Export** → Download hasil (jika fitur tersedia)

### Scenario 3: Admin Manage Users

1. **Login as Admin** → Credentials admin
2. **User Management** → Klik menu
3. **Add User** → Tambah dokter baru
4. **Edit** → Update informasi user
5. **Delete** → Hapus user (dengan konfirmasi)

## 🐛 Troubleshooting Penggunaan

### Error: "Gagal mengunggah file"
**Solusi:**
- Cek ukuran file (max 10MB)
- Cek format file (JPG/PNG only)
- Cek koneksi backend: `curl http://localhost:8000/kesehatan`

### Error: "Model belum dimuat"
**Solusi:**
- Pastikan file model ada di `backend/storage/models/`
- Restart backend: `docker-compose restart backend`
- Check logs: `docker-compose logs backend`

### Hasil Analisis Tidak Muncul
**Solusi:**
- Buka browser console (F12)
- Cek network tab untuk error
- Verify API response di Swagger UI
- Check MongoDB connection

### Storage R2 Error
**Solusi:**
- Verify credentials di .env
- Check R2 bucket exists
- Test dengan storage lokal (kosongkan R2 configs)
- System akan fallback ke local storage

### Frontend Tidak Load
**Solusi:**
- Clear browser cache
- Check frontend logs: `docker-compose logs frontend`
- Verify Next.js build: Rebuild container
- Check port 3000 tidak digunakan aplikasi lain

## 📊 Monitoring & Logs

### Real-time Logs
```bash
# Semua services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend

# MongoDB only
docker-compose logs -f mongodb
```

### Check Container Status
```bash
docker-compose ps
```

### Check Resource Usage
```bash
docker stats
```

## 🔐 Security Best Practices

### Development
- ✅ Use lokal MongoDB credentials
- ✅ Frontend di localhost only
- ✅ CORS configured untuk localhost

### Production (Future)
- 🔒 Change MongoDB password
- 🔒 Use HTTPS dengan SSL certificates
- 🔒 Implement proper authentication (JWT)
- 🔒 Rate limiting pada API
- 🔒 Input sanitization
- 🔒 Secure R2 credentials dengan secrets management

## 📞 Support & FAQ

### Q: Apakah bisa diakses dari komputer lain?
A: Tidak, saat ini hanya bisa diakses dari localhost. Untuk akses remote, perlu konfigurasi network dan security tambahan.

### Q: Berapa lama proses analisis?
A: Sekitar 2-5 detik tergantung ukuran citra dan spesifikasi komputer.

### Q: Apakah data aman?
A: Untuk development, data tersimpan lokal. Untuk production, gunakan R2 Cloudflare dengan enkripsi.

### Q: Bisa menambah model AI sendiri?
A: Ya, letakkan file .pth di `backend/storage/models/` dan update environment variable `JALUR_MODEL`.

### Q: Bagaimana backup data?
A: 
```bash
# Backup MongoDB
docker exec mammoguard_mongodb mongodump --out=/backup

# Backup images
cp -r backend/storage/images/ ./backup/
```

## 🎯 Next Steps

Setelah familiar dengan aplikasi:

1. **Customize Model** - Train model dengan dataset Anda sendiri
2. **Add Grad-CAM** - Implementasi visualization heatmap
3. **Enhance UI** - Improve user experience
4. **Add Features** - Report generation, export PDF, etc.
5. **Deploy** - Setup production environment dengan proper security

## 📚 Resources

- API Documentation: http://localhost:8000/docs
- Cloudflare R2 Docs: https://developers.cloudflare.com/r2/
- FastAPI Docs: https://fastapi.tiangolo.com/
- Next.js Docs: https://nextjs.org/docs
- PyTorch Docs: https://pytorch.org/docs/

---

**Happy coding! 🎉**

Jika ada pertanyaan atau masalah, cek file `README-DOCKER.md` untuk troubleshooting lengkap.
