# 🚀 SETUP CLOUDFLARE R2 STORAGE - PANDUAN LENGKAP

## 📋 APA ITU R2?

Cloudflare R2 adalah object storage yang kompatibel dengan AWS S3 API.

**Keunggulan:**
- ✅ **GRATIS** 10GB storage + 1 juta operasi/bulan
- ✅ **TIDAK ADA** biaya egress (bandwidth keluar gratis unlimited!)
- ✅ Compatible dengan AWS S3 SDK (boto3)
- ✅ Global CDN integration
- ✅ Perfect untuk menyimpan model AI (.pth), gambar mammogram, heatmaps

**Perbandingan dengan AWS S3:**
| Fitur | AWS S3 | Cloudflare R2 |
|-------|--------|---------------|
| Storage 10GB | ~$0.23/bulan | **GRATIS** |
| Bandwidth Out | $0.09/GB | **GRATIS** |
| 1M Operations | $0.005 | **GRATIS** |
| **Total Cost** | $$$ | **$0** |

---

## 🔧 STEP-BY-STEP SETUP R2

### STEP 1: Buat Akun Cloudflare (Jika Belum Punya)

1. Buka https://dash.cloudflare.com/sign-up
2. Daftar dengan email Anda (gratis, tidak perlu kartu kredit)
3. Verifikasi email
4. Login ke dashboard

---

### STEP 2: Aktifkan R2 Storage

1. Di dashboard Cloudflare, pilih menu **R2** di sidebar kiri
2. Klik tombol **"Purchase R2 Plan"**
3. Pilih **FREE PLAN** (10GB storage + 1M ops/bulan)
4. Klik **"Purchase"** (tidak akan dikenakan biaya apapun)

---

### STEP 3: Buat Bucket untuk MammoGuard

1. Klik tombol **"Create bucket"**
2. **Bucket name:** `mammoguard-storage` (atau nama lain sesuai keinginan)
3. **Location:** Automatic (recommended) atau pilih region terdekat
4. Klik **"Create bucket"**

---

### STEP 4: Dapatkan R2 API Credentials

#### 4.1 Generate API Token

1. Di menu R2, klik **"Manage R2 API Tokens"**
2. Klik **"Create API Token"**
3. **Token Name:** `MammoGuard API Token`
4. **Permissions:** Pilih **"Admin Read & Write"**
5. **TTL:** Leave default (forever) atau set expiration sesuai kebutuhan
6. **Specific bucket:** Pilih `mammoguard-storage` (lebih aman)
7. Klik **"Create API Token"**

#### 4.2 Copy Credentials (PENTING!)

Setelah membuat token, Anda akan melihat 3 informasi penting:

```
Access Key ID: 1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
Secret Access Key: abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567
```

**⚠️ SANGAT PENTING:**
- Copy dan simpan credentials ini **SEKARANG**!
- Secret Access Key hanya ditampilkan **SEKALI**
- Jika hilang, harus generate token baru

---

### STEP 5: Dapatkan Account ID & Endpoint URL

#### Account ID:
1. Lihat di URL dashboard Anda
2. Format: `https://dash.cloudflare.com/<account_id>/r2`
3. Atau klik profil Anda → **"Account ID"** tercantum di sidebar

#### Endpoint URL:
1. Masuk ke bucket `mammoguard-storage`
2. Di tab **"Settings"**, scroll ke **"Bucket Details"**
3. Copy **"S3 API Endpoint"**
4. Format: `https://<account_id>.r2.cloudflarestorage.com`

---

### STEP 6: (Opsional) Setup Public Access

Jika Anda ingin gambar dapat diakses secara publik:

1. Masuk ke bucket `mammoguard-storage`
2. Klik tab **"Settings"**
3. Scroll ke **"Public Access"**
4. Klik **"Allow Access"**
5. Pilih **"Connect Domain"** ATAU **"Use R2.dev subdomain"**

**Opsi A: R2.dev Subdomain (Termudah)**
- Klik **"Enable R2.dev subdomain"**
- Dapatkan URL: `https://pub-xxxxxxxxxxxx.r2.dev`
- Copy URL ini untuk `R2_PUBLIC_URL`

**Opsi B: Custom Domain**
- Jika Anda punya domain sendiri
- Connect domain Anda ke bucket
- Setup CNAME di Cloudflare DNS

---

## 📝 KONFIGURASI BACKEND

### Option 1: File `.env` (Development)

Buat file `.env` di folder `backend/`:

```bash
# Copy dari .env.example
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
# Database
MONGODB_URL=mongodb://admin_medis:password_lokal_123@localhost:27017
NAMA_DATABASE=mammoguard_db

# Model AI
JALUR_MODEL=./storage/models/ResNetDemo_1782708575_9063396e.pth

# Server
HOST=0.0.0.0
PORT=8000

# ============================================
# CLOUDFLARE R2 STORAGE CONFIGURATION
# ============================================

# Account ID
R2_ACCOUNT_ID=your_account_id_here

# Access Key ID
R2_ACCESS_KEY_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p

# Secret Access Key
R2_SECRET_ACCESS_KEY=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567

# Bucket Name
R2_BUCKET_NAME=mammoguard-storage

# Endpoint URL
R2_ENDPOINT_URL=https://your_account_id.r2.cloudflarestorage.com

# Public URL (opsional)
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxx.r2.dev
```

---

### Option 2: Docker Environment Variables

Jika menggunakan Docker, R2 credentials sudah dikonfigurasi di `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      - R2_ACCOUNT_ID=${R2_ACCOUNT_ID:-}
      - R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID:-}
      - R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY:-}
      - R2_BUCKET_NAME=${R2_BUCKET_NAME:-mammoguard-storage}
      - R2_ENDPOINT_URL=${R2_ENDPOINT_URL:-}
      - R2_PUBLIC_URL=${R2_PUBLIC_URL:-}
```

**Cara pakai:**

1. Buat file `.env` di **ROOT** projek (di luar folder backend/frontend):

```bash
# File: d:\projekan\MammoGuard-AI\.env
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
R2_SECRET_ACCESS_KEY=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567
R2_BUCKET_NAME=mammoguard-storage
R2_ENDPOINT_URL=https://your_account_id.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxx.r2.dev
```

2. Docker Compose akan otomatis membaca file `.env` ini

---

## ✅ VERIFIKASI SETUP

### Test 1: Cek Koneksi R2 dari Backend

```bash
cd backend
venv\Scripts\activate
python
```

```python
import os
import boto3
from dotenv import load_dotenv

load_dotenv()

# Init S3 client
s3 = boto3.client(
    's3',
    endpoint_url=os.getenv("R2_ENDPOINT_URL"),
    aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
    region_name='auto'
)

# List buckets
buckets = s3.list_buckets()
print("Buckets:", [b['Name'] for b in buckets['Buckets']])

# Test upload
with open('test.txt', 'wb') as f:
    f.write(b'Hello R2!')

s3.upload_file('test.txt', 'mammoguard-storage', 'test/test.txt')
print("✅ Upload sukses!")

# Test download
s3.download_file('mammoguard-storage', 'test/test.txt', 'downloaded.txt')
print("✅ Download sukses!")
```

---

### Test 2: Upload via API

```bash
# Upload gambar mammogram
curl -X POST "http://localhost:8000/analisis/unggah" \
  -F "berkas=@path/to/mammogram.png"

# Response harus include:
# "storage_type": "r2"
# "presigned_url": "https://..."
```

---

### Test 3: Upload Model AI

```bash
curl -X POST "http://localhost:8000/model/upload?model_id=resnet50_test&arsitektur=ResNet50&nama_tampilan=ResNet50%20Test&akurasi=90.0" \
  -F "file=@path/to/model.pth"

# Response harus:
# "storage_type": "r2"
# "presigned_url": "https://..."
```

---

## 🔒 KEAMANAN & BEST PRACTICES

### 1. **JANGAN** Commit Credentials ke Git

```bash
# Pastikan .env ada di .gitignore
echo ".env" >> .gitignore
echo "backend/.env" >> .gitignore
```

### 2. Gunakan Token dengan Permissions Minimal

- Untuk production: Buat token per-environment (dev, staging, prod)
- Set expiration date untuk token
- Limit permissions ke bucket tertentu saja

### 3. Rotate Credentials Secara Berkala

- Generate token baru setiap 3-6 bulan
- Delete token lama setelah migration

### 4. Monitor Usage

- Dashboard R2 → Tab **"Metrics"**
- Check storage usage, operations, bandwidth
- Set alerts jika mendekati free tier limit

---

## 💰 BIAYA & LIMITS

### Free Tier (Forever Free):
- ✅ 10 GB storage
- ✅ 1,000,000 Class A operations/month (writes)
- ✅ 10,000,000 Class B operations/month (reads)
- ✅ **UNLIMITED** bandwidth (egress)

### Paid Tier (Jika Exceed Free Tier):
- $0.015/GB storage per month
- $4.50 per million Class A operations
- $0.36 per million Class B operations
- **$0** bandwidth (tetap gratis!)

**Estimasi Biaya MammoGuard (100 pasien/hari):**
- Storage: ~50GB model + gambar = $0.60/bulan
- Operations: ~100K writes + 1M reads = $0 (dalam free tier)
- Bandwidth: Unlimited = $0
- **Total: ~$0.60/bulan** (dibanding AWS S3: ~$50/bulan)

---

## 🐛 TROUBLESHOOTING

### Error: "InvalidAccessKeyId"
**Penyebab:** Access Key salah atau expired
**Solusi:** 
1. Generate token baru di Cloudflare dashboard
2. Update R2_ACCESS_KEY_ID dan R2_SECRET_ACCESS_KEY di `.env`

### Error: "NoSuchBucket"
**Penyebab:** Bucket name salah atau tidak exist
**Solusi:**
1. Cek spelling bucket name di R2 dashboard
2. Update R2_BUCKET_NAME di `.env`

### Error: "SignatureDoesNotMatch"
**Penyebab:** Secret Access Key salah
**Solusi:**
1. Regenerate API token (secret hanya ditampilkan sekali)
2. Update R2_SECRET_ACCESS_KEY di `.env`

### Fallback ke Local Storage
Jika R2 tidak dikonfigurasi, sistem otomatis fallback ke local storage:
```
backend/storage/
├── images/
│   ├── raw/
│   └── heatmaps/
└── models/
```

---

## 📚 RESOURCES

- **R2 Documentation:** https://developers.cloudflare.com/r2/
- **S3 API Compatibility:** https://developers.cloudflare.com/r2/api/s3/
- **Pricing:** https://developers.cloudflare.com/r2/pricing/
- **Boto3 Documentation:** https://boto3.amazonaws.com/v1/documentation/api/latest/guide/s3.html

---

## 🎯 KESIMPULAN

Dengan R2 Storage, MammoGuard mendapatkan:
- ✅ Storage scalable & reliable
- ✅ Cost-effective (gratis untuk most use cases)
- ✅ Global CDN untuk akses cepat
- ✅ Compatibility dengan AWS S3 ecosystem
- ✅ **Hemat hingga 90% dibanding AWS S3!**

**Setup selesai! Backend siap production! 🚀**
