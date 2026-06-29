from io import BytesIO

import torch
from torch import nn

from app.db.database import get_database
from app.db.gridfs import download_bytes_from_models


class ActiveModelRegistry:
    def __init__(self) -> None:
        self.model: nn.Module | None = None
        self.model_id: str | None = None
        self.label: str | None = None
        self.architecture: str | None = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    async def load_active_model(self) -> dict | None:
        db = get_database()
        model_doc = await db["ai_models"].find_one(
            {"$or": [{"isActive": True}, {"is_active": True}]}
        )
        if not model_doc:
            self.model = None
            self.model_id = None
            self.label = None
            self.architecture = None
            return None

        model_id = str(model_doc["_id"])
        if self.model is not None and self.model_id == model_id:
            return model_doc

        loaded = None
        file_id = model_doc.get("file_id") or model_doc.get("fileId")

        if file_id:
            model_bytes = await download_bytes_from_models(file_id)
            buffer = BytesIO(model_bytes)
            loaded = torch.load(buffer, map_location=self.device)
        else:
            self.clear()
            return None

        if isinstance(loaded, nn.Module):
            model = loaded
        elif isinstance(loaded, dict) and "model" in loaded and isinstance(loaded["model"], nn.Module):
            model = loaded["model"]
        else:
            raise ValueError("Format model .pth belum didukung untuk auto-load")

        model.eval()
        model.to(self.device)

        self.model = model
        self.model_id = model_id
        self.label = model_doc.get("display_name") or model_doc.get("label")
        self.architecture = model_doc.get("architecture")
        return model_doc

    def clear(self) -> None:
        self.model = None
        self.model_id = None
        self.label = None
        self.architecture = None


active_model_registry = ActiveModelRegistry()
