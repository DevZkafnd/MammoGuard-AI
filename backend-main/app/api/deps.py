from typing import Annotated

from bson import ObjectId
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.security import decode_access_token
from app.db.database import get_database


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        if payload.get("type") != "access":
            raise credentials_exception
        user_id = payload.get("sub")
        if not user_id or not ObjectId.is_valid(user_id):
            raise credentials_exception
    except (jwt.InvalidTokenError, ValueError):
        raise credentials_exception

    db = get_database()
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user or user.get("status") != "Aktif":
        raise credentials_exception
    return user


def require_role(*roles: str):
    async def role_dependency(current_user: Annotated[dict, Depends(get_current_user)]) -> dict:
        if current_user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden",
            )
        return current_user

    return role_dependency
