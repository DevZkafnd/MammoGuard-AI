from __future__ import annotations

from io import BytesIO
from math import sqrt

import numpy as np
from PIL import Image, ImageDraw
import pydicom
import torch
from torch import nn
from torchvision import transforms


CLASS_LABELS = ["Benign", "Follow-up", "Malignant"]
BIRADS_SUGGESTIONS = {
    "Benign": "2",
    "Follow-up": "3",
    "Malignant": "4C",
}


def _build_heatmap_overlay(image: Image.Image) -> tuple[bytes, list[list[float]], list[dict[str, float]]]:
    rgb_image = image.convert("RGB")
    grayscale = np.asarray(rgb_image.convert("L"), dtype=np.float32)

    total = grayscale.sum() or 1.0
    ys, xs = np.indices(grayscale.shape)
    center_x = int((xs * grayscale).sum() / total)
    center_y = int((ys * grayscale).sum() / total)
    intensity = float(np.clip(grayscale.mean() / 255.0, 0.2, 0.99))

    width, height = rgb_image.size
    radius = max(18, int(sqrt(width * height) * 0.08))

    overlay = rgb_image.copy()
    draw = ImageDraw.Draw(overlay, "RGBA")
    draw.ellipse(
        (
            center_x - radius,
            center_y - radius,
            center_x + radius,
            center_y + radius,
        ),
        fill=(255, 0, 0, 90),
        outline=(255, 80, 80, 180),
        width=4,
    )

    heatmap = np.asarray(overlay.convert("L").resize((32, 32)), dtype=np.float32)
    heatmap = np.clip(heatmap / 255.0, 0.0, 1.0)

    buffer = BytesIO()
    overlay.save(buffer, format="PNG")
    bounding_boxes = [
        {
            "x_min": float(max(0, center_x - radius)),
            "y_min": float(max(0, center_y - radius)),
            "x_max": float(min(width, center_x + radius)),
            "y_max": float(min(height, center_y + radius)),
            "confidence": round(intensity * 100, 2),
        }
    ]
    return buffer.getvalue(), heatmap.round(4).tolist(), bounding_boxes


def _normalize_image(image_bytes: bytes, object_key: str) -> Image.Image:
    lower_key = object_key.lower()
    if lower_key.endswith(".dcm") or lower_key.endswith(".dicom"):
        dicom = pydicom.dcmread(BytesIO(image_bytes))
        pixel_array = dicom.pixel_array.astype(np.float32)
        pixel_array -= pixel_array.min()
        max_value = pixel_array.max() or 1.0
        pixel_array = np.clip((pixel_array / max_value) * 255.0, 0, 255).astype(np.uint8)
        return Image.fromarray(pixel_array).convert("RGB")
    return Image.open(BytesIO(image_bytes)).convert("RGB")


def _transform_image(image: Image.Image) -> torch.Tensor:
    pipeline = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    return pipeline(image).unsqueeze(0)


class ActiveModelRuntime:
    def __init__(self) -> None:
        self.model: nn.Module | None = None
        self.model_id: str | None = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def clear(self) -> None:
        if self.model is not None:
            del self.model
        self.model = None
        self.model_id = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    def load_model(self, *, model_id: str, model_bytes: bytes) -> dict:
        if self.model is not None and self.model_id == model_id:
            return {"model_id": model_id, "device": str(self.device), "status": "ready"}

        self.clear()
        loaded = torch.load(BytesIO(model_bytes), map_location=self.device)
        if isinstance(loaded, nn.Module):
            model = loaded
        elif isinstance(loaded, dict) and "model" in loaded and isinstance(loaded["model"], nn.Module):
            model = loaded["model"]
        else:
            raise ValueError("Format .pth belum didukung. Pastikan file menyimpan nn.Module atau dict['model'].")

        model.eval()
        model.to(self.device)
        self.model = model
        self.model_id = model_id
        return {"model_id": model_id, "device": str(self.device), "status": "ready"}

    def predict(self, image: Image.Image) -> dict:
        if self.model is None:
            raise RuntimeError("Belum ada ACTIVE_MODEL yang diload di backend-ai.")

        tensor = _transform_image(image).to(self.device)
        with torch.no_grad():
            logits = self.model(tensor)
            if isinstance(logits, (tuple, list)):
                logits = logits[0]
            probs = torch.softmax(logits, dim=1).detach().cpu().numpy()[0]

        label_index = int(np.argmax(probs))
        prediction = CLASS_LABELS[label_index] if label_index < len(CLASS_LABELS) else "Follow-up"
        confidence = round(float(probs[label_index] * 100), 2)
        heatmap_png, heatmap_array, bounding_boxes = _build_heatmap_overlay(image)
        return {
            "prediction": prediction,
            "confidence": confidence,
            "birads_ai_suggestion": BIRADS_SUGGESTIONS.get(prediction, "3"),
            "heatmap_png": heatmap_png,
            "heatmap": heatmap_array,
            "bounding_boxes": bounding_boxes,
            "model_used": self.model_id,
        }


active_runtime = ActiveModelRuntime()
