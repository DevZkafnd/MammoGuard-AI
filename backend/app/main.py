"""
Aplikasi utama FastAPI untuk MammoGuard-AI
Sistem deteksi dini kanker payudara menggunakan analisis citra mammogram
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

aplikasi = FastAPI(
    title="MammoGuard-AI API",
    description="API untuk analisis citra mammogram menggunakan kecerdasan buatan",
    version="1.0.0"
)

# Konfigurasi CORS untuk mengizinkan frontend mengakses API
aplikasi.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # URL frontend Next.js
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@aplikasi.get("/")
async def halaman_utama():
    """Endpoint utama untuk memeriksa status server"""
    return {
        "pesan": "Selamat datang di MammoGuard-AI API",
        "status": "berjalan",
        "versi": "1.0.0"
    }

@aplikasi.get("/kesehatan")
async def cek_kesehatan():
    """Endpoint untuk memeriksa kesehatan sistem"""
    return {
        "status": "sehat",
        "layanan": "aktif"
    }
