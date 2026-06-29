from datetime import UTC, datetime
import re

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo.errors import DuplicateKeyError

from app.api.deps import require_role
from app.core.security import hash_password
from app.db.database import get_database
from app.models import DoctorCreateRequest, DoctorUpdateRequest


router = APIRouter(
    prefix="/v1/doctors",
    tags=["Doctors"],
    dependencies=[Depends(require_role("admin"))],
)


def _to_doctor_response(document: dict) -> dict:
    return {
        "_id": str(document["_id"]),
        "full_name": document.get("full_name") or document.get("name"),
        "email": document["email"],
        "specialization": document.get("specialization"),
        "created_at": document.get("created_at") or document.get("createdAt"),
        "is_active": document.get("is_active", document.get("status") == "Aktif"),
        "status": document.get("status", "Aktif"),
    }


async def _get_doctor_or_404(doctor_id: str) -> dict:
    if not ObjectId.is_valid(doctor_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokter tidak ditemukan")

    db = get_database()
    doctor = await db["users"].find_one(
        {"_id": ObjectId(doctor_id), "role": "doctor", "is_deleted": {"$ne": True}}
    )
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokter tidak ditemukan")
    return doctor


@router.get("")
async def list_doctors(search: str | None = Query(default=None)) -> dict:
    db = get_database()
    filters: dict = {"role": "doctor", "is_deleted": {"$ne": True}}

    if search:
        escaped = re.escape(search.strip())
        filters["$or"] = [
            {"name": {"$regex": escaped, "$options": "i"}},
            {"full_name": {"$regex": escaped, "$options": "i"}},
            {"specialization": {"$regex": escaped, "$options": "i"}},
        ]

    doctors = await db["users"].find(filters).sort("createdAt", -1).to_list(length=500)
    return {"total": len(doctors), "data": [_to_doctor_response(item) for item in doctors]}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_doctor(payload: DoctorCreateRequest) -> dict:
    db = get_database()
    now = datetime.now(UTC)
    password_hash = hash_password(payload.password)
    document = {
        "name": payload.full_name,
        "full_name": payload.full_name,
        "email": payload.email.lower(),
        "password": password_hash,
        "hashed_password": password_hash,
        "role": "doctor",
        "specialization": payload.specialization,
        "status": payload.status,
        "is_active": payload.status == "Aktif",
        "is_deleted": False,
        "lastLogin": None,
        "createdAt": now,
        "updatedAt": now,
        "created_at": now,
    }

    try:
        result = await db["users"].insert_one(document)
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email sudah terdaftar.")

    created = await db["users"].find_one({"_id": result.inserted_id})
    return _to_doctor_response(created)


@router.put("/{doctor_id}")
async def update_doctor(doctor_id: str, payload: DoctorUpdateRequest) -> dict:
    doctor = await _get_doctor_or_404(doctor_id)
    update_fields = {}

    if payload.full_name is not None:
        update_fields["name"] = payload.full_name
        update_fields["full_name"] = payload.full_name
    if payload.email is not None:
        update_fields["email"] = payload.email.lower()
    if payload.specialization is not None:
        update_fields["specialization"] = payload.specialization
    if payload.status is not None:
        update_fields["status"] = payload.status
        update_fields["is_active"] = payload.status == "Aktif"
    if payload.password is not None:
        password_hash = hash_password(payload.password)
        update_fields["password"] = password_hash
        update_fields["hashed_password"] = password_hash

    if not update_fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tidak ada data untuk diupdate.")

    update_fields["updatedAt"] = datetime.now(UTC)
    db = get_database()
    try:
        await db["users"].update_one({"_id": doctor["_id"]}, {"$set": update_fields})
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email sudah terdaftar.")

    updated = await db["users"].find_one({"_id": doctor["_id"]})
    return _to_doctor_response(updated)


@router.delete("/{doctor_id}")
async def delete_doctor(doctor_id: str) -> dict:
    doctor = await _get_doctor_or_404(doctor_id)
    db = get_database()
    await db["users"].update_one(
        {"_id": doctor["_id"]},
        {
            "$set": {
                "status": "Nonaktif",
                "is_active": False,
                "is_deleted": True,
                "updatedAt": datetime.now(UTC),
            }
        },
    )
    return {"message": "Akun dokter dinonaktifkan dan disembunyikan dari daftar."}
