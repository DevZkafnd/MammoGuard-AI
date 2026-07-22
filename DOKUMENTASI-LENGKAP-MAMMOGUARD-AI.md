# 📋 DOKUMENTASI LENGKAP - MammoGuard AI

## Sistem Analisis Mammogram dengan AI untuk Deteksi Kanker Payudara

**Version:** 1.0.0  
**Last Updated:** 21 Juli 2026  
**Status:** Production Ready

---

## 📖 DAFTAR ISI

1. [Ringkasan Proyek](#ringkasan-proyek)
2. [Arsitektur Sistem](#arsitektur-sistem)
3. [Fitur-Fitur Utama](#fitur-fitur-utama)
4. [Alur Kerja (Workflow)](#alur-kerja-workflow)
5. [Role & Hak Akses](#role--hak-akses)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Cara Deployment](#cara-deployment)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 RINGKASAN PROYEK

### Apa itu MammoGuard AI?

**MammoGuard AI** adalah sistem berbasis web untuk membantu dokter spesialis radiologi dalam menganalisis citra mammogram untuk deteksi dini kanker payudara menggunakan teknologi **Artificial Intelligence (Deep Learning)**.

### Tujuan Utama:
1. **Meningkatkan Akurasi** - AI membantu dokter mendeteksi area mencurigakan
2. **Mempercepat Diagnosis** - Analisis otomatis dengan Grad-CAM heatmap
3. **Manajemen Data Pasien** - Sistem terpusat untuk record pasien lengkap
4. **Dokumentasi Lengkap** - Menyimpan 6 gambar per pasien (bilateral: kanan & kiri)

### Teknologi yang Digunakan:

**Frontend:**
- Next.js 16.2.9 (React Framework)
- TypeScript
- Tailwind CSS
- Server-Side Rendering (SSR)

**Backend:**
- FastAPI (Python Web Framework)
- Python 3.11
- PyTorch (Deep Learning)
- OpenCV & Pillow (Image Processing)

**Database:**
- MongoDB 8.2 (NoSQL Database)

**AI/ML:**
- ResNet (Convolutional Neural Network)
- Grad-CAM (Gradient-weighted Class Activation Mapping)
- PyTorch Model (.pth file)

**Storage:**
- Local Storage (default)
- Cloudflare R2 (optional, S3-compatible)

**Deployment:**
- Docker & Docker Compose
- Multi-container architecture
- Volume persistence untuk data

---

## 🏗️ ARSITEKTUR SISTEM

### Diagram Arsitektur:

```
┌─────────────────────────────────────────────────────────────┐
│                       USER (Browser)                        │
│              http://localhost:3000                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               FRONTEND CONTAINER                            │
│               (Next.js SSR)                                 │
│               Port: 3000                                    │
│                                                             │
│  - Login Page                                              │
│  - Dashboard Dokter (Dual Workflow)                        │
│  - Profil Pasien (4-step workflow)                         │
│  - Riwayat Pasien                                          │
│  - Detail Pasien                                           │
│  - Manajemen Model AI (IT Role)                            │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               BACKEND CONTAINER                             │
│               (FastAPI + PyTorch)                           │
│               Port: 8000                                    │
│                                                             │
│  ┌───────────────────────────────────────────────┐         │
│  │  API Routes:                                  │         │
│  │  - /login (Authentication)                    │         │
│  │  - /analisis/* (AI Analysis)                  │         │
│  │  - /pasien/* (Patient CRUD)                   │         │
│  │  - /model/* (Model Management)                │         │
│  └───────────────────────────────────────────────┘         │
│                                                             │
│  ┌───────────────────────────────────────────────┐         │
│  │  AI/ML Components:                            │         │
│  │  - Model Loader (ResNet)                      │         │
│  │  - Image Preprocessing                        │         │
│  │  - Grad-CAM Generator                         │         │
│  │  - Inference Engine                           │         │
│  └───────────────────────────────────────────────┘         │
│                                                             │
│  ┌───────────────────────────────────────────────┐         │
│  │  Storage:                                     │         │
│  │  - /storage/images/raw/ (Original)            │         │
│  │  - /storage/images/heatmaps/ (Grad-CAM)       │         │
│  │  - /storage/models/ (AI Models .pth)          │         │
│  └───────────────────────────────────────────────┘         │
└────────────────────────┬────────────────────────────────────┘
                         │ MongoDB Protocol
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               DATABASE CONTAINER                            │
│               (MongoDB 8.2)                                 │
│               Port: 27019→27017                             │
│                                                             │
│  Collections:                                              │
│  - pengguna (users)                                        │
│  - pasien (patients)                                       │
│  - analisis (legacy single upload)                         │
│  - model_ai (AI models metadata)                           │
└─────────────────────────────────────────────────────────────┘
```

### Docker Volumes:

- `mammoguard_mongo_data` - MongoDB data persistence
- `mammoguard_mongo_config` - MongoDB configuration
- `mammoguard_storage` - Images & AI models storage

---

## 🎨 FITUR-FITUR UTAMA

### 1. **SISTEM AUTHENTICATION & AUTHORIZATION**

#### Login System:
- **Multi-role authentication** (Dokter & IT)
- **Session management** dengan localStorage
- **Auto-redirect** based on role
- **Secure password hashing** (bcrypt)

#### Demo Accounts:
```
Role: Dokter Spesialis Radiologi
Username: dr.sarah
Password: dokter123
Akses: Dashboard, Upload, Patient Management

Role: Tim IT (Administrator)
Username: admin.it
Password: admin123
Akses: Model Management, User Management
```

---

### 2. **DASHBOARD DOKTER (DUAL WORKFLOW)**

Dashboard memiliki **2 workflow berbeda** yang terintegrasi:

#### A. **Single Upload Workflow (Quick Analysis)**

**Tujuan:** Analisis cepat untuk 1 gambar mammogram

**Fitur:**
- ✅ Drag & drop upload (.JPG, .PNG, .DICOM)
- ✅ Loading animation 3-stage (Preprocessing → Inference → Complete)
- ✅ Real-time progress bar (0-100%)
- ✅ Exception handling (Model AI tidak aktif)
- ✅ AI Analysis dengan PyTorch ResNet
- ✅ Grad-CAM heatmap visualization
- ✅ Workspace interaktif:
  - Zoom: 50% - 400%
  - Pan (drag gambar)
  - Rotate (90° increments)
  - Reset view
- ✅ Side-by-side: Original vs Grad-CAM
- ✅ Color legend heatmap (Low/Mid/High)
- ✅ Koreksi AI dropdown (Benign/Malignant)
- ✅ BI-RADS classification (7 kategori)
- ✅ Validasi & simpan to database

**Alur Kerja:**
```
1. Dokter upload 1 gambar mammogram
2. Loading animation (3 stages):
   - Preprocessing (0-33%)
   - Running inference (33-95%)
   - Complete (95-100%)
3. AI analysis:
   - Model check (aktif/tidak)
   - Image preprocessing
   - Inference dengan ResNet
   - Generate Grad-CAM heatmap
4. Workspace muncul:
   - Kiri: Original image (zoom/pan/rotate)
   - Kanan: Grad-CAM heatmap
5. Dokter review hasil AI
6. (Optional) Koreksi hasil AI:
   - Dropdown: Benign → Malignant atau sebaliknya
   - Confidence jadi 100% (manual correction)
7. Pilih BI-RADS category (0, 1, 2, 3, 4A, 4B, 4C)
8. Klik "Validasi & Simpan ke Riwayat"
9. Data tersimpan di collection 'analisis'
```


#### B. **Patient-Centric Workflow (4-Step Complete Record)**

**Tujuan:** Dokumentasi lengkap pasien dengan bilateral analysis (kanan & kiri)

**Fitur:**
- ✅ 4-step wizard interface
- ✅ Auto-generate Patient ID (PAT-{timestamp})
- ✅ Upload 2 gambar (kanan & kiri)
- ✅ AI analysis untuk setiap gambar
- ✅ Loading animation sama dengan single upload
- ✅ Exception handling (Model AI tidak aktif)
- ✅ Verifikasi lengkap sebelum submit
- ✅ Total 6 gambar per pasien disimpan
- ✅ Bilateral status (most serious)

**Alur Kerja Detail:**

**STEP 1/4: Input Nama Pasien**
```
Input Form:
┌────────────────────────────────────────┐
│  Nama Lengkap Pasien                  │
│  [Contoh: Ibu Siti Aminah______]     │
│                                        │
│         [Lanjut ke Upload Gambar →]   │
└────────────────────────────────────────┘

Action:
1. Dokter input nama pasien
2. Klik "Lanjut"
3. System auto-generate ID: PAT-1721564234567
4. Redirect ke Step 2
```

**STEP 2/4: Upload Mammogram Kanan**
```
Header Progress:
┌────────────────────────────────────────┐
│  Ibu Siti Aminah                      │
│  ID: PAT-1721564234567                │
│  ● Kanan  →  ○ Kiri                   │
└────────────────────────────────────────┘

Upload Area:
┌────────────────────────────────────────┐
│         📤 Upload Mammogram Kanan      │
│                                        │
│   [Drag & Drop atau Klik untuk Upload]│
│   Format: JPG, PNG, DICOM             │
└────────────────────────────────────────┘

Action:
1. Dokter upload gambar kanan
2. Loading animation 3-stage:
   ┌──────────────────────────────────┐
   │  💓 Mengekstrak fitur citra...   │
   │  [████████░░░░░░░░░░] 45%        │
   │  Preprocessing → Inference       │
   └──────────────────────────────────┘
3. Exception Check:
   - IF model TIDAK aktif:
     ⚠️ Alert: "Model AI Belum Aktif"
     → STOP di Step 2 (tidak lanjut)
   - IF model AKTIF:
     ✓ Analysis selesai
     ✓ Dapat 2 gambar:
       - Original (stored URL)
       - Grad-CAM heatmap (generated)
     ✓ Hasil AI: Benign (87.2%) atau Malignant (95.3%)
     ✓ Auto lanjut ke Step 3
```

**STEP 3/4: Upload Mammogram Kiri**
```
Header Progress:
┌────────────────────────────────────────┐
│  Ibu Siti Aminah                      │
│  ID: PAT-1721564234567                │
│  ✓ Kanan  →  ● Kiri                   │
└────────────────────────────────────────┘

Upload Area: (sama dengan Step 2)

Action:
1. Dokter upload gambar kiri
2. Loading animation 3-stage (sama)
3. Exception Check (sama)
4. IF success:
   ✓ Dapat 2 gambar lagi (original + grad-CAM)
   ✓ Hasil AI untuk sisi kiri
   ✓ Auto lanjut ke Step 4
```

**STEP 4/4: Verifikasi Final**
```
Data Pasien:
┌────────────────────────────────────────┐
│  Nama: Ibu Siti Aminah                │
│  ID: PAT-1721564234567                │
└────────────────────────────────────────┘

Hasil Analisis Bilateral:
┌──────────────────┬──────────────────┐
│  MAMMOGRAM KANAN │ MAMMOGRAM KIRI   │
├──────────────────┼──────────────────┤
│  [Original IMG]  │  [Original IMG]  │
│  [Grad-CAM IMG]  │  [Grad-CAM IMG]  │
├──────────────────┼──────────────────┤
│  ✅ Benign       │  🔴 Malignant    │
│  Confidence:     │  Confidence:     │
│  87.2%           │  95.3%           │
└──────────────────┴──────────────────┘

Tombol:
[← Kembali]    [✓ Simpan ke Riwayat Pasien]

Action:
1. Dokter review semua data (6 gambar):
   - Kanan: original, gradcam, brush (placeholder)
   - Kiri: original, gradcam, brush (placeholder)
2. Cek hasil AI kedua sisi
3. Klik "Simpan ke Riwayat Pasien"
4. Data tersimpan ke collection 'pasien'
5. Redirect ke Dashboard
6. Pasien baru muncul di "Pasien Terbaru"
```


#### C. **Dashboard Layout (Phase: Idle)**

```
┌─────────────────────────────────────────────────────────────┐
│  Analisis Mammogram Baru        [+ Tambah Pasien Baru]     │
│  Unggah citra mammogram untuk dianalisis...                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STATISTICS CARDS:                                          │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ 📊 Analisis  │ ⚠️ Pending   │ 👥 Total     │            │
│  │ Hari Ini     │ Validasi     │ Pasien       │            │
│  │     5        │     2         │    12        │            │
│  └──────────────┴──────────────┴──────────────┘            │
│                                                             │
│  PASIEN TERBARU:               [Lihat Semua →]             │
│  ┌───────────────────────────────────────────────────┐     │
│  │ 👤 Ibu Siti Aminah          🔴 Malignant         │→   │
│  │    PAT-1721564234567        21 Jul 2026          │     │
│  ├───────────────────────────────────────────────────┤     │
│  │ 👤 Ny. Ratna Dewi           🟢 Benign            │→   │
│  │    PAT-1721564123456        20 Jul 2026          │     │
│  ├───────────────────────────────────────────────────┤     │
│  │ 👤 Ibu Aisyah               🟢 Benign            │→   │
│  │    PAT-1721564098765        19 Jul 2026          │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
│  SINGLE UPLOAD (Quick Analysis):                           │
│  ┌───────────────────────────────────────────────┐         │
│  │     📤 Tarik & Lepas Gambar Mammogram        │         │
│  │         Mendukung .JPG, .PNG, .DICOM         │         │
│  │        [Pilih dari Komputer]                 │         │
│  └───────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

**Statistics Logic:**
- **Analisis Hari Ini:** Jumlah pasien baru hari ini (tanggal_pemeriksaan = today)
- **Pending Validasi:** Jumlah pasien dengan status "pending"
- **Total Pasien:** Total documents di collection 'pasien'

**Patient List Logic:**
- Fetch 5 pasien terbaru dari `/pasien/?limit=5`
- Sort by `tanggal_pemeriksaan` DESC
- Display:
  - Nama pasien (bukan nama file!)
  - ID pasien
  - Status bilateral (most serious):
    - IF kanan=Malignant OR kiri=Malignant → 🔴 Malignant
    - ELSE → 🟢 Benign
  - Tanggal pemeriksaan
- Clickable → Redirect ke `/detail-pasien/{id_pasien}`

---

### 3. **RIWAYAT PASIEN**

**Tujuan:** Melihat semua pasien yang pernah diperiksa

**Fitur:**
- ✅ List all patients dengan pagination
- ✅ Search by nama/ID pasien
- ✅ Filter by status (Benign/Malignant)
- ✅ Sort by date (terbaru/terlama)
- ✅ Display bilateral status
- ✅ Clickable → Detail pasien

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Riwayat Pasien                                             │
│  [Search: Nama/ID_______]  [Filter: Semua ▼]  [Sort ▼]     │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐      │
│  │ 👤 Ibu Siti Aminah          🔴 Malignant         │→    │
│  │    PAT-1721564234567        21 Jul 2026          │      │
│  ├───────────────────────────────────────────────────┤      │
│  │ 👤 Ny. Ratna Dewi           🟢 Benign            │→    │
│  │    PAT-1721564123456        20 Jul 2026          │      │
│  ├───────────────────────────────────────────────────┤      │
│  │ ... (more patients)                              │      │
│  └───────────────────────────────────────────────────┘      │
│                                                              │
│  [◄ Prev]  Page 1 of 5  [Next ►]                           │
└──────────────────────────────────────────────────────────────┘
```

**API Call:**
```javascript
GET /pasien/?limit=20&skip=0&status=completed
```


---

### 4. **DETAIL PASIEN**

**Tujuan:** Melihat informasi lengkap 1 pasien dengan semua gambar

**Fitur:**
- ✅ Informasi pasien lengkap
- ✅ Display 6 gambar:
  - 3 gambar mammogram kanan (original, grad-CAM, brush)
  - 3 gambar mammogram kiri (original, grad-CAM, brush)
- ✅ Hasil AI analysis kedua sisi
- ✅ Confidence score
- ✅ BI-RADS category
- ✅ Tanggal pemeriksaan
- ✅ Dokter yang melakukan analisis
- ✅ Catatan tambahan

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│  Detail Pasien                                     [◄ Kembali]│
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  INFORMASI PASIEN:                                           │
│  ┌────────────────────────────────────────────────┐          │
│  │ Nama: Ibu Siti Aminah                         │          │
│  │ ID: PAT-1721564234567                         │          │
│  │ Tanggal: 21 Juli 2026                         │          │
│  │ Dokter: dr.sarah (Dr. Sarah Wijaya, Sp.Rad)  │          │
│  └────────────────────────────────────────────────┘          │
│                                                               │
│  HASIL ANALISIS BILATERAL:                                   │
│  ┌──────────────────────┬──────────────────────┐            │
│  │  MAMMOGRAM KANAN     │  MAMMOGRAM KIRI      │            │
│  ├──────────────────────┼──────────────────────┤            │
│  │  Original Image:     │  Original Image:     │            │
│  │  [IMG: 512x512]      │  [IMG: 512x512]      │            │
│  │                      │                      │            │
│  │  Grad-CAM Heatmap:   │  Grad-CAM Heatmap:   │            │
│  │  [IMG: 512x512]      │  [IMG: 512x512]      │            │
│  │                      │                      │            │
│  │  Brush Annotation:   │  Brush Annotation:   │            │
│  │  [Belum tersedia]    │  [Belum tersedia]    │            │
│  ├──────────────────────┼──────────────────────┤            │
│  │  Hasil AI:           │  Hasil AI:           │            │
│  │  ✅ Benign           │  🔴 Malignant        │            │
│  │  Confidence: 87.2%   │  Confidence: 95.3%   │            │
│  │  BI-RADS: 2          │  BI-RADS: 4C         │            │
│  └──────────────────────┴──────────────────────┘            │
│                                                               │
│  CATATAN:                                                    │
│  ┌────────────────────────────────────────────────┐          │
│  │ Analisis mammogram bilateral. Mammogram kanan │          │
│  │ menunjukkan hasil benign dengan confidence     │          │
│  │ tinggi. Mammogram kiri menunjukkan area       │          │
│  │ mencurigakan dengan klasifikasi malignant.     │          │
│  │ Rekomendasi: Biopsi pada area terdeteksi.     │          │
│  └────────────────────────────────────────────────┘          │
│                                                               │
│  [Download PDF Report]  [Edit Catatan]  [Hapus]             │
└──────────────────────────────────────────────────────────────┘
```

**API Call:**
```javascript
GET /pasien/PAT-1721564234567
```

**Response:**
```json
{
  "status": "berhasil",
  "data": {
    "id": "676aef...",
    "id_pasien": "PAT-1721564234567",
    "nama": "Ibu Siti Aminah",
    "kanan": {
      "original_url": "/storage/images/raw/xxx.png",
      "gradcam_url": "/storage/images/heatmaps/xxx_gradcam.png",
      "brush_url": null,
      "prediksi": "Benign",
      "confidence_score": 0.872,
      "bi_rads": "2"
    },
    "kiri": {
      "original_url": "/storage/images/raw/yyy.png",
      "gradcam_url": "/storage/images/heatmaps/yyy_gradcam.png",
      "brush_url": null,
      "prediksi": "Malignant",
      "confidence_score": 0.953,
      "bi_rads": "4C"
    },
    "dokter_id": "dr.sarah",
    "tanggal_pemeriksaan": "2026-07-21T10:30:00Z",
    "status": "completed",
    "catatan": "Analisis bilateral...",
    "created_at": "2026-07-21T10:15:00Z"
  }
}
```


---

### 5. **MANAJEMEN MODEL AI (Role: IT)**

**Tujuan:** Tim IT mengelola AI model (.pth file) yang digunakan untuk analisis

**Fitur:**
- ✅ Upload model .pth file
- ✅ List all uploaded models
- ✅ Activate/Deactivate model
- ✅ Delete model
- ✅ View model metadata
- ✅ Presigned URL untuk R2 Cloudflare (optional)
- ✅ Local storage support (default)
- ✅ Model validation (check file exists)

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│  Manajemen Model AI                               (Role: IT) │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  UPLOAD MODEL BARU:                                          │
│  ┌────────────────────────────────────────────────┐          │
│  │  Nama Model: [ResNetDemo_____________]        │          │
│  │  File .pth:  [Choose File]  No file chosen   │          │
│  │                                                │          │
│  │  Storage: ○ Local  ○ R2 Cloudflare           │          │
│  │                                                │          │
│  │           [Upload Model]                      │          │
│  └────────────────────────────────────────────────┘          │
│                                                               │
│  MODEL YANG TERSEDIA:                                        │
│  ┌────────────────────────────────────────────────────┐      │
│  │ 🤖 ResNetDemo_1782708575_9063396e.pth         │      │
│  │    Status: ✅ ACTIVE                           │      │
│  │    Size: 89.5 MB                               │      │
│  │    Uploaded: 15 Jul 2026 by admin.it          │      │
│  │    Storage: Local                              │      │
│  │    [Deactivate]  [Delete]                     │      │
│  ├────────────────────────────────────────────────────┤      │
│  │ 🤖 ResNet_Old_Model.pth                        │      │
│  │    Status: ⚪ INACTIVE                         │      │
│  │    Size: 85.2 MB                               │      │
│  │    Uploaded: 10 Jul 2026 by admin.it          │      │
│  │    Storage: R2 Cloudflare                      │      │
│  │    [Activate]  [Delete]                       │      │
│  └────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

**Alur Upload Model:**
```
1. Tim IT login dengan role "it"
2. Go to "Manajemen Model AI"
3. Input nama model (contoh: ResNetDemo)
4. Choose file .pth (file PyTorch model)
5. Pilih storage:
   - Local: Upload ke backend/storage/models/
   - R2 Cloudflare: Upload ke R2 bucket
6. Klik "Upload Model"
7. System:
   - Validate file (.pth extension)
   - Upload file ke storage
   - Save metadata ke collection 'model_ai'
   - Set status = "inactive"
8. Success notification
9. Model muncul di list
10. Klik "Activate" untuk mengaktifkan model
11. System:
    - Deactivate model lain (only 1 active)
    - Set model ini status = "active"
    - Load model ke memory (PemuatModel)
12. Model siap digunakan untuk analisis
```

**Cara Model Digunakan:**
```
1. Dokter upload gambar mammogram
2. Backend check: Ada model active?
   - IF NO:
     → model_status = "not_loaded"
     → Alert: "Model AI Belum Aktif"
   - IF YES:
     → Load model ke memory
     → Preprocessing image
     → Inference dengan model
     → Generate Grad-CAM heatmap
     → Return hasil (Benign/Malignant + confidence)
     → model_status = "loaded"
```

**Exception Handling:**
- Model belum diaktifkan → Alert ke dokter
- Model file tidak ditemukan → Error log
- Inference gagal → model_status = "error"
- Model corrupt → Validation error


---

### 6. **EXCEPTION HANDLING (CRITICAL)**

System memiliki **exception handling lengkap** untuk semua scenarios:

#### A. **Model AI Belum Aktif**

**Scenario:** Dokter upload gambar, tapi Tim IT belum upload/aktifkan model

**Alert Message:**
```
⚠️ Model AI Belum Aktif

Model AI belum di-upload atau diaktifkan oleh Tim IT.

Silakan:
1. Hubungi Tim IT untuk mengaktifkan model AI
2. Tim IT login ke role "Tim IT"
3. Upload file model .pth di halaman "Manajemen Model AI"
4. Aktifkan model untuk digunakan

Setelah model aktif, Anda dapat kembali melakukan analisis.
```

**Backend Response:**
```json
{
  "data": {
    "analisis": {
      "model_status": "not_loaded",
      "label": null,
      "confidence": 0,
      "pesan": "Model AI belum tersedia"
    }
  }
}
```

**Frontend Behavior:**
- ❌ Proses BERHENTI (tidak lanjut ke step berikutnya)
- ❌ Tidak ada data dummy tersimpan
- ✅ Alert dengan instruksi jelas
- ✅ User harus upload ulang setelah model aktif

**Applies to:**
- ✅ Single upload (dashboard)
- ✅ Patient workflow Step 2 (upload kanan)
- ✅ Patient workflow Step 3 (upload kiri)

#### B. **Model AI Error (Inference Failed)**

**Scenario:** Model aktif tapi inference gagal (gambar corrupt, dll)

**Alert Message:**
```
❌ Analisis AI Gagal

Error: Invalid image format

Silakan coba lagi atau hubungi Tim IT.
```

**Backend Response:**
```json
{
  "data": {
    "analisis": {
      "model_status": "error",
      "error": "Invalid image format",
      "label": null
    }
  }
}
```

**Frontend Behavior:**
- ❌ Proses BERHENTI
- ✅ User bisa upload ulang dengan gambar valid

#### C. **Model AI Active & Success**

**Scenario:** Model aktif dan inference berhasil

**Backend Response:**
```json
{
  "data": {
    "id": "676aef...",
    "gambar_url": "/storage/images/raw/xxx.png",
    "analisis": {
      "model_status": "loaded",
      "label": "Malignant",
      "confidence": 0.953,
      "confidence_score": 0.953,
      "heatmap_url": "/storage/images/heatmaps/xxx_gradcam.png"
    }
  }
}
```

**Frontend Behavior:**
- ✅ Loading animation (3 stages)
- ✅ Progress bar 0-100%
- ✅ Hasil AI: Malignant (95.3%)
- ✅ Grad-CAM heatmap displayed
- ✅ Lanjut ke workspace/step berikutnya

---

## 📊 DATABASE SCHEMA

### Collection: `pengguna` (Users)

**Purpose:** Menyimpan data user (dokter & IT)

```javascript
{
  _id: ObjectId("..."),
  username: "dr.sarah",
  password: "$2b$12$hashedpassword...",  // bcrypt hashed
  role: "dokter",                        // "dokter" | "it"
  nama: "Dr. Sarah Wijaya, Sp.Rad",
  email: "sarah.wijaya@hospital.com",
  tanggal_dibuat: ISODate("2026-07-15T10:00:00Z")
}
```

**Indexes:**
- `username` (unique)
- `email` (unique)
- `role`


### Collection: `pasien` (Patients - NEW WORKFLOW)

**Purpose:** Menyimpan data pasien lengkap dengan bilateral analysis

```javascript
{
  _id: ObjectId("..."),
  id_pasien: "PAT-1721564234567",      // Auto-generated
  nama: "Ibu Siti Aminah",
  
  // Mammogram Kanan
  kanan: {
    original_url: "/storage/images/raw/PAT-XXX_R_CC.png",
    gradcam_url: "/storage/images/heatmaps/PAT-XXX_R_CC_gradcam.png",
    brush_url: null,                   // Manual annotation (future)
    prediksi: "Benign",                // "Benign" | "Malignant"
    confidence_score: 0.872,           // 0.0 - 1.0
    bi_rads: "2"                       // "0"|"1"|"2"|"3"|"4A"|"4B"|"4C"
  },
  
  // Mammogram Kiri
  kiri: {
    original_url: "/storage/images/raw/PAT-XXX_L_MLO.png",
    gradcam_url: "/storage/images/heatmaps/PAT-XXX_L_MLO_gradcam.png",
    brush_url: null,
    prediksi: "Malignant",
    confidence_score: 0.953,
    bi_rads: "4C"
  },
  
  dokter_id: "dr.sarah",
  tanggal_pemeriksaan: ISODate("2026-07-21T10:30:00Z"),
  status: "completed",                 // "pending" | "completed"
  catatan: "Analisis mammogram bilateral. Kanan: Benign (87.2%), Kiri: Malignant (95.3%)",
  created_at: ISODate("2026-07-21T10:15:00Z"),
  updated_at: ISODate("2026-07-21T10:35:00Z")
}
```

**Indexes:**
- `id_pasien` (unique)
- `nama` (text search)
- `tanggal_pemeriksaan` (DESC)
- `dokter_id`
- `status`

**Total Images per Patient:** 6 (2 original + 2 gradcam + 2 brush)

### Collection: `analisis` (Legacy - SINGLE UPLOAD)

**Purpose:** Menyimpan hasil single upload (workflow lama)

```javascript
{
  _id: ObjectId("..."),
  gambar_url: "/storage/images/raw/xxx.png",
  heatmap_url: "/storage/images/heatmaps/xxx_gradcam.png",
  label: "Malignant",
  confidence: 0.953,
  confidence_score: 0.953,
  model_id: "676aef...",
  dokter_id: "dr.sarah",
  birads: "4C",
  divalidasi: true,                    // Sudah divalidasi dokter?
  waktu_unggah: ISODate("2026-07-21T14:00:00Z"),
  created_at: ISODate("2026-07-21T14:00:00Z")
}
```

**Note:** Collection ini untuk backward compatibility

### Collection: `model_ai` (AI Models)

**Purpose:** Metadata AI models yang di-upload Tim IT

```javascript
{
  _id: ObjectId("..."),
  nama: "ResNetDemo_1782708575_9063396e",
  file_path: "/app/storage/models/ResNetDemo_1782708575_9063396e.pth",
  storage_type: "local",               // "local" | "r2"
  r2_url: null,                        // URL jika di R2 Cloudflare
  status: "active",                    // "active" | "inactive"
  file_size: 89500000,                 // bytes
  uploaded_by: "admin.it",
  uploaded_at: ISODate("2026-07-15T08:00:00Z"),
  activated_at: ISODate("2026-07-15T08:05:00Z")
}
```

**Business Rule:** Only 1 model can be active at a time

---

## 🔌 API ENDPOINTS

### Authentication

#### POST `/login`
**Purpose:** User login

**Request:**
```json
{
  "username": "dr.sarah",
  "password": "dokter123"
}
```

**Response:**
```json
{
  "status": "berhasil",
  "data": {
    "username": "dr.sarah",
    "nama": "Dr. Sarah Wijaya, Sp.Rad",
    "role": "dokter",
    "email": "sarah.wijaya@hospital.com"
  }
}
```


### AI Analysis

#### POST `/analisis/unggah`
**Purpose:** Upload gambar & AI analysis

**Request:** `multipart/form-data`
- `berkas`: File (.jpg, .png, .dcm)

**Response:**
```json
{
  "status": "berhasil",
  "data": {
    "id": "676aef...",
    "gambar_url": "/storage/images/raw/xxx.png",
    "analisis": {
      "model_status": "loaded",
      "label": "Malignant",
      "confidence": 0.953,
      "confidence_score": 0.953,
      "heatmap_url": "/storage/images/heatmaps/xxx_gradcam.png"
    }
  }
}
```

#### GET `/analisis/statistik`
**Purpose:** Dashboard statistics

**Response:**
```json
{
  "status": "berhasil",
  "data": {
    "analisis_hari_ini": 5,
    "pending_validasi": 2,
    "total_pasien": 12
  }
}
```

#### POST `/analisis/{id}/validasi`
**Purpose:** Validasi hasil analisis oleh dokter

**Request:**
```json
{
  "birads": "4C",
  "label_final": "Malignant",
  "dokter": "Dr. Sarah Wijaya"
}
```

### Patient Management

#### POST `/pasien/`
**Purpose:** Create new patient

**Request:**
```json
{
  "nama": "Ibu Siti Aminah",
  "id_pasien": "PAT-1721564234567",
  "kanan": {
    "original_url": "/storage/images/raw/xxx.png",
    "gradcam_url": "/storage/images/heatmaps/xxx_gradcam.png",
    "brush_url": null,
    "prediksi": "Benign",
    "confidence_score": 0.872,
    "bi_rads": "2"
  },
  "kiri": {
    "original_url": "/storage/images/raw/yyy.png",
    "gradcam_url": "/storage/images/heatmaps/yyy_gradcam.png",
    "brush_url": null,
    "prediksi": "Malignant",
    "confidence_score": 0.953,
    "bi_rads": "4C"
  },
  "dokter_id": "dr.sarah",
  "catatan": "Analisis bilateral..."
}
```

#### GET `/pasien/?limit=5&skip=0`
**Purpose:** List patients with pagination

**Response:**
```json
{
  "status": "berhasil",
  "data": [
    {
      "id": "...",
      "id_pasien": "PAT-1721564234567",
      "nama": "Ibu Siti Aminah",
      "kanan": { "prediksi": "Benign", "confidence_score": 0.872 },
      "kiri": { "prediksi": "Malignant", "confidence_score": 0.953 },
      "tanggal_pemeriksaan": "2026-07-21T10:30:00Z"
    }
  ],
  "total": 12
}
```

#### GET `/pasien/{id}`
**Purpose:** Get patient detail

#### PUT `/pasien/{id}`
**Purpose:** Update patient data

#### DELETE `/pasien/{id}`
**Purpose:** Delete patient

### Model Management

#### GET `/model/list`
**Purpose:** List all AI models

#### POST `/model/upload`
**Purpose:** Upload new AI model

#### POST `/model/activate`
**Purpose:** Activate a model

#### POST `/model/deactivate`
**Purpose:** Deactivate a model

---

## 🚀 CARA DEPLOYMENT

### Prerequisites:
- Docker Desktop installed
- At least 8GB RAM
- At least 20GB free disk space

### Step 1: Clone & Setup

```powershell
# Clone repository
cd D:\projekan\MammoGuard-AI

# Check files
ls
```

### Step 2: Docker Cleanup (PENTING!)

```powershell
# Stop all containers
docker-compose down -v

# Clean Docker system (HATI-HATI: Hapus semua!)
docker system prune -a --volumes -f

# Check disk space
docker system df
```

### Step 3: Build & Run

```powershell
# Build all services
docker-compose build

# Start all containers
docker-compose up -d

# Check status
docker ps

# Check logs
docker logs mammoguard_backend --tail 50
docker logs mammoguard_frontend --tail 50
```

### Step 4: Verify

```powershell
# Test backend
curl http://localhost:8000/kesehatan

# Test frontend
curl http://localhost:3000
```

### Step 5: Access Application

- Frontend: **http://localhost:3000**
- Backend API: **http://localhost:8000**
- API Docs: **http://localhost:8000/docs**


---

## 🔧 TROUBLESHOOTING

### Problem 1: Docker Build Failed / Out of Space

**Symptoms:**
```
error reading from server: EOF
Exit Code: 1
```

**Solution:**
```powershell
# 1. Stop all containers
docker-compose down -v

# 2. Clean Docker system
docker system prune -a --volumes -f

# 3. Restart Docker Desktop
# (Right-click Docker icon → Quit → Open again)

# 4. Check disk space
docker system df

# 5. Rebuild
docker-compose build
docker-compose up -d
```

### Problem 2: Container Crash / 500 Error

**Symptoms:**
```
request returned 500 Internal Server Error
```

**Solution:**
```powershell
# Restart Docker Desktop
# Then:
docker-compose up -d
```

### Problem 3: Model AI Tidak Aktif

**Symptoms:**
- Alert: "Model AI Belum Aktif"
- Semua analysis gagal

**Solution:**
1. Login sebagai Tim IT (admin.it / admin123)
2. Go to "Manajemen Model AI"
3. Upload file .pth (ResNetDemo_xxx.pth)
4. Click "Activate" pada model yang diupload
5. Logout & login sebagai dokter
6. Try upload gambar lagi

### Problem 4: Statistik Salah / Riwayat Kosong

**Symptoms:**
- Dashboard menampilkan angka aneh
- Riwayat pasien kosong padahal ada data

**Solution:**
- Data statistik sekarang dari collection `pasien` (bukan `analisis`)
- Jika collection `pasien` kosong, statistik akan 0
- Buat pasien baru via workflow 4-step

### Problem 5: Frontend Tidak Update Setelah Code Change

**Symptoms:**
- Edit code tapi tidak berubah di browser

**Solution:**
```powershell
# Rebuild frontend
docker-compose build frontend

# Restart container
docker-compose up -d frontend

# Check logs
docker logs mammoguard_frontend --tail 30
```

### Problem 6: Backend Error / Connection Refused

**Symptoms:**
- Frontend tidak bisa connect ke backend
- Error: `ERR_CONNECTION_REFUSED`

**Solution:**
```powershell
# Check backend status
docker ps

# Check backend logs
docker logs mammoguard_backend --tail 50

# Restart backend
docker-compose restart backend

# If still error, rebuild
docker-compose build backend
docker-compose up -d backend
```

### Problem 7: MongoDB Connection Failed

**Symptoms:**
- Backend log: "Failed to connect to database"

**Solution:**
```powershell
# Check MongoDB status
docker ps | findstr mongodb

# Check MongoDB logs
docker logs mammoguard_mongodb --tail 50

# Restart MongoDB
docker-compose restart mongodb

# Wait 10 seconds then restart backend
timeout /t 10
docker-compose restart backend
```

---

## 📝 MAINTENANCE CHECKLIST

### Daily:
- [ ] Check container status: `docker ps`
- [ ] Check disk space: `docker system df`
- [ ] Backup database (if needed)

### Weekly:
- [ ] Clean unused images: `docker image prune -f`
- [ ] Review logs for errors
- [ ] Test both workflows (single & patient)

### Monthly:
- [ ] Full system cleanup: `docker system prune -a`
- [ ] Update dependencies (if needed)
- [ ] Review and update documentation

---

## 🎯 KESIMPULAN

### Apa yang Sudah Dibangun:

1. **Sistem AI Analysis Lengkap:**
   - Upload gambar mammogram (.JPG, .PNG, .DICOM)
   - AI inference dengan PyTorch ResNet
   - Grad-CAM heatmap visualization
   - Exception handling complete
   - Loading animation 3-stage

2. **Dual Workflow System:**
   - Single upload untuk analisis cepat
   - Patient workflow 4-step untuk record lengkap
   - Terintegrasi dalam 1 dashboard

3. **Patient Management:**
   - CRUD complete (Create, Read, Update, Delete)
   - Bilateral analysis (kanan & kiri)
   - 6 gambar per pasien
   - Riwayat & detail lengkap

4. **Model Management:**
   - Upload model .pth
   - Activate/deactivate
   - Local & R2 Cloudflare support
   - Validation & error handling

5. **Multi-Role System:**
   - Dokter: Analysis, patient management
   - IT: Model management, user management

6. **Production-Ready:**
   - Docker containerized
   - Volume persistence
   - Health checks
   - Error logging

---

## 📞 CONTACT & SUPPORT

**Developer:** Kiro AI Assistant  
**Project:** MammoGuard AI  
**Version:** 1.0.0  
**Last Updated:** 21 Juli 2026

**Dokumentasi:**
- `DOKUMENTASI-LENGKAP-MAMMOGUARD-AI.md` (this file)
- `STATUS-PROYEK-FINAL.md`
- `INTEGRASI-WORKFLOW-PASIEN.md`
- `FIX-EXCEPTION-HANDLING-PROFIL-PASIEN.md`
- `CARA-JALANKAN-CEPAT.md`

---

**🎉 SELAMAT MENGGUNAKAN MAMMOGUARD AI! 🎉**

Sistem siap membantu dokter dalam deteksi dini kanker payudara dengan teknologi AI.

