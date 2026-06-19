"""
Modul untuk memuat dan menjalankan model PyTorch
"""

import torch
import torchvision.transforms as transforms
from typing import Optional

class PemuatModel:
    """Kelas untuk memuat dan mengelola model PyTorch"""
    
    def __init__(self, jalur_model: str):
        self.jalur_model = jalur_model
        self.model: Optional[torch.nn.Module] = None
        self.perangkat = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
    def muat_model(self):
        """Memuat model dari file .pth"""
        try:
            self.model = torch.load(self.jalur_model, map_location=self.perangkat)
            self.model.eval()
            print(f"✓ Model berhasil dimuat dari: {self.jalur_model}")
            print(f"✓ Menggunakan perangkat: {self.perangkat}")
        except Exception as kesalahan:
            print(f"✗ Gagal memuat model: {kesalahan}")
            raise
    
    def prediksi(self, citra_tensor):
        """
        Melakukan prediksi pada citra
        
        Args:
            citra_tensor: Tensor citra yang sudah dipreproses
            
        Returns:
            Hasil prediksi model
        """
        if self.model is None:
            raise ValueError("Model belum dimuat. Panggil muat_model() terlebih dahulu")
        
        with torch.no_grad():
            citra_tensor = citra_tensor.to(self.perangkat)
            hasil = self.model(citra_tensor)
            
        return hasil

def preprocessing_citra(citra_pil, ukuran_target=(224, 224)):
    """
    Melakukan preprocessing pada citra untuk input model
    
    Args:
        citra_pil: Objek PIL Image
        ukuran_target: Ukuran target untuk resize
        
    Returns:
        Tensor yang siap untuk input model
    """
    transformasi = transforms.Compose([
        transforms.Resize(ukuran_target),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    tensor = transformasi(citra_pil)
    tensor = tensor.unsqueeze(0)  # Tambah dimensi batch
    
    return tensor
