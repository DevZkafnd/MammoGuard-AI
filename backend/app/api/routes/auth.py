from datetime import UTC, datetime

from bson import ObjectId
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_token,
    verify_password,
)
from app.core.serializers import serialize_mongo_document
from app.db.database import get_database
from app.models import LoginRequest


router = APIRouter(prefix="/auth", tags=["Auth"])


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=refresh_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def _build_login_response(user: dict, access_token: str) -> dict:
    return {
        "accessToken": access_token,
        "user": serialize_mongo_document(user, exclude={"password"}),
    }


@router.post("/login")
async def login(payload: LoginRequest, response: Response) -> dict:
    db = get_database()
    user = await db["users"].find_one({"email": payload.email.lower()})

    if not user or user.get("status") != "Aktif":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kredensial tidak valid atau akun dinonaktifkan.",
        )

    if not verify_password(payload.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kredensial tidak valid atau akun dinonaktifkan.",
        )

    now = datetime.now(UTC)
    await db["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"lastLogin": now, "updatedAt": now}},
    )
    user["lastLogin"] = now
    user["updatedAt"] = now

    subject = str(user["_id"])
    access_token = create_access_token(
        subject=subject,
        email=user["email"],
        role=user["role"],
        name=user["name"],
    )
    refresh_token, refresh_expires_at = create_refresh_token(
        subject=subject,
        email=user["email"],
        role=user["role"],
        name=user["name"],
    )

    await db["refresh_tokens"].delete_many({"userId": user["_id"]})
    await db["refresh_tokens"].insert_one(
        {
            "userId": user["_id"],
            "token": hash_token(refresh_token),
            "expiresAt": refresh_expires_at,
            "createdAt": now,
        }
    )

    _set_refresh_cookie(response, refresh_token)
    return _build_login_response(user, access_token)


@router.post("/refresh")
async def refresh_token(request: Request, response: Response) -> dict:
    refresh_token = request.cookies.get(settings.refresh_cookie_name)
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    try:
        payload = decode_refresh_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
        user_id = payload.get("sub")
        if not user_id or not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    db = get_database()
    stored_token = await db["refresh_tokens"].find_one(
        {
            "userId": ObjectId(user_id),
            "token": hash_token(refresh_token),
            "expiresAt": {"$gt": datetime.now(UTC)},
        }
    )
    if not stored_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user or user.get("status") != "Aktif":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    access_token = create_access_token(
        subject=str(user["_id"]),
        email=user["email"],
        role=user["role"],
        name=user["name"],
    )
    new_refresh_token, refresh_expires_at = create_refresh_token(
        subject=str(user["_id"]),
        email=user["email"],
        role=user["role"],
        name=user["name"],
    )

    await db["refresh_tokens"].update_one(
        {"_id": stored_token["_id"]},
        {
            "$set": {
                "token": hash_token(new_refresh_token),
                "expiresAt": refresh_expires_at,
            }
        },
    )

    _set_refresh_cookie(response, new_refresh_token)
    return _build_login_response(user, access_token)


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)) -> dict:
    return serialize_mongo_document(current_user, exclude={"password"})


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
) -> dict:
    refresh_token = request.cookies.get(settings.refresh_cookie_name)
    db = get_database()

    if refresh_token:
        try:
            payload = decode_refresh_token(refresh_token)
            user_id = payload.get("sub")
            delete_filter = {"token": hash_token(refresh_token)}
            if user_id and ObjectId.is_valid(user_id):
                delete_filter["userId"] = ObjectId(user_id)
            await db["refresh_tokens"].delete_many(delete_filter)
        except (jwt.InvalidTokenError, ValueError):
            await db["refresh_tokens"].delete_many({"token": hash_token(refresh_token)})

    _clear_refresh_cookie(response)
    return {"message": "Logout berhasil"}
