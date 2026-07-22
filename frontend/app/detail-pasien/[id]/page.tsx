"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DokterSidebar from "@/components/dokter/DokterSidebar";
import {
  ambilSesiDemo,
  hapusSesiDemo,
} from "@/lib/demoAuth";

const URL_DASAR_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type GambarPasien = {
  original_url: string | null;
  gradcam_url: string | null;
  brush_url: string | null;
  prediksi: string;
  confidence_score: number;
  bi_rads: string | null;
};

type DetailPasien = {
  id: string;
  id_pasien: string;
  nama: string;
  kanan: GambarPasien;
  kiri: GambarPasien;
  dokter_id: string;
  tanggal_pemeriksaan: string;
  status: string;
  catatan: string | null;
};

export default function DetailPasienPage() {
  const router = useRouter();
  const params = useParams();
  const pasienId = params?.id as string;
  
  const [session, setSession] = useState<any>(null);
  const [pasien, setPasien] = useState<DetailPasien | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sesi = ambilSesiDemo();
    setSession(sesi);
    if (!sesi || sesi.role !== "dokter") {
      router.replace("/");
    } else {
      fetchDetailPasien();
    }
  }, [pasienId, router]);

  const fetchDetailPasien = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Fetching detail for pasien:", pasienId);
      
      const response = await fetch(`${URL_DASAR_API}/pasien/${pasienId}`);
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail?.message || errorData.detail || "Pasien tidak ditemukan");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail?.message || errorData.detail || "Gagal mengambil data pasien");
      }
      
      const data = await response.json();
      console.log("Received data:", data);
      
      if (data.status === "berhasil" && data.data) {
        console.log("Pasien data:", data.data);
        setPasien(data.data);
      } else {
        throw new Error("Data pasien tidak valid");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Terjadi kesalahan saat mengambil data";
      console.error("Error fetching detail pasien:", err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    hapusSesiDemo();
    router.replace("/");
  };

  const handleBack = () => {
    router.back();
  };

  const handleDelete = async () => {
    if (!confirm(`Yakin ingin menghapus data pasien ${pasien?.nama}?`)) {
      return;
    }

    try {
      const response = await fetch(`${URL_DASAR_API}/pasien/${pasienId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Gagal menghapus data pasien");
      }

      alert("Data pasien berhasil dihapus");
      router.push("/beranda-dokter");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f8fa]">
        <p className="text-[14px] text-[#8a95a1]">Memuat...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#f5f8fa]">
        <DokterSidebar session={session} onLogout={handleLogout} />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#e0e6eb] border-t-[#0a5c4f]" />
            <p className="mt-4 text-[14px] font-semibold text-[#8a95a1]">
              Memuat detail pasien...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !pasien) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#f5f8fa]">
        <DokterSidebar session={session} onLogout={handleLogout} />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-red-600">
                <path
                  d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-[18px] font-bold text-[#1a2a3a]">
              {error || "Data tidak ditemukan"}
            </h2>
            <p className="mt-2 text-[13px] text-[#8a95a1]">
              ID Pasien: {pasienId}
            </p>
            <button
              onClick={handleBack}
              className="mt-6 rounded-[8px] bg-[#0a5c4f] px-6 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#087765]"
            >
              ← Kembali
            </button>
          </div>
        </main>
      </div>
    );
  }

  const tanggal = new Date(pasien.tanggal_pemeriksaan).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f8fa]">
      <DokterSidebar session={session} onLogout={handleLogout} />

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#e0e6eb] bg-white px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#8a95a1] transition hover:bg-[#f0f4f8] hover:text-[#1a2a3a]"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                <path
                  d="M12 4L6 10L12 16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-[18px] font-bold text-[#1a2a3a]">
                Detail Pasien: {pasien.nama}
              </h1>
              <p className="text-[11px] text-[#8a95a1]">
                ID: {pasien.id_pasien} • {tanggal}
              </p>
            </div>
          </div>

          <button
            onClick={handleDelete}
            className="flex items-center gap-2 rounded-[8px] border-2 border-red-300 bg-white px-4 py-2 text-[12px] font-semibold text-red-600 transition hover:bg-red-50"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path
                d="M7 4V3C7 2.44772 7.44772 2 8 2H12C12.5523 2 13 2.44772 13 3V4M4 6H16M15 6L14.5 16C14.5 17.1046 13.5523 18 12.5 18H7.5C6.44772 18 5.5 17.1046 5.5 16L5 6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Hapus Data Pasien
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {/* Hasil Analisis Summary */}
          <div className="mb-6 grid grid-cols-2 gap-6">
            <HasilCard
              sisi="Kanan"
              prediksi={pasien.kanan.prediksi}
              confidence={Math.round(pasien.kanan.confidence_score * 100)}
            />
            <HasilCard
              sisi="Kiri"
              prediksi={pasien.kiri.prediksi}
              confidence={Math.round(pasien.kiri.confidence_score * 100)}
            />
          </div>

          {/* Gambar Mammogram */}
          <div className="grid grid-cols-2 gap-6">
            <GambarSection
              judul="Mammogram Kanan"
              gambar={pasien.kanan}
            />
            <GambarSection
              judul="Mammogram Kiri"
              gambar={pasien.kiri}
            />
          </div>

          {/* Catatan Dokter */}
          {pasien.catatan && (
            <div className="mt-6 rounded-[12px] bg-white p-6 shadow-md">
              <h3 className="text-[14px] font-bold text-[#1a2a3a]">
                Catatan Dokter
              </h3>
              <p className="mt-3 text-[13px] leading-relaxed text-[#5a6672]">
                {pasien.catatan}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function HasilCard({
  sisi,
  prediksi,
  confidence,
}: {
  sisi: string;
  prediksi: string;
  confidence: number;
}) {
  const isMalignant = prediksi === "Malignant";

  return (
    <div
      className={`rounded-[12px] border-2 p-6 ${
        isMalignant
          ? "border-[#f4c0c8] bg-gradient-to-r from-[#fff1f3] to-[#ffe8eb]"
          : "border-[#c5e8d8] bg-gradient-to-r from-[#effaf5] to-[#e6f7f0]"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a95a1]">
        Hasil Analisis {sisi}
      </p>
      <p
        className={`mt-2 text-[24px] font-bold ${
          isMalignant ? "text-[#e22a39]" : "text-[#0a8a59]"
        }`}
      >
        {prediksi}
      </p>
      <p className="mt-1 text-[12px] font-semibold text-[#5a6672]">
        Confidence: {confidence}%
      </p>
    </div>
  );
}

function GambarSection({
  judul,
  gambar,
}: {
  judul: string;
  gambar: GambarPasien;
}) {
  const baseUrl = URL_DASAR_API;
  
  // Helper function untuk mendapatkan URL lengkap
  const getFullUrl = (url: string | null): string | null => {
    if (!url) return null;
    
    // Jika sudah URL lengkap (http/https), return as is
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    
    // Jika relative path, gabungkan dengan base URL
    if (url.startsWith("/")) {
      return `${baseUrl}${url}`;
    }
    
    // Jika tidak ada slash di awal, tambahkan
    return `${baseUrl}/${url}`;
  };

  const originalUrl = getFullUrl(gambar.original_url);
  const gradcamUrl = getFullUrl(gambar.gradcam_url);
  
  console.log("GambarSection:", judul, {
    original_raw: gambar.original_url,
    original_full: originalUrl,
    gradcam_raw: gambar.gradcam_url,
    gradcam_full: gradcamUrl,
  });

  return (
    <div className="rounded-[12px] bg-white p-6 shadow-md">
      <h3 className="mb-4 text-[14px] font-bold text-[#1a2a3a]">{judul}</h3>

      <div className="space-y-4">
        {/* Original */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#8a95a1]">
            Citra Original
          </p>
          <div className="aspect-square overflow-hidden rounded-[8px] border-2 border-[#e0e6eb] bg-[#0a0e1a]">
            {originalUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={originalUrl}
                alt={`${judul} Original`}
                className="h-full w-full object-contain"
                onError={(e) => {
                  console.error("Error loading original image:", originalUrl);
                  e.currentTarget.style.display = "none";
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="flex h-full items-center justify-center text-[12px] text-red-400">Error loading image</div>`;
                  }
                }}
                onLoad={() => console.log("Original image loaded successfully:", originalUrl)}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[12px] text-[#5a6672]">
                Tidak ada gambar
              </div>
            )}
          </div>
        </div>

        {/* Grad-CAM */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#8a95a1]">
            Grad-CAM Heatmap
          </p>
          <div className="aspect-square overflow-hidden rounded-[8px] border-2 border-[#e0e6eb] bg-[#0a0e1a]">
            {gradcamUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={gradcamUrl}
                alt={`${judul} Grad-CAM`}
                className="h-full w-full object-contain"
                onError={(e) => {
                  console.error("Error loading gradcam image:", gradcamUrl);
                  e.currentTarget.style.display = "none";
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="flex h-full items-center justify-center text-[12px] text-yellow-400">Heatmap tidak tersedia</div>`;
                  }
                }}
                onLoad={() => console.log("Gradcam image loaded successfully:", gradcamUrl)}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[12px] text-[#5a6672]">
                Tidak ada heatmap
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
