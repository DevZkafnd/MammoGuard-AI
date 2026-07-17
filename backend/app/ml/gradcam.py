"""
Grad-CAM: menghasilkan peta panas (heatmap) yang menyoroti area citra
yang paling berpengaruh terhadap prediksi model.

Pendekatan universal: cari layer konvolusi terakhir di model, pasang hook untuk
mengambil aktivasi + gradien, lalu hitung Class Activation Map. Bekerja untuk
arsitektur CNN umum (ResNet, DenseNet, EfficientNet/timm, dll) selama ada Conv2d.
"""

import numpy as np
import torch
from PIL import Image


def _cari_layer_konv_terakhir(model: torch.nn.Module):
    """Mengembalikan modul Conv2d terakhir pada model (None jika tidak ada)."""
    layer_konv = None
    for modul in model.modules():
        if isinstance(modul, torch.nn.Conv2d):
            layer_konv = modul
    return layer_konv


def _colormap_jet(x: np.ndarray) -> np.ndarray:
    """
    Memetakan nilai [0,1] ke warna gaya 'jet' (biru rendah -> merah tinggi).
    Mengembalikan array uint8 (H, W, 3).
    """
    r = np.clip(1.5 - np.abs(4.0 * x - 3.0), 0.0, 1.0)
    g = np.clip(1.5 - np.abs(4.0 * x - 2.0), 0.0, 1.0)
    b = np.clip(1.5 - np.abs(4.0 * x - 1.0), 0.0, 1.0)
    return (np.stack([r, g, b], axis=-1) * 255.0).astype(np.uint8)


def hasilkan_gradcam(model, perangkat, citra_tensor, citra_pil):
    """
    Menjalankan Grad-CAM.

    Args:
        model: torch.nn.Module (sudah eval)
        perangkat: torch.device
        citra_tensor: tensor input hasil preprocessing (1,3,H,W)
        citra_pil: PIL.Image citra asli (untuk overlay & ukuran output)

    Returns:
        (heatmap_pil, kelas, confidence)
        heatmap_pil: PIL.Image RGB (citra asli + overlay heatmap), atau None jika gagal
        kelas: int indeks kelas prediksi
        confidence: float probabilitas kelas prediksi (0..1)
    """
    target_layer = _cari_layer_konv_terakhir(model)

    aktivasi: dict = {}
    gradien: dict = {}

    def hook_maju(_modul, _masukan, keluaran):
        aktivasi["nilai"] = keluaran.detach()

    def hook_mundur(_modul, _grad_masukan, grad_keluaran):
        gradien["nilai"] = grad_keluaran[0].detach()

    handle_maju = handle_mundur = None
    try:
        if target_layer is not None:
            handle_maju = target_layer.register_forward_hook(hook_maju)
            handle_mundur = target_layer.register_full_backward_hook(hook_mundur)

        # Forward dengan gradien aktif (tidak boleh no_grad untuk Grad-CAM)
        x = citra_tensor.to(perangkat)
        x.requires_grad_(True)
        logits = model(x)
        prob = torch.softmax(logits, dim=1)
        kelas = int(torch.argmax(prob, dim=1).item())
        confidence = float(prob[0, kelas].item())

        # Jika tidak ada layer konv, kembalikan prediksi tanpa heatmap
        if target_layer is None:
            return None, kelas, confidence

        model.zero_grad(set_to_none=True)
        logits[0, kelas].backward()

        akt = aktivasi.get("nilai")
        grad = gradien.get("nilai")
        if akt is None or grad is None:
            return None, kelas, confidence

        akt = akt[0]        # (C, H, W)
        grad = grad[0]      # (C, H, W)
        bobot = grad.mean(dim=(1, 2))                       # (C,)
        cam = torch.relu((bobot[:, None, None] * akt).sum(dim=0))  # (H, W)
        cam = cam / (cam.max() + 1e-8)
        cam_np = cam.cpu().numpy()

        # Resize CAM ke ukuran citra asli
        lebar, tinggi = citra_pil.size
        cam_img = Image.fromarray((cam_np * 255.0).astype(np.uint8)).resize(
            (lebar, tinggi), Image.BILINEAR
        )
        cam_arr = np.asarray(cam_img).astype(np.float32) / 255.0  # (H, W)

        # Warnai & tumpuk di atas citra asli (grayscale -> RGB)
        heat = _colormap_jet(cam_arr).astype(np.float32)          # (H, W, 3)
        dasar = np.asarray(citra_pil.convert("RGB")).astype(np.float32)  # (H, W, 3)
        alpha = (cam_arr[..., None] * 0.55)                        # kuat di area panas
        komposit = (dasar * (1.0 - alpha) + heat * alpha).clip(0, 255).astype(np.uint8)

        return Image.fromarray(komposit), kelas, confidence

    finally:
        if handle_maju is not None:
            handle_maju.remove()
        if handle_mundur is not None:
            handle_mundur.remove()
