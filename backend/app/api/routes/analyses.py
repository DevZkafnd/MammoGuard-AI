from datetime import UTC, datetime, time
from io import BytesIO
from pathlib import Path
import uuid

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse

from app.api.deps import get_current_user, require_role
from app.core.serializers import serialize_mongo_document
from app.db.database import get_database
from app.db.gridfs import download_bytes_from_images, upload_bytes_to_images
from app.ml.inference import run_local_inference
from app.models import AnalysisValidate


ALLOWED_IMAGE_EXTENSIONS = {".jpg": "jpg", ".jpeg": "jpg", ".png": "png"}
MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024

router = APIRouter(prefix="/analyses", tags=["Analyses"])


def _generate_patient_id() -> str:
    return f"PAT-{datetime.now(UTC).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


def _analysis_urls(analysis_id: str) -> dict[str, str]:
    return {
        "imageUrl": f"/api/analyses/{analysis_id}/image",
        "heatmapUrl": f"/api/analyses/{analysis_id}/heatmap",
    }


def _build_analysis_response(document: dict) -> dict:
    analysis = serialize_mongo_document(document)
    analysis_id = analysis["_id"]
    analysis.update(_analysis_urls(analysis_id))
    model_used = document.get("modelUsed")
    if isinstance(model_used, dict):
        analysis["modelUsed"] = model_used.get("modelId")
    elif model_used is not None:
        analysis["modelUsed"] = str(model_used)
    return analysis


async def _get_analysis_or_404(analysis_id: str) -> dict:
    if not ObjectId.is_valid(analysis_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan")
    db = get_database()
    analysis = await db["analyses"].find_one({"_id": ObjectId(analysis_id)})
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan")
    return analysis


@router.post("/upload", dependencies=[Depends(require_role("doctor"))], status_code=status.HTTP_201_CREATED)
async def upload_analysis(
    image: UploadFile = File(...),
    patientId: str | None = Form(default=None),
    patientName: str = Form(...),
    current_user: dict = Depends(get_current_user),
) -> dict:
    suffix = Path(image.filename or "").suffix.lower()
    image_format = ALLOWED_IMAGE_EXTENSIONS.get(suffix)
    if image_format is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Format file tidak didukung. Gunakan .jpg, .jpeg, atau .png.",
        )

    file_bytes = await image.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File gambar kosong.")
    if len(file_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Ukuran file melebihi batas maksimum.")

    db = get_database()
    patient_id = patientId.strip() if patientId else _generate_patient_id()
    duplicate = await db["analyses"].find_one({"patientId": patient_id})
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="patientId sudah digunakan.")

    image_file_id = await upload_bytes_to_images(
        filename=image.filename or f"{patient_id}.{image_format}",
        data=file_bytes,
        content_type=image.content_type or "application/octet-stream",
        metadata={"type": "mammogram", "patientId": patient_id},
    )

    inference_result = await run_local_inference(file_bytes)
    heatmap_file_id = await upload_bytes_to_images(
        filename=f"{patient_id}_heatmap.png",
        data=inference_result["heatmapBytes"],
        content_type="image/png",
        metadata={"type": "heatmap", "patientId": patient_id},
    )

    now = datetime.now(UTC)
    document = {
        "patientId": patient_id,
        "patientName": patientName.strip(),
        "imageFileId": image_file_id,
        "heatmapFileId": heatmap_file_id,
        "imageFormat": image_format,
        "imageSizeBytes": len(file_bytes),
        "aiPrediction": inference_result["prediction"],
        "confidenceScore": inference_result["confidence"],
        "gradcamData": inference_result["gradcamCoordinates"],
        "biradsAiSuggestion": inference_result["biradsAiSuggestion"],
        "biradsCategory": None,
        "validatedBy": None,
        "validatedAt": None,
        "doctorNotes": None,
        "recommendation": None,
        "status": "pending_validation",
        "modelUsed": inference_result["modelUsed"],
        "uploadedBy": current_user["_id"],
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db["analyses"].insert_one(document)
    created_analysis = await db["analyses"].find_one({"_id": result.inserted_id})
    return _build_analysis_response(created_analysis)


@router.get("", dependencies=[Depends(require_role("doctor"))])
async def list_analyses(
    search: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    workflow_status: str | None = Query(default=None, alias="workflowStatus"),
    dateFrom: str | None = Query(default=None),
    dateTo: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict:
    db = get_database()
    filters: dict = {}

    if search:
        filters["$or"] = [
            {"patientId": {"$regex": search.strip(), "$options": "i"}},
            {"patientName": {"$regex": search.strip(), "$options": "i"}},
        ]
    if status_filter:
        filters["aiPrediction"] = status_filter
    if workflow_status:
        filters["status"] = workflow_status
    if dateFrom or dateTo:
        created_filter: dict = {}
        if dateFrom:
            created_filter["$gte"] = datetime.combine(datetime.fromisoformat(dateFrom).date(), time.min, tzinfo=UTC)
        if dateTo:
            created_filter["$lte"] = datetime.combine(datetime.fromisoformat(dateTo).date(), time.max, tzinfo=UTC)
        filters["createdAt"] = created_filter

    total = await db["analyses"].count_documents(filters)
    cursor = (
        db["analyses"]
        .find(filters)
        .sort("createdAt", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )
    analyses = await cursor.to_list(length=limit)

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "data": [_build_analysis_response(item) for item in analyses],
    }


@router.get("/{analysis_id}", dependencies=[Depends(require_role("doctor"))])
async def get_analysis(analysis_id: str) -> dict:
    analysis = await _get_analysis_or_404(analysis_id)
    return _build_analysis_response(analysis)


@router.put("/{analysis_id}/validate", dependencies=[Depends(require_role("doctor"))])
async def validate_analysis(
    analysis_id: str,
    payload: AnalysisValidate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    analysis = await _get_analysis_or_404(analysis_id)
    db = get_database()

    now = datetime.now(UTC)
    await db["analyses"].update_one(
        {"_id": analysis["_id"]},
        {
            "$set": {
                "biradsCategory": payload.biradsCategory,
                "doctorNotes": payload.doctorNotes,
                "recommendation": payload.recommendation,
                "validatedBy": current_user["_id"],
                "validatedAt": now,
                "status": "validated",
                "updatedAt": now,
            }
        },
    )

    updated = await db["analyses"].find_one({"_id": analysis["_id"]})
    return _build_analysis_response(updated)


@router.get("/{analysis_id}/image", dependencies=[Depends(require_role("doctor"))])
async def get_analysis_image(analysis_id: str):
    analysis = await _get_analysis_or_404(analysis_id)
    file_id = analysis.get("imageFileId")
    if not file_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File gambar tidak ditemukan")

    file_bytes = await download_bytes_from_images(file_id)
    db = get_database()
    file_doc = await db["images.files"].find_one({"_id": file_id})
    content_type = (file_doc or {}).get("metadata", {}).get("contentType", "application/octet-stream")
    return StreamingResponse(BytesIO(file_bytes), media_type=content_type)


@router.get("/{analysis_id}/heatmap", dependencies=[Depends(require_role("doctor"))])
async def get_analysis_heatmap(analysis_id: str):
    analysis = await _get_analysis_or_404(analysis_id)
    file_id = analysis.get("heatmapFileId")
    if not file_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File heatmap tidak ditemukan")

    file_bytes = await download_bytes_from_images(file_id)
    db = get_database()
    file_doc = await db["images.files"].find_one({"_id": file_id})
    content_type = (file_doc or {}).get("metadata", {}).get("contentType", "image/png")
    return StreamingResponse(BytesIO(file_bytes), media_type=content_type)
