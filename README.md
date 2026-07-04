# MammoGuard-AI

MammoGuard-AI adalah sistem analisis mammogram berbasis AI yang terdiri dari frontend web, API Gateway, dan AI Inference Server yang dipisah.

## Ringkasan Status

- Sistem memiliki arsitektur dual-backend (API Gateway & AI Inference). Backend utama menggunakan FastAPI + MongoDB + JWT. Backend AI diisolasi khusus untuk eksekusi PyTorch.
- Endpoint integrasi utama tetap berada di `/api/v1/*` pada `backend-main`.
- File model `.pth` dan citra mammogram tidak lagi disimpan di MongoDB, tetapi di Object Storage S3-compatible menggunakan Presigned URL.
- Backend utama berperan sebagai konduktor: auth, audit log, metadata database, dan orkestrasi request ke `backend-ai`.
- Backend AI tidak memakai JWT atau MongoDB, dan hanya fokus pada warm-up model serta inferensi.

## Struktur Proyek

```text
MammoGuard-AI/
|-- frontend/          # Aplikasi web (Next.js)
|-- backend-main/      # API Gateway, Auth, dan koneksi MongoDB
|-- backend-ai/        # Inference Server lokal (PyTorch, boto3)
|-- model_ai/          # Eksperimen/training model AI, bukan runtime service
|-- docker-compose.yml # MongoDB + backend-main + backend-ai
|-- .gitignore         # Aturan file/folder yang tidak boleh di-commit
`-- README.md          # Dokumentasi utama proyek
```

## Stack Teknologi

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend Main: FastAPI, Uvicorn, Pydantic v2, Motor, JWT
- Backend AI: FastAPI, PyTorch, Torchvision, boto3
- Database: MongoDB
- Storage eksternal: Cloudflare R2 / S3 Compatible Object Storage
- Medical image support: DICOM via `pydicom`
- Report/export: CSV export dan PDF report via `reportlab`

## Arsitektur Backend

### backend-main

- Menangani autentikasi JWT, refresh token, dan role guard
- Menyimpan metadata user, model, analisis, audit log, dan riwayat pasien di MongoDB
- Membuat Presigned URL upload/download untuk frontend
- Mengirim request internal ke `backend-ai` saat aktivasi model dan proses analisis

### backend-ai

- Mengunduh file model dari Object Storage ke memori saat warm-up
- Memuat model aktif ke variabel global `ACTIVE_MODEL` runtime
- Mengunduh citra mammogram dari Object Storage saat inferensi
- Menjalankan prediksi PyTorch dan mengembalikan hasil deteksi, confidence, dan heatmap ke `backend-main`

## Fitur Utama Yang Sudah Terdokumentasi

### Auth dan Role

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- Role aktif saat ini: `admin` dan `doctor`

### Admin

- CRUD akun dokter melalui `/api/v1/doctors`
- Inisialisasi upload model melalui `/api/v1/models/upload`
- Aktivasi model melalui `/api/v1/models/{model_id}/activate`
- Penghapusan metadata model nonaktif

### Dokter

- Dashboard statistik dokter
- Inisialisasi upload citra melalui `/api/v1/analysis/upload`
- Finalisasi/proses inferensi melalui `/api/v1/analysis/{analysis_id}/process`
- Workspace detail analisis
- Protected download link untuk citra original dan heatmap
- Validasi hasil AI oleh dokter
- Riwayat pasien dengan pagination
- Export CSV dan PDF report

## Endpoint Utama

### Health

- `GET /api/health` pada `backend-main`
- `GET /api/health` pada `backend-ai`

### Admin - Doctors

- `GET /api/v1/doctors`
- `POST /api/v1/doctors`
- `PUT /api/v1/doctors/{doctor_id}`
- `DELETE /api/v1/doctors/{doctor_id}`

### Admin - Models

- `GET /api/v1/models`
- `POST /api/v1/models/upload`
- `GET /api/v1/models/{model_id}`
- `PATCH /api/v1/models/{model_id}/activate`
- `DELETE /api/v1/models/{model_id}`

### Doctor Portal

- `GET /api/v1/doctor/dashboard-stats`
- `POST /api/v1/analysis/upload`
- `POST /api/v1/analysis/{analysis_id}/process`
- `GET /api/v1/analysis/{analysis_id}`
- `GET /api/v1/analysis/{analysis_id}/original-image`
- `GET /api/v1/analysis/{analysis_id}/heatmap-image`
- `PUT /api/v1/analysis/{analysis_id}/validate`
- `GET /api/v1/patients/history`
- `GET /api/v1/patients/history/export`
- `GET /api/v1/patients/history/{analysis_id}`
- `GET /api/v1/patients/history/{analysis_id}/pdf`

### Internal AI Service

- `POST /api/ai/setup`
- `POST /api/ai/predict`

## Penyimpanan File dan Model

Semua file biner (citra mammogram, heatmap resolusi tinggi, dan file model `.pth`) disimpan secara eksternal di Object Storage (Cloudflare R2/S3 Compatible) menggunakan mekanisme Presigned URL untuk efisiensi memori.

- MongoDB hanya menyimpan metadata dan object key seperti `storage_key`, `original_image_key`, dan `heatmap_image_key`
- Frontend mengunggah file langsung ke object storage menggunakan URL bertanda tangan
- Backend utama hanya menyimpan referensi file, bukan data binernya
- Folder `model_ai/` tetap berfungsi sebagai tempat eksperimen/training, bukan runtime storage

## Format Request Penting

### Login

`POST /api/v1/auth/login` masih memakai `OAuth2PasswordRequestForm`, jadi request dikirim sebagai `form-data`.

- `username` = email user
- `password` = password user

### Upload Analisis

`POST /api/v1/analysis/upload` sekarang tidak menerima multipart form-data. Endpoint ini memakai JSON payload untuk membuat Presigned URL upload.

Contoh payload:

```json
{
  "patient_name": "Siti Aminah",
  "patient_id": "PAT-001",
  "scan_view": "L CC",
  "file_name": "scan-left.dcm",
  "content_type": "application/dicom"
}
```

Setelah file berhasil di-upload langsung ke Object Storage, panggil endpoint `POST /api/v1/analysis/{analysis_id}/process` dengan body berikut:

```json
{
  "object_key": "patients/PAT-001/uploads/scan-left-ab12cd34.dcm"
}
```

### Upload Model AI

`POST /api/v1/models/upload` sekarang tidak menerima multipart form-data. Endpoint ini memakai JSON payload standar untuk menginisiasi Presigned URL.

Contoh payload:

```json
{
  "model_name": "resnet50-mammogram",
  "model_version": "v1",
  "file_name": "resnet50-v1.pth",
  "content_type": "application/octet-stream"
}
```

Setelah frontend mengunggah file `.pth` ke URL yang diberikan, admin dapat mengaktifkan model lewat endpoint aktivasi.

## Alur Aktivasi Model

1. Admin memanggil `POST /api/v1/models/upload` untuk meminta Presigned URL.
2. Frontend mengunggah file `.pth` langsung ke Object Storage.
3. Admin memanggil `PATCH /api/v1/models/{model_id}/activate`.
4. `backend-main` menandai model aktif di MongoDB lalu memanggil `POST http://backend-ai:8001/api/ai/setup`.
5. `backend-ai` mengunduh file model dari Object Storage, membersihkan model lama dari memori, dan memuat model baru ke runtime.

## Alur Analisis Citra

1. Dokter memanggil `POST /api/v1/analysis/upload` untuk mendapatkan Presigned URL upload citra.
2. Frontend dokter mengunggah file mammogram langsung ke Object Storage.
3. Frontend memanggil `POST /api/v1/analysis/{analysis_id}/process`.
4. `backend-main` mengirim request ke `backend-ai` melalui `POST /api/ai/predict`.
5. `backend-ai` mengunduh citra dari Object Storage, menjalankan inferensi, lalu mengembalikan JSON hasil prediksi.
6. `backend-main` menyimpan hasil AI, heatmap, dan metadata analisis ke MongoDB/Object Storage.
7. Dokter memvalidasi hasil akhir melalui endpoint validate.

## Cara Menjalankan Lokal

### Standardisasi Environment

- Gunakan `.env.example` di root repo sebagai referensi utama seluruh kebutuhan sistem
- Gunakan `backend-main/.env.example` untuk environment service API Gateway
- Gunakan `backend-ai/.env.example` untuk environment service inference
- Parameter yang wajib sinkron di kedua backend adalah kredensial R2/S3: `R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, dan `R2_REGION`
- Untuk komunikasi internal Docker, `backend-main` harus mengarah ke `BACKEND_AI_URL=http://backend-ai:8001`

### Opsi 1 - Docker Compose

```bash
docker-compose up --build
```

Service yang dijalankan:

- `mongodb` di port `27017`
- `backend-main` di port `8000`
- `backend-ai` di port `8001`

### Opsi 2 - Manual

#### backend-main

```bash
cd backend-main
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### backend-ai

```bash
cd backend-ai
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Pastikan kredensial R2/Object Storage di kedua service konsisten.

## Swagger dan Testing

- Swagger `backend-main`: `http://127.0.0.1:8000/docs`
- Swagger `backend-ai`: `http://127.0.0.1:8001/docs`
- Health `backend-main`: `http://127.0.0.1:8000/api/health`
- Health `backend-ai`: `http://127.0.0.1:8001/api/health`
- Collection Postman siap impor: `docs/postman/MammoGuard-AI-Presigned-Flow.postman_collection.json`

Flow test minimum:

1. Login admin dari Swagger `backend-main`
2. Buat akun dokter
3. Inisialisasi upload model dan upload file `.pth` ke Presigned URL
4. Aktivasi model dan cek respons warm-up dari `backend-ai`
5. Login sebagai dokter
6. Inisialisasi upload citra dan upload file mammogram ke Presigned URL
7. Jalankan endpoint process untuk memicu inferensi
8. Validasi hasil analisis

### Alur Uji Presigned URL

Langkah A - Inisialisasi:

- Panggil endpoint `backend-main` untuk mendaftarkan metadata dan meminta Presigned URL
- Untuk model gunakan `POST /api/v1/models/upload`
- Untuk citra gunakan `POST /api/v1/analysis/upload`

Langkah B - Unggah Langsung:

- Gunakan `HTTP PUT` langsung ke URL presigned yang dikembalikan backend
- File model `.pth` dan citra medis tidak lagi dikirim ke endpoint FastAPI utama
- Tahap ini paling nyaman diuji lewat Postman collection karena request body berupa file biner langsung ke URL storage

Langkah C - Proses / Inferensi:

- Setelah upload sukses, panggil endpoint proses di `backend-main`
- Untuk model lanjutkan dengan `PATCH /api/v1/models/{model_id}/activate`
- Untuk citra lanjutkan dengan `POST /api/v1/analysis/{analysis_id}/process`
- `backend-main` lalu akan memanggil `backend-ai` secara internal

## Akun Admin Bootstrap

Saat `backend-main` startup, sistem otomatis membuat akun admin awal jika email tersebut belum ada di database.

- Email default: `admin@mammoguard.id`
- Password default: `Admin@12345`
- Role: `admin`

Ganti kredensial ini sebelum dipakai di lingkungan non-lokal.

## Keamanan dan Privasi

- Jangan commit file `.env`
- Jangan commit dataset citra medis pasien
- Jangan commit file `.pth`, `.pt`, dan artefak model besar
- Semua endpoint sensitif tetap wajib diproteksi JWT dan role guard
- File image/heatmap hanya diakses melalui endpoint backend yang mengeluarkan signed download URL

## Catatan

- Endpoint `/api/v1/*` tetap menjadi baseline utama untuk integrasi frontend dan dokumentasi skripsi
- Beberapa file/folder lama masih bisa tersisa sementara selama proses migrasi workspace lokal, tetapi arsitektur target yang dipakai sekarang adalah `backend-main` dan `backend-ai`

## Lisensi

Proyek ini dikembangkan untuk kebutuhan penelitian dan edukasi.
