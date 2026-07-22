"""
Aplikasi utama FastAPI untuk MammoGuard-AI
Sistem deteksi dini kanker payudara menggunakan analisis citra mammogram
"""

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

# Import router dan database (setelah load_dotenv agar env vars sudah tersedia)
from app.routes.analisis import router_analisis
from app.routes.model_management import router_model, muat_ulang_model_aktif_dari_db
from app.routes.auth import router_auth, seed_pengguna
from app.routes.pasien import router as router_pasien
from app.db.koneksi import hubungkan_database, putuskan_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage aplikasi lifecycle - startup dan shutdown"""
    # Startup
    await hubungkan_database()
    await seed_pengguna()
    # Muat kembali model yang aktif di DB agar tetap 'nyambung' setelah restart
    await muat_ulang_model_aktif_dari_db()
    yield
    # Shutdown
    await putuskan_database()

aplikasi = FastAPI(
    title="MammoGuard-AI API",
    description="API untuk analisis citra mammogram menggunakan kecerdasan buatan",
    version="1.0.0",
    lifespan=lifespan
)

# Konfigurasi CORS untuk mengizinkan frontend mengakses API
aplikasi.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],  # URL frontend Next.js
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files untuk storage lokal
if os.path.exists("./storage"):
    aplikasi.mount("/storage", StaticFiles(directory="./storage"), name="storage")

# Register routers
aplikasi.include_router(router_auth)
aplikasi.include_router(router_analisis)
aplikasi.include_router(router_model)
aplikasi.include_router(router_pasien)

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
