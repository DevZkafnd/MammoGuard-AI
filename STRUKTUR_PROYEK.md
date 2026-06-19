# Struktur Proyek MammoGuard-AI

Dokumentasi ini menjelaskan struktur lengkap dari proyek MammoGuard-AI.

## Struktur Folder Utama

```
mammoguard-ai/
├── frontend/              # Aplikasi web Next.js dengan TypeScript
├── backend/               # API server FastAPI dengan PyTorch
├── model_ai/              # Skrip AI/ML dan eksperimen
├── .gitignore             # Aturan file yang diabaikan Git
├── docker-compose.yml     # Konfigurasi MongoDB dengan Docker
├── README.md              # Dokumentasi utama proyek
├── KONTRIBUSI.md          # Panduan kontribusi untuk developer
├── PANDUAN_INSTALASI.md   # Panduan instalasi lengkap
└── STRUKTUR_PROYEK.md     # Dokumen ini
```

## Detail Struktur Frontend

```
frontend/
├── app/                   # App Router Next.js
│   ├── page.tsx          # Halaman utama aplikasi
│   ├── layout.tsx        # Layout wrapper untuk semua halaman
│   ├── globals.css       # Styling global dengan Tailwind
│   └── favicon.ico       # Icon aplikasi
│
├── components/           # Komponen React yang reusable
│   └── FormUnggahCitra.tsx   # Form untuk upload citra mammogram
│
├── services/             # Layanan untuk komunikasi dengan API
│   └── apiLayanan.ts     # Fungsi helper untuk fetch ke backend
│
├── public/               # File static (gambar, icon, dll)
│
├── .env.local.example    # Contoh file environment variables
├── .env.local            # File konfigurasi lokal (tidak di-commit)
├── package.json          # Dependensi dan skrip npm
├── tsconfig.json         # Konfigurasi TypeScript
├── tailwind.config.ts    # Konfigurasi Tailwind CSS
└── next.config.ts        # Konfigurasi Next.js
```

### Komponen Frontend Penting

- **FormUnggahCitra**: Komponen untuk upload file citra mammogram dengan validasi
- **apiLayanan**: Service layer untuk komunikasi dengan backend API

## Detail Struktur Backend

```
backend/
├── app/                  # Aplikasi utama FastAPI
│   ├── main.py          # Entry point aplikasi & definisi FastAPI
│   │
│   ├── routes/          # Endpoint API yang dikelompokkan
│   │   ├── __init__.py
│   │   └── analisis.py  # Endpoint untuk upload & analisis citra
│   │
│   ├── db/              # Modul database MongoDB
│   │   ├── __init__.py
│   │   └── koneksi.py   # Konfigurasi koneksi ke MongoDB
│   │
│   └── ml/              # Modul Machine Learning
│       ├── __init__.py
│       └── model.py     # Logika pemuatan & inferensi model PyTorch
│
├── .env.example         # Contoh konfigurasi environment
├── .env                 # File konfigurasi lokal (tidak di-commit)
└── requirements.txt     # Dependensi Python
```

### Modul Backend Penting

- **main.py**: Inisialisasi aplikasi FastAPI dengan CORS middleware
- **routes/analisis.py**: Endpoint untuk upload citra dan ambil riwayat
- **db/koneksi.py**: Konfigurasi koneksi asynchronous ke MongoDB
- **ml/model.py**: Class untuk memuat model PyTorch dan melakukan prediksi

## Detail Struktur Model AI

```
model_ai/
├── skrip_pelatihan/         # Skrip untuk melatih model
│   └── latih_model.py       # Logika training dengan PyTorch
│
├── skrip_praproses/         # Skrip preprocessing dataset
│   └── praproses_citra.py   # Normalisasi & resize citra
│
└── README.md                # Dokumentasi folder model AI
```

### Catatan Penting

⚠️ Folder berikut **TIDAK** boleh di-commit ke repositori:
- `dataset/` - Dataset citra medis (privasi & ukuran)
- `data/raw/` - Data mentah
- `data/processed/` - Data yang sudah diproses
- `*.pth`, `*.pt`, `*.onnx` - File bobot model (ukuran besar)

## Konfigurasi Docker

```yaml
# docker-compose.yml
services:
  mongodb:
    - Port: 27017
    - Database: mammoguard_db
    - Username: admin_medis
    - Password: password_lokal_123 (ganti di production!)
```

## Environment Variables

### Backend (.env)
```bash
MONGODB_URL=mongodb://admin_medis:password_lokal_123@localhost:27017
NAMA_DATABASE=mammoguard_db
JALUR_MODEL=./model_ai/model_terbaik.pth
HOST=0.0.0.0
PORT=8000
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_NAMA_APLIKASI=MammoGuard-AI
```

## Alur Data dalam Sistem

```
1. User mengunggah citra mammogram di Frontend
   ↓
2. Frontend mengirim file ke Backend via API
   ↓
3. Backend melakukan preprocessing citra
   ↓
4. Model PyTorch melakukan inferensi
   ↓
5. Hasil analisis disimpan ke MongoDB
   ↓
6. Backend mengirim response ke Frontend
   ↓
7. Frontend menampilkan hasil ke User
```

## Teknologi yang Digunakan

### Frontend
- **Next.js 15** - Framework React untuk production
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **React 19** - Library UI

### Backend
- **FastAPI** - Modern Python web framework
- **PyTorch** - Deep learning framework
- **Motor** - Async MongoDB driver
- **Uvicorn** - ASGI server
- **Python 3.9+** - Programming language

### Database
- **MongoDB** - NoSQL database
- **Docker** - Containerization

## Port yang Digunakan

- **Frontend**: `http://localhost:3000`
- **Backend**: `http://localhost:8000`
- **MongoDB**: `localhost:27017`

## Konvensi Penamaan

### Python (Backend & Model AI)
- Nama variabel: `nama_variabel` (snake_case)
- Nama fungsi: `nama_fungsi()` (snake_case)
- Nama class: `NamaClass` (PascalCase)
- Konstanta: `NAMA_KONSTANTA` (UPPER_CASE)

### TypeScript (Frontend)
- Nama variabel: `namaVariabel` (camelCase)
- Nama fungsi: `namaFungsi()` (camelCase)
- Nama komponen: `NamaKomponen` (PascalCase)
- Nama interface/type: `NamaTipe` (PascalCase)

## Referensi Tambahan

- [Panduan Instalasi](PANDUAN_INSTALASI.md)
- [Panduan Kontribusi](KONTRIBUSI.md)
- [README Utama](README.md)
