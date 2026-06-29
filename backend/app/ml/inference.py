from io import BytesIO

import numpy as np
from PIL import Image
import torch
from torchvision import transforms

from app.ml.gradcam import generate_heatmap_overlay
from app.ml.model_loader import active_model_registry


CLASS_LABELS = ["Benign", "Follow-up", "Malignant"]
BIRADS_SUGGESTIONS = {
    "Benign": "2",
    "Follow-up": "3",
    "Malignant": "4C",
}


def _transform_image(image: Image.Image) -> torch.Tensor:
    pipeline = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    return pipeline(image.convert("RGB")).unsqueeze(0)


def _fallback_prediction(image: Image.Image) -> tuple[str, float]:
    grayscale = np.asarray(image.convert("L"), dtype=np.float32)
    brightness = float(grayscale.mean() / 255.0)
    contrast = float(grayscale.std() / 255.0)
    risk_score = np.clip((brightness * 0.45) + (contrast * 0.8), 0.0, 1.0)

    if risk_score >= 0.72:
        return "Malignant", round(78 + (risk_score - 0.72) * 75, 2)
    if risk_score >= 0.45:
        return "Follow-up", round(65 + (risk_score - 0.45) * 70, 2)
    return "Benign", round(70 + (0.45 - risk_score) * 40, 2)


async def run_local_inference(image_bytes: bytes) -> dict:
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    try:
        active_model = await active_model_registry.load_active_model()
    except Exception:
        active_model_registry.clear()
        active_model = None

    if active_model_registry.model is None:
        prediction, confidence = _fallback_prediction(image)
        model_used = "local-demo-analyzer"
    else:
        tensor = _transform_image(image).to(active_model_registry.device)
        with torch.no_grad():
            logits = active_model_registry.model(tensor)
            if isinstance(logits, (tuple, list)):
                logits = logits[0]
            probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
        label_index = int(np.argmax(probs))
        prediction = CLASS_LABELS[label_index] if label_index < len(CLASS_LABELS) else "Follow-up"
        confidence = round(float(probs[label_index] * 100), 2)
        model_used = active_model.get("modelId") if active_model else "uploaded-model"

    heatmap_bytes, gradcam_coordinates = generate_heatmap_overlay(image)
    return {
        "prediction": prediction,
        "confidence": confidence,
        "biradsAiSuggestion": BIRADS_SUGGESTIONS.get(prediction, "3"),
        "heatmapBytes": heatmap_bytes,
        "gradcamCoordinates": gradcam_coordinates,
        "modelUsed": model_used,
    }
