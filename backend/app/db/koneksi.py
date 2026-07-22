"""
Konfigurasi koneksi ke MongoDB menggunakan Motor (driver asynchronous)
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient

# Konfigurasi koneksi database
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://admin_medis:password_lokal_123@localhost:27017")
NAMA_DATABASE = os.getenv("NAMA_DATABASE", "mammoguard_db")

klien_database = None
database = None

async def hubungkan_database():
    """Membuat koneksi ke MongoDB"""
    global klien_database, database
    
    klien_database = AsyncIOMotorClient(MONGODB_URL)
    database = klien_database[NAMA_DATABASE]
    
    print(f"✓ Berhasil terhubung ke database: {NAMA_DATABASE}")

async def putuskan_database():
    """Menutup koneksi ke MongoDB"""
    global klien_database
    
    if klien_database:
        klien_database.close()
        print("✓ Koneksi database ditutup")

def dapatkan_database():
    """Mendapatkan instance database untuk digunakan di endpoint"""
    return database


def koleksi_analisis():
    """Mendapatkan koleksi 'analisis' dari database"""
    return database["analisis"]


def koleksi_model():
    """Mendapatkan koleksi 'model_ai' dari database"""
    return database["model_ai"]


def koleksi_pasien():
    """Mendapatkan koleksi 'pasien' dari database"""
    return database["pasien"]
