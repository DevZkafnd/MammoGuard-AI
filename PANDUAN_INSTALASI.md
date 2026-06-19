# Panduan Instalasi MammoGuard-AI

Dokumen ini berisi panduan lengkap untuk instalasi dan menjalankan proyek MammoGuard-AI.

## Prasyarat Sistem

Pastikan sistem Anda telah terinstal:

- **Node.js** versi 18 atau lebih tinggi ([Unduh di sini](https://nodejs.org/))
- **Python** versi 3.9 atau lebih tinggi ([Unduh di sini](https://www.python.org/downloads/))
- **Docker Desktop** ([Unduh di sini](https://www.docker.com/products/docker-desktop))
- **Git** ([Unduh di sini](https://git-scm.com/downloads))

## Langkah 1: Clone Repositori

```bash
git clone https://github.com/DevZkafnd/MammoGuard-AI.git
cd MammoGuard-AI
```

## Langkah 2: Instalasi Backend (FastAPI)

### 2.1 Buat Virtual Environment

```bash
cd backend
python -m venv venv
```

### 2.2 Aktifkan Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

### 2.3 Instalasi Dependensi Python

```bash
pip install -r requirements.txt
```

### 2.4 Konfigurasi Environment Variables

Salin file `.env.example` menjadi `.env`:

```bash
copy .env.example .env
```

Edit file `.env` sesuai kebutuhan Anda.

## Langkah 3: Instalasi Frontend (Next.js)

```bash
cd ../frontend
npm install
```

### 3.1 Konfigurasi Environment Variables Frontend

Salin file `.env.local.example` menjadi `.env.local`:

```bash
copy .env.local.example .env.local
```

## Langkah 4: Jalankan Database MongoDB

Pastikan Docker Desktop sudah berjalan, kemudian di folder root proyek:

```bash
cd ..
docker-compose up -d
```

Perintah ini akan menjalankan MongoDB di container Docker.

## Langkah 5: Menjalankan Aplikasi

### 5.1 Jalankan Backend

Buka terminal pertama:

```bash
cd backend
# Aktifkan venv jika belum
venv\Scripts\activate
# Jalankan server
uvicorn app.main:aplikasi --reload --port 8000
```

Server backend akan berjalan di: `http://localhost:8000`

### 5.2 Jalankan Frontend

Buka terminal kedua:

```bash
cd frontend
npm run dev
```

Aplikasi web akan berjalan di: `http://localhost:3000`

## Verifikasi Instalasi

1. Buka browser dan akses `http://localhost:3000`
2. Anda akan melihat halaman utama MammoGuard-AI
3. Cek endpoint API di `http://localhost:8000/docs` untuk melihat dokumentasi API interaktif

## Troubleshooting

### MongoDB Gagal Terhubung

- Pastikan Docker Desktop sudah berjalan
- Jalankan `docker-compose ps` untuk melihat status container
- Restart container: `docker-compose restart`

### Port Sudah Digunakan

Jika port 8000 atau 3000 sudah digunakan, Anda bisa mengubahnya:

**Backend:** Tambahkan flag `--port` saat menjalankan uvicorn
```bash
uvicorn app.main:aplikasi --reload --port 8001
```

**Frontend:** Ubah port di `package.json` atau jalankan dengan:
```bash
npm run dev -- -p 3001
```

### Error Instalasi Python Dependencies

Jika mengalami error saat instalasi PyTorch:
- Kunjungi [pytorch.org](https://pytorch.org/get-started/locally/)
- Pilih konfigurasi sesuai sistem Anda
- Gunakan command instalasi yang disediakan

## Pengembangan Selanjutnya

Setelah instalasi berhasil, Anda dapat:
1. Melatih model AI di folder `model_ai/`
2. Mengembangkan endpoint baru di `backend/app/routes/`
3. Menambah komponen UI di `frontend/components/`

## Bantuan

Jika mengalami masalah, silakan buat issue di [GitHub Repository](https://github.com/DevZkafnd/MammoGuard-AI/issues).
