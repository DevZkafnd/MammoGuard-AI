from fastapi import APIRouter

from app.core.config import settings
from app.db.database import mongodb


router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    db_status = "connected" if mongodb.database is not None else "disconnected"
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "ok",
        "database": db_status,
    }
