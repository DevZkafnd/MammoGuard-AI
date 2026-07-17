"""
Modul untuk memuat dan menjalankan model PyTorch
"""

import contextlib

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
        """Memuat model dari file .pth (mendukung format full model atau TorchScript)"""
        try:
            self.model = self._muat_objek_model()
            self.model.eval()
            print(f"✓ Model berhasil dimuat dari: {self.jalur_model}")
            print(f"✓ Menggunakan perangkat: {self.perangkat}")
        except Exception as kesalahan:
            print(f"✗ Gagal memuat model: {kesalahan}")
            raise

    def _muat_objek_model(self) -> torch.nn.Module:
        """
        Mencoba memuat file .pth sebagai objek model yang bisa langsung dipakai.

        Mendukung dua format yang bersifat universal untuk arsitektur apa pun:
        1. Full model pickle (torch.save(model, path)) - format yang dipakai
           skrip pelatihan project ini.
        2. TorchScript (torch.jit.save(...)) - menyimpan graph komputasi,
           tidak butuh definisi class Python aslinya.

        File yang hanya berisi state_dict (torch.save(model.state_dict(), path))
        tidak bisa dimuat otomatis karena tidak menyimpan arsitektur sama sekali.
        """
        try:
            hasil_muat = torch.load(self.jalur_model, map_location=self.perangkat)
        except Exception:
            hasil_muat = None

        if isinstance(hasil_muat, torch.nn.Module):
            return hasil_muat

        with contextlib.suppress(Exception):
            return torch.jit.load(self.jalur_model, map_location=self.perangkat)

        raise ValueError(
            "File .pth ini sepertinya hanya berisi state_dict (bobot saja), "
            "bukan model utuh atau TorchScript, sehingga arsitekturnya tidak "
            "diketahui. Simpan ulang model dengan torch.save(model, path) atau "
            "torch.jit.save(torch.jit.script(model), path)."
        )
    
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
