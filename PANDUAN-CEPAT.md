# 🚀 PANDUAN CEPAT - Jalankan Dalam 2 Menit!

## ⚡ Cara Tercepat (Double-click saja!)

### Opsi 1: Klik File Bat (PALING MUDAH)
```
Double-click: JALANKAN-SEKARANG.bat
```

### Opsi 2: PowerShell Script
```powershell
Right-click: CLEANUP-DAN-START.ps1
Pilih: "Run with PowerShell"
```

**Tunggu ~15 detik, lalu buka browser ke http://localhost:3000**

---

## 📝 Atau Manual (3 Step):

### STEP 1: Cleanup (Hapus yang conflict)
```powershell
docker-compose down
docker stop mammoguard_mongodb mammoguard_backend mammoguard_frontend
docker rm mammoguard_mongodb mammoguard_backend mammoguard_frontend
```

### STEP 2: Start Semua
```powershell
docker-compose up -d
```

### STEP 3: Check Status
```powershell
docker-compose ps
```

**Harusnya muncul 3 containers: mongodb, backend, frontend**

---

## ✅ Verifikasi Berhasil:

### Check containers running:
```powershell
docker ps
```

Harus ada 3 containers:
- mammoguard_mongodb (port 27017)
- mammoguard_backend (port 8000)
- mammoguard_frontend (port 3000)

### Test Backend:
```powershell
curl http://localhost:8000/kesehatan
```

Output harus:
```json
{"status":"sehat","layanan":"aktif"}
```

### Test Frontend:
Buka browser: http://localhost:3000
Harus muncul login page!

---

## 🐛 Troubleshooting:

### Docker Desktop Error 500?
**Restart Docker Desktop:**
1. Klik kanan Docker Desktop di system tray
2. Pilih "Quit Docker Desktop"
3. Buka lagi Docker Desktop
4. Tunggu status "running"
5. Run script lagi

### Port sudah digunakan?
```powershell
# Check apa yang pakai port:
netstat -ano | findstr :3000
netstat -ano | findstr :8000
netstat -ano | findstr :27017

# Kill process (ganti <PID>):
taskkill /PID <PID> /F
```

### Container conflict?
```powershell
# Force remove all:
docker rm -f $(docker ps -aq)

# Start lagi:
docker-compose up -d
```

### Logs untuk debug:
```powershell
# Semua logs:
docker-compose logs -f

# Specific service:
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

---

## 🎯 Setelah Berhasil:

### Test Upload Citra:
1. Buka http://localhost:3000
2. Login (atau navigate ke beranda dokter)
3. Upload citra mammogram (.png, .jpg)
4. Lihat hasil analisis

### Test API Docs:
1. Buka http://localhost:8000/docs
2. Try endpoint `/analisis/unggah`
3. Upload test image
4. Lihat response

### Check Riwayat:
```bash
curl http://localhost:8000/analisis/riwayat
```

---

## 📊 Expected Result:

### docker-compose ps:
```
NAME                 STATUS
mammoguard_mongodb   Up X seconds (healthy)
mammoguard_backend   Up X seconds
mammoguard_frontend  Up X seconds
```

### Browser:
- http://localhost:3000 → Login Page ✅
- http://localhost:8000 → API Response ✅
- http://localhost:8000/docs → Swagger UI ✅

---

## 🎉 SELESAI!

Aplikasi sudah running! Mulai test fitur-fiturnya:

✅ Upload citra mammogram  
✅ Lihat hasil analisis AI  
✅ Check riwayat pasien  
✅ Test semua pages frontend  

**Enjoy! 🚀**

---

## 💡 Tips:

- Gunakan `JALANKAN-SEKARANG.bat` setiap kali mau start
- Script otomatis cleanup conflicts
- Tidak perlu khawatir error lagi
- Jika error, restart Docker Desktop dulu

---

## 🆘 Need Help?

Check logs:
```powershell
docker-compose logs -f
```

Restart everything:
```powershell
docker-compose restart
```

Full cleanup and rebuild:
```powershell
docker-compose down -v
docker-compose up --build -d
```
