"""
Endpoint API untuk manajemen model AI (upload, switch, download dari R2)
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Depends
from fastapi.responses import JSONResponse, FileResponse
from datetime import datetime
from typing import List, Optional
import io
import os
import torch
import traceback
import json

from app.utils.r2_storage import r2_storage
from app.ml.model import PemuatModel
from app.db.koneksi import dapatkan_database
from app.routes.auth import wajib_admin

router_model = APIRouter(
    prefix="/model",
    tags=["Model Management"]
)

# Global model manager
model_aktif = {
    "model_id": None,
    "model_loader": None,
    "model_info": None
}


async def _muat_model_ke_memori(model_doc: dict):
    """
    Memuat sebuah model (dari dokumen DB) ke memori: unload model lama,
    unduh dari R2/lokal, load ke memori, lalu set global model_aktif.

    Dipakai oleh switch_model, auto-load saat startup, dan lazy-load saat inferensi.
    Mengembalikan PemuatModel yang sudah dimuat.
    """
    model_id = model_doc.get("model_id")

    # Unload model lama (jika ada)
    if model_aktif.get("model_loader") is not None:
        print(f"🔄 Unloading model lama: {model_aktif.get('model_id')}")
        try:
            model_aktif["model_loader"].model = None
        except Exception:
            pass
        model_aktif["model_loader"] = None
        import gc
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    storage_info = model_doc.get("storage_info", {})

    if storage_info.get("storage_type") == "r2":
        import tempfile
        temp_dir = tempfile.gettempdir()
        jalur_model = os.path.join(temp_dir, f"model_{model_id}.pth")

        object_key = storage_info.get("object_key")
        if not object_key:
            raise ValueError("Object key tidak ditemukan di storage info")

        presigned_url = r2_storage.generate_presigned_download_url(
            object_key=object_key,
            expiration=3600
        )
        if not presigned_url:
            raise ValueError("Gagal generate presigned URL untuk download")

        import requests
        response = requests.get(presigned_url, stream=True)
        if response.status_code != 200:
            raise ValueError(f"Gagal download model dari R2: HTTP {response.status_code}")

        with open(jalur_model, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"✓ Model diunduh ke: {jalur_model}")
    else:
        jalur_model = storage_info.get("file_path")
        if not jalur_model or not os.path.exists(jalur_model):
            raise ValueError("File model tidak ditemukan di storage lokal")

    pemuat = PemuatModel(jalur_model)
    pemuat.muat_model()

    model_aktif["model_id"] = model_id
    model_aktif["model_loader"] = pemuat
    model_aktif["model_info"] = {
        "model_id": model_id,
        "nama": model_doc.get("nama"),
        "arsitektur": model_doc.get("arsitektur"),
        "akurasi": model_doc.get("akurasi"),
        "jalur": jalur_model,
    }
    return pemuat


async def muat_ulang_model_aktif_dari_db():
    """
    Memuat kembali model yang ditandai aktif di DB ke memori.

    Dipanggil saat startup (agar aktivasi tetap 'nyambung' setelah restart) dan
    sebagai lazy-load ketika inferensi menemukan belum ada model di memori.
    """
    if model_aktif.get("model_loader") is not None:
        return model_aktif["model_loader"]

    db = dapatkan_database()
    if db is None:
        return None

    model_doc = await db["models"].find_one({"aktif": True})
    if not model_doc:
        return None

    try:
        print(f"⚙ Memuat ulang model aktif dari DB: {model_doc.get('model_id')}")
        return await _muat_model_ke_memori(model_doc)
    except Exception as e:
        print(f"⚠ Gagal memuat ulang model aktif: {e}")
        return None

@router_model.get("/list")
async def list_model():
    """
    Mendapatkan daftar semua model yang tersedia di database
    """
    try:
        db = dapatkan_database()
        if db is None:
            raise HTTPException(
                status_code=503,
                detail="Database tidak tersedia"
            )
        
        # Ambil semua model dari database
        cursor = db["models"].find().sort("tanggal_upload", -1)
        models = await cursor.to_list(length=100)
        
        # Convert ObjectId ke string
        for model in models:
            model["_id"] = str(model["_id"])
        
        # Tambahkan informasi model aktif
        model_aktif_id = model_aktif.get("model_id")
        for model in models:
            model["sedang_digunakan"] = (model.get("model_id") == model_aktif_id)
        
        return {
            "status": "berhasil",
            "jumlah": len(models),
            "model_aktif": model_aktif_id,
            "data": models
        }
    
    except Exception as e:
        print(f"Error list model: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Terjadi kesalahan: {str(e)}"
        )

@router_model.post("/upload")
async def upload_model(
    file: UploadFile = File(...),
    model_id: str = Query(..., description="ID unik model"),
    arsitektur: str = Query(..., description="Arsitektur model (ResNet50, DenseNet121, dll)"),
    nama_tampilan: str = Query(..., description="Nama tampilan model"),
    akurasi: float = Query(..., description="Akurasi validasi (%)"),
    catatan: Optional[str] = Query(None, description="Catatan opsional"),
    _admin: dict = Depends(wajib_admin)
):
    """
    Upload model .pth ke R2 Storage dan simpan metadata ke database
    
    Flow:
    1. Validasi file .pth
    2. Upload ke R2 Storage (folder: models/)
    3. Simpan metadata ke MongoDB
    4. Return info model
    """
    try:
        # Validasi file extension
        if not file.filename or not file.filename.endswith('.pth'):
            raise HTTPException(
                status_code=400,
                detail="File harus berformat .pth (PyTorch model)"
            )
        
        # Validasi ukuran file (max 500MB untuk model)
        max_size = 500 * 1024 * 1024  # 500MB
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        
        if file_size > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"Ukuran file terlalu besar. Maksimal 500MB, file Anda: {file_size / 1024 / 1024:.2f}MB"
            )
        
        # Baca file content
        file_content = await file.read()
        
        # Validasi bahwa file adalah valid PyTorch model
        try:
            # Test load model untuk validasi
            buffer = io.BytesIO(file_content)
            torch.load(buffer, map_location='cpu')
            print("✓ File .pth berhasil divalidasi")
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"File .pth tidak valid atau corrupt: {str(e)}"
            )
        
        # Upload ke R2 Storage
        hasil_upload = await r2_storage.upload_file(
            file_content=file_content,
            original_filename=file.filename,
            folder="models"
        )
        
        # Generate presigned download URL
        presigned_url = None
        if hasil_upload.get("storage_type") == "r2":
            presigned_url = r2_storage.generate_presigned_download_url(
                object_key=hasil_upload.get("object_key"),
                expiration=3600 * 24,  # 24 jam
                filename=file.filename
            )
        
        # Simpan metadata ke MongoDB
        db = dapatkan_database()
        if db is not None:
            model_metadata = {
                "model_id": model_id,
                "nama": nama_tampilan,
                "arsitektur": arsitektur,
                "akurasi": f"{akurasi}%",
                "file_name": file.filename,
                "ukuran": f"{file_size / 1024 / 1024:.1f} MB",
                "storage_info": hasil_upload,
                "presigned_url": presigned_url,
                "catatan": catatan,
                "tanggal_upload": datetime.now(),
                "aktif": False,
                "sedang_digunakan": False
            }
            
            result = await db["models"].insert_one(model_metadata)
            model_metadata["_id"] = str(result.inserted_id)
        
        return {
            "status": "berhasil",
            "pesan": "Model berhasil diupload ke R2 Storage",
            "data": {
                "model_id": model_id,
                "nama": nama_tampilan,
                "arsitektur": arsitektur,
                "file_name": file.filename,
                "ukuran": f"{file_size / 1024 / 1024:.1f} MB",
                "storage": hasil_upload,
                "presigned_url": presigned_url
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error upload model: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Terjadi kesalahan tidak terduga: {str(e)}"
        )

@router_model.post("/switch/{model_id}")
async def switch_model(model_id: str, _admin: dict = Depends(wajib_admin)):
    """
    Switch model aktif (unload model lama, download & load model baru dari R2)
    
    Flow sesuai instruksi:
    1. Unload model lama dari memori (garbage collection)
    2. Download model baru dari R2 ke temp storage
    3. Load model baru ke memori
    4. Update status di database
    
    PENTING: Hanya 1 model yang ada di memori pada satu waktu!
    """
    try:
        db = dapatkan_database()
        if db is None:
            raise HTTPException(
                status_code=503,
                detail="Database tidak tersedia"
            )
        
        # Cari info model yang akan diaktifkan
        model_doc = await db["models"].find_one({"model_id": model_id})
        if not model_doc:
            raise HTTPException(
                status_code=404,
                detail=f"Model dengan ID '{model_id}' tidak ditemukan"
            )

        # Unload lama + download + load baru ke memori (helper bersama)
        try:
            await _muat_model_ke_memori(model_doc)
            print("✓ Model baru berhasil di-load ke memori")
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Gagal load model ke memori: {str(e)}"
            )

        jalur_model = model_aktif.get("model_info", {}).get("jalur")

        # Update status di database
        # Set semua model aktif = False
        await db["models"].update_many(
            {},
            {"$set": {"aktif": False, "sedang_digunakan": False}}
        )
        
        # Set model ini aktif = True
        await db["models"].update_one(
            {"model_id": model_id},
            {
                "$set": {
                    "aktif": True,
                    "sedang_digunakan": True,
                    "waktu_aktivasi": datetime.now()
                }
            }
        )
        
        return {
            "status": "berhasil",
            "pesan": f"Model '{model_doc.get('nama')}' berhasil diaktifkan",
            "data": {
                "model_id": model_id,
                "nama": model_doc.get("nama"),
                "arsitektur": model_doc.get("arsitektur"),
                "akurasi": model_doc.get("akurasi"),
                "jalur_model": jalur_model,
                "model_sebelumnya_unloaded": True,
                "model_baru_loaded": True
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error switch model: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Terjadi kesalahan tidak terduga: {str(e)}"
        )

@router_model.get("/active")
async def get_active_model():
    """
    Mendapatkan informasi model yang sedang aktif
    """
    if model_aktif.get("model_id") is None:
        return {
            "status": "tidak ada model aktif",
            "data": None
        }
    
    return {
        "status": "berhasil",
        "data": model_aktif.get("model_info")
    }

@router_model.get("/download/{model_id}")
async def download_model(model_id: str, _admin: dict = Depends(wajib_admin)):
    """
    Menyediakan link/berkas untuk mengunduh file model (.pth).

    - Storage R2: generate presigned download URL yang FRESH (URL yang tersimpan
      saat upload sudah kedaluwarsa setelah 24 jam), lalu kembalikan sebagai download_url.
    - Storage lokal: kembalikan file langsung sebagai FileResponse.
    """
    try:
        db = dapatkan_database()
        if db is None:
            raise HTTPException(status_code=503, detail="Database tidak tersedia")

        model_doc = await db["models"].find_one({"model_id": model_id})
        if not model_doc:
            raise HTTPException(
                status_code=404,
                detail=f"Model dengan ID '{model_id}' tidak ditemukan"
            )

        storage_info = model_doc.get("storage_info", {})
        file_name = model_doc.get("file_name", f"{model_id}.pth")

        if storage_info.get("storage_type") == "r2":
            object_key = storage_info.get("object_key")
            if not object_key:
                raise HTTPException(
                    status_code=500,
                    detail="Object key tidak ditemukan di storage info"
                )

            download_url = r2_storage.generate_presigned_download_url(
                object_key=object_key,
                expiration=3600,  # 1 jam
                filename=file_name
            )
            if not download_url:
                raise HTTPException(
                    status_code=500,
                    detail="Gagal generate presigned URL untuk download"
                )

            return {
                "status": "berhasil",
                "tipe": "url",
                "download_url": download_url,
                "file_name": file_name,
                "expires_in": "1 hour"
            }

        # Storage lokal
        file_path = storage_info.get("file_path")
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(
                status_code=404,
                detail="File model tidak ditemukan di storage lokal"
            )

        return FileResponse(
            path=file_path,
            filename=file_name,
            media_type="application/octet-stream"
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error download model: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Terjadi kesalahan: {str(e)}"
        )


@router_model.delete("/{model_id}")
async def delete_model(model_id: str, _admin: dict = Depends(wajib_admin)):
    """
    Hapus model dari database dan R2 Storage
    
    PENTING: Tidak boleh hapus model yang sedang aktif
    """
    try:
        db = dapatkan_database()
        if db is None:
            raise HTTPException(
                status_code=503,
                detail="Database tidak tersedia"
            )
        
        # Cek apakah model sedang aktif
        if model_aktif.get("model_id") == model_id:
            raise HTTPException(
                status_code=400,
                detail="Tidak dapat menghapus model yang sedang aktif. Nonaktifkan terlebih dahulu."
            )
        
        # Cari model
        model_doc = await db["models"].find_one({"model_id": model_id})
        if not model_doc:
            raise HTTPException(
                status_code=404,
                detail=f"Model dengan ID '{model_id}' tidak ditemukan"
            )
        
        # Hapus dari R2 jika ada
        storage_info = model_doc.get("storage_info", {})
        if storage_info.get("storage_type") == "r2" and r2_storage.r2_enabled:
            object_key = storage_info.get("object_key")
            if object_key:
                try:
                    r2_storage.s3_client.delete_object(
                        Bucket=r2_storage.bucket_name,
                        Key=object_key
                    )
                    print(f"✓ Model berhasil dihapus dari R2: {object_key}")
                except Exception as e:
                    print(f"⚠ Warning: Gagal hapus dari R2: {e}")
        
        # Hapus dari database
        await db["models"].delete_one({"model_id": model_id})
        
        return {
            "status": "berhasil",
            "pesan": f"Model '{model_doc.get('nama')}' berhasil dihapus"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error delete model: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Terjadi kesalahan: {str(e)}"
        )

def dapatkan_model_aktif():
    """
    Helper function untuk mendapatkan model loader yang sedang aktif
    Digunakan oleh endpoint analisis
    """
    return model_aktif.get("model_loader")
