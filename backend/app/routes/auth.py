"""
Endpoint API untuk autentikasi dan manajemen pengguna (dokter/admin)

- POST /auth/login          -> verifikasi kredensial, kembalikan JWT
- GET  /pengguna            -> daftar pengguna (admin)
- POST /pengguna            -> buat akun dokter (admin)
- PUT  /pengguna/{id}       -> ubah akun (admin)
- DELETE /pengguna/{id}     -> hapus akun (admin)

Password disimpan sebagai hash bcrypt. Token menggunakan JWT (PyJWT).
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

from app.db.koneksi import dapatkan_database

router_auth = APIRouter(tags=["Autentikasi & Pengguna"])

# Konfigurasi JWT
JWT_SECRET = os.getenv("JWT_SECRET", "ubah-secret-ini-di-produksi")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))  # 8 jam

security = HTTPBearer(auto_error=True)


# ============================================================
# Skema request
# ============================================================
class LoginRequest(BaseModel):
    email: str
    password: str


class BuatPenggunaRequest(BaseModel):
    nama: str
    email: str
    password: str = Field(min_length=8)
    spesialisasi: str = ""
    status: str = "aktif"
    role: str = "dokter"


class UbahPenggunaRequest(BaseModel):
    nama: Optional[str] = None
    spesialisasi: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=8)


# ============================================================
# Helper password & token
# ============================================================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verifikasi_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def buat_token(pengguna: dict) -> str:
    sekarang = datetime.now(timezone.utc)
    payload = {
        "sub": str(pengguna["_id"]),
        "email": pengguna["email"],
        "role": pengguna.get("role", "dokter"),
        "iat": sekarang,
        "exp": sekarang + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verifikasi_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token sudah kedaluwarsa")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")


# ============================================================
# Dependencies
# ============================================================
async def pengguna_saat_ini(
    kredensial: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    payload = verifikasi_token(kredensial.credentials)
    return payload


async def wajib_admin(pengguna: dict = Depends(pengguna_saat_ini)) -> dict:
    if pengguna.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Akses khusus admin")
    return pengguna


# ============================================================
# Serialisasi pengguna (tanpa password_hash)
# ============================================================
def bersihkan_pengguna(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "nama": doc.get("nama", ""),
        "email": doc.get("email", ""),
        "peran": doc.get("peran", ""),
        "role": doc.get("role", "dokter"),
        "spesialisasi": doc.get("spesialisasi", ""),
        "status": doc.get("status", "aktif"),
        "tanggal_dibuat": doc.get("tanggal_dibuat").isoformat()
        if isinstance(doc.get("tanggal_dibuat"), datetime)
        else doc.get("tanggal_dibuat"),
    }


# ============================================================
# Endpoint autentikasi
# ============================================================
@router_auth.post("/auth/login")
async def login(data: LoginRequest):
    db = dapatkan_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database tidak tersedia")

    pengguna = await db["users"].find_one({"email": data.email.lower()})
    if not pengguna or not verifikasi_password(data.password, pengguna.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Email atau password salah")

    if pengguna.get("status") == "nonaktif":
        raise HTTPException(status_code=403, detail="Akun dinonaktifkan. Hubungi admin.")

    token = buat_token(pengguna)
    return {
        "status": "berhasil",
        "token": token,
        "data": bersihkan_pengguna(pengguna),
    }


@router_auth.get("/auth/saya")
async def profil_saya(pengguna: dict = Depends(pengguna_saat_ini)):
    """Mengembalikan info pengguna dari token (validasi sesi frontend)."""
    return {"status": "berhasil", "data": pengguna}


# ============================================================
# Endpoint manajemen pengguna (admin)
# ============================================================
@router_auth.get("/pengguna")
async def daftar_pengguna(
    role: Optional[str] = Query(None, description="Filter role (dokter/admin)"),
    _admin: dict = Depends(wajib_admin),
):
    db = dapatkan_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database tidak tersedia")

    kueri = {"role": role} if role else {}
    cursor = db["users"].find(kueri).sort("tanggal_dibuat", -1)
    dokumen = await cursor.to_list(length=500)

    return {
        "status": "berhasil",
        "jumlah": len(dokumen),
        "data": [bersihkan_pengguna(d) for d in dokumen],
    }


@router_auth.post("/pengguna")
async def buat_pengguna(data: BuatPenggunaRequest, _admin: dict = Depends(wajib_admin)):
    db = dapatkan_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database tidak tersedia")

    email = data.email.lower()
    if await db["users"].find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email sudah terdaftar")

    peran = "Admin IT" if data.role == "admin" else "Dokter Spesialis"
    dokumen = {
        "nama": data.nama,
        "email": email,
        "password_hash": hash_password(data.password),
        "peran": peran,
        "role": data.role,
        "spesialisasi": data.spesialisasi,
        "status": data.status,
        "tanggal_dibuat": datetime.now(),
    }
    hasil = await db["users"].insert_one(dokumen)
    dokumen["_id"] = hasil.inserted_id

    return {"status": "berhasil", "pesan": "Akun berhasil dibuat", "data": bersihkan_pengguna(dokumen)}


@router_auth.put("/pengguna/{pengguna_id}")
async def ubah_pengguna(
    pengguna_id: str, data: UbahPenggunaRequest, _admin: dict = Depends(wajib_admin)
):
    db = dapatkan_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database tidak tersedia")

    try:
        object_id = ObjectId(pengguna_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Format ID tidak valid")

    perubahan: dict = {}
    if data.nama is not None:
        perubahan["nama"] = data.nama
    if data.spesialisasi is not None:
        perubahan["spesialisasi"] = data.spesialisasi
    if data.status is not None:
        perubahan["status"] = data.status
    if data.password:
        perubahan["password_hash"] = hash_password(data.password)

    if not perubahan:
        raise HTTPException(status_code=400, detail="Tidak ada perubahan yang dikirim")

    hasil = await db["users"].update_one({"_id": object_id}, {"$set": perubahan})
    if hasil.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan")

    dokumen = await db["users"].find_one({"_id": object_id})
    return {"status": "berhasil", "pesan": "Akun berhasil diperbarui", "data": bersihkan_pengguna(dokumen)}


@router_auth.delete("/pengguna/{pengguna_id}")
async def hapus_pengguna(pengguna_id: str, _admin: dict = Depends(wajib_admin)):
    db = dapatkan_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database tidak tersedia")

    try:
        object_id = ObjectId(pengguna_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Format ID tidak valid")

    hasil = await db["users"].delete_one({"_id": object_id})
    if hasil.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan")

    return {"status": "berhasil", "pesan": "Akun berhasil dihapus"}


# ============================================================
# Seeding akun demo (dipanggil saat startup)
# ============================================================
async def seed_pengguna():
    """
    Pastikan akun demo tersedia dengan kredensial yang benar (idempoten).

    Menggunakan upsert per-email agar aman dijalankan berkali-kali dan tidak
    menghapus data pengguna lain yang sudah ada.
    """
    db = dapatkan_database()
    if db is None:
        print("⚠ Seed pengguna dilewati: database tidak tersedia")
        return

    # Pastikan email unik di level index
    try:
        await db["users"].create_index("email", unique=True)
    except Exception as e:
        print(f"⚠ Gagal membuat index email: {e}")

    akun_demo = [
        {
            "nama": "Admin Sistem",
            "email": "admin@mammoguard.id",
            "password": "admin123",
            "peran": "Admin IT",
            "role": "admin",
            "spesialisasi": "",
        },
        {
            "nama": "Dr. Ayu Permata Sari",
            "email": "dr.ayu@mammoguard.id",
            "password": "dokter123",
            "peran": "Dokter Spesialis",
            "role": "dokter",
            "spesialisasi": "Radiologi",
        },
    ]

    for akun in akun_demo:
        await db["users"].update_one(
            {"email": akun["email"]},
            {
                "$set": {
                    "nama": akun["nama"],
                    "password_hash": hash_password(akun["password"]),
                    "peran": akun["peran"],
                    "role": akun["role"],
                    "spesialisasi": akun["spesialisasi"],
                    "status": "aktif",
                },
                "$setOnInsert": {
                    "email": akun["email"],
                    "tanggal_dibuat": datetime.now(),
                },
            },
            upsert=True,
        )
    print(f"✓ Seed pengguna: {len(akun_demo)} akun demo dipastikan tersedia")
