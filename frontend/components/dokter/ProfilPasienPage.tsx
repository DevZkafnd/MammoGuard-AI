"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DokterSidebar from "@/components/dokter/DokterSidebar";
import {
  ambilSesiDemo,
  hapusSesiDemo,
  subscribeSesiDemo,
} from "@/lib/demoAuth";

const URL_DASAR_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type SisiGambar = "kanan" | "kiri";

type GambarPasien = {
  original: string | null;
  gradcam: string | null;
  brush: string | null;
  file_original?: File | null;
};

type DataPasien = {
  nama: string;
  id_pasien: string;
  kanan: GambarPasien;
  kiri: GambarPasien;
};

type Prediction = {
  label: "Benign" | "Malignant";
  confidence: number;
};

type Step = "input-nama" | "upload-kanan" | "upload-kiri" | "verifikasi";

export default function ProfilPasienPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [step, setStep] = useState<Step>("input-nama");
  const [dataPasien, setDataPasien] = useState<DataPasien>({
    nama: "",
    id_pasien: "",
    kanan: { original: null, gradcam: null, brush: null },
    kiri: { original: null, gradcam: null, brush: null },
  });
  const [prediksiKanan, setPrediksiKanan] = useState<Prediction | null>(null);
  const [prediksiKiri, setPrediksiKiri] = useState<Prediction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSide, setCurrentSide] = useState<SisiGambar>("kanan");
  const [uploadProgress, setUploadProgress] = useState(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const sesi = ambilSesiDemo();
    setSession(sesi);
    if (!sesi || sesi.role !== "dokter") {
      router.replace("/");
    }
  }, [router]);

  const handleLogout = () => {
    hapusSesiDemo();
    router.replace("/");
  };

  const handleInputNama = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataPasien.nama.trim()) {
      alert("Mohon masukkan nama pasien");
      return;
    }
    // Generate ID pasien otomatis
    const timestamp = Date.now();
    setDataPasien(prev => ({
      ...prev,
      id_pasien: `PAT-${timestamp}`,
    }));
    setStep("upload-kanan");
  };

  const handleUploadImage = async (file: File, sisi: SisiGambar) => {
    setIsProcessing(true);
    setUploadProgress(0);
    
    // Start progress simulation
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }
    
    progressTimerRef.current = setInterval(() => {
      setUploadProgress(current => {
        if (current >= 100) {
          if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
          }
          return 100;
        }
        const delta = current < 70 ? 8 : current < 90 ? 4 : 2;
        return Math.min(100, current + delta);
      });
    }, 150);
    
    try {
      const formData = new FormData();
      formData.append("berkas", file);
      
      const response = await fetch(`${URL_DASAR_API}/analisis/unggah`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Gagal upload");
      }
      
      const data = await response.json();
      const hasilAI = data.data?.analisis;
      const gambarOriginalUrl = data.data?.gambar_url || "";
      
      // ⚠️ EXCEPTION HANDLING: Cek status model AI
      if (!hasilAI || hasilAI.model_status !== "loaded" || !hasilAI.label) {
        // Stop progress timer
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
        setIsProcessing(false);
        setUploadProgress(0);
        
        if (hasilAI?.model_status === "error") {
          alert(
            `❌ Analisis AI Gagal\n\n` +
            `Error: ${hasilAI.error || hasilAI.pesan || "Kesalahan pada model AI"}\n\n` +
            `Silakan coba lagi atau hubungi Tim IT.`
          );
        } else if (hasilAI?.model_status === "not_loaded") {
          alert(
            `⚠️ Model AI Belum Aktif\n\n` +
            `Model AI belum di-upload atau diaktifkan oleh Tim IT.\n\n` +
            `Silakan:\n` +
            `1. Hubungi Tim IT untuk mengaktifkan model AI\n` +
            `2. Tim IT login ke role "Tim IT"\n` +
            `3. Upload file model .pth di halaman "Manajemen Model AI"\n` +
            `4. Aktifkan model untuk digunakan\n\n` +
            `Setelah model aktif, Anda dapat kembali melakukan analisis.`
          );
        } else {
          alert(
            `⚠️ Model AI Tidak Tersedia\n\n` +
            `Model AI belum diaktifkan oleh Tim IT.\n\n` +
            `Status: ${hasilAI?.model_status || "unknown"}\n` +
            `Pesan: ${hasilAI?.pesan || "Model belum tersedia"}\n\n` +
            `Silakan hubungi Tim IT untuk mengaktifkan model AI.`
          );
        }
        return;
      }
      
      // Wait for progress to reach 100%
      while (uploadProgress < 100) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Simpan URL untuk submit nanti
      if (sisi === "kanan") {
        setGambarKananUrl(gambarOriginalUrl);
      } else {
        setGambarKiriUrl(gambarOriginalUrl);
      }
      
      // Update data pasien dengan gambar dan hasil AI
      setDataPasien(prev => ({
        ...prev,
        [sisi]: {
          original: URL.createObjectURL(file),
          gradcam: hasilAI?.heatmap_url ? 
            (hasilAI.heatmap_url.startsWith("/") ? 
              `${URL_DASAR_API}${hasilAI.heatmap_url}` : 
              hasilAI.heatmap_url) : null,
          brush: null,
          file_original: file,
        }
      }));
      
      // Simpan prediksi
      const prediksi: Prediction = {
        label: hasilAI.label as "Benign" | "Malignant",
        confidence: hasilAI.confidence_score ? hasilAI.confidence_score * 100 : parseFloat(hasilAI.confidence) || 0,
      };
      
      if (sisi === "kanan") {
        setPrediksiKanan(prediksi);
        setStep("upload-kiri");
        setCurrentSide("kiri");
      } else {
        setPrediksiKiri(prediksi);
        setStep("verifikasi");
      }
      
    } catch (error) {
      console.error("Error upload:", error);
      alert("Gagal melakukan analisis. Pastikan backend berjalan.");
      // Stop progress timer
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setUploadProgress(0);
    } finally {
      setIsProcessing(false);
      // Clean up progress timer
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = async () => {
    try {
      const payload = {
        nama: dataPasien.nama,
        id_pasien: dataPasien.id_pasien,
        kanan: {
          original_url: gambarKananUrl,
          gradcam_url: dataPasien.kanan.gradcam,
          brush_url: null,
          prediksi: prediksiKanan?.label || "Unknown",
          confidence_score: prediksiKanan?.confidence ? prediksiKanan.confidence / 100 : 0,
          bi_rads: "2",  // Default, bisa diupdate nanti
        },
        kiri: {
          original_url: gambarKiriUrl,
          gradcam_url: dataPasien.kiri.gradcam,
          brush_url: null,
          prediksi: prediksiKiri?.label || "Unknown",
          confidence_score: prediksiKiri?.confidence ? prediksiKiri.confidence / 100 : 0,
          bi_rads: "2",  // Default, bisa diupdate nanti
        },
        dokter_id: session.username || "dokter",
        catatan: `Analisis mammogram bilateral. Kanan: ${prediksiKanan?.label} (${prediksiKanan?.confidence.toFixed(1)}%), Kiri: ${prediksiKiri?.label} (${prediksiKiri?.confidence.toFixed(1)}%)`,
      };

      const response = await fetch(`${URL_DASAR_API}/pasien/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Gagal menyimpan data pasien");
      }

      const result = await response.json();
      alert(`✓ Data pasien ${dataPasien.nama} berhasil disimpan!\nID: ${dataPasien.id_pasien}`);
      
      // Reset dan kembali ke dashboard
      setDataPasien({
        nama: "",
        id_pasien: "",
        kanan: { original: null, gradcam: null, brush: null },
        kiri: { original: null, gradcam: null, brush: null },
      });
      setPrediksiKanan(null);
      setPrediksiKiri(null);
      setStep("input-nama");
      router.push("/beranda-dokter");
    } catch (error: any) {
      console.error("Error submit:", error);
      alert(`Gagal menyimpan data pasien: ${error.message}`);
    }
  };

  const [gambarKananUrl, setGambarKananUrl] = useState("");
  const [gambarKiriUrl, setGambarKiriUrl] = useState("");

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f8fa]">
        <p className="text-[14px] text-[#8a95a1]">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f8fa]">
      <DokterSidebar session={session} onLogout={handleLogout} />
      
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#e0e6eb] bg-white px-8">
          <div>
            <h1 className="text-[20px] font-bold text-[#1a2a3a]">
              Profil Pasien Baru
            </h1>
            <p className="text-[12px] text-[#8a95a1]">
              Workflow: Input Nama → Upload Kanan → Upload Kiri → Verifikasi → Submit
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-[#8a95a1]">
              Step: {step === "input-nama" ? "1/4" : step === "upload-kanan" ? "2/4" : step === "upload-kiri" ? "3/4" : "4/4"}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {step === "input-nama" && (
            <InputNamaView 
              nama={dataPasien.nama}
              onChange={(nama) => setDataPasien(prev => ({ ...prev, nama }))}
              onSubmit={handleInputNama}
            />
          )}
          
          {(step === "upload-kanan" || step === "upload-kiri") && (
            <UploadView 
              sisi={currentSide}
              isProcessing={isProcessing}
              uploadProgress={uploadProgress}
              onUpload={(file) => handleUploadImage(file, currentSide)}
              dataPasien={dataPasien}
            />
          )}
          
          {step === "verifikasi" && (
            <VerifikasiView 
              dataPasien={dataPasien}
              prediksiKanan={prediksiKanan}
              prediksiKiri={prediksiKiri}
              onSubmit={handleSubmit}
              onBack={() => setStep("upload-kiri")}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function InputNamaView({ 
  nama, 
  onChange, 
  onSubmit 
}: { 
  nama: string;
  onChange: (nama: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="mx-auto max-w-[600px]">
      <div className="rounded-[16px] bg-white p-8 shadow-md">
        <h2 className="text-[18px] font-bold text-[#1a2a3a]">
          Input Data Pasien
        </h2>
        <p className="mt-1 text-[12px] text-[#8a95a1]">
          Masukkan nama pasien untuk memulai proses analisis mammogram
        </p>
        
        <form onSubmit={onSubmit} className="mt-6">
          <label className="block">
            <span className="text-[12px] font-semibold text-[#5a6672]">
              Nama Lengkap Pasien
            </span>
            <input
              type="text"
              value={nama}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Contoh: Ibu Siti Aminah"
              className="mt-2 w-full rounded-[8px] border-2 border-[#e0e6eb] px-4 py-3 text-[14px] text-[#1a2a3a] outline-none focus:border-[#0a5c4f]"
            />
          </label>
          
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="rounded-[8px] bg-[#0a5c4f] px-6 py-3 text-[13px] font-semibold text-white transition hover:bg-[#087765]"
            >
              Lanjut ke Upload Gambar →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UploadView({
  sisi,
  isProcessing,
  uploadProgress,
  onUpload,
  dataPasien,
}: {
  sisi: SisiGambar;
  isProcessing: boolean;
  uploadProgress: number;
  onUpload: (file: File) => void;
  dataPasien: DataPasien;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    onUpload(file);
  };

  const judulSisi = sisi === "kanan" ? "Kanan" : "Kiri";
  
  // Calculate step progress
  const stepAktif =
    uploadProgress < 33 ? "Preprocessing" : uploadProgress < 95 ? "Running inference" : "Complete";

  return (
    <div className="mx-auto max-w-[700px]">
      <div className="mb-4 rounded-[12px] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-bold text-[#1a2a3a]">
              {dataPasien.nama}
            </h3>
            <p className="text-[11px] text-[#8a95a1]">
              ID: {dataPasien.id_pasien}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${sisi === "kanan" ? "bg-[#0a8a59]" : "bg-[#cfd8df]"}`} />
            <span className="text-[11px] font-semibold text-[#5a6672]">Kanan</span>
            <span className="mx-2 text-[#cfd8df]">→</span>
            <span className={`h-2 w-2 rounded-full ${sisi === "kiri" ? "bg-[#0a8a59]" : "bg-[#cfd8df]"}`} />
            <span className="text-[11px] font-semibold text-[#5a6672]">Kiri</span>
          </div>
        </div>
      </div>

      <div className="rounded-[16px] bg-white p-8 shadow-md">
        <h2 className="text-[18px] font-bold text-[#1a2a3a]">
          Upload Mammogram {judulSisi}
        </h2>
        <p className="mt-1 text-[12px] text-[#8a95a1]">
          Upload gambar mammogram sisi {judulSisi.toLowerCase()} untuk dianalisis oleh AI
        </p>

        {isProcessing ? (
          <div className="mt-6 flex flex-col items-center gap-5 rounded-[12px] border-2 border-[#e0e6eb] bg-[#f8fafc] py-16">
            <span className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-[#eef5f3] text-[#0a5c4f]">
              <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7" aria-hidden="true">
                <path
                  d="M3 16H7L9 11L13 22L15 16H19L21 13L23 19L25 16H29"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <p className="text-[14px] font-bold text-[#1a2a3a]">
              Mengekstrak fitur citra ke server AI...
            </p>
            <p className="text-[12px] font-mono font-semibold text-[#0a5c4f]">
              {uploadProgress}% selesai
            </p>
            <div className="w-full max-w-md">
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#e3e8ee]">
                <div
                  className="h-full bg-[#0a5c4f] transition-all duration-200 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 text-[10px] font-medium text-[#8a95a1]">
                <span className={stepAktif === "Preprocessing" ? "font-bold text-[#0a5c4f]" : ""}>
                  Preprocessing
                </span>
                <span
                  className={`text-center ${
                    stepAktif === "Running inference" ? "font-bold text-[#0a5c4f]" : ""
                  }`}
                >
                  Running inference...
                </span>
                <span className={`text-right ${stepAktif === "Complete" ? "font-bold text-[#0a5c4f]" : ""}`}>
                  Complete
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`mt-6 cursor-pointer rounded-[12px] border-2 border-dashed p-12 transition ${
              isDragOver
                ? "border-[#0a5c4f] bg-[#f3faf7]"
                : "border-[#cfd8df] bg-[#f8fafc]"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              handleFile(e.dataTransfer.files[0]);
            }}
            onClick={() => inputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-3">
              <svg viewBox="0 0 48 48" fill="none" className="h-12 w-12 text-[#0a5c4f]">
                <path
                  d="M12 36C8.68629 36 6 33.3137 6 30C6 27.0876 7.92882 24.5908 10.6461 23.7819C11.0695 18.8353 15.0623 15 20 15C24.1844 15 27.7365 17.7571 29.1872 21.5845C29.7819 21.3763 30.4176 21.2727 31.0909 21.2727C35.0413 21.2727 38.2727 24.5041 38.2727 28.4545C38.2727 32.405 35.0413 35.6364 31.0909 35.6364H12"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M24 30V40" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                <path
                  d="M18 34L24 30L30 34"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-[14px] font-bold text-[#1a2a3a]">
                Tarik & Lepas atau Klik untuk Upload
              </p>
              <p className="text-[11px] text-[#8a95a1]">
                Format: JPG, PNG, DICOM
              </p>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.dcm,.dicom"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}

function VerifikasiView({
  dataPasien,
  prediksiKanan,
  prediksiKiri,
  onSubmit,
  onBack,
}: {
  dataPasien: DataPasien;
  prediksiKanan: Prediction | null;
  prediksiKiri: Prediction | null;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-6 rounded-[16px] bg-white p-6 shadow-md">
        <h2 className="text-[18px] font-bold text-[#1a2a3a]">
          Verifikasi Data Pasien
        </h2>
        <p className="mt-1 text-[12px] text-[#8a95a1]">
          Periksa kembali semua data sebelum menyimpan ke sistem
        </p>
      </div>

      <div className="mb-6 rounded-[12px] bg-white p-6 shadow-md">
        <h3 className="text-[14px] font-bold text-[#1a2a3a]">Data Pasien</h3>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-semibold text-[#8a95a1]">Nama Lengkap</p>
            <p className="mt-1 text-[14px] font-bold text-[#1a2a3a]">{dataPasien.nama}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#8a95a1]">ID Pasien</p>
            <p className="mt-1 font-mono text-[14px] font-bold text-[#1a2a3a]">{dataPasien.id_pasien}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <HasilAnalisisCard
          sisi="Kanan"
          gambarOriginal={dataPasien.kanan.original}
          gambarGradcam={dataPasien.kanan.gradcam}
          prediksi={prediksiKanan}
        />
        <HasilAnalisisCard
          sisi="Kiri"
          gambarOriginal={dataPasien.kiri.original}
          gambarGradcam={dataPasien.kiri.gradcam}
          prediksi={prediksiKiri}
        />
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={onBack}
          className="rounded-[8px] border-2 border-[#cfd8df] bg-white px-6 py-3 text-[13px] font-semibold text-[#5a6672] transition hover:bg-[#f8fafc]"
        >
          ← Kembali
        </button>
        <button
          onClick={onSubmit}
          className="rounded-[8px] bg-[#0a5c4f] px-8 py-3 text-[13px] font-semibold text-white transition hover:bg-[#087765]"
        >
          ✓ Simpan ke Riwayat Pasien
        </button>
      </div>
    </div>
  );
}

function HasilAnalisisCard({
  sisi,
  gambarOriginal,
  gambarGradcam,
  prediksi,
}: {
  sisi: string;
  gambarOriginal: string | null;
  gambarGradcam: string | null;
  prediksi: Prediction | null;
}) {
  const isMalignant = prediksi?.label === "Malignant";

  return (
    <div className="rounded-[12px] bg-white p-6 shadow-md">
      <h3 className="text-[14px] font-bold text-[#1a2a3a]">
        Mammogram {sisi}
      </h3>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="aspect-square overflow-hidden rounded-[8px] border-2 border-[#e0e6eb] bg-[#0a0e1a]">
          {gambarOriginal ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={gambarOriginal}
              alt={`Mammogram ${sisi} Original`}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] text-[#5a6672]">
              No Image
            </div>
          )}
        </div>
        <div className="aspect-square overflow-hidden rounded-[8px] border-2 border-[#e0e6eb] bg-[#0a0e1a]">
          {gambarGradcam ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={gambarGradcam}
              alt={`Grad-CAM ${sisi}`}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] text-[#5a6672]">
              No Heatmap
            </div>
          )}
        </div>
      </div>

      {prediksi && (
        <div
          className={`mt-4 rounded-[8px] border-2 p-4 ${
            isMalignant
              ? "border-[#f4c0c8] bg-gradient-to-r from-[#fff1f3] to-[#ffe8eb]"
              : "border-[#c5e8d8] bg-gradient-to-r from-[#effaf5] to-[#e6f7f0]"
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a95a1]">
            Hasil Analisis AI
          </p>
          <p
            className={`mt-1 text-[16px] font-bold ${
              isMalignant ? "text-[#e22a39]" : "text-[#0a8a59]"
            }`}
          >
            {prediksi.label} {isMalignant ? "(Ganas)" : "(Jinak)"}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#5a6672]">
            Confidence: {prediksi.confidence.toFixed(1)}%
          </p>
        </div>
      )}
    </div>
  );
}
