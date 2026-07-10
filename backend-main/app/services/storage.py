import asyncio
from functools import lru_cache
from typing import Any

import boto3
from botocore.client import BaseClient

from app.core.config import settings
from app.services import cache


@lru_cache(maxsize=1)
def _get_s3_client() -> BaseClient:
    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name=settings.r2_region,
    )


def _build_public_url(object_key: str) -> str:
    base = settings.r2_public_base_url.rstrip("/")
    return f"{base}/{object_key.lstrip('/')}"


async def generate_presigned_upload(object_key: str, content_type: str) -> dict[str, Any]:
    client = _get_s3_client()

    def _generate() -> str:
        return client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.r2_bucket_name,
                "Key": object_key,
                "ContentType": content_type,
            },
            ExpiresIn=settings.presigned_upload_expires_seconds,
        )

    upload_url = await asyncio.to_thread(_generate)
    return {
        "object_key": object_key,
        "upload_url": upload_url,
        "method": "PUT",
        "headers": {"Content-Type": content_type},
        "expires_in": settings.presigned_upload_expires_seconds,
        "public_url": _build_public_url(object_key),
    }


async def generate_presigned_download(object_key: str) -> dict[str, Any]:
    client = _get_s3_client()

    def _generate() -> str:
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.r2_bucket_name, "Key": object_key},
            ExpiresIn=settings.presigned_download_expires_seconds,
        )

    download_url = await asyncio.to_thread(_generate)
    return {
        "object_key": object_key,
        "download_url": download_url,
        "expires_in": settings.presigned_download_expires_seconds,
        "public_url": _build_public_url(object_key),
    }


async def upload_bytes(
    *,
    object_key: str,
    data: bytes,
    content_type: str,
    metadata: dict[str, str] | None = None,
) -> str:
    client = _get_s3_client()

    def _upload() -> None:
        extra_args: dict[str, Any] = {"ContentType": content_type}
        if metadata:
            extra_args["Metadata"] = metadata
        client.put_object(
            Bucket=settings.r2_bucket_name,
            Key=object_key,
            Body=data,
            **extra_args,
        )

    await asyncio.to_thread(_upload)
    await cache.write_cached(object_key, data)
    return object_key


async def download_bytes(object_key: str) -> bytes:
    cached = await cache.read_cached(object_key)
    if cached is not None:
        return cached

    client = _get_s3_client()

    def _download() -> bytes:
        response = client.get_object(Bucket=settings.r2_bucket_name, Key=object_key)
        return response["Body"].read()

    data = await asyncio.to_thread(_download)
    await cache.write_cached(object_key, data)
    return data
