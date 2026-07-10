import os

from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict, Field


load_dotenv()


class Settings(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    app_name: str = "MammoGuard AI Backend"
    app_version: str = "1.0.0"
    api_prefix: str = "/api"
    environment: str = Field(default_factory=lambda: os.getenv("ENVIRONMENT", "development"))
    debug: bool = Field(default_factory=lambda: os.getenv("DEBUG", "false").lower() == "true")
    host: str = Field(default_factory=lambda: os.getenv("HOST", "0.0.0.0"))
    port: int = Field(default_factory=lambda: int(os.getenv("PORT", "8000")))
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            origin.strip()
            for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
            if origin.strip()
        ]
    )
    mongodb_uri: str = Field(
        default_factory=lambda: os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    )
    mongodb_db_name: str = Field(
        default_factory=lambda: os.getenv("MONGODB_DB_NAME", "mammoguard_db")
    )
    jwt_secret: str = Field(
        default_factory=lambda: os.getenv("JWT_SECRET", "change-me-in-production")
    )
    jwt_refresh_secret: str = Field(
        default_factory=lambda: os.getenv("JWT_REFRESH_SECRET", "change-me-too")
    )
    jwt_algorithm: str = Field(default_factory=lambda: os.getenv("JWT_ALGORITHM", "HS256"))
    jwt_expires_in: str = Field(default_factory=lambda: os.getenv("JWT_EXPIRES_IN", "15m"))
    jwt_refresh_expires_in: str = Field(
        default_factory=lambda: os.getenv("JWT_REFRESH_EXPIRES_IN", "7d")
    )
    refresh_cookie_name: str = Field(default_factory=lambda: os.getenv("REFRESH_COOKIE_NAME", "mgu_rt"))
    cookie_secure: bool = Field(
        default_factory=lambda: os.getenv("COOKIE_SECURE", "false").lower() == "true"
    )
    bootstrap_admin_name: str = Field(
        default_factory=lambda: os.getenv("BOOTSTRAP_ADMIN_NAME", "Admin MammoGuard")
    )
    bootstrap_admin_email: str = Field(
        default_factory=lambda: os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@mammoguard.id")
    )
    bootstrap_admin_password: str = Field(
        default_factory=lambda: os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "Admin@12345")
    )
    bootstrap_admin_specialization: str = Field(
        default_factory=lambda: os.getenv("BOOTSTRAP_ADMIN_SPECIALIZATION", "System Administrator")
    )
    r2_endpoint_url: str = Field(
        default_factory=lambda: os.getenv("R2_ENDPOINT_URL", "https://example-account.r2.cloudflarestorage.com")
    )
    r2_access_key_id: str = Field(
        default_factory=lambda: os.getenv("R2_ACCESS_KEY_ID", "replace-me")
    )
    r2_secret_access_key: str = Field(
        default_factory=lambda: os.getenv("R2_SECRET_ACCESS_KEY", "replace-me")
    )
    r2_bucket_name: str = Field(
        default_factory=lambda: os.getenv("R2_BUCKET_NAME", "mammoguard-storage")
    )
    r2_region: str = Field(default_factory=lambda: os.getenv("R2_REGION", "auto"))
    r2_public_base_url: str = Field(
        default_factory=lambda: os.getenv("R2_PUBLIC_BASE_URL", "https://cdn.example.com")
    )
    presigned_upload_expires_seconds: int = Field(
        default_factory=lambda: int(os.getenv("PRESIGNED_UPLOAD_EXPIRES_SECONDS", "900"))
    )
    presigned_download_expires_seconds: int = Field(
        default_factory=lambda: int(os.getenv("PRESIGNED_DOWNLOAD_EXPIRES_SECONDS", "300"))
    )
    backend_ai_url: str = Field(
        default_factory=lambda: os.getenv("BACKEND_AI_URL", "http://backend-ai:8001")
    )
    backend_ai_timeout_seconds: int = Field(
        default_factory=lambda: int(os.getenv("BACKEND_AI_TIMEOUT_SECONDS", "60"))
    )
    storage_cache_dir: str = Field(
        default_factory=lambda: os.getenv("STORAGE_CACHE_DIR", "./storage_cache")
    )


settings = Settings()
