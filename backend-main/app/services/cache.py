import os
from pathlib import Path

import anyio

from app.core.config import settings


def cache_path_for(key: str) -> Path:
    return Path(settings.storage_cache_dir) / key


async def read_cached(key: str) -> bytes | None:
    def _read() -> bytes | None:
        path = cache_path_for(key)
        if not path.is_file():
            return None
        return path.read_bytes()

    return await anyio.to_thread.run_sync(_read)


async def write_cached(key: str, data: bytes) -> Path:
    def _write() -> Path:
        path = cache_path_for(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = path.with_suffix(path.suffix + ".tmp")
        tmp_path.write_bytes(data)
        os.replace(tmp_path, path)
        return path

    return await anyio.to_thread.run_sync(_write)


def remove_cached(key: str) -> None:
    cache_path_for(key).unlink(missing_ok=True)
