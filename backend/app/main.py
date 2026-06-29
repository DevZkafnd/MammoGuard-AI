from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.analyses import router as analyses_router
from app.api.routes.auth import router as auth_router
from app.api.routes.auth_v1 import router as auth_v1_router
from app.api.routes.doctor_portal_v1 import router as doctor_portal_v1_router
from app.api.routes.doctors import router as doctors_router
from app.api.routes.health import router as health_router
from app.api.routes.models_admin import router as models_admin_router
from app.api.routes.users import router as users_router
from app.core.bootstrap import ensure_bootstrap_admin
from app.core.config import settings
from app.db.database import mongodb


@asynccontextmanager
async def lifespan(_: FastAPI):
    await mongodb.connect()
    await ensure_bootstrap_admin()
    try:
        yield
    finally:
        await mongodb.disconnect()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend monolithic FastAPI untuk MammoGuard AI.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "message": "MammoGuard AI backend is running.",
    }


app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(users_router, prefix=settings.api_prefix)
app.include_router(analyses_router, prefix=settings.api_prefix)
app.include_router(doctors_router, prefix=settings.api_prefix)
app.include_router(models_admin_router, prefix=settings.api_prefix)
app.include_router(auth_v1_router, prefix=settings.api_prefix)
app.include_router(doctor_portal_v1_router, prefix=settings.api_prefix)
