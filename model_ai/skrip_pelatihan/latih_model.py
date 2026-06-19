"""
Skrip untuk melatih model deteksi kanker payudara
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader

def latih_model(
    model,
    pemuat_data_latih: DataLoader,
    pemuat_data_validasi: DataLoader,
    jumlah_epoch: int = 50,
    laju_belajar: float = 0.001
):
    """
    Fungsi utama untuk melatih model
    
    Args:
        model: Model PyTorch yang akan dilatih
        pemuat_data_latih: DataLoader untuk data pelatihan
        pemuat_data_validasi: DataLoader untuk data validasi
        jumlah_epoch: Jumlah epoch pelatihan
        laju_belajar: Learning rate untuk optimizer
    """
    
    # Tentukan perangkat (GPU atau CPU)
    perangkat = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(perangkat)
    
    # Definisikan fungsi loss dan optimizer
    fungsi_loss = nn.BCEWithLogitsLoss()
    optimizer = optim.Adam(model.parameters(), lr=laju_belajar)
    
    print(f"Memulai pelatihan pada perangkat: {perangkat}")
    print(f"Jumlah epoch: {jumlah_epoch}")
    
    loss_terbaik = float('inf')
    
    for epoch in range(jumlah_epoch):
        # Mode pelatihan
        model.train()
        total_loss_latih = 0.0
        
        for batch_idx, (data, target) in enumerate(pemuat_data_latih):
            data, target = data.to(perangkat), target.to(perangkat)
            
            # Forward pass
            optimizer.zero_grad()
            keluaran = model(data)
            loss = fungsi_loss(keluaran, target)
            
            # Backward pass
            loss.backward()
            optimizer.step()
            
            total_loss_latih += loss.item()
        
        # Mode evaluasi
        model.eval()
        total_loss_validasi = 0.0
        
        with torch.no_grad():
            for data, target in pemuat_data_validasi:
                data, target = data.to(perangkat), target.to(perangkat)
                keluaran = model(data)
                loss = fungsi_loss(keluaran, target)
                total_loss_validasi += loss.item()
        
        rata_loss_latih = total_loss_latih / len(pemuat_data_latih)
        rata_loss_validasi = total_loss_validasi / len(pemuat_data_validasi)
        
        print(f"Epoch {epoch+1}/{jumlah_epoch}")
        print(f"  Loss Latih: {rata_loss_latih:.4f}")
        print(f"  Loss Validasi: {rata_loss_validasi:.4f}")
        
        # Simpan model terbaik
        if rata_loss_validasi < loss_terbaik:
            loss_terbaik = rata_loss_validasi
            torch.save(model, 'model_terbaik.pth')
            print(f"  ✓ Model terbaik disimpan!")
    
    print("\nPelatihan selesai!")
    return model

if __name__ == "__main__":
    print("Skrip pelatihan model MammoGuard-AI")
    print("Implementasi lengkap akan ditambahkan setelah dataset tersedia")
