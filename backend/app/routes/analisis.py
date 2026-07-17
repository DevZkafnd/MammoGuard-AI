"""
Endpoint API untuk upload dan analisis citra mammogram
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
import io
from PIL import Image
import traceback

# Import modul internal
from app.utils.r2_storage import r2_storage
from app.ml.model import PemuatModel, preprocessing_citra
from app.ml.gradcam import hasilkan_gradcam
from app.db.koneksi import dapatkan_database
from app.routes.model_management import dapatkan_model_aktif, muat_ulang_model_aktif_dari_db

router_analisis = APIRouter(
    prefix="/analisis",
    tags=["Analisis Citra"]
)

# Instance model (akan dimuat saat server startup)
pemuat_model = None

def dapatkan_pemuat_model():
    """Get atau inisialisasi model loader"""
    global pemuat_model
    if pemuat_model is None:
        import os
        jalur_model = os.getenv("JALUR_MODEL", "./storage/models/ResNetDemo_1782708575_9063396e.pth")
        pemuat_model = PemuatModel(jalur_model)
        try:
            pemuat_model.muat_model()
        except Exception as e:
            print(f"⚠ Warning: Model tidak dapat dimuat - {e}")
    return pemuat_model

@router_analisis.post("/unggah")
async def unggah_citra(berkas: UploadFile = File(...)):
    """
    Endpoint untuk mengunggah citra mammogram dan melakukan analisis AI
    
    Returns:
        JSON dengan hasil upload dan analisis, termasuk presigned URL jika menggunakan R2
    """
    try:
        # Validasi tipe file
        tipe_file_diizinkan = ["image/jpeg", "image/jpg", "image/png"]
        
        if not berkas.content_type:
            raise HTTPException(
                status_code=400,
                detail="Tipe file tidak dapat dideteksi"
            )
        
        if berkas.content_type not in tipe_file_diizinkan:
            raise HTTPException(
                status_code=400,
                detail=f"Tipe file tidak didukung. Gunakan: {', '.join(tipe_file_diizinkan)}"
            )
        
        # Validasi ukuran file (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        berkas.file.seek(0, 2)  # Seek to end
        file_size = berkas.file.tell()
        berkas.file.seek(0)  # Reset to start
        
        if file_size > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"Ukuran file terlalu besar. Maksimal 10MB, file Anda: {file_size / 1024 / 1024:.2f}MB"
            )
        
        if file_size == 0:
            raise HTTPException(
                status_code=400,
                detail="File kosong"
            )
        
        # Baca file
        konten_file = await berkas.read()
        
        if not konten_file:
            raise HTTPException(
                status_code=400,
                detail="Gagal membaca konten file"
            )
        
        # Upload ke storage (R2 atau lokal)
        hasil_upload = await r2_storage.upload_file(
            file_content=konten_file,
            original_filename=berkas.filename or "unknown.png",
            folder="raw"
        )
        
        # Generate presigned URL untuk download (jika menggunakan R2)
        presigned_url = None
        if hasil_upload.get("storage_type") == "r2":
            presigned_url = r2_storage.generate_presigned_download_url(
                object_key=hasil_upload.get("object_key"),
                expiration=3600,  # 1 jam
                filename=berkas.filename
            )
        
        # Proses AI inference
        try:
            # Load image untuk preprocessing
            citra = Image.open(io.BytesIO(konten_file))

            # Model memakai normalisasi ImageNet 3-channel, jadi SEMUA citra
            # (termasuk grayscale mode 'L' pada mammogram) harus dikonversi ke RGB.
            if citra.mode != 'RGB':
                citra = citra.convert('RGB')
            
            # Preprocessing
            citra_tensor = preprocessing_citra(citra)

            # Dapatkan model aktif dari model management (lazy-load dari DB jika perlu)
            model = dapatkan_model_aktif()
            if model is None or model.model is None:
                # Coba muat ulang model yang ditandai aktif di DB (mis. setelah restart)
                await muat_ulang_model_aktif_dari_db()
                model = dapatkan_model_aktif()

            # Prediksi + Grad-CAM
            if model and model.model is not None:
                # Grad-CAM sekaligus memberi kelas & confidence dari forward yang sama
                heatmap_pil, kelas_prediksi, confidence = hasilkan_gradcam(
                    model.model, model.perangkat, citra_tensor, citra
                )

                # Map ke label Benign/Malignant
                label_map = {0: "Benign", 1: "Malignant"}
                label = label_map.get(kelas_prediksi, "Unknown")

                # Simpan heatmap Grad-CAM ke storage (jika berhasil dibuat)
                heatmap_url = None
                if heatmap_pil is not None:
                    try:
                        buffer_heatmap = io.BytesIO()
                        heatmap_pil.save(buffer_heatmap, format="PNG")
                        nama_heatmap = f"gradcam_{berkas.filename or 'citra'}.png"
                        hasil_heatmap = await r2_storage.upload_file(
                            file_content=buffer_heatmap.getvalue(),
                            original_filename=nama_heatmap,
                            folder="heatmaps"
                        )
                        if hasil_heatmap.get("storage_type") == "r2":
                            heatmap_url = r2_storage.generate_presigned_download_url(
                                object_key=hasil_heatmap.get("object_key"),
                                expiration=3600
                            )
                        else:
                            heatmap_url = hasil_heatmap.get("url")
                    except Exception as e:
                        print(f"⚠ Gagal menyimpan heatmap Grad-CAM: {e}")

                hasil_ai = {
                    "label": label,
                    "confidence": f"{confidence * 100:.2f}%",
                    "confidence_score": confidence,
                    "model_status": "loaded",
                    "heatmap_url": heatmap_url,
                    "gradcam_tersedia": heatmap_url is not None
                }
            else:
                hasil_ai = {
                    "label": "Unknown",
                    "confidence": "0%",
                    "confidence_score": 0.0,
                    "pesan": "Tidak ada model aktif. Aktifkan model terlebih dahulu di halaman Manajemen Model AI.",
                    "model_status": "not_loaded"
                }
        except Exception as e:
            print(f"Error pada AI inference: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            hasil_ai = {
                "error": str(e),
                "pesan": "Gagal melakukan analisis AI",
                "model_status": "error"
            }
        
        # Simpan hasil ke MongoDB
        db = dapatkan_database()
        dokumen_id = None
        
        if db is not None:
            try:
                hasil_dokumen = {
                    "nama_berkas": berkas.filename,
                    "ukuran_file": file_size,
                    "tipe_file": berkas.content_type,
                    "storage_info": hasil_upload,
                    "hasil_analisis": hasil_ai,
                    "presigned_url": presigned_url,
                    "waktu_unggah": datetime.now(),
                    "status": "selesai"
                }
                result = await db["analisis"].insert_one(hasil_dokumen)
                dokumen_id = str(result.inserted_id)
            except Exception as e:
                print(f"Error menyimpan ke MongoDB: {e}")
                # Lanjutkan meskipun gagal save ke DB
        
        return {
            "status": "berhasil",
            "pesan": "Citra berhasil diunggah dan dianalisis",
            "data": {
                "id": dokumen_id,
                "nama_berkas": berkas.filename,
                "ukuran_file": f"{file_size / 1024:.2f} KB",
                "storage": hasil_upload,
                "presigned_url": presigned_url,
                "presigned_expires_in": "1 hour" if presigned_url else None,
                "analisis": hasil_ai,
                "waktu_unggah": datetime.now().isoformat()
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error tidak terduga: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Terjadi kesalahan tidak terduga: {str(e)}"
        )

@router_analisis.get("/riwayat")
async def dapatkan_riwayat(
    limit: int = Query(10, ge=1, le=100, description="Jumlah data yang ingin diambil (1-100)"),
    skip: int = Query(0, ge=0, description="Jumlah data yang ingin dilewati (untuk pagination)")
):
    """
    Endpoint untuk mendapatkan riwayat analisis dengan pagination
    
    Args:
        limit: Jumlah data per page (default: 10, max: 100)
        skip: Offset untuk pagination (default: 0)
    """
    try:
        db = dapatkan_database()
        if db is None:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "error",
                    "pesan": "Database tidak tersedia",
                    "jumlah_data": 0,
                    "data": []
                }
            )
        
        # Hitung total dokumen
        total_dokumen = await db["analisis"].count_documents({})
        
        # Ambil data dari MongoDB dengan pagination
        cursor = db["analisis"].find().sort("waktu_unggah", -1).skip(skip).limit(limit)
        riwayat = await cursor.to_list(length=limit)
        
        # Convert ObjectId ke string dan generate presigned URLs jika perlu
        for item in riwayat:
            item["_id"] = str(item["_id"])
            
            # Generate presigned URL baru untuk akses (jika menggunakan R2)
            if item.get("storage_info", {}).get("storage_type") == "r2":
                object_key = item["storage_info"].get("object_key")
                if object_key:
                    item["presigned_url"] = r2_storage.generate_presigned_download_url(
                        object_key=object_key,
                        expiration=3600
                    )
        
        return {
            "status": "berhasil",
            "jumlah_data": len(riwayat),
            "total_dokumen": total_dokumen,
            "limit": limit,
            "skip": skip,
            "has_more": (skip + len(riwayat)) < total_dokumen,
            "data": riwayat
        }
    
    except Exception as e:
        print(f"Error mendapatkan riwayat: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Terjadi kesalahan: {str(e)}"
        )

@router_analisis.get("/presigned-upload-url")
async def dapatkan_presigned_upload_url(
    filename: str = Query(..., description="Nama file yang akan diupload"),
    folder: str = Query("raw", description="Folder tujuan (raw/heatmaps)")
):
    """
    Generate presigned URL untuk upload langsung dari client ke R2
    
    Ini memungkinkan client upload file langsung ke R2 tanpa melalui backend,
    menghemat bandwidth dan mempercepat upload untuk file besar.
    """
    try:
        if not r2_storage.r2_enabled:
            raise HTTPException(
                status_code=501,
                detail="R2 Storage tidak dikonfigurasi. Gunakan endpoint /analisis/unggah untuk upload via backend."
            )
        
        # Generate unique filename
        unique_filename = r2_storage.generate_unique_filename(filename)
        
        # Generate presigned upload URL
        presigned_data = r2_storage.generate_presigned_upload_url(
            filename=unique_filename,
            folder=folder,
            expiration=900  # 15 menit
        )
        
        if not presigned_data:
            raise HTTPException(
                status_code=500,
                detail="Gagal generate presigned URL"
            )
        
        return {
            "status": "berhasil",
            "pesan": "Presigned upload URL berhasil dibuat",
            "data": {
                "upload_url": presigned_data["url"],
                "fields": presigned_data["fields"],
                "object_key": presigned_data["object_key"],
                "unique_filename": unique_filename,
                "expires_in_seconds": presigned_data["expires_in"],
                "instruction": "POST ke upload_url dengan fields sebagai form data, tambahkan file dengan key 'file'"
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generate presigned upload URL: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Terjadi kesalahan: {str(e)}"
        )

@router_analisis.get("/statistik")
async def statistik_analisis():
    """
    Statistik untuk dashboard beranda dokter, dihitung dari koleksi 'analisis':
    - analisis_hari_ini : jumlah analisis dengan waktu_unggah hari ini
    - pending_validasi  : jumlah analisis yang belum divalidasi dokter
    - total_pasien      : total rekam analisis (proxy jumlah pasien)
    """
    db = dapatkan_database()
    kosong = {"analisis_hari_ini": 0, "pending_validasi": 0, "total_pasien": 0}
    if db is None:
        return {"status": "error", "data": kosong}

    try:
        sekarang = datetime.now()
        awal_hari = datetime(sekarang.year, sekarang.month, sekarang.day)

        total = await db["analisis"].count_documents({})
        hari_ini = await db["analisis"].count_documents({"waktu_unggah": {"$gte": awal_hari}})
        pending = await db["analisis"].count_documents({"divalidasi": {"$ne": True}})

        return {
            "status": "berhasil",
            "data": {
                "analisis_hari_ini": hari_ini,
                "pending_validasi": pending,
                "total_pasien": total,
            },
        }
    except Exception as e:
        print(f"Error statistik: {e}")
        return {"status": "error", "data": kosong}


class ValidasiRequest(BaseModel):
    birads: str
    label_final: Optional[str] = None
    dokter: Optional[str] = None


@router_analisis.post("/{analisis_id}/validasi")
async def validasi_analisis(analisis_id: str, data: ValidasiRequest):
    """
    Menyimpan validasi dokter pada sebuah analisis: tandai divalidasi, simpan
    kategori BI-RADS akhir dan (opsional) label koreksi. Ini yang membuat
    'pending_validasi' pada statistik berkurang.
    """
    from bson import ObjectId
    from bson.errors import InvalidId

    db = dapatkan_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database tidak tersedia")

    try:
        object_id = ObjectId(analisis_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Format ID tidak valid")

    perubahan = {
        "divalidasi": True,
        "birads": data.birads,
        "waktu_validasi": datetime.now(),
    }
    if data.label_final:
        perubahan["label_final"] = data.label_final
    if data.dokter:
        perubahan["dokter"] = data.dokter

    hasil = await db["analisis"].update_one({"_id": object_id}, {"$set": perubahan})
    if hasil.matched_count == 0:
        raise HTTPException(status_code=404, detail="Analisis tidak ditemukan")

    return {"status": "berhasil", "pesan": "Validasi tersimpan"}


@router_analisis.get("/{analisis_id}")
async def dapatkan_detail_analisis(analisis_id: str):
    """
    Mendapatkan detail analisis berdasarkan ID
    """
    try:
        from bson import ObjectId
        from bson.errors import InvalidId
        
        db = dapatkan_database()
        if db is None:
            raise HTTPException(
                status_code=503,
                detail="Database tidak tersedia"
            )
        
        # Validasi ObjectId
        try:
            object_id = ObjectId(analisis_id)
        except InvalidId:
            raise HTTPException(
                status_code=400,
                detail="Format ID tidak valid"
            )
        
        # Ambil dokumen
        dokumen = await db["analisis"].find_one({"_id": object_id})
        
        if not dokumen:
            raise HTTPException(
                status_code=404,
                detail="Analisis tidak ditemukan"
            )
        
        # Convert ObjectId ke string
        dokumen["_id"] = str(dokumen["_id"])
        
        # Generate presigned URL baru jika perlu
        if dokumen.get("storage_info", {}).get("storage_type") == "r2":
            object_key = dokumen["storage_info"].get("object_key")
            if object_key:
                dokumen["presigned_url"] = r2_storage.generate_presigned_download_url(
                    object_key=object_key,
                    expiration=3600
                )
        
        return {
            "status": "berhasil",
            "data": dokumen
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error mendapatkan detail analisis: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Terjadi kesalahan: {str(e)}"
        )
