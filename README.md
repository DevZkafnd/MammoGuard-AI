# MammoGuard-AI

Sistem deteksi dini kanker payudara menggunakan kecerdasan buatan berbasis analisis citra mammogram.

## Struktur Proyek

```
mammoguard-ai/
├── frontend/          # Aplikasi antarmuka web (Next.js)
├── backend/           # API Server & Mesin Inferensi AI (FastAPI & PyTorch)
├── model_ai/          # Skrip eksperimen AI, training, dan dataset mentah
├── docker-compose.yml # Skrip untuk inisialisasi MongoDB lokal
├── .gitignore         # Aturan perlindungan file agar tidak masuk ke GitHub
└── README.md          # Dokumentasi utama proyek
```

## Teknologi yang Digunakan

- **Frontend**: Next.js dengan TypeScript dan Tailwind CSS
- **Backend**: FastAPI dengan PyTorch untuk inferensi model AI
- **Database**: MongoDB (via Docker)
- **AI/ML**: PyTorch untuk deep learning

## Cara Menjalankan Proyek

### Prasyarat
- Node.js (versi 18 atau lebih tinggi)
- Python 3.9+
- Docker dan Docker Compose
- Git

### 1. Menjalankan Database MongoDB

```bash
docker-compose up -d
```

### 2. Menjalankan Backend (FastAPI)

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 3. Menjalankan Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

## Standar Konvensi Commit

Gunakan format berikut untuk pesan commit:

- `INISIALISASI`: Pembuatan awal proyek atau modul
- `FITUR`: Penambahan fungsionalitas baru
- `PERBAIKAN`: Perbaikan bug atau kesalahan sistem
- `UBAH`: Refaktor kode atau perubahan logika
- `DOKUMEN`: Pembaruan dokumentasi

Contoh:
```bash
git commit -m "FITUR: tambah endpoint upload citra mammogram"
```

## Keamanan dan Privasi

⚠️ **PENTING**: Jangan pernah commit file berikut ke repositori:
- File `.env` yang berisi kredensial
- Dataset citra medis (privasi pasien)
- File model AI berukuran besar (`.pth`, `.pt`)

## Lisensi

Proyek ini dikembangkan untuk tujuan penelitian dan edukasi.
