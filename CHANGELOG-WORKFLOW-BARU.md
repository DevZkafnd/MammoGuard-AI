# Changelog - Workflow Pasien Baru

## 📋 Perubahan yang Telah Dilakukan

### ✅ Frontend Changes

#### 1. Sidebar Dokter - SELESAI
**File**: `frontend/components/dokter/DokterSidebar.tsx`
- ✅ Menu "Daftar Dokter Spesialis" sudah dihapus
- ✅ Sidebar sekarang hanya menampilkan:
  - Beranda
  - Riwayat Pasien
  - Logout

#### 2. Dashboard Dokter Baru - SELESAI
**File**: `frontend/components/dokter/DashboardDokterPage.tsx`
- ✅ Dashboard baru dengan fokus pada list pasien
- ✅ Tombol "Tambah Pasien Baru" di header
- ✅ Statistik cards (Analisis Hari Ini, Pending Validasi, Total Pasien)
- ✅ List pasien terbaru dengan status prediksi kanan dan kiri
- ✅ Klik pasien untuk lihat detail

#### 3. Profil Pasien Page - SELESAI
**File**: `frontend/components/dokter/ProfilPasienPage.tsx`
**Route**: `/profil-pasien`

**Alur Workflow 4 Langkah:**

##### Step 1: Input Nama Pasien
- Form input nama lengkap pasien
- Auto-generate ID pasien (format: PAT-{timestamp})
- Tombol "Lanjut ke Upload Gambar"

##### Step 2: Upload Mammogram Kanan
- Upload gambar mammogram sisi kanan
- Drag & drop atau klik untuk pilih file
- Format support: JPG, PNG, DICOM
- Loading indicator saat proses AI analysis
- Otomatis lanjut ke step 3 setelah selesai

##### Step 3: Upload Mammogram Kiri
- Upload gambar mammogram sisi kiri
- Interface sama dengan step 2
- Otomatis lanjut ke step 4 setelah selesai

##### Step 4: Verifikasi Data
- Preview semua data pasien:
  - Nama lengkap
  - ID Pasien
  - Gambar kanan (original + Grad-CAM)
  - Gambar kiri (original + Grad-CAM)
  - Hasil prediksi AI untuk kedua sisi
- Tombol "Kembali" untuk edit upload
- Tombol "Simpan ke Riwayat Pasien" untuk submit final

#### 4. Progress Indicator
- Setiap step menampilkan progress "Step X/4"
- Visual indicator untuk step mana yang sedang aktif

---

## 🗂️ Struktur Data Per Pasien

```typescript
type DataPasien = {
  nama: string;
  id_pasien: string; // Format: PAT-{timestamp}
  kanan: GambarPasien;
  kiri: GambarPasien;
}

type GambarPasien = {
  original: string | null;      // URL gambar asli
  gradcam: string | null;        // URL Grad-CAM heatmap dari AI
  brush: string | null;          // URL brush annotation (manual doctor)
  file_original?: File | null;   // File object untuk upload
}
```

**Total 6 gambar per pasien:**
1. Kanan - Original
2. Kanan - Grad-CAM
3. Kanan - Brush (annotation manual - TODO)
4. Kiri - Original
5. Kiri - Grad-CAM
6. Kiri - Brush (annotation manual - TODO)

---

## 🔄 Alur Kerja Lengkap

### User Journey:

```
Dashboard
  ↓
  [Klik "Tambah Pasien Baru"]
  ↓
Step 1: Input Nama
  → Input: "Ibu Siti Aminah"
  → ID generated: "PAT-1719123456789"
  ↓
Step 2: Upload Kanan
  → Upload file mammogram_kanan.jpg
  → Backend: AI analysis + Grad-CAM
  → Preview hasil: Benign / Malignant
  ↓
Step 3: Upload Kiri
  → Upload file mammogram_kiri.jpg
  → Backend: AI analysis + Grad-CAM
  → Preview hasil: Benign / Malignant
  ↓
Step 4: Verifikasi
  → Review:
    ✓ Nama: Ibu Siti Aminah
    ✓ ID: PAT-1719123456789
    ✓ Kanan: Original + Grad-CAM (Benign, 95.2%)
    ✓ Kiri: Original + Grad-CAM (Benign, 93.8%)
  → [Klik "Simpan ke Riwayat Pasien"]
  ↓
Saved to Database
  ↓
Redirect ke Dashboard
  → Pasien baru muncul di list
```

---

## 🚀 Cara Menjalankan

### 1. Rebuild Frontend Container

```bash
cd d:\projekan\MammoGuard-AI
docker-compose down
docker-compose up -d --build frontend
```

### 2. Akses Aplikasi

- Frontend: http://localhost:3000
- Login sebagai Dokter:
  - Username: `dr.sarah`
  - Password: `dokter123`

### 3. Test Workflow Baru

1. Login → Dashboard
2. Klik "Tambah Pasien Baru"
3. Input nama pasien
4. Upload mammogram kanan
5. Upload mammogram kiri
6. Verifikasi data
7. Submit → Lihat di dashboard

---

## ⚠️ Yang Masih TODO

### Backend API yang Perlu Ditambahkan:

#### 1. Endpoint: POST `/api/pasien`
**Request Body:**
```json
{
  "nama": "Ibu Siti Aminah",
  "id_pasien": "PAT-1719123456789",
  "kanan": {
    "original_url": "...",
    "gradcam_url": "...",
    "brush_url": "...",
    "prediksi": "Benign",
    "confidence": 95.2
  },
  "kiri": {
    "original_url": "...",
    "gradcam_url": "...",
    "brush_url": "...",
    "prediksi": "Malignant",
    "confidence": 87.5
  },
  "tanggal": "2026-07-21T10:30:00Z",
  "dokter_id": "dr.sarah"
}
```

**Response:**
```json
{
  "status": "sukses",
  "data": {
    "id": "...",
    "message": "Data pasien berhasil disimpan"
  }
}
```

#### 2. Endpoint: GET `/api/pasien`
List semua pasien dengan pagination

#### 3. Endpoint: GET `/api/pasien/:id`
Detail satu pasien dengan semua gambarnya

#### 4. Endpoint: PUT `/api/pasien/:id`
Update data pasien

#### 5. Endpoint: DELETE `/api/pasien/:id`
Hapus data pasien

### Database Schema MongoDB:

```javascript
{
  _id: ObjectId("..."),
  id_pasien: "PAT-1719123456789",
  nama: "Ibu Siti Aminah",
  kanan: {
    original_url: "/storage/images/raw/PAT-xxx-kanan-original.jpg",
    gradcam_url: "/storage/images/heatmaps/PAT-xxx-kanan-gradcam.jpg",
    brush_url: "/storage/images/brush/PAT-xxx-kanan-brush.jpg",
    prediksi: "Benign",
    confidence_score: 0.952,
    bi_rads: "2"
  },
  kiri: {
    original_url: "/storage/images/raw/PAT-xxx-kiri-original.jpg",
    gradcam_url: "/storage/images/heatmaps/PAT-xxx-kiri-gradcam.jpg",
    brush_url: "/storage/images/brush/PAT-xxx-kiri-brush.jpg",
    prediksi: "Malignant",
    confidence_score: 0.875,
    bi_rads: "4C"
  },
  dokter_id: "dr.sarah",
  tanggal_pemeriksaan: ISODate("2026-07-21T10:30:00Z"),
  status: "completed", // "pending" | "completed"
  catatan: "...",
  created_at: ISODate("2026-07-21T10:30:00Z"),
  updated_at: ISODate("2026-07-21T10:30:00Z")
}
```

### Fitur Tambahan (Nice to Have):

#### 1. Brush Annotation Tool
- Canvas untuk dokter menggambar/mark area suspicious di gambar
- Save sebagai overlay image
- Display di verifikasi dan detail pasien

#### 2. DICOM Metadata Extraction
- Extract patient name dari DICOM tags
- Auto-fill form nama pasien
- Extract laterality (kanan/kiri) otomatis

#### 3. Export Laporan PDF
- Generate PDF report dengan:
  - Data pasien
  - Semua 6 gambar
  - Hasil AI
  - Catatan dokter
  - Tanda tangan digital

#### 4. Koreksi Hasil AI
- Dropdown untuk dokter override hasil AI
- Benign → Malignant atau sebaliknya
- Simpan koreksi untuk improve model

---

## 📊 Perbedaan dengan Workflow Lama

| Aspek | Workflow Lama | Workflow Baru |
|-------|---------------|---------------|
| **Input Pasien** | Tidak ada nama pasien | Input nama dulu |
| **Upload** | Single upload → hasil | Upload kanan → kiri (2x) |
| **Gambar per Analisis** | 2 (original + gradcam) | 6 (2 ori + 2 gradcam + 2 brush) |
| **Workflow** | Linear 1 step | 4 steps dengan progress |
| **Verifikasi** | Langsung validasi | Review lengkap sebelum submit |
| **Dashboard** | Upload-centric | Patient-centric |
| **CRUD** | Per analisis | Per pasien |

---

## 🎯 Benefit Workflow Baru

1. **Patient-Centric**: Semua data terorganisir per pasien, bukan per analisis
2. **Complete Record**: 6 gambar per pasien untuk dokumentasi lengkap
3. **Better UX**: Step-by-step workflow lebih guided dan user-friendly
4. **Verification Step**: Dokter bisa review semua data sebelum submit final
5. **Scalable**: Mudah untuk add brush annotation & fitur lain nanti
6. **Clinical Standard**: Sesuai standard radiologi (perlu analisis bilateral/kanan-kiri)

---

## 🔧 Files yang Dimodifikasi

### Modified:
1. `frontend/components/dokter/DokterSidebar.tsx` - Hapus menu tidak perlu
2. `frontend/app/beranda-dokter/page.tsx` - Switch ke dashboard baru
3. `docker-compose.yml` - Fix volume mount issue

### Created:
1. `frontend/components/dokter/DashboardDokterPage.tsx` - Dashboard baru
2. `frontend/components/dokter/ProfilPasienPage.tsx` - Workflow 4 langkah
3. `frontend/app/profil-pasien/page.tsx` - Route untuk profil pasien

### Preserved (Backup):
1. `frontend/components/dokter/BerandaDokterPage.tsx` - File lama (jaga-jaga)

---

## 📝 Next Steps

1. ✅ Frontend workflow sudah selesai
2. ⏳ Perlu backend API untuk:
   - Save pasien dengan 6 gambar
   - List pasien
   - Detail pasien
   - CRUD pasien
3. ⏳ Perlu update MongoDB schema
4. ⏳ Implementasi brush annotation tool
5. ⏳ Extract DICOM metadata (optional)
6. ⏳ Export PDF report (optional)

---

**Status**: Frontend DONE ✅ | Backend TODO ⏳
**Last Updated**: 21 Juli 2026
