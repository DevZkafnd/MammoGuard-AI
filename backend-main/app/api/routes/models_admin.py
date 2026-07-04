from datetime import UTC, datetime
import re

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pymongo.errors import DuplicateKeyError

from app.api.deps import require_role
from app.core.audit import write_audit_log
from app.db.database import get_database
from app.models import AIModelUploadInitRequest
from app.services.ai_inference import warmup_model
from app.services.storage import generate_presigned_upload


router = APIRouter(
    prefix="/v1/models",
    tags=["AI Models"],
    dependencies=[Depends(require_role("admin"))],
)


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "model"


def _build_model_response(document: dict) -> dict:
    return {
        "_id": str(document["_id"]),
        "model_id": document["model_id"],
        "model_name": document.get("model_name"),
        "model_version": document.get("model_version"),
        "storage_key": document.get("storage_key"),
        "upload_status": document.get("upload_status", "pending"),
        "upload_date": document.get("upload_date") or document.get("createdAt"),
        "is_active": document.get("is_active", document.get("isActive", False)),
    }


async def _get_model_or_404(model_id: str) -> dict:
    db = get_database()
    model = await db["ai_models"].find_one({"model_id": model_id})
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model AI tidak ditemukan")
    return model


@router.get("")
async def list_models() -> dict:
    db = get_database()
    models = await db["ai_models"].find({}).sort("upload_date", -1).to_list(length=500)
    return {"total": len(models), "data": [_build_model_response(item) for item in models]}


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_model(payload: AIModelUploadInitRequest) -> dict:
    file_name = payload.file_name.strip()
    if not file_name.lower().endswith(".pth"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File model harus berformat .pth.",
        )

    model_id = f"{_slugify(payload.model_name)}-{_slugify(payload.model_version)}"
    object_key = f"models/{model_id}/{file_name}"
    now = datetime.now(UTC)

    db = get_database()
    document = {
        "model_id": model_id,
        "modelId": model_id,
        "model_name": payload.model_name.strip(),
        "model_version": payload.model_version.strip(),
        "storage_key": object_key,
        "upload_status": "presigned_issued",
        "upload_method": "presigned_put",
        "content_type": payload.content_type,
        "upload_date": now,
        "createdAt": now,
        "updatedAt": now,
        "is_active": False,
        "isActive": False,
    }

    try:
        result = await db["ai_models"].insert_one(document)
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versi model sudah terdaftar.")

    upload_payload = await generate_presigned_upload(object_key, payload.content_type)
    created = await db["ai_models"].find_one({"_id": result.inserted_id})
    return {
        "message": "Presigned URL model berhasil dibuat.",
        "model": _build_model_response(created),
        "upload": upload_payload,
    }


@router.get("/{model_id}")
async def get_model_detail(model_id: str) -> dict:
    model = await _get_model_or_404(model_id)
    return _build_model_response(model)


@router.patch("/{model_id}/activate")
async def activate_model(
    model_id: str,
    request: Request,
    current_user: dict = Depends(require_role("admin")),
) -> dict:
    db = get_database()
    model = await _get_model_or_404(model_id)
    storage_key = model.get("storage_key")
    if not storage_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Storage key model belum tersedia.")

    now = datetime.now(UTC)
    await db["ai_models"].update_many(
        {},
        {"$set": {"is_active": False, "isActive": False, "updatedAt": now}},
    )
    await db["ai_models"].update_one(
        {"_id": model["_id"]},
        {"$set": {"is_active": True, "isActive": True, "upload_status": "activating", "updatedAt": now}},
    )

    try:
        warmup_result = await warmup_model(model_id=model_id, storage_key=storage_key)
    except httpx.HTTPError as exc:
        await db["ai_models"].update_one(
            {"_id": model["_id"]},
            {"$set": {"is_active": False, "isActive": False, "upload_status": "activation_failed", "updatedAt": datetime.now(UTC)}},
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gagal menghubungi backend-ai saat aktivasi model: {exc}",
        )

    await db["ai_models"].update_one(
        {"_id": model["_id"]},
        {"$set": {"upload_status": "ready", "updatedAt": datetime.now(UTC)}},
    )
    await write_audit_log(
        db=db,
        action="ACTIVATE_MODEL",
        user_id=current_user["_id"],
        target_id=model["_id"],
        ip_address=request.client.host if request.client else None,
        meta={"model_id": model_id, "storage_key": storage_key},
    )

    activated = await db["ai_models"].find_one({"_id": model["_id"]})
    return {
        "message": "Model berhasil diaktifkan dan backend-ai sudah warm-up.",
        "model": _build_model_response(activated),
        "backend_ai": warmup_result,
    }


@router.delete("/{model_id}")
async def delete_model(model_id: str) -> dict:
    db = get_database()
    model = await _get_model_or_404(model_id)
    if model.get("is_active") or model.get("isActive"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Model aktif tidak boleh dihapus.",
        )

    await db["ai_models"].delete_one({"_id": model["_id"]})
    return {"message": "Metadata model berhasil dihapus."}
