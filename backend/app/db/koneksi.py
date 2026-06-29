from app.db.database import get_database, get_image_bucket, get_model_bucket, mongodb


async def hubungkan_database() -> None:
    await mongodb.connect()


async def putuskan_database() -> None:
    await mongodb.disconnect()


def dapatkan_database():
    return get_database()


def dapatkan_bucket_gambar():
    return get_image_bucket()


def dapatkan_bucket_model():
    return get_model_bucket()
