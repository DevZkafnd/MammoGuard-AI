"""
Endpoint API untuk upload dan analisis citra mammogram
Supports: JPG, PNG, DICOM
Zero-Typing Workflow: DICOM file auto-extracts patient metadata
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
import io
from PIL import Image
import traceback

# Import modul internal
from app.utils.r2_storage import r2_storage
from app.utils.dicom_parser import is_dicom_file, extract_dicom_metadata, convert_dicom_to_image
from app.ml.model import PemuatModel, preprocessing_citra
from app.ml.gradcam import hasilkan_gradcam
from app.db.koneksi import dapatkan_database, koleksi_pasien
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
    
    Supports:
    - JPG/PNG: Upload biasa
    - DICOM: Auto-extract patient metadata (Zero-Typing Workflow)
    
    Returns:
        JSON dengan hasil upload, analisis AI, dan patient info (jika DICOM)
    """
    try:
        # Baca file content
        konten_file = await berkas.read()
        
        if not konten_file or len(konten_file) == 0:
            raise HTTPException(
                status_code=400,
                detail="File kosong"
            )
        
        # ========================================
        # STEP 1: Detect DICOM dan Extract Metadata
        # ========================================
        is_dicom = is_dicom_file(konten_file)
        dicom_metadata = None
        patient_info = None
        image_bytes_for_ai = konten_file  # Default: gunakan file asli
        
        if is_dicom:
            print("🔍 DICOM file detected! Extracting metadata...")
            
            # Extract metadata dari DICOM
            dicom_metadata = extract_dicom_metadata(konten_file)
            
            if dicom_metadata:
                print(f"✅ DICOM metadata extracted:")
                print(f"   Patient ID: {dicom_metadata.get('patient_id')}")
                print(f"   Patient Name: {dicom_metadata.get('patient_name')}")
                print(f"   Laterality: {dicom_metadata.get('laterality')}")
                print(f"   View Position: {dicom_metadata.get('view_position')}")
                
                # Convert DICOM pixel data ke PNG untuk AI inference
                png_bytes = convert_dicom_to_image(konten_file)
                if png_bytes:
                    image_bytes_for_ai = png_bytes
                    print("✅ DICOM converted to PNG for AI inference")
                else:
                    print("⚠️  Failed to convert DICOM to PNG, will try using original")
                
                # Prepare patient info untuk response
                patient_info = {
                    "patient_id": dicom_metadata.get("patient_id"),
                    "patient_name": dicom_metadata.get("patient_name"),
                    "patient_birth_date": dicom_metadata.get("patient_birth_date_formatted"),
                    "patient_sex": dicom_metadata.get("patient_sex"),
                    "patient_age": dicom_metadata.get("patient_age"),
                    "study_date": dicom_metadata.get("study_date_formatted"),
                    "laterality": dicom_metadata.get("laterality"),  # R (Kanan) / L (Kiri)
                    "view_position": dicom_metadata.get("view_position"),  # CC, MLO
                    "modality": dicom_metadata.get("modality"),
                    "institution_name": dicom_metadata.get("institution_name"),
                }
            else:
                print("⚠️  Failed to extract DICOM metadata")
        else:
            # Validasi tipe file untuk non-DICOM
            tipe_file_diizinkan = ["image/jpeg", "image/jpg", "image/png"]
            
            if not berkas.content_type:
                raise HTTPException(
                    status_code=400,
                    detail="Tipe file tidak dapat dideteksi"
                )
            
            if berkas.content_type not in tipe_file_diizinkan:
                raise HTTPException(
                    status_code=400,
                    detail=f"Tipe file tidak didukung. Gunakan: {', '.join(tipe_file_diizinkan)} atau DICOM (.dcm)"
                )
        
        # Validasi ukuran file (max 50MB untuk DICOM, 10MB untuk image)
        max_size = 50 * 1024 * 1024 if is_dicom else 10 * 1024 * 1024
        file_size = len(konten_file)
        
        if file_size > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"Ukuran file terlalu besar. Maksimal {max_size // (1024*1024)}MB, file Anda: {file_size / 1024 / 1024:.2f}MB"
            )
        
        # ========================================
        # STEP 2: Upload File ke Storage
        # ========================================
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
        
        # ========================================
        # STEP 3: AI Inference
        # ========================================
        try:
            # Load image untuk preprocessing
            citra = Image.open(io.BytesIO(image_bytes_for_ai))

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
        
        # ========================================
        # STEP 4: Auto-Create/Update Patient Profile (Jika DICOM)
        # ========================================
        patient_record_id = None
        patient_status = None  # "new" | "existing"
        
        if is_dicom and dicom_metadata and hasil_ai.get("model_status") == "loaded":
            try:
                db = dapatkan_database()
                if db is not None:
                    patient_id_from_dicom = dicom_metadata.get("patient_id")
                    laterality = dicom_metadata.get("laterality", "").upper()  # R or L
                    
                    # Check apakah pasien sudah ada
                    existing_patient = await koleksi_pasien().find_one({"id_pasien": patient_id_from_dicom})
                    
                    if existing_patient:
                        # PASIEN LAMA: Update existing record
                        print(f"👤 Existing patient found: {patient_id_from_dicom}")
                        patient_status = "existing"
                        patient_record_id = str(existing_patient["_id"])
                        
                        # Update gambar sesuai laterality (kanan/kiri)
                        gambar_url = hasil_upload.get("url") or presigned_url
                        heatmap_url_final = hasil_ai.get("heatmap_url")
                        
                        update_data = {}
                        if laterality == "R":
                            # Update kanan
                            update_data["kanan"] = {
                                "original_url": gambar_url,
                                "gradcam_url": heatmap_url_final,
                                "brush_url": existing_patient.get("kanan", {}).get("brush_url"),
                                "prediksi": hasil_ai.get("label"),
                                "confidence_score": hasil_ai.get("confidence_score"),
                                "bi_rads": existing_patient.get("kanan", {}).get("bi_rads", "0"),
                            }
                        elif laterality == "L":
                            # Update kiri
                            update_data["kiri"] = {
                                "original_url": gambar_url,
                                "gradcam_url": heatmap_url_final,
                                "brush_url": existing_patient.get("kiri", {}).get("brush_url"),
                                "prediksi": hasil_ai.get("label"),
                                "confidence_score": hasil_ai.get("confidence_score"),
                                "bi_rads": existing_patient.get("kiri", {}).get("bi_rads", "0"),
                            }
                        
                        if update_data:
                            update_data["updated_at"] = datetime.utcnow()
                            await koleksi_pasien().update_one(
                                {"_id": existing_patient["_id"]},
                                {"$set": update_data}
                            )
                            print(f"✅ Patient record updated (laterality: {laterality})")
                    
                    else:
                        # PASIEN BARU: Create new profile
                        print(f"👤 New patient detected: {patient_id_from_dicom}")
                        patient_status = "new"
                        
                        gambar_url = hasil_upload.get("url") or presigned_url
                        heatmap_url_final = hasil_ai.get("heatmap_url")
                        
                        # Initialize kanan/kiri based on laterality
                        kanan_data = {
                            "original_url": None,
                            "gradcam_url": None,
                            "brush_url": None,
                            "prediksi": None,
                            "confidence_score": 0.0,
                            "bi_rads": "0",
                        }
                        kiri_data = {
                            "original_url": None,
                            "gradcam_url": None,
                            "brush_url": None,
                            "prediksi": None,
                            "confidence_score": 0.0,
                            "bi_rads": "0",
                        }
                        
                        if laterality == "R":
                            kanan_data = {
                                "original_url": gambar_url,
                                "gradcam_url": heatmap_url_final,
                                "brush_url": None,
                                "prediksi": hasil_ai.get("label"),
                                "confidence_score": hasil_ai.get("confidence_score"),
                                "bi_rads": "0",
                            }
                        elif laterality == "L":
                            kiri_data = {
                                "original_url": gambar_url,
                                "gradcam_url": heatmap_url_final,
                                "brush_url": None,
                                "prediksi": hasil_ai.get("label"),
                                "confidence_score": hasil_ai.get("confidence_score"),
                                "bi_rads": "0",
                            }
                        
                        now = datetime.utcnow()
                        new_patient_doc = {
                            "id_pasien": patient_id_from_dicom,
                            "nama": dicom_metadata.get("patient_name", f"Patient {patient_id_from_dicom}"),
                            "tanggal_lahir": dicom_metadata.get("patient_birth_date_formatted"),
                            "jenis_kelamin": dicom_metadata.get("patient_sex"),
                            "umur": dicom_metadata.get("patient_age"),
                            "kanan": kanan_data,
                            "kiri": kiri_data,
                            "dokter_id": "system_dicom_import",
                            "tanggal_pemeriksaan": now,
                            "status": "pending" if (laterality == "R" and not kiri_data["original_url"]) or (laterality == "L" and not kanan_data["original_url"]) else "completed",
                            "catatan": f"Auto-imported from DICOM. Institution: {dicom_metadata.get('institution_name', 'N/A')}",
                            "dicom_metadata": dicom_metadata,  # Simpan full metadata untuk referensi
                            "created_at": now,
                            "updated_at": now,
                        }
                        
                        result = await koleksi_pasien().insert_one(new_patient_doc)
                        patient_record_id = str(result.inserted_id)
                        print(f"✅ New patient profile created (ID: {patient_record_id})")
                
            except Exception as e:
                print(f"⚠️  Error creating/updating patient profile: {e}")
                traceback.print_exc()
                # Continue execution, karena AI analysis sudah berhasil
        
        # ========================================
        # STEP 5: Simpan hasil ke MongoDB (analisis collection)
        # ========================================
        db = dapatkan_database()
        dokumen_id = None
        
        if db is not None:
            try:
                hasil_dokumen = {
                    "nama_berkas": berkas.filename,
                    "ukuran_file": file_size,
                    "tipe_file": "application/dicom" if is_dicom else berkas.content_type,
                    "is_dicom": is_dicom,
                    "dicom_metadata": dicom_metadata if is_dicom else None,
                    "patient_info": patient_info if is_dicom else None,
                    "patient_record_id": patient_record_id,
                    "patient_status": patient_status,
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
        
        # ========================================
        # STEP 6: Return Response
        # ========================================
        response_data = {
            "id": dokumen_id,
            "nama_berkas": berkas.filename,
            "ukuran_file": f"{file_size / 1024:.2f} KB",
            "is_dicom": is_dicom,
            "storage": hasil_upload,
            "presigned_url": presigned_url,
            "presigned_expires_in": "1 hour" if presigned_url else None,
            "analisis": hasil_ai,
            "waktu_unggah": datetime.now().isoformat()
        }
        
        # Tambahkan patient info jika DICOM
        if is_dicom and patient_info:
            response_data["patient_info"] = patient_info
            response_data["patient_record_id"] = patient_record_id
            response_data["patient_status"] = patient_status  # "new" or "existing"
        
        # Tambahkan gambar URL untuk frontend
        gambar_url_final = presigned_url or hasil_upload.get("url")
        response_data["gambar_url"] = gambar_url_final
        
        return {
            "status": "berhasil",
            "pesan": f"{'DICOM' if is_dicom else 'Citra'} berhasil diunggah dan dianalisis" + 
                     (f". {patient_status.upper()} patient: {patient_info.get('patient_name')}" if patient_status else ""),
            "data": response_data
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
    Statistik untuk dashboard beranda dokter, dihitung dari koleksi 'pasien':
    - analisis_hari_ini : jumlah pasien baru hari ini
    - pending_validasi  : jumlah pasien dengan status pending
    - total_pasien      : total jumlah pasien
    """
    db = dapatkan_database()
    kosong = {"analisis_hari_ini": 0, "pending_validasi": 0, "total_pasien": 0}
    if db is None:
        return {"status": "error", "data": kosong}

    try:
        sekarang = datetime.now()
        awal_hari = datetime(sekarang.year, sekarang.month, sekarang.day)

        # Hitung dari collection 'pasien' (workflow baru)
        total = await koleksi_pasien().count_documents({})
        hari_ini = await koleksi_pasien().count_documents({"tanggal_pemeriksaan": {"$gte": awal_hari}})
        pending = await koleksi_pasien().count_documents({"status": "pending"})

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
        traceback.print_exc()
        return {"status": "error", "data": kosong}


class ValidasiRequest(BaseModel):
    birads: str
    label_final: Optional[str] = None
    dokter: Optional[str] = None
    alasan_koreksi: Optional[str] = None  # Wajib jika ada koreksi AI
    sip_dokter: Optional[str] = None       # Surat Izin Praktik


@router_analisis.post("/{analisis_id}/validasi")
async def validasi_analisis(analisis_id: str, data: ValidasiRequest, request: Request):
    """
    Menyimpan validasi dokter pada sebuah analisis: tandai divalidasi, simpan
    kategori BI-RADS akhir dan (opsional) label koreksi. Ini yang membuat
    'pending_validasi' pada statistik berkurang.
    
    MEDIKOLEGAL: Jika ada koreksi AI (label_final != label awal), 
    wajib menyertakan alasan_koreksi untuk audit trail.
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

    # Ambil data analisis original untuk cek koreksi
    analisis_asli = await db["analisis"].find_one({"_id": object_id})
    if not analisis_asli:
        raise HTTPException(status_code=404, detail="Analisis tidak ditemukan")

    # Validasi: Jika ada koreksi AI, alasan_koreksi wajib diisi
    ada_koreksi = False
    if data.label_final and data.label_final != analisis_asli.get("label"):
        ada_koreksi = True
        if not data.alasan_koreksi or len(data.alasan_koreksi.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="Alasan koreksi wajib diisi minimal 10 karakter untuk compliance medikolegal"
            )

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

    # AUDIT TRAIL: Jika ada koreksi, simpan ke collection audit_koreksi
    if ada_koreksi:
        await db["audit_koreksi"].insert_one({
            "analisis_id": str(object_id),
            "pasien_id": analisis_asli.get("nama_berkas", "unknown"),
            "sisi": "unknown",  # Untuk single upload, tidak ada sisi spesifik
            "hasil_ai_awal": {
                "label": analisis_asli.get("label"),
                "confidence": analisis_asli.get("confidence", 0),
                "timestamp": analisis_asli.get("waktu_unggah")
            },
            "koreksi_dokter": {
                "label": data.label_final,
                "confidence": 1.0,  # Manual correction = 100%
                "alasan": data.alasan_koreksi,
                "dokter_id": data.dokter or "unknown",
                "dokter_nama": data.dokter or "Dokter Unknown",
                "dokter_sip": data.sip_dokter or "N/A",
                "timestamp": datetime.now(),
                "ip_address": request.client.host,
                "user_agent": request.headers.get("user-agent", "unknown")
            },
            "status": "corrected",
            "reviewed_by": None,
            "reviewed_at": None,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        })

    return {
        "status": "berhasil", 
        "pesan": "Validasi tersimpan",
        "audit_logged": ada_koreksi
    }


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



@router_analisis.get("/audit/koreksi")
async def dapatkan_audit_koreksi(
    limit: int = 20,
    skip: int = 0,
    dokter_id: Optional[str] = None,
    days: int = 7
):
    """
    Mendapatkan audit trail koreksi AI
    Endpoint ini untuk role admin/dokter senior
    
    Parameters:
    - limit: Jumlah record per halaman (default: 20)
    - skip: Offset untuk pagination (default: 0)
    - dokter_id: Filter by dokter (optional)
    - days: Filter X hari terakhir (default: 7)
    """
    db = dapatkan_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database tidak tersedia")

    # Build filter
    filter_query = {}
    
    # Filter by time range
    cutoff_date = datetime.now() - timedelta(days=days)
    filter_query["created_at"] = {"$gte": cutoff_date}
    
    # Filter by dokter
    if dokter_id:
        filter_query["koreksi_dokter.dokter_id"] = dokter_id

    # Query database
    cursor = db["audit_koreksi"].find(filter_query).sort("created_at", -1).skip(skip).limit(limit)
    
    audit_list = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        audit_list.append(doc)

    # Get total count untuk pagination
    total = await db["audit_koreksi"].count_documents(filter_query)

    # Statistik koreksi
    total_koreksi = await db["audit_koreksi"].count_documents({})
    benign_to_malignant = await db["audit_koreksi"].count_documents({
        "hasil_ai_awal.label": "Benign",
        "koreksi_dokter.label": "Malignant"
    })
    malignant_to_benign = await db["audit_koreksi"].count_documents({
        "hasil_ai_awal.label": "Malignant",
        "koreksi_dokter.label": "Benign"
    })

    return {
        "status": "berhasil",
        "data": audit_list,
        "pagination": {
            "total": total,
            "limit": limit,
            "skip": skip,
            "has_more": (skip + limit) < total
        },
        "statistik": {
            "total_koreksi": total_koreksi,
            "benign_to_malignant": benign_to_malignant,
            "malignant_to_benign": malignant_to_benign,
            "correction_rate": f"{(total_koreksi / max(1, total)) * 100:.1f}%"
        }
    }


@router_analisis.get("/audit/koreksi/{koreksi_id}")
async def dapatkan_detail_audit(koreksi_id: str):
    """
    Mendapatkan detail satu record audit koreksi
    """
    from bson import ObjectId
    from bson.errors import InvalidId
    
    db = dapatkan_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database tidak tersedia")

    try:
        object_id = ObjectId(koreksi_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Format ID tidak valid")

    dokumen = await db["audit_koreksi"].find_one({"_id": object_id})
    
    if not dokumen:
        raise HTTPException(status_code=404, detail="Audit record tidak ditemukan")

    dokumen["_id"] = str(dokumen["_id"])
    return {"status": "berhasil", "data": dokumen}
