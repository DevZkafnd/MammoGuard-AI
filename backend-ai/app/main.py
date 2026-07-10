import base64

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.ml.runtime import active_runtime, _normalize_image
from app.services.storage import download_bytes


class SetupRequest(BaseModel):
    model_id: str = Field(..., min_length=3, max_length=150)
    storage_key: str = Field(..., min_length=3, max_length=500)


class PredictRequest(BaseModel):
    analysis_id: str = Field(..., min_length=3, max_length=150)
    image_key: str = Field(..., min_length=3, max_length=500)


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Inference server terisolasi untuk model PyTorch MammoGuard AI.",
)


@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "message": "MammoGuard AI inference server is running.",
    }


@app.get("/api/health", tags=["Health"])
async def health() -> dict[str, str | None]:
    return {
        "status": "ok",
        "active_model": active_runtime.model_id,
    }


@app.post("/api/ai/setup", tags=["AI"])
async def setup_model(payload: SetupRequest) -> dict:
    if active_runtime.model is not None and active_runtime.model_id == payload.model_id:
        return {"model_id": payload.model_id, "device": str(active_runtime.device), "status": "ready"}

    try:
        model_bytes = await download_bytes(payload.storage_key)
        return active_runtime.load_model(model_id=payload.model_id, model_bytes=model_bytes)
    except Exception as exc:
        active_runtime.clear()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal warm-up model di backend-ai: {exc}",
        )


@app.post("/api/ai/predict", tags=["AI"])
async def predict(payload: PredictRequest) -> dict:
    if active_runtime.model is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ACTIVE_MODEL belum tersedia. Jalankan setup model terlebih dahulu.",
        )

    try:
        image_bytes = await download_bytes(payload.image_key)
        image = _normalize_image(image_bytes, payload.image_key)
        result = active_runtime.predict(image)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal menjalankan inference: {exc}",
        )

    return {
        "analysis_id": payload.analysis_id,
        "image_key": payload.image_key,
        "prediction": result["prediction"],
        "confidence": result["confidence"],
        "birads_ai_suggestion": result["birads_ai_suggestion"],
        "bounding_boxes": result["bounding_boxes"],
        "heatmap": result["heatmap"],
        "heatmap_png_base64": base64.b64encode(result["heatmap_png"]).decode("ascii"),
        "model_used": result["model_used"],
    }
