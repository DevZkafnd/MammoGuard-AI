from datetime import UTC, datetime
import re
from typing import Annotated

from bson import ObjectId
from pymongo.errors import DuplicateKeyError
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import require_role
from app.core.security import hash_password
from app.core.serializers import serialize_mongo_document
from app.db.database import get_database
from app.models import UserCreate, UserUpdate


router = APIRouter(
    prefix="/users",
    tags=["Users"],
    dependencies=[Depends(require_role("admin"))],
)


@router.get("")
async def list_users(
    search: Annotated[str | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
) -> dict:
    db = get_database()
    filters: dict = {"role": "doctor"}

    if search:
        escaped = re.escape(search.strip())
        filters["$or"] = [
            {"name": {"$regex": escaped, "$options": "i"}},
            {"email": {"$regex": escaped, "$options": "i"}},
            {"specialization": {"$regex": escaped, "$options": "i"}},
        ]
    if status_filter:
        filters["status"] = status_filter

    users = await db["users"].find(filters).sort("createdAt", -1).to_list(length=500)
    return {
        "total": len(users),
        "data": [serialize_mongo_document(user, exclude={"password"}) for user in users],
    }


@router.get("/{user_id}")
async def get_user(user_id: str) -> dict:
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan")

    db = get_database()
    user = await db["users"].find_one({"_id": ObjectId(user_id), "role": "doctor"})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan")

    return serialize_mongo_document(user, exclude={"password"})


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate) -> dict:
    db = get_database()
    now = datetime.now(UTC)
    document = {
        "name": payload.name,
        "email": payload.email.lower(),
        "password": hash_password(payload.password),
        "role": "doctor",
        "specialization": payload.specialization,
        "status": payload.status,
        "lastLogin": None,
        "createdAt": now,
        "updatedAt": now,
    }

    try:
        result = await db["users"].insert_one(document)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email sudah terdaftar.",
        )

    created_user = await db["users"].find_one({"_id": result.inserted_id})
    return serialize_mongo_document(created_user, exclude={"password"})


@router.put("/{user_id}")
async def update_user(user_id: str, payload: UserUpdate) -> dict:
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan")

    update_fields = {
        key: value
        for key, value in payload.model_dump(exclude_unset=True).items()
        if value is not None
    }
    if not update_fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tidak ada data untuk diupdate")

    update_fields["updatedAt"] = datetime.now(UTC)

    db = get_database()
    result = await db["users"].update_one(
        {"_id": ObjectId(user_id), "role": "doctor"},
        {"$set": update_fields},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan")

    updated_user = await db["users"].find_one({"_id": ObjectId(user_id)})
    return serialize_mongo_document(updated_user, exclude={"password"})


@router.delete("/{user_id}")
async def soft_delete_user(user_id: str) -> dict:
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan")

    db = get_database()
    result = await db["users"].update_one(
        {"_id": ObjectId(user_id), "role": "doctor"},
        {
            "$set": {
                "status": "Nonaktif",
                "updatedAt": datetime.now(UTC),
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan")

    updated_user = await db["users"].find_one({"_id": ObjectId(user_id)})
    return serialize_mongo_document(updated_user, exclude={"password"})
