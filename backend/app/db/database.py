from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorGridFSBucket
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import PyMongoError

from app.core.config import settings


class MongoDatabase:
    def __init__(self) -> None:
        self.client: AsyncIOMotorClient | None = None
        self.database: AsyncIOMotorDatabase | None = None
        self.image_bucket: AsyncIOMotorGridFSBucket | None = None
        self.model_bucket: AsyncIOMotorGridFSBucket | None = None

    async def connect(self) -> None:
        self.client = AsyncIOMotorClient(settings.mongodb_uri)
        await self.client.admin.command("ping")
        self.database = self.client[settings.mongodb_db_name]
        self.image_bucket = AsyncIOMotorGridFSBucket(
            self.database,
            bucket_name=settings.image_bucket_name,
            chunk_size_bytes=settings.gridfs_chunk_size_bytes,
        )
        self.model_bucket = AsyncIOMotorGridFSBucket(
            self.database,
            bucket_name=settings.model_bucket_name,
            chunk_size_bytes=settings.gridfs_chunk_size_bytes,
        )
        await self.ensure_indexes()

    async def disconnect(self) -> None:
        if self.client is not None:
            self.client.close()
        self.client = None
        self.database = None
        self.image_bucket = None
        self.model_bucket = None

    async def ensure_indexes(self) -> None:
        if self.database is None:
            raise RuntimeError("Database connection is not initialized")

        mammogram_indexes = await self.database["mammogram_analyses"].index_information()
        patient_id_index = mammogram_indexes.get("patient_id_1")
        if patient_id_index and patient_id_index.get("unique"):
            await self.database["mammogram_analyses"].drop_index("patient_id_1")

        await self.database["users"].create_index("email", unique=True)
        await self.database["users"].create_index("role")

        await self.database["analyses"].create_index("patientId", unique=True)
        await self.database["analyses"].create_index("validatedBy")
        await self.database["analyses"].create_index("status")
        await self.database["analyses"].create_index("aiPrediction")
        await self.database["analyses"].create_index([("createdAt", DESCENDING)])

        await self.database["mammogram_analyses"].create_index("patient_id")
        await self.database["mammogram_analyses"].create_index("doctor_id")
        await self.database["mammogram_analyses"].create_index("status")
        await self.database["mammogram_analyses"].create_index("ai_prediction_class")
        await self.database["mammogram_analyses"].create_index([("created_at", DESCENDING)])

        await self.database["ai_models"].create_index("modelId", unique=True)
        await self.database["ai_models"].create_index("model_id", unique=True)
        await self.database["ai_models"].create_index("isActive")
        await self.database["ai_models"].create_index("is_active")

        await self.database["audit_logs"].create_index("actor")
        await self.database["audit_logs"].create_index("action")
        await self.database["audit_logs"].create_index("user_id")
        await self.database["audit_logs"].create_index("target_id")
        await self.database["audit_logs"].create_index("timestamp")
        await self.database["audit_logs"].create_index(
            [("createdAt", ASCENDING)],
            expireAfterSeconds=31_536_000,
        )

        await self.database["refresh_tokens"].create_index(
            [("expiresAt", ASCENDING)],
            expireAfterSeconds=0,
        )
        await self.database["refresh_tokens"].create_index("userId")


mongodb = MongoDatabase()


def get_database() -> AsyncIOMotorDatabase:
    if mongodb.database is None:
        raise PyMongoError("Database connection is not available")
    return mongodb.database


def get_image_bucket() -> AsyncIOMotorGridFSBucket:
    if mongodb.image_bucket is None:
        raise PyMongoError("Image GridFS bucket is not available")
    return mongodb.image_bucket


def get_model_bucket() -> AsyncIOMotorGridFSBucket:
    if mongodb.model_bucket is None:
        raise PyMongoError("Model GridFS bucket is not available")
    return mongodb.model_bucket
