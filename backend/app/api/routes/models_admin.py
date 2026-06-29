from datetime import UTC, datetime

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, UploadFile, status
from pymongo.errors import DuplicateKeyError

from app.api.deps import require_role
from app.core.audit import write_audit_log
from app.db.database import get_database
from app.db.gridfs import delete_model_file, get_model_file_document, upload_bytes_to_models
from app.ml.model_loader import active_model_registry


router = APIRouter(
    prefix="/v1/models",
    tags=["AI Models"],
    dependencies=[Depends(require_role("admin"))],
)


def _to_model_response(document: dict) -> dict:
    file_id = document.get("file_id") or document.get("fileId")
    return {
        "_id": str(document["_id"]),
        "model_id": document.get("model_id") or document.get("modelId"),
        "architecture": document.get("architecture"),
        "display_name": document.get("display_name") or document.get("label"),
        "validation_accuracy": document.get("validation_accuracy", document.get("accuracy")),
        "file_id": str(file_id) if isinstance(file_id, ObjectId) else file_id,
        "file_size": document.get("file_size"),
        "upload_date": document.get("upload_date") or document.get("createdAt"),
        "is_active": document.get("is_active", document.get("isActive", False)),
        "admin_notes": document.get("admin_notes") or document.get("notes"),
    }


async def _get_model_or_404(model_id: str) -> dict:
    db = get_database()
    model = await db["ai_models"].find_one({"model_id": model_id})
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model AI tidak ditemukan")
    return model


async def _reload_active_model() -> None:
    try:
        await active_model_registry.load_active_model()
    except Exception:
        active_model_registry.clear()


@router.get("")
async def list_models() -> dict:
    db = get_database()
    models = await db["ai_models"].find({}).sort("upload_date", -1).to_list(length=500)
    return {"total": len(models), "data": [_to_model_response(item) for item in models]}


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_model(
    file: UploadFile = File(...),
    ai_model_id: str = Form(..., alias="model_id"),
    architecture: str = Form(...),
    display_name: str = Form(...),
    validation_accuracy: float = Form(...),
    admin_notes: str | None = Form(default=None),
) -> dict:
    if not (file.filename or "").lower().endswith(".pth"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Format file tidak didukung. Gunakan file .pth.",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File model kosong.")

    now = datetime.now(UTC)
    file_id = await upload_bytes_to_models(
        filename=file.filename or f"{ai_model_id}.pth",
        data=file_bytes,
        content_type=file.content_type or "application/octet-stream",
        metadata={"type": "ai_model", "model_id": ai_model_id},
    )
    file_doc = await get_model_file_document(file_id)
    file_size_mb = round(len(file_bytes) / (1024 * 1024), 2)

    document = {
        "model_id": ai_model_id,
        "modelId": ai_model_id,
        "architecture": architecture,
        "display_name": display_name,
        "label": display_name,
        "validation_accuracy": validation_accuracy,
        "accuracy": validation_accuracy,
        "file_id": file_id,
        "fileId": file_id,
        "file_size": file_size_mb,
        "fileSizeBytes": len(file_bytes),
        "gridfs_filename": (file_doc or {}).get("filename"),
        "upload_date": now,
        "createdAt": now,
        "updatedAt": now,
        "is_active": False,
        "isActive": False,
        "admin_notes": admin_notes,
        "notes": admin_notes,
    }

    db = get_database()
    try:
        result = await db["ai_models"].insert_one(document)
    except DuplicateKeyError:
        await delete_model_file(file_id)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="model_id sudah terdaftar.")

    created = await db["ai_models"].find_one({"_id": result.inserted_id})
    return _to_model_response(created)


@router.get("/{model_id}")
async def get_model_detail(model_id: str) -> dict:
    model = await _get_model_or_404(model_id)
    return _to_model_response(model)


@router.patch("/{model_id}/activate")
async def activate_model(
    model_id: str,
    background_tasks: BackgroundTasks,
    request: Request,
    current_user: dict = Depends(require_role("admin")),
) -> dict:
    db = get_database()
    model = await _get_model_or_404(model_id)

    await db["ai_models"].update_many({}, {"$set": {"is_active": False, "isActive": False}})
    await db["ai_models"].update_one(
        {"_id": model["_id"]},
        {"$set": {"is_active": True, "isActive": True, "updatedAt": datetime.now(UTC)}},
    )
    background_tasks.add_task(_reload_active_model)
    await write_audit_log(
        db=db,
        action="ACTIVATE_MODEL",
        user_id=current_user["_id"],
        target_id=model["_id"],
        ip_address=request.client.host if request.client else None,
        meta={"model_id": model_id},
    )

    activated = await db["ai_models"].find_one({"_id": model["_id"]})
    return {"message": "Model berhasil diaktifkan.", "model": _to_model_response(activated)}


@router.delete("/{model_id}")
async def delete_model(model_id: str) -> dict:
    db = get_database()
    model = await _get_model_or_404(model_id)
    if model.get("is_active") or model.get("isActive"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Model aktif tidak boleh dihapus.",
        )

    file_id = model.get("file_id") or model.get("fileId")
    if isinstance(file_id, str) and ObjectId.is_valid(file_id):
        file_id = ObjectId(file_id)
    if isinstance(file_id, ObjectId):
        await delete_model_file(file_id)

    await db["ai_models"].delete_one({"_id": model["_id"]})
    return {"message": "Model berhasil dihapus."}
