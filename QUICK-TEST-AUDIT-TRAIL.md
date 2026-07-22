# 🧪 QUICK TEST - AUDIT TRAIL WORKFLOW

**Tujuan:** Verify implementasi audit trail koreksi dokter sudah berjalan dengan benar

**Durasi:** ~5 menit

---

## ✅ PRE-REQUISITES

```bash
# Check Docker containers running
docker ps

# Expected output:
# mammoguard_mongodb    - healthy
# mammoguard_backend    - healthy  
# mammoguard_frontend   - Up
```

**Access URLs:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

---

## 📋 TEST CASE 1: Koreksi AI (Happy Path)

### Step 1: Login Dokter
1. Buka browser → http://localhost:3000
2. Login:
   - Email: `dr.ayu@mammoguard.id`
   - Password: `demo123`
3. ✅ Expected: Redirect ke **Beranda Dokter**

---

### Step 2: Upload Gambar Mammogram
1. Klik **area drag-and-drop** atau "Pilih File"
2. Upload sample image:
   - Bisa JPG/PNG/DICOM
   - Contoh: `backend/storage/images/raw/PAT-20260629-4E95B_L_CC_1fae40.png`
3. ✅ Expected: Loading → AI analysis → Workspace muncul

**Cek UI Workspace:**
- ✅ Original image (kiri)
- ✅ Grad-CAM heatmap (kanan)
- ✅ Prediction label + confidence (misal: "Malignant 85%")
- ✅ BI-RADS dropdown
- ✅ Koreksi AI dropdown

---

### Step 3: Koreksi Prediksi AI
1. Klik dropdown **"Koreksi AI"**
2. Pilih label **berbeda** dari prediksi AI
   - Jika AI bilang "Malignant" → Pilih **"Benign"**
   - Jika AI bilang "Benign" → Pilih **"Malignant"**

**✅ Expected Result:**
- Prediction label berubah
- Confidence jadi **100%** (manual correction)
- **TEXTAREA "Alasan Koreksi" MUNCUL** (yellow box dengan icon warning)

**❌ If Fail:**
- Textarea tidak muncul → Check `BerandaDokterPage.tsx` line ~701
- Confidence tidak 100% → Check `tanganiKoreksi` function

---

### Step 4: Validasi Tanpa Alasan (Expect: Error)
1. **JANGAN ISI** textarea alasan koreksi
2. Pilih BI-RADS: "2 - Benign"
3. Klik **"Validasi"**

**✅ Expected Result:**
- ❌ Alert error muncul: _"Alasan koreksi wajib diisi minimal 10 karakter untuk compliance medikolegal."_
- Validasi **DITOLAK**
- UI tetap di workspace

**❌ If Fail:**
- Validasi berhasil padahal alasan kosong → Check `tanganiValidasi` validation logic
- Alert tidak muncul → Check browser console for errors

---

### Step 5: Isi Alasan Koreksi & Validasi Ulang
1. Isi textarea dengan alasan minimal 10 karakter:
   ```
   Terdeteksi massa irregular dengan spikulated margin di kuadran lateral atas. 
   AI kurang optimal dalam deteksi. Rekomendasi biopsi untuk konfirmasi histopatologi.
   ```
2. Pastikan BI-RADS sudah dipilih
3. Klik **"Validasi"** lagi

**✅ Expected Result:**
- ✅ Alert success: _"Validasi berhasil disimpan"_
- UI reset ke idle state (workspace hilang)
- Statistik "Analisis Hari Ini" bertambah +1

**❌ If Fail:**
- HTTP 400 error → Check backend logs: `docker logs mammoguard_backend`
- Alert tidak muncul → Check browser Network tab (F12 → Network)

---

### Step 6: Verifikasi Audit Trail di MongoDB

**Option A: Via Docker Exec (Terminal)**
```bash
# Connect to MongoDB
docker exec -it mammoguard_mongodb mongosh -u admin_medis -p password_lokal_123 --authenticationDatabase admin

# Switch to database
use mammoguard_db

# Count audit records
db.audit_koreksi.countDocuments()
# Expected: >= 1

# Show latest audit record
db.audit_koreksi.find().sort({created_at: -1}).limit(1).pretty()

# Expected output:
# {
#     _id: ObjectId("..."),
#     analisis_id: "...",
#     pasien_id: "PAT-...",
#     hasil_ai_awal: {
#         label: "Malignant",
#         confidence: 0.85
#     },
#     koreksi_dokter: {
#         label: "Benign",
#         confidence: 1.0,
#         alasan: "Terdeteksi massa irregular...",
#         dokter_id: "dr.ayu@mammoguard.id",
#         dokter_sip: "SIP.DEMO/2026",
#         ip_address: "172.18.0.1",
#         user_agent: "Mozilla/5.0...",
#         timestamp: ISODate("...")
#     },
#     status: "corrected",
#     created_at: ISODate("...")
# }
```

**Option B: Via API (PowerShell/Bash)**
```powershell
# Get audit trail list
curl http://localhost:8000/analisis/audit/koreksi?limit=10

# Expected JSON response:
# {
#     "status": "berhasil",
#     "data": [
#         {
#             "_id": "...",
#             "analisis_id": "...",
#             "koreksi_dokter": {
#                 "alasan": "Terdeteksi massa irregular...",
#                 "dokter_id": "dr.ayu@mammoguard.id"
#             }
#         }
#     ],
#     "statistik": {
#         "total_koreksi": 1,
#         "correction_rate": "..."
#     }
# }
```

**✅ Expected:**
- Collection `audit_koreksi` ada dan terisi
- Field `koreksi_dokter.alasan` berisi text yang Anda ketik
- Field `ip_address` dan `user_agent` terisi
- Timestamp `created_at` sesuai waktu validasi

**❌ If Fail:**
- Collection kosong → Check backend code: `analisis.py` line ~654 (audit insert)
- Field `alasan` kosong → Check payload frontend: `tanganiValidasi` function

---

## 📋 TEST CASE 2: Validasi Tanpa Koreksi (No Audit)

### Step 1: Upload Gambar Baru
1. Upload image baru (atau refresh page → upload lagi)
2. ✅ Expected: AI analysis → Workspace muncul

---

### Step 2: Validasi TANPA Koreksi AI
1. **JANGAN klik** "Koreksi AI" dropdown
2. Langsung pilih BI-RADS: "2 - Benign"
3. Klik **"Validasi"**

**✅ Expected Result:**
- ✅ Validasi berhasil (tidak ada validasi alasan koreksi)
- ✅ Textarea "Alasan Koreksi" **TIDAK MUNCUL** (karena tidak ada koreksi)
- UI reset ke idle state

---

### Step 3: Verifikasi NO Audit Entry Created
```bash
# Check total audit records
docker exec -it mammoguard_mongodb mongosh -u admin_medis -p password_lokal_123 --authenticationDatabase admin

use mammoguard_db
db.audit_koreksi.countDocuments()
```

**✅ Expected:**
- Count **TIDAK BERTAMBAH** (karena tidak ada koreksi)
- Hanya Test Case 1 yang tercatat di audit

**❌ If Fail:**
- Count bertambah padahal tidak ada koreksi → Check backend logic: `ada_koreksi` detection

---

## 📋 TEST CASE 3: API Endpoints Testing

### Test Endpoint 1: Health Check
```bash
curl http://localhost:8000/kesehatan
```

**Expected:**
```json
{"status":"sehat","layanan":"aktif"}
```

---

### Test Endpoint 2: List Audit Trail
```bash
curl http://localhost:8000/analisis/audit/koreksi?limit=5&days=7
```

**Expected:**
```json
{
    "status": "berhasil",
    "data": [
        {
            "_id": "...",
            "analisis_id": "...",
            "pasien_id": "PAT-...",
            "hasil_ai_awal": {...},
            "koreksi_dokter": {...}
        }
    ],
    "pagination": {
        "total": 1,
        "limit": 5,
        "skip": 0,
        "has_more": false
    },
    "statistik": {
        "total_koreksi": 1,
        "benign_to_malignant": 0,
        "malignant_to_benign": 1,
        "correction_rate": "100.0%"
    }
}
```

---

### Test Endpoint 3: Detail Audit Record
```bash
# Get audit ID from previous response
# Example: _id = "66b8e5f2a3c4d5e6f7890abc"

curl http://localhost:8000/analisis/audit/koreksi/66b8e5f2a3c4d5e6f7890abc
```

**Expected:**
```json
{
    "status": "berhasil",
    "data": {
        "_id": "66b8e5f2a3c4d5e6f7890abc",
        "analisis_id": "...",
        "hasil_ai_awal": {
            "label": "Malignant",
            "confidence": 0.85,
            "timestamp": "..."
        },
        "koreksi_dokter": {
            "label": "Benign",
            "alasan": "Terdeteksi massa irregular...",
            "dokter_id": "dr.ayu@mammoguard.id",
            "dokter_sip": "SIP.DEMO/2026",
            "ip_address": "172.18.0.1",
            "user_agent": "...",
            "timestamp": "..."
        },
        "status": "corrected"
    }
}
```

---

## 🐛 TROUBLESHOOTING

### Issue 1: Textarea Tidak Muncul Setelah Koreksi

**Debug:**
1. Open browser DevTools (F12)
2. Check Console for errors
3. Check React state:
   ```javascript
   // In Console, type:
   prediction.confidence
   // Expected: 100 (after koreksi)
   ```

**Fix:**
- Check `tanganiKoreksi` function in `BerandaDokterPage.tsx`
- Ensure `setPrediction({ label: koreksiLabel, confidence: 100 })`

---

### Issue 2: Validasi Berhasil Padahal Alasan Kosong

**Debug:**
1. Check backend logs:
   ```bash
   docker logs mammoguard_backend --tail 50
   ```
2. Look for validation logic execution

**Fix:**
- Check `validasi_analisis` endpoint line ~628
- Ensure validation: `if not data.alasan_koreksi or len(data.alasan_koreksi.strip()) < 10`

---

### Issue 3: Audit Tidak Tersimpan di MongoDB

**Debug:**
1. Check backend logs for errors:
   ```bash
   docker logs mammoguard_backend | grep -i error
   ```
2. Check MongoDB connection:
   ```bash
   docker exec -it mammoguard_backend python -c "from app.db.koneksi import dapatkan_database; print(dapatkan_database())"
   ```

**Fix:**
- Verify `ada_koreksi` detection logic (line ~626)
- Ensure `await db["audit_koreksi"].insert_one(...)` executed (line ~654)
- Check MongoDB permissions

---

### Issue 4: Frontend Cannot Connect to Backend

**Debug:**
```bash
# Check backend health
curl http://localhost:8000/kesehatan

# Check backend logs
docker logs mammoguard_backend
```

**Fix:**
- Restart backend container: `docker-compose restart backend`
- Check `.env.local` in frontend: `NEXT_PUBLIC_API_URL=http://localhost:8000`

---

## ✅ SUCCESS CRITERIA

**All tests pass if:**
1. ✅ Koreksi AI → Textarea muncul
2. ✅ Validasi tanpa alasan → Error alert muncul
3. ✅ Validasi dengan alasan (>10 char) → Berhasil
4. ✅ MongoDB collection `audit_koreksi` terisi dengan data lengkap
5. ✅ API endpoint `/analisis/audit/koreksi` return data
6. ✅ Validasi tanpa koreksi → Tidak ada audit entry

**If all pass:** 🎉 **AUDIT TRAIL IMPLEMENTATION VERIFIED**

---

## 📸 SCREENSHOT CHECKLIST (For Demo/Presentation)

Capture screenshots untuk dokumentasi:
1. [ ] Login page
2. [ ] Beranda dokter dashboard (dengan statistik)
3. [ ] Upload → AI analysis result
4. [ ] Workspace dengan Grad-CAM heatmap
5. [ ] **Koreksi AI → Textarea "Alasan Koreksi" muncul (HIGHLIGHT INI!)**
6. [ ] Validasi error (alasan kosong)
7. [ ] Validasi success
8. [ ] MongoDB shell dengan query `db.audit_koreksi.find()`
9. [ ] API response `/analisis/audit/koreksi`
10. [ ] Disclaimer "Prototype Akademik" di bottom workspace

---

## 🎓 UNTUK PRESENTASI

**Key Points to Demonstrate:**
1. **Problem:** AI bisa salah, dokter perlu koreksi, tapi koreksi harus terdokumentasi (medikolegal)
2. **Solution:** Conditional UI yang **hanya muncul** jika ada koreksi, wajib isi alasan min 10 char
3. **Audit Trail:** Semua koreksi tersimpan dengan metadata lengkap (IP, timestamp, user agent)
4. **Compliance Aware:** Sistem paham requirements medikolegal, tapi masih prototype (bukan production)

**Demo Flow:**
1. Show upload → AI analysis → Grad-CAM
2. **Koreksi AI** → Show textarea muncul (highlight: "ini compliance feature")
3. Try validasi tanpa alasan → Show error (highlight: "validation logic")
4. Isi alasan → Validasi berhasil
5. Show MongoDB audit record (highlight: "full audit trail with metadata")
6. Show API endpoint response (highlight: "queryable untuk analysis")

**Closing Statement:**
> "Ini menunjukkan **awareness** terhadap compliance medikolegal. Bukan full implementation 
> (belum ada digital signature, review workflow, dll), tapi **foundation** yang extensible 
> untuk pilot riset di RS."

---

**READY TO TEST!** 🚀
