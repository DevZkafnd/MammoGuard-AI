"""
routes/pasien.py
===============
API endpoints untuk manajemen data pasien mammogram.
Workflow: Input nama → Upload kanan → Upload kiri → Verifikasi → Submit
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from bson import ObjectId

from app.db.koneksi import koleksi_pasien

router = APIRouter(prefix="/pasien", tags=["Pasien"])


# ============================================================================
# Pydantic Models
# ============================================================================

class GambarPasien(BaseModel):
    """Model untuk gambar mammogram (kanan atau kiri)"""
    original_url: Optional[str] = None
    gradcam_url: Optional[str] = None
    brush_url: Optional[str] = None  # Manual annotation by doctor
    prediksi: Optional[str] = None  # "Benign" | "Malignant"
    confidence_score: Optional[float] = None
    bi_rads: Optional[str] = None  # "0" | "1" | "2" | "3" | "4A" | "4B" | "4C" | "5" | "6"


class PasienCreate(BaseModel):
    """Model untuk membuat data pasien baru"""
    nama: str = Field(..., min_length=1, description="Nama lengkap pasien")
    id_pasien: str = Field(..., description="ID pasien (format: PAT-{timestamp})")
    kanan: GambarPasien
    kiri: GambarPasien
    dokter_id: Optional[str] = "dokter"
    catatan: Optional[str] = None


class PasienUpdate(BaseModel):
    """Model untuk update data pasien"""
    nama: Optional[str] = None
    kanan: Optional[GambarPasien] = None
    kiri: Optional[GambarPasien] = None
    catatan: Optional[str] = None
    status: Optional[str] = None  # "pending" | "completed"


class PasienResponse(BaseModel):
    """Model response untuk data pasien"""
    id: str
    id_pasien: str
    nama: str
    kanan: GambarPasien
    kiri: GambarPasien
    dokter_id: str
    tanggal_pemeriksaan: str
    status: str
    catatan: Optional[str] = None
    created_at: str
    updated_at: str


# ============================================================================
# Helper Functions
# ============================================================================

def serialize_pasien(doc: dict) -> dict:
    """Convert MongoDB document to JSON-serializable dict"""
    if not doc:
        return None
    
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    
    # Convert datetime to ISO string
    if "tanggal_pemeriksaan" in doc and doc["tanggal_pemeriksaan"]:
        doc["tanggal_pemeriksaan"] = doc["tanggal_pemeriksaan"].isoformat()
    if "created_at" in doc and doc["created_at"]:
        doc["created_at"] = doc["created_at"].isoformat()
    if "updated_at" in doc and doc["updated_at"]:
        doc["updated_at"] = doc["updated_at"].isoformat()
    
    return doc


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/", response_model=dict, summary="Buat data pasien baru")
async def buat_pasien(pasien: PasienCreate):
    """
    Endpoint untuk menyimpan data pasien baru setelah workflow selesai.
    
    Workflow:
    1. Dokter input nama pasien
    2. Upload mammogram kanan → AI analysis
    3. Upload mammogram kiri → AI analysis
    4. Verifikasi semua data
    5. Submit → API ini dipanggil
    
    Request Body:
    - nama: Nama lengkap pasien
    - id_pasien: ID pasien (format: PAT-{timestamp})
    - kanan: Data gambar mammogram kanan (original, gradcam, prediksi, dll)
    - kiri: Data gambar mammogram kiri (original, gradcam, prediksi, dll)
    - dokter_id: ID dokter yang melakukan analisis
    - catatan: Catatan tambahan (optional)
    
    Returns:
    - status: "sukses"
    - data: Data pasien yang tersimpan
    """
    try:
        # Cek apakah ID pasien sudah ada
        existing = await koleksi_pasien().find_one({"id_pasien": pasien.id_pasien})
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"ID pasien {pasien.id_pasien} sudah ada di database"
            )
        
        # Prepare document untuk MongoDB
        now = datetime.utcnow()
        doc = {
            "id_pasien": pasien.id_pasien,
            "nama": pasien.nama,
            "kanan": pasien.kanan.dict(),
            "kiri": pasien.kiri.dict(),
            "dokter_id": pasien.dokter_id,
            "tanggal_pemeriksaan": now,
            "status": "completed",
            "catatan": pasien.catatan,
            "created_at": now,
            "updated_at": now,
        }
        
        # Insert ke MongoDB
        result = await koleksi_pasien().insert_one(doc)
        
        # Ambil document yang baru disimpan
        saved_doc = await koleksi_pasien().find_one({"_id": result.inserted_id})
        
        return {
            "status": "sukses",
            "pesan": "Data pasien berhasil disimpan",
            "data": serialize_pasien(saved_doc)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error menyimpan data pasien: {str(e)}")


@router.get("/", response_model=dict, summary="List semua pasien")
async def list_pasien(
    limit: int = 100,
    skip: int = 0,
    status: Optional[str] = None,
    dokter_id: Optional[str] = None
):
    """
    Endpoint untuk mengambil list semua pasien dengan pagination.
    
    Query Parameters:
    - limit: Jumlah data maksimal (default: 100)
    - skip: Offset untuk pagination (default: 0)
    - status: Filter by status ("pending" | "completed")
    - dokter_id: Filter by dokter ID
    
    Returns:
    - status: "berhasil"
    - data: Array of pasien
    - total: Total jumlah pasien
    """
    try:
        # Build filter query
        query = {}
        if status:
            query["status"] = status
        if dokter_id:
            query["dokter_id"] = dokter_id
        
        # Get total count
        total = await koleksi_pasien().count_documents(query)
        
        # Get documents
        cursor = koleksi_pasien().find(query).sort("tanggal_pemeriksaan", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        
        # Serialize
        pasien_list = [serialize_pasien(doc) for doc in docs]
        
        # Pastikan URLs lengkap untuk setiap pasien
        for pasien in pasien_list:
            if pasien.get("kanan"):
                if pasien["kanan"].get("original_url") and not pasien["kanan"]["original_url"].startswith("http"):
                    if not pasien["kanan"]["original_url"].startswith("/"):
                        pasien["kanan"]["original_url"] = "/" + pasien["kanan"]["original_url"]
                if pasien["kanan"].get("gradcam_url") and not pasien["kanan"]["gradcam_url"].startswith("http"):
                    if not pasien["kanan"]["gradcam_url"].startswith("/"):
                        pasien["kanan"]["gradcam_url"] = "/" + pasien["kanan"]["gradcam_url"]
                        
            if pasien.get("kiri"):
                if pasien["kiri"].get("original_url") and not pasien["kiri"]["original_url"].startswith("http"):
                    if not pasien["kiri"]["original_url"].startswith("/"):
                        pasien["kiri"]["original_url"] = "/" + pasien["kiri"]["original_url"]
                if pasien["kiri"].get("gradcam_url") and not pasien["kiri"]["gradcam_url"].startswith("http"):
                    if not pasien["kiri"]["gradcam_url"].startswith("/"):
                        pasien["kiri"]["gradcam_url"] = "/" + pasien["kiri"]["gradcam_url"]
        
        return {
            "status": "berhasil",
            "data": pasien_list,
            "total": total,
            "limit": limit,
            "skip": skip
        }
        
    except Exception as e:
        print(f"Error in list_pasien: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail={
                "error": "Internal server error",
                "message": str(e)
            }
        )


@router.get("/{pasien_id}", response_model=dict, summary="Detail satu pasien")
async def detail_pasien(pasien_id: str):
    """
    Endpoint untuk mengambil detail lengkap satu pasien.
    
    Path Parameters:
    - pasien_id: MongoDB ObjectId atau ID pasien (PAT-xxx)
    
    Returns:
    - status: "berhasil"
    - data: Detail pasien dengan semua gambar
    """
    try:
        doc = None
        
        # Try to find by MongoDB _id first
        try:
            obj_id = ObjectId(pasien_id)
            doc = await koleksi_pasien().find_one({"_id": obj_id})
        except Exception as e:
            # If not valid ObjectId, try by id_pasien
            print(f"Not a valid ObjectId, trying id_pasien: {e}")
            pass
        
        # If not found by _id, try by id_pasien
        if not doc:
            doc = await koleksi_pasien().find_one({"id_pasien": pasien_id})
        
        if not doc:
            raise HTTPException(
                status_code=404, 
                detail={
                    "error": "Pasien tidak ditemukan",
                    "pasien_id": pasien_id,
                    "message": f"Tidak ada pasien dengan ID {pasien_id} di database"
                }
            )
        
        # Serialize dan return
        serialized = serialize_pasien(doc)
        
        # Pastikan URLs lengkap untuk gambar
        if serialized.get("kanan"):
            if serialized["kanan"].get("original_url") and not serialized["kanan"]["original_url"].startswith("http"):
                if not serialized["kanan"]["original_url"].startswith("/"):
                    serialized["kanan"]["original_url"] = "/" + serialized["kanan"]["original_url"]
            if serialized["kanan"].get("gradcam_url") and not serialized["kanan"]["gradcam_url"].startswith("http"):
                if not serialized["kanan"]["gradcam_url"].startswith("/"):
                    serialized["kanan"]["gradcam_url"] = "/" + serialized["kanan"]["gradcam_url"]
                    
        if serialized.get("kiri"):
            if serialized["kiri"].get("original_url") and not serialized["kiri"]["original_url"].startswith("http"):
                if not serialized["kiri"]["original_url"].startswith("/"):
                    serialized["kiri"]["original_url"] = "/" + serialized["kiri"]["original_url"]
            if serialized["kiri"].get("gradcam_url") and not serialized["kiri"]["gradcam_url"].startswith("http"):
                if not serialized["kiri"]["gradcam_url"].startswith("/"):
                    serialized["kiri"]["gradcam_url"] = "/" + serialized["kiri"]["gradcam_url"]
        
        return {
            "status": "berhasil",
            "data": serialized
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in detail_pasien: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail={
                "error": "Internal server error",
                "message": str(e),
                "pasien_id": pasien_id
            }
        )


@router.put("/{pasien_id}", response_model=dict, summary="Update data pasien")
async def update_pasien(pasien_id: str, update_data: PasienUpdate):
    """
    Endpoint untuk mengupdate data pasien.
    
    Path Parameters:
    - pasien_id: MongoDB ObjectId atau ID pasien (PAT-xxx)
    
    Request Body:
    - Fields yang ingin diupdate (semua optional)
    
    Returns:
    - status: "sukses"
    - data: Data pasien setelah diupdate
    """
    try:
        # Try to find by MongoDB _id first
        try:
            obj_id = ObjectId(pasien_id)
            doc = await koleksi_pasien().find_one({"_id": obj_id})
        except:
            doc = await koleksi_pasien().find_one({"id_pasien": pasien_id})
        
        if not doc:
            raise HTTPException(status_code=404, detail=f"Pasien dengan ID {pasien_id} tidak ditemukan")
        
        # Prepare update data (only non-None fields)
        update_fields = {}
        if update_data.nama is not None:
            update_fields["nama"] = update_data.nama
        if update_data.kanan is not None:
            update_fields["kanan"] = update_data.kanan.dict()
        if update_data.kiri is not None:
            update_fields["kiri"] = update_data.kiri.dict()
        if update_data.catatan is not None:
            update_fields["catatan"] = update_data.catatan
        if update_data.status is not None:
            update_fields["status"] = update_data.status
        
        # Always update updated_at
        update_fields["updated_at"] = datetime.utcnow()
        
        # Update MongoDB
        await koleksi_pasien().update_one(
            {"_id": doc["_id"]},
            {"$set": update_fields}
        )
        
        # Get updated document
        updated_doc = await koleksi_pasien().find_one({"_id": doc["_id"]})
        
        return {
            "status": "sukses",
            "pesan": "Data pasien berhasil diupdate",
            "data": serialize_pasien(updated_doc)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error mengupdate data pasien: {str(e)}")


@router.delete("/{pasien_id}", response_model=dict, summary="Hapus data pasien")
async def hapus_pasien(pasien_id: str):
    """
    Endpoint untuk menghapus data pasien.
    
    Path Parameters:
    - pasien_id: MongoDB ObjectId atau ID pasien (PAT-xxx)
    
    Returns:
    - status: "sukses"
    - pesan: Konfirmasi penghapusan
    """
    try:
        # Try to find by MongoDB _id first
        try:
            obj_id = ObjectId(pasien_id)
            doc = await koleksi_pasien().find_one({"_id": obj_id})
        except:
            doc = await koleksi_pasien().find_one({"id_pasien": pasien_id})
        
        if not doc:
            raise HTTPException(status_code=404, detail=f"Pasien dengan ID {pasien_id} tidak ditemukan")
        
        # Delete from MongoDB
        await koleksi_pasien().delete_one({"_id": doc["_id"]})
        
        return {
            "status": "sukses",
            "pesan": f"Data pasien {doc['nama']} (ID: {doc['id_pasien']}) berhasil dihapus"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error menghapus data pasien: {str(e)}")
