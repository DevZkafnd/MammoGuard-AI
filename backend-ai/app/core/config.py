import os

from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict, Field


load_dotenv()


class Settings(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    app_name: str = "MammoGuard AI Inference Server"
    app_version: str = "1.0.0"
    host: str = Field(default_factory=lambda: os.getenv("HOST", "0.0.0.0"))
    port: int = Field(default_factory=lambda: int(os.getenv("PORT", "8001")))
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


settings = Settings()
