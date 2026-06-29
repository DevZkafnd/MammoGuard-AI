from datetime import UTC, datetime
from app.core.config import settings
from app.core.security import hash_password
from app.db.database import get_database


async def ensure_bootstrap_admin() -> None:
    db = get_database()
    admin_email = settings.bootstrap_admin_email.lower()

    existing_admin = await db["users"].find_one({"email": admin_email})
    if existing_admin:
        return

    now = datetime.now(UTC)
    await db["users"].insert_one(
        {
            "name": settings.bootstrap_admin_name,
            "email": admin_email,
            "password": hash_password(settings.bootstrap_admin_password),
            "role": "admin",
            "specialization": settings.bootstrap_admin_specialization,
            "status": "Aktif",
            "lastLogin": None,
            "createdAt": now,
            "updatedAt": now,
        }
    )
