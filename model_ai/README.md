# Folder Model AI

Folder ini berisi skrip untuk eksperimen, pelatihan model, dan pengelolaan dataset.

## Struktur

```
model_ai/
├── notebooks/          # Jupyter notebooks untuk eksperimen
├── skrip_pelatihan/   # Skrip Python untuk melatih model
├── skrip_praproses/   # Skrip untuk preprocessing dataset
└── README.md
```

## Catatan Penting

⚠️ **Dataset dan model yang sudah dilatih TIDAK boleh di-commit ke repositori.**

Dataset dan file model (`.pth`, `.pt`) harus:
- Disimpan di penyimpanan cloud (Google Drive, AWS S3, dll)
- Atau disimpan lokal di folder yang sudah masuk dalam `.gitignore`

## Penggunaan

1. Letakkan dataset di folder yang sudah di-gitignore (contoh: `data/raw/`)
2. Jalankan skrip preprocessing untuk mempersiapkan data
3. Jalankan skrip pelatihan untuk melatih model
4. Simpan model terbaik dan catat metrik performanya
5. Model yang sudah dilatih dapat dimuat di backend untuk inferensi
