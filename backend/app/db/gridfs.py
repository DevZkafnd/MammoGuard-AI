from io import BytesIO

from bson import ObjectId
from gridfs.errors import NoFile

from app.db.database import get_database, get_image_bucket, get_model_bucket


async def upload_bytes_to_images(
    *,
    filename: str,
    data: bytes,
    content_type: str,
    metadata: dict | None = None,
) -> ObjectId:
    bucket = get_image_bucket()
    stream = bucket.open_upload_stream(
        filename=filename,
        metadata={**(metadata or {}), "contentType": content_type},
    )
    await stream.write(data)
    await stream.close()
    return stream._id


async def upload_bytes_to_models(
    *,
    filename: str,
    data: bytes,
    content_type: str,
    metadata: dict | None = None,
) -> ObjectId:
    bucket = get_model_bucket()
    stream = bucket.open_upload_stream(
        filename=filename,
        metadata={**(metadata or {}), "contentType": content_type},
    )
    await stream.write(data)
    await stream.close()
    return stream._id


async def download_bytes_from_images(file_id: ObjectId) -> bytes:
    bucket = get_image_bucket()
    try:
        stream = bucket.open_download_stream(file_id)
    except NoFile:
        raise FileNotFoundError("GridFS image file not found")
    buffer = BytesIO()
    while True:
        chunk = await stream.readchunk()
        if not chunk:
            break
        buffer.write(chunk)
    return buffer.getvalue()


async def download_bytes_from_models(file_id: ObjectId) -> bytes:
    bucket = get_model_bucket()
    try:
        stream = bucket.open_download_stream(file_id)
    except NoFile:
        raise FileNotFoundError("GridFS model file not found")
    buffer = BytesIO()
    while True:
        chunk = await stream.readchunk()
        if not chunk:
            break
        buffer.write(chunk)
    return buffer.getvalue()


async def delete_image_file(file_id: ObjectId) -> None:
    bucket = get_image_bucket()
    try:
        await bucket.delete(file_id)
    except NoFile:
        return


async def delete_model_file(file_id: ObjectId) -> None:
    bucket = get_model_bucket()
    try:
        await bucket.delete(file_id)
    except NoFile:
        return


async def get_image_file_document(file_id: ObjectId) -> dict | None:
    db = get_database()
    return await db["images.files"].find_one({"_id": file_id})


async def get_model_file_document(file_id: ObjectId) -> dict | None:
    db = get_database()
    return await db["models.files"].find_one({"_id": file_id})
