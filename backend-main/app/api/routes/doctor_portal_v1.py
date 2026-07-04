import base64
import csv
from datetime import UTC, datetime, time
from io import BytesIO, StringIO
import re
import uuid

import httpx
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from app.api.deps import get_current_user, require_role
from app.core.audit import write_audit_log
from app.core.serializers import serialize_mongo_document
from app.db.database import get_database
from app.models import AnalysisProcessRequest, AnalysisUploadInitRequest, WorkspaceValidateRequest
from app.services.ai_inference import request_prediction
from app.services.storage import (
    download_bytes,
    generate_presigned_download,
    generate_presigned_upload,
    upload_bytes,
)


router = APIRouter(prefix="/v1", tags=["Doctor Portal"])

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "application/dicom",
    "application/dicom+json",
    "application/octet-stream",
}


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "item"


def _generate_patient_id() -> str:
    return f"PAT-{datetime.now(UTC).strftime('%Y%m%d')}-{uuid.uuid4().hex[:5].upper()}"


def _serialize_document(document: dict) -> dict:
    return serialize_mongo_document(document)


def _map_v1_analysis(document: dict) -> dict:
    item = _serialize_document(document)
    item["analysis_id"] = item["_id"]
    item["original_image_url"] = f"/api/v1/analysis/{item['_id']}/original-image"
    item["heatmap_image_url"] = f"/api/v1/analysis/{item['_id']}/heatmap-image"
    item["process_url"] = f"/api/v1/analysis/{item['_id']}/process"
    return item


async def _get_analysis_or_404(analysis_id: str) -> dict:
    if not ObjectId.is_valid(analysis_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan.")
    db = get_database()
    analysis = await db["mammogram_analyses"].find_one({"_id": ObjectId(analysis_id)})
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan.")
    return analysis


def _ensure_analysis_access(analysis: dict, current_user: dict) -> None:
    if analysis["doctor_id"] != current_user["_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


def _build_history_pipeline(
    *,
    doctor_id: ObjectId,
    date_from: str | None,
    date_to: str | None,
    category: str | None,
) -> list[dict]:
    match: dict = {"doctor_id": doctor_id, "status": "Validated"}

    if category:
        match["ai_prediction_class"] = category

    if date_from or date_to:
        created_filter: dict = {}
        if date_from:
            created_filter["$gte"] = datetime.combine(
                datetime.fromisoformat(date_from).date(),
                time.min,
                tzinfo=UTC,
            )
        if date_to:
            created_filter["$lte"] = datetime.combine(
                datetime.fromisoformat(date_to).date(),
                time.max,
                tzinfo=UTC,
            )
        match["created_at"] = created_filter

    return [{"$match": match}, {"$sort": {"created_at": -1}}]


@router.get("/doctor/dashboard-stats", dependencies=[Depends(require_role("doctor"))])
async def dashboard_stats(current_user: dict = Depends(get_current_user)) -> dict:
    db = get_database()
    today = datetime.now(UTC).date()
    start = datetime.combine(today, time.min, tzinfo=UTC)
    end = datetime.combine(today, time.max, tzinfo=UTC)
    doctor_id = current_user["_id"]

    analyses_today = await db["mammogram_analyses"].count_documents(
        {"doctor_id": doctor_id, "created_at": {"$gte": start, "$lte": end}}
    )
    pending_validation = await db["mammogram_analyses"].count_documents(
        {"doctor_id": doctor_id, "status": {"$in": ["UploadPending", "Processing", "Pending"]}}
    )
    total_patients = len(
        await db["mammogram_analyses"].distinct("patient_id", {"doctor_id": doctor_id})
    )

    return {
        "analyses_today": analyses_today,
        "pending_validation": pending_validation,
        "total_patients": total_patients,
    }


@router.post("/analysis/upload", dependencies=[Depends(require_role("doctor"))], status_code=status.HTTP_201_CREATED)
async def upload_analysis_v1(
    payload: AnalysisUploadInitRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    content_type = payload.content_type.strip().lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Content-Type file tidak didukung untuk presigned upload.",
        )

    analysis_patient_id = payload.patient_id.strip() if payload.patient_id else _generate_patient_id()
    safe_file_name = _slugify(payload.file_name.rsplit(".", 1)[0])
    extension = payload.file_name.rsplit(".", 1)[-1].lower() if "." in payload.file_name else "bin"
    object_key = (
        f"patients/{analysis_patient_id}/uploads/"
        f"{safe_file_name}-{uuid.uuid4().hex[:8]}.{extension}"
    )
    upload_payload = await generate_presigned_upload(object_key, payload.content_type)

    now = datetime.now(UTC)
    document = {
        "patient_id": analysis_patient_id,
        "patient_name": payload.patient_name.strip(),
        "doctor_id": current_user["_id"],
        "scan_view": payload.scan_view.strip(),
        "original_image_key": object_key,
        "original_image_content_type": payload.content_type,
        "heatmap_image_key": None,
        "heatmap_image_content_type": None,
        "ai_prediction_class": None,
        "ai_confidence_score": None,
        "ai_birads_suggestion": None,
        "ai_bounding_boxes": [],
        "ai_heatmap_array": [],
        "final_birads": None,
        "clinical_findings": None,
        "follow_up_recommendation": None,
        "status": "UploadPending",
        "created_at": now,
        "updated_at": now,
        "validated_at": None,
        "model_used": None,
    }
    db = get_database()
    result = await db["mammogram_analyses"].insert_one(document)
    created = await db["mammogram_analyses"].find_one({"_id": result.inserted_id})
    return {
        "message": "Presigned URL upload citra berhasil dibuat.",
        "analysis": _map_v1_analysis(created),
        "upload": upload_payload,
    }


@router.post("/analysis/{analysis_id}/process", dependencies=[Depends(require_role("doctor"))])
async def process_uploaded_analysis(
    analysis_id: str,
    payload: AnalysisProcessRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    analysis = await _get_analysis_or_404(analysis_id)
    _ensure_analysis_access(analysis, current_user)

    image_key = payload.object_key or analysis.get("original_image_key")
    if not image_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Object key citra belum tersedia.")

    db = get_database()
    await db["mammogram_analyses"].update_one(
        {"_id": analysis["_id"]},
        {"$set": {"status": "Processing", "updated_at": datetime.now(UTC), "original_image_key": image_key}},
    )

    try:
        prediction = await request_prediction(analysis_id=analysis_id, image_key=image_key)
    except httpx.HTTPError as exc:
        await db["mammogram_analyses"].update_one(
            {"_id": analysis["_id"]},
            {"$set": {"status": "PredictionFailed", "updated_at": datetime.now(UTC), "prediction_error": str(exc)}},
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gagal memproses prediksi dari backend-ai: {exc}",
        )

    heatmap_key = None
    heatmap_png = prediction.get("heatmap_png_base64")
    if heatmap_png:
        heatmap_key = f"patients/{analysis.get('patient_id')}/heatmaps/{analysis_id}.png"
        await upload_bytes(
            object_key=heatmap_key,
            data=base64.b64decode(heatmap_png),
            content_type="image/png",
            metadata={"analysis_id": analysis_id},
        )

    await db["mammogram_analyses"].update_one(
        {"_id": analysis["_id"]},
        {
            "$set": {
                "status": "Pending",
                "updated_at": datetime.now(UTC),
                "original_image_key": image_key,
                "heatmap_image_key": heatmap_key,
                "heatmap_image_content_type": "image/png" if heatmap_key else None,
                "ai_prediction_class": prediction.get("prediction"),
                "ai_confidence_score": prediction.get("confidence"),
                "ai_birads_suggestion": prediction.get("birads_ai_suggestion"),
                "ai_bounding_boxes": prediction.get("bounding_boxes", []),
                "ai_heatmap_array": prediction.get("heatmap", []),
                "model_used": prediction.get("model_used"),
                "prediction_generated_at": datetime.now(UTC),
            }
        },
    )
    updated = await db["mammogram_analyses"].find_one({"_id": analysis["_id"]})
    return {
        "message": "Prediksi AI berhasil diproses dan disimpan.",
        "analysis": _map_v1_analysis(updated),
        "ai_result": prediction,
    }


@router.get("/analysis/{analysis_id}", dependencies=[Depends(require_role("doctor"))])
async def get_analysis_workspace(
    analysis_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    analysis = await _get_analysis_or_404(analysis_id)
    _ensure_analysis_access(analysis, current_user)
    return _map_v1_analysis(analysis)


@router.get("/analysis/{analysis_id}/original-image", dependencies=[Depends(require_role("doctor"))])
async def get_workspace_original_image(
    analysis_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    analysis = await _get_analysis_or_404(analysis_id)
    _ensure_analysis_access(analysis, current_user)
    object_key = analysis.get("original_image_key")
    if not object_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File original tidak ditemukan.")
    return await generate_presigned_download(object_key)


@router.get("/analysis/{analysis_id}/heatmap-image", dependencies=[Depends(require_role("doctor"))])
async def get_workspace_heatmap_image(
    analysis_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    analysis = await _get_analysis_or_404(analysis_id)
    _ensure_analysis_access(analysis, current_user)
    object_key = analysis.get("heatmap_image_key")
    if not object_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File heatmap tidak ditemukan.")
    return await generate_presigned_download(object_key)


@router.put("/analysis/{analysis_id}/validate", dependencies=[Depends(require_role("doctor"))])
async def validate_analysis_v1(
    analysis_id: str,
    payload: WorkspaceValidateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
) -> dict:
    analysis = await _get_analysis_or_404(analysis_id)
    _ensure_analysis_access(analysis, current_user)

    db = get_database()
    await db["mammogram_analyses"].update_one(
        {"_id": analysis["_id"]},
        {
            "$set": {
                "final_birads": payload.final_birads,
                "clinical_findings": payload.clinical_findings,
                "follow_up_recommendation": payload.follow_up_recommendation,
                "status": "Validated",
                "validated_at": datetime.now(UTC),
                "updated_at": datetime.now(UTC),
            }
        },
    )
    await write_audit_log(
        db=db,
        action="VALIDATE_ANALYSIS",
        user_id=current_user["_id"],
        target_id=analysis["_id"],
        ip_address=request.client.host if request.client else None,
        meta={"patient_id": analysis.get("patient_id")},
    )
    updated = await db["mammogram_analyses"].find_one({"_id": analysis["_id"]})
    return _map_v1_analysis(updated)


@router.get("/patients/history", dependencies=[Depends(require_role("doctor"))])
async def patient_history(
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    category: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
) -> dict:
    pipeline = _build_history_pipeline(
        doctor_id=current_user["_id"],
        date_from=date_from,
        date_to=date_to,
        category=category,
    )
    db = get_database()
    count_pipeline = [*pipeline, {"$count": "total"}]
    count_result = await db["mammogram_analyses"].aggregate(count_pipeline).to_list(length=1)
    total_data = count_result[0]["total"] if count_result else 0
    total_pages = max(1, (total_data + limit - 1) // limit) if total_data else 0

    paginated_pipeline = [*pipeline, {"$skip": (page - 1) * limit}, {"$limit": limit}]
    history = await db["mammogram_analyses"].aggregate(paginated_pipeline).to_list(length=limit)
    return {
        "total_data": total_data,
        "total_pages": total_pages,
        "current_page": page,
        "data": [_map_v1_analysis(item) for item in history],
    }


@router.get("/patients/history/export", dependencies=[Depends(require_role("doctor"))])
async def export_patient_history(
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    category: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    pipeline = _build_history_pipeline(
        doctor_id=current_user["_id"],
        date_from=date_from,
        date_to=date_to,
        category=category,
    )
    db = get_database()
    history = await db["mammogram_analyses"].aggregate(pipeline).to_list(length=1000)

    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "patient_id",
            "patient_name",
            "scan_view",
            "ai_prediction_class",
            "ai_confidence_score",
            "ai_birads_suggestion",
            "final_birads",
            "status",
            "created_at",
            "validated_at",
        ]
    )
    for item in history:
        writer.writerow(
            [
                item.get("patient_id"),
                item.get("patient_name"),
                item.get("scan_view"),
                item.get("ai_prediction_class"),
                item.get("ai_confidence_score"),
                item.get("ai_birads_suggestion"),
                item.get("final_birads"),
                item.get("status"),
                item.get("created_at").isoformat() if item.get("created_at") else "",
                item.get("validated_at").isoformat() if item.get("validated_at") else "",
            ]
        )

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="patient_history.csv"'},
    )


@router.get("/patients/history/{analysis_id}", dependencies=[Depends(require_role("doctor"))])
async def patient_history_detail(
    analysis_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    if not ObjectId.is_valid(analysis_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Riwayat tidak ditemukan.")
    db = get_database()
    pipeline = [
        {"$match": {"_id": ObjectId(analysis_id)}},
        {
            "$lookup": {
                "from": "users",
                "localField": "doctor_id",
                "foreignField": "_id",
                "as": "doctor",
            }
        },
    ]
    result = await db["mammogram_analyses"].aggregate(pipeline).to_list(length=1)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Riwayat tidak ditemukan.")

    item = result[0]
    _ensure_analysis_access(item, current_user)

    doctor_name = None
    if item.get("doctor"):
        doctor_name = item["doctor"][0].get("full_name") or item["doctor"][0].get("name")
    item["radiologist_name"] = doctor_name
    item.pop("doctor", None)
    return _map_v1_analysis(item)


@router.get("/patients/history/{analysis_id}/pdf", dependencies=[Depends(require_role("doctor"))])
async def patient_history_pdf(
    analysis_id: str,
    current_user: dict = Depends(get_current_user),
):
    detail = await patient_history_detail(analysis_id, current_user)

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 40

    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y, "Laporan MammoGuard AI")
    y -= 30

    pdf.setFont("Helvetica", 10)
    lines = [
        f"Patient ID: {detail.get('patient_id')}",
        f"Patient Name: {detail.get('patient_name')}",
        f"Scan View: {detail.get('scan_view')}",
        f"AI Prediction: {detail.get('ai_prediction_class')}",
        f"Confidence Score: {detail.get('ai_confidence_score')}%",
        f"AI BI-RADS Suggestion: {detail.get('ai_birads_suggestion')}",
        f"Final BI-RADS: {detail.get('final_birads')}",
        f"Status: {detail.get('status')}",
        f"Radiologist: {detail.get('radiologist_name')}",
        f"Clinical Findings: {detail.get('clinical_findings') or '-'}",
        f"Recommendation: {detail.get('follow_up_recommendation') or '-'}",
    ]

    for line in lines:
        pdf.drawString(40, y, line[:110])
        y -= 16

    image_sources = [
        (detail.get("original_image_key"), 40),
        (detail.get("heatmap_image_key"), 300),
    ]
    for object_key, x in image_sources:
        if not object_key:
            continue
        try:
            image_bytes = await download_bytes(object_key)
            pdf.drawImage(
                ImageReader(BytesIO(image_bytes)),
                x,
                120,
                width=220,
                height=220,
                preserveAspectRatio=True,
                mask="auto",
            )
        except Exception:
            continue

    pdf.showPage()
    pdf.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="report_{analysis_id}.pdf"'},
    )
