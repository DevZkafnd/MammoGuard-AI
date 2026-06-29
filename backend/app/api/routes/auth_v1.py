from datetime import UTC, datetime

from bson import ObjectId
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_token,
    verify_password,
)
from app.db.database import get_database


router = APIRouter(prefix="/v1/auth", tags=["Auth V1"])


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


@router.post("/login")
async def login_v1(form_data: OAuth2PasswordRequestForm = Depends(), response: Response = None) -> dict:
    db = get_database()
    user = await db["users"].find_one({"email": form_data.username.lower()})

    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Email atau password tidak valid.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not user or user.get("status") != "Aktif":
        raise invalid_credentials

    hashed_password = user.get("hashed_password") or user.get("password")
    if not hashed_password or not verify_password(form_data.password, hashed_password):
        raise invalid_credentials

    now = datetime.now(UTC)
    await db["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"lastLogin": now, "updatedAt": now}},
    )

    access_token = create_access_token(
        subject=str(user["_id"]),
        email=user["email"],
        role=user["role"],
        name=user.get("full_name") or user["name"],
    )
    refresh_token, refresh_expires_at = create_refresh_token(
        subject=str(user["_id"]),
        email=user["email"],
        role=user["role"],
        name=user.get("full_name") or user["name"],
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
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],
        "user_id": str(user["_id"]),
        "name": user.get("full_name") or user["name"],
        "email": user["email"],
    }


@router.post("/refresh")
async def refresh_v1(request: Request, response: Response) -> dict:
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
    stored = await db["refresh_tokens"].find_one(
        {
            "userId": ObjectId(user_id),
            "token": hash_token(refresh_token),
            "expiresAt": {"$gt": datetime.now(UTC)},
        }
    )
    if not stored:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user or user.get("status") != "Aktif":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    access_token = create_access_token(
        subject=str(user["_id"]),
        email=user["email"],
        role=user["role"],
        name=user.get("full_name") or user["name"],
    )
    new_refresh_token, refresh_expires_at = create_refresh_token(
        subject=str(user["_id"]),
        email=user["email"],
        role=user["role"],
        name=user.get("full_name") or user["name"],
    )
    await db["refresh_tokens"].update_one(
        {"_id": stored["_id"]},
        {"$set": {"token": hash_token(new_refresh_token), "expiresAt": refresh_expires_at}},
    )
    _set_refresh_cookie(response, new_refresh_token)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],
        "user_id": str(user["_id"]),
        "name": user.get("full_name") or user["name"],
        "email": user["email"],
    }


@router.get("/me")
async def me_v1(current_user: dict = Depends(get_current_user)) -> dict:
    return {
        "user_id": str(current_user["_id"]),
        "name": current_user.get("full_name") or current_user["name"],
        "email": current_user["email"],
        "role": current_user["role"],
        "specialization": current_user.get("specialization"),
        "status": current_user.get("status"),
    }


@router.post("/logout")
async def logout_v1(
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
