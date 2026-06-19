"""
Skrip untuk preprocessing citra mammogram
"""

import os
from PIL import Image
import numpy as np

def normalisasi_citra(citra_array):
    """
    Melakukan normalisasi citra ke rentang [0, 1]
    
    Args:
        citra_array: Array numpy dari citra
        
    Returns:
        Array yang sudah dinormalisasi
    """
    nilai_min = citra_array.min()
    nilai_maks = citra_array.max()
    
    citra_ternormalisasi = (citra_array - nilai_min) / (nilai_maks - nilai_min)
    
    return citra_ternormalisasi

def ubah_ukuran_citra(citra_pil, ukuran_target=(224, 224)):
    """
    Mengubah ukuran citra ke ukuran target
    
    Args:
        citra_pil: Objek PIL Image
        ukuran_target: Tuple (lebar, tinggi)
        
    Returns:
        Citra yang sudah diubah ukurannya
    """
    return citra_pil.resize(ukuran_target, Image.Resampling.LANCZOS)

def praproses_dataset(jalur_input, jalur_output):
    """
    Melakukan preprocessing pada seluruh dataset
    
    Args:
        jalur_input: Folder input berisi citra mentah
        jalur_output: Folder output untuk menyimpan hasil
    """
    if not os.path.exists(jalur_output):
        os.makedirs(jalur_output)
    
    daftar_file = os.listdir(jalur_input)
    total_file = len(daftar_file)
    
    print(f"Memproses {total_file} file...")
    
    for idx, nama_file in enumerate(daftar_file):
        if nama_file.lower().endswith(('.png', '.jpg', '.jpeg')):
            jalur_file = os.path.join(jalur_input, nama_file)
            
            try:
                # Baca citra
                citra = Image.open(jalur_file)
                
                # Konversi ke grayscale jika perlu
                if citra.mode != 'L':
                    citra = citra.convert('L')
                
                # Ubah ukuran
                citra_diubah = ubah_ukuran_citra(citra)
                
                # Simpan hasil
                jalur_simpan = os.path.join(jalur_output, nama_file)
                citra_diubah.save(jalur_simpan)
                
                if (idx + 1) % 10 == 0:
                    print(f"Progres: {idx + 1}/{total_file}")
                    
            except Exception as kesalahan:
                print(f"Error memproses {nama_file}: {kesalahan}")
    
    print(f"✓ Preprocessing selesai! {total_file} file diproses")

if __name__ == "__main__":
    print("Skrip preprocessing citra mammogram")
    print("Implementasi lengkap akan ditambahkan setelah dataset tersedia")
