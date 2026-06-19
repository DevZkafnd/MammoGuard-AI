# Panduan Kontribusi

Terima kasih atas minat Anda untuk berkontribusi pada proyek MammoGuard-AI!

## Standar Pesan Commit

Semua commit wajib menggunakan format berikut:

```
[JENIS COMMIT]: Penjelasan detail pekerjaan yang dilakukan
```

### Jenis Commit yang Disetujui

- **INISIALISASI**: Pembuatan awal proyek atau modul baru
- **FITUR**: Penambahan fungsionalitas baru yang sudah berjalan
- **PERBAIKAN**: Perbaikan bug atau kesalahan sistem
- **UBAH**: Refaktor kode, perubahan UI, atau perubahan logika tanpa menambah fitur baru
- **DOKUMEN**: Penambahan atau pembaruan dokumentasi

### Contoh Commit yang Benar

```bash
git commit -m "FITUR: tambah endpoint untuk analisis batch citra"
git commit -m "PERBAIKAN: perbaiki error validasi tipe file pada upload"
git commit -m "UBAH: refaktor fungsi preprocessing untuk performa lebih baik"
git commit -m "DOKUMEN: tambah panduan instalasi untuk windows"
```

### Contoh Commit yang Salah

```bash
# ❌ Tidak ada jenis commit
git commit -m "tambah fitur baru"

# ❌ Menggunakan bahasa Inggris
git commit -m "FEATURE: add new endpoint"

# ❌ Tidak deskriptif
git commit -m "FITUR: update"
```

## Workflow Kontribusi

### 1. Fork Repository

Klik tombol "Fork" di halaman GitHub repository.

### 2. Clone Fork Anda

```bash
git clone https://github.com/USERNAME_ANDA/MammoGuard-AI.git
cd MammoGuard-AI
```

### 3. Buat Branch Baru

```bash
git checkout -b fitur/nama-fitur-anda
```

### 4. Lakukan Perubahan

Pastikan kode Anda:
- Mengikuti konvensi penamaan yang sudah ada
- Menggunakan Bahasa Indonesia untuk variabel dan komentar
- Sudah diuji dan berjalan dengan baik

### 5. Commit Perubahan

```bash
git add .
git commit -m "FITUR: deskripsi detail perubahan yang dilakukan"
```

### 6. Push ke Fork Anda

```bash
git push origin fitur/nama-fitur-anda
```

### 7. Buat Pull Request

- Buka repository asli di GitHub
- Klik "New Pull Request"
- Pilih branch Anda
- Berikan deskripsi lengkap tentang perubahan yang Anda buat

## Standar Kode

### Backend (Python)

- Gunakan nama variabel dan fungsi dalam Bahasa Indonesia
- Ikuti PEP 8 untuk formatting
- Tambahkan docstring untuk fungsi publik
- Gunakan type hints jika memungkinkan

```python
def hitung_akurasi(prediksi: list, target: list) -> float:
    """
    Menghitung akurasi model
    
    Args:
        prediksi: Daftar hasil prediksi
        target: Daftar target sebenarnya
        
    Returns:
        Nilai akurasi dalam persentase
    """
    benar = sum(p == t for p, t in zip(prediksi, target))
    total = len(prediksi)
    return (benar / total) * 100
```

### Frontend (TypeScript)

- Gunakan nama variabel dan fungsi dalam Bahasa Indonesia
- Gunakan TypeScript untuk type safety
- Komponen harus reusable dan well-documented

```typescript
interface PropsKomponen {
  judul: string;
  deskripsi?: string;
  onKlik?: () => void;
}

export default function Komponen({ judul, deskripsi, onKlik }: PropsKomponen) {
  // Implementasi komponen
}
```

## Hal yang Dilarang

❌ **JANGAN commit file berikut:**
- File `.env` yang berisi kredensial
- Dataset citra medis (privasi)
- File model AI (`.pth`, `.pt`, `.onnx`)
- Folder `node_modules/` atau `venv/`

❌ **JANGAN push langsung ke branch `main`**
- Selalu buat branch terpisah untuk fitur/perbaikan

## Testing

Pastikan semua perubahan Anda sudah diuji:

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
npm test
```

## Pertanyaan?

Jika ada pertanyaan, silakan:
- Buat issue di GitHub
- Hubungi maintainer proyek

Terima kasih atas kontribusi Anda! 🎉
