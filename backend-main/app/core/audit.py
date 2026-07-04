from datetime import UTC, datetime


async def write_audit_log(
    *,
    db,
    action: str,
    user_id,
    target_id=None,
    ip_address: str | None = None,
    meta: dict | None = None,
) -> None:
    now = datetime.now(UTC)
    await db["audit_logs"].insert_one(
        {
            "action": action,
            "user_id": user_id,
            "userId": user_id,
            "target_id": target_id,
            "targetId": target_id,
            "timestamp": now,
            "createdAt": now,
            "ip_address": ip_address,
            "ip": ip_address,
            "meta": meta,
        }
    )
