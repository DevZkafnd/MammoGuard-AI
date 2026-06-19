"""
Endpoint API untuk upload dan analisis citra mammogram
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from datetime import datetime

router_analisis = APIRouter(
    prefix="/analisis",
    tags=["Analisis Citra"]
)

@router_analisis.post("/unggah")
async def unggah_citra(berkas: UploadFile = File(...)):
    """
    Endpoint untuk mengunggah citra mammogram dan melakukan analisis AI
    """
    # Validasi tipe file
    tipe_file_diizinkan = ["image/jpeg", "image/jpg", "image/png"]
    
    if berkas.content_type not in tipe_file_diizinkan:
        raise HTTPException(
            status_code=400,
            detail=f"Tipe file tidak didukung. Gunakan: {', '.join(tipe_file_diizinkan)}"
        )
    
    # TODO: Implementasi proses inferensi model AI
    # - Baca dan simpan file
    # - Preprocessing citra
    # - Jalankan model PyTorch
    # - Ekstrak Grad-CAM
    # - Simpan hasil ke MongoDB
    
    return {
        "status": "berhasil",
        "pesan": "Citra berhasil diunggah",
        "nama_berkas": berkas.filename,
        "waktu_unggah": datetime.now().isoformat()
    }

@router_analisis.get("/riwayat")
async def dapatkan_riwayat():
    """
    Endpoint untuk mendapatkan riwayat analisis
    """
    # TODO: Ambil data dari MongoDB
    
    return {
        "status": "berhasil",
        "jumlah_data": 0,
        "data": []
    }
