from io import BytesIO
from math import sqrt

import numpy as np
from PIL import Image, ImageDraw


def generate_heatmap_overlay(image: Image.Image) -> tuple[bytes, dict]:
    rgb_image = image.convert("RGB")
    grayscale = np.asarray(rgb_image.convert("L"), dtype=np.float32)

    total = grayscale.sum()
    if total <= 0:
        total = 1.0

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

    buffer = BytesIO()
    overlay.save(buffer, format="PNG")
    return buffer.getvalue(), {
        "x": center_x,
        "y": center_y,
        "radius": radius,
        "heatIntensity": round(intensity, 4),
    }
