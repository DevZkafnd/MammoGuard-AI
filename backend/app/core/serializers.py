from datetime import date, datetime
from typing import Any

from bson import ObjectId


def serialize_value(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: serialize_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [serialize_value(item) for item in value]
    return value


def serialize_mongo_document(document: dict[str, Any], exclude: set[str] | None = None) -> dict[str, Any]:
    exclude = exclude or set()
    return {
        key: serialize_value(value)
        for key, value in document.items()
        if key not in exclude
    }
