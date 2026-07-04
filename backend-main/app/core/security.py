from datetime import UTC, datetime, timedelta
import hashlib
import re

import jwt
from passlib.context import CryptContext

from app.core.config import settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def parse_expiry_to_timedelta(value: str) -> timedelta:
    match = re.fullmatch(r"(\d+)([mhd])", value.strip().lower())
    if not match:
        raise ValueError(f"Unsupported expiry format: {value}")

    amount = int(match.group(1))
    unit = match.group(2)

    if unit == "m":
        return timedelta(minutes=amount)
    if unit == "h":
        return timedelta(hours=amount)
    return timedelta(days=amount)


def create_access_token(*, subject: str, email: str, role: str, name: str) -> str:
    now = datetime.now(UTC)
    expires_delta = parse_expiry_to_timedelta(settings.jwt_expires_in)
    payload = {
        "sub": subject,
        "email": email,
        "role": role,
        "name": name,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(*, subject: str, email: str, role: str, name: str) -> tuple[str, datetime]:
    now = datetime.now(UTC)
    expires_delta = parse_expiry_to_timedelta(settings.jwt_refresh_expires_in)
    expires_at = now + expires_delta
    payload = {
        "sub": subject,
        "email": email,
        "role": role,
        "name": name,
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_refresh_secret, algorithm=settings.jwt_algorithm)
    return token, expires_at


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


def decode_refresh_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_refresh_secret, algorithms=[settings.jwt_algorithm])
