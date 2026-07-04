import httpx

from app.core.config import settings


async def warmup_model(*, model_id: str, storage_key: str) -> dict:
    async with httpx.AsyncClient(timeout=settings.backend_ai_timeout_seconds) as client:
        response = await client.post(
            f"{settings.backend_ai_url.rstrip('/')}/api/ai/setup",
            json={"model_id": model_id, "storage_key": storage_key},
        )
        response.raise_for_status()
        return response.json()


async def request_prediction(*, analysis_id: str, image_key: str) -> dict:
    async with httpx.AsyncClient(timeout=settings.backend_ai_timeout_seconds) as client:
        response = await client.post(
            f"{settings.backend_ai_url.rstrip('/')}/api/ai/predict",
            json={"analysis_id": analysis_id, "image_key": image_key},
        )
        response.raise_for_status()
        return response.json()
