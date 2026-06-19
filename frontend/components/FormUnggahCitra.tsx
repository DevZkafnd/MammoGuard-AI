"use client";

import { useState } from "react";

interface PropsFormUnggahCitra {
  onBerhasilUnggah?: (data: any) => void;
}

export default function FormUnggahCitra({ onBerhasilUnggah }: PropsFormUnggahCitra) {
  const [berkasYangDipilih, setBerkasYangDipilih] = useState<File | null>(null);
  const [sedangMemuat, setSedangMemuat] = useState(false);
  const [pesanError, setPesanError] = useState<string>("");

  const tanganiPilihBerkas = (event: React.ChangeEvent<HTMLInputElement>) => {
    const berkas = event.target.files?.[0];
    
    if (berkas) {
      // Validasi tipe file
      const tipeDiterima = ["image/jpeg", "image/jpg", "image/png"];
      
      if (!tipeDiterima.includes(berkas.type)) {
        setPesanError("Format file tidak didukung. Gunakan format JPG, JPEG, atau PNG");
        return;
      }
      
      // Validasi ukuran file (maksimal 10MB)
      const ukuranMaksimal = 10 * 1024 * 1024;
      if (berkas.size > ukuranMaksimal) {
        setPesanError("Ukuran file terlalu besar. Maksimal 10MB");
        return;
      }
      
      setBerkasYangDipilih(berkas);
      setPesanError("");
    }
  };

  const tanganiUnggah = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!berkasYangDipilih) {
      setPesanError("Silakan pilih file terlebih dahulu");
      return;
    }

    setSedangMemuat(true);
    setPesanError("");

    try {
      const dataForm = new FormData();
      dataForm.append("berkas", berkasYangDipilih);

      const respons = await fetch("http://localhost:8000/analisis/unggah", {
        method: "POST",
        body: dataForm,
      });

      if (!respons.ok) {
        throw new Error("Gagal mengunggah file");
      }

      const data = await respons.json();
      
      if (onBerhasilUnggah) {
        onBerhasilUnggah(data);
      }

      // Reset form
      setBerkasYangDipilih(null);
      (event.target as HTMLFormElement).reset();
      
    } catch (error) {
      setPesanError("Terjadi kesalahan saat mengunggah file");
      console.error(error);
    } finally {
      setSedangMemuat(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Unggah Citra Mammogram
      </h2>
      
      <form onSubmit={tanganiUnggah} className="space-y-4">
        <div>
          <label 
            htmlFor="input-berkas" 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Pilih File Citra
          </label>
          
          <input
            id="input-berkas"
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={tanganiPilihBerkas}
            disabled={sedangMemuat}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              disabled:opacity-50"
          />
        </div>

        {berkasYangDipilih && (
          <div className="text-sm text-gray-600">
            <p>File dipilih: <span className="font-medium">{berkasYangDipilih.name}</span></p>
            <p>Ukuran: <span className="font-medium">
              {(berkasYangDipilih.size / 1024 / 1024).toFixed(2)} MB
            </span></p>
          </div>
        )}

        {pesanError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{pesanError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!berkasYangDipilih || sedangMemuat}
          className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md
            hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
            transition-colors duration-200"
        >
          {sedangMemuat ? "Mengunggah..." : "Analisis Citra"}
        </button>
      </form>
    </div>
  );
}
