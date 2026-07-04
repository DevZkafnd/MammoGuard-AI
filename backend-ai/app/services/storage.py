import asyncio
from functools import lru_cache

import boto3
from botocore.client import BaseClient

from app.core.config import settings


@lru_cache(maxsize=1)
def get_s3_client() -> BaseClient:
    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name=settings.r2_region,
    )


async def download_bytes(object_key: str) -> bytes:
    client = get_s3_client()

    def _download() -> bytes:
        response = client.get_object(Bucket=settings.r2_bucket_name, Key=object_key)
        return response["Body"].read()

    return await asyncio.to_thread(_download)
