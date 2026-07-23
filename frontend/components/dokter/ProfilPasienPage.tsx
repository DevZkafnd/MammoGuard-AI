"use client";

import { type MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from "react";
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
  const [notif, setNotif] = useState<{ tipe: "sukses" | "error"; pesan: string } | null>(null);
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
      
      // Upload + AI sudah selesai. Hentikan animasi progres, tampilkan 100%
      // sebentar, lalu lanjut. JANGAN membaca state uploadProgress di loop
      // (stale closure -> loop tak pernah berhenti / nyangkut di 100%).
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setUploadProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 400));

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

  // Komposit citra original (object-contain) + goresan kuas, lalu unggah -> URL
  const unggahAnotasi = async (
    originalUrl: string | null,
    brushDataUrl: string | null,
  ): Promise<string | null> => {
    if (!originalUrl || !brushDataUrl) return null;
    try {
      const muat = (src: string) =>
        new Promise<HTMLImageElement>((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = src;
        });
      const [orig, brush] = await Promise.all([muat(originalUrl), muat(brushDataUrl)]);
      const c = document.createElement("canvas");
      c.width = KANVAS_W;
      c.height = KANVAS_H;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#0a0e1a";
      ctx.fillRect(0, 0, KANVAS_W, KANVAS_H);
      const s = Math.min(KANVAS_W / orig.width, KANVAS_H / orig.height);
      const dw = orig.width * s;
      const dh = orig.height * s;
      ctx.drawImage(orig, (KANVAS_W - dw) / 2, (KANVAS_H - dh) / 2, dw, dh);
      ctx.drawImage(brush, 0, 0, KANVAS_W, KANVAS_H);
      const blob: Blob | null = await new Promise((res) => c.toBlob(res, "image/png"));
      if (!blob) return null;
      const fd = new FormData();
      fd.append("berkas", new File([blob], "anotasi.png", { type: "image/png" }));
      const r = await fetch(`${URL_DASAR_API}/analisis/unggah`, { method: "POST", body: fd });
      if (!r.ok) return null;
      const d = await r.json();
      return d.data?.gambar_url || null;
    } catch {
      return null;
    }
  };

  const handleSubmit = async (koreksi: KoreksiData) => {
    try {
      // Unggah anotasi dokter (jika ada goresan) -> brush_url
      const [brushKananUrl, brushKiriUrl] = await Promise.all([
        unggahAnotasi(dataPasien.kanan.original, koreksi.kanan.brushDataUrl),
        unggahAnotasi(dataPasien.kiri.original, koreksi.kiri.brushDataUrl),
      ]);

      const payload = {
        nama: dataPasien.nama,
        id_pasien: dataPasien.id_pasien,
        kanan: {
          original_url: gambarKananUrl,
          gradcam_url: dataPasien.kanan.gradcam,
          brush_url: brushKananUrl,
          prediksi: koreksi.kanan.label,
          confidence_score: prediksiKanan?.confidence ? prediksiKanan.confidence / 100 : 0,
          bi_rads: koreksi.kanan.birads,
        },
        kiri: {
          original_url: gambarKiriUrl,
          gradcam_url: dataPasien.kiri.gradcam,
          brush_url: brushKiriUrl,
          prediksi: koreksi.kiri.label,
          confidence_score: prediksiKiri?.confidence ? prediksiKiri.confidence / 100 : 0,
          bi_rads: koreksi.kiri.birads,
        },
        dokter_id: session.username || "dokter",
        catatan: `Kanan: ${koreksi.kanan.label} (BI-RADS ${koreksi.kanan.birads}), Kiri: ${koreksi.kiri.label} (BI-RADS ${koreksi.kiri.birads}). Divalidasi dokter.`,
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

      await response.json();

      // Notifikasi sukses dalam web, lalu redirect ke halaman detail pasien
      const idPasien = dataPasien.id_pasien;
      setNotif({
        tipe: "sukses",
        pesan: `Data pasien ${dataPasien.nama} berhasil disimpan. Mengalihkan ke detail pasien…`,
      });
      setTimeout(() => {
        router.push(`/detail-pasien/${idPasien}`);
      }, 1300);
    } catch (error: any) {
      console.error("Error submit:", error);
      setNotif({ tipe: "error", pesan: `Gagal menyimpan data pasien: ${error.message}` });
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
      {/* Notifikasi in-app (toast) */}
      {notif ? (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2">
          <div
            className={`flex items-center gap-3 rounded-[12px] px-5 py-3.5 shadow-[0_12px_40px_rgba(15,30,45,0.25)] ${
              notif.tipe === "sukses" ? "bg-[#0a5c4f] text-white" : "bg-[#e22a39] text-white"
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-[13px] font-bold">
              {notif.tipe === "sukses" ? "✓" : "!"}
            </span>
            <p className="text-[13px] font-semibold">{notif.pesan}</p>
            <button
              type="button"
              onClick={() => setNotif(null)}
              className="ml-2 text-[18px] leading-none text-white/70 transition hover:text-white"
              aria-label="Tutup notifikasi"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}

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

// Ukuran kanvas anotasi (resolusi tetap; zoom hanya mengubah tampilan CSS).
const KANVAS_W = 440;
const KANVAS_H = 560;
const HIGHLIGHT_ALPHA = 0.25; // opacity mode Highlight (seragam, tanpa penumpukan)
const WARNA_KUAS = ["#ff3d2e", "#ffd23d", "#3ba7ff", "#2ec16b"];
const UKURAN_KUAS = [8, 16, 28];
const OPSI_STATUS = ["Benign", "Malignant"] as const;
const OPSI_BIRADS = ["0", "1", "2", "3", "4A", "4B", "4C", "5", "6"];

type SisiKoreksi = {
  label: "Benign" | "Malignant";
  birads: string;
  brushDataUrl: string | null;
};
type KoreksiData = { kanan: SisiKoreksi; kiri: SisiKoreksi };

function biradsDefault(p: Prediction | null): string {
  return p?.label === "Malignant" ? "4C" : "2";
}

/**
 * Editor anotasi citra original: kuas highlight (beberapa warna & ukuran),
 * zoom in/out, dan hapus. Menyimpan goresan sebagai PNG transparan via onChange.
 */
function BrushEditor({
  imageUrl,
  brushDataUrl,
  onChange,
}: {
  imageUrl: string | null;
  brushDataUrl: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const pan = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [warna, setWarna] = useState(WARNA_KUAS[0]);
  const [ukuran, setUkuran] = useState(UKURAN_KUAS[1]);
  const [alat, setAlat] = useState<"kuas" | "geser">("kuas");
  const [mode, setMode] = useState<"highlight" | "biasa">("highlight");

  // Inisialisasi kanvas & pulihkan goresan tersimpan (saat pindah tab)
  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (brushDataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height);
      img.src = brushDataUrl;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const koord = (e: ReactMouseEvent) => {
    const c = liveRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (c.width / r.width),
      y: (e.clientY - r.top) * (c.height / r.height),
    };
  };

  const mulai = (e: ReactMouseEvent) => {
    if (alat === "geser") {
      const s = scrollRef.current;
      if (s) pan.current = { x: e.clientX, y: e.clientY, sl: s.scrollLeft, st: s.scrollTop };
      return;
    }
    drawing.current = true;
    last.current = koord(e);
  };
  const gerak = (e: ReactMouseEvent) => {
    if (alat === "geser") {
      if (!pan.current || !scrollRef.current) return;
      scrollRef.current.scrollLeft = pan.current.sl - (e.clientX - pan.current.x);
      scrollRef.current.scrollTop = pan.current.st - (e.clientY - pan.current.y);
      return;
    }
    if (!drawing.current) return;
    // Sapuan digambar di lapisan "live" pada opacity penuh; translusen diterapkan
    // sekali saat commit (mencegah penumpukan warna di dalam satu sapuan).
    const ctx = liveRef.current!.getContext("2d")!;
    const p = koord(e);
    ctx.strokeStyle = warna;
    ctx.globalAlpha = 1;
    ctx.lineWidth = ukuran;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current!.x, last.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const selesai = () => {
    if (alat === "geser") {
      pan.current = null;
      return;
    }
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    // Commit sapuan dari lapisan live ke kanvas utama dengan opacity sesuai mode
    const main = canvasRef.current!;
    const live = liveRef.current!;
    const mctx = main.getContext("2d")!;
    mctx.globalAlpha = mode === "highlight" ? HIGHLIGHT_ALPHA : 1;
    mctx.drawImage(live, 0, 0);
    mctx.globalAlpha = 1;
    live.getContext("2d")!.clearRect(0, 0, live.width, live.height);
    onChange(main.toDataURL("image/png"));
  };
  const hapus = () => {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    onChange(null);
  };

  return (
    <div>
      {/* Toolbar kuas */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {/* Alat: Kuas / Geser */}
        <div className="flex overflow-hidden rounded-[6px] border-2 border-[#e0e6eb]">
          <button
            type="button"
            onClick={() => setAlat("kuas")}
            className={`px-2.5 py-1 text-[11px] font-bold transition ${alat === "kuas" ? "bg-[#0a5c4f] text-white" : "bg-white text-[#5a6672]"}`}
          >
            🖌️ Kuas
          </button>
          <button
            type="button"
            onClick={() => setAlat("geser")}
            className={`px-2.5 py-1 text-[11px] font-bold transition ${alat === "geser" ? "bg-[#0a5c4f] text-white" : "bg-white text-[#5a6672]"}`}
          >
            ✋ Geser
          </button>
        </div>

        {/* Jenis kuas: Highlight / Biasa */}
        <div className={`flex overflow-hidden rounded-[6px] border-2 border-[#e0e6eb] ${alat === "geser" ? "pointer-events-none opacity-40" : ""}`}>
          <button
            type="button"
            onClick={() => setMode("highlight")}
            className={`px-2.5 py-1 text-[11px] font-bold transition ${mode === "highlight" ? "bg-[#0a5c4f] text-white" : "bg-white text-[#5a6672]"}`}
          >
            Highlight
          </button>
          <button
            type="button"
            onClick={() => setMode("biasa")}
            className={`px-2.5 py-1 text-[11px] font-bold transition ${mode === "biasa" ? "bg-[#0a5c4f] text-white" : "bg-white text-[#5a6672]"}`}
          >
            Biasa
          </button>
        </div>

        <span className="text-[10px] font-bold uppercase tracking-wide text-[#8a95a1]">Warna</span>
        {WARNA_KUAS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWarna(w)}
            className={`h-6 w-6 rounded-full border-2 transition ${warna === w ? "border-[#1a2a3a] scale-110" : "border-white"}`}
            style={{ backgroundColor: w }}
            aria-label={`Warna ${w}`}
          />
        ))}
        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-[#8a95a1]">Tebal</span>
        {UKURAN_KUAS.map((u, i) => (
          <button
            key={u}
            type="button"
            onClick={() => setUkuran(u)}
            className={`flex h-7 w-7 items-center justify-center rounded-[6px] border-2 text-[10px] font-bold transition ${ukuran === u ? "border-[#0a5c4f] bg-[#0a5c4f] text-white" : "border-[#e0e6eb] bg-white text-[#5a6672]"}`}
          >
            {["S", "M", "L"][i]}
          </button>
        ))}
        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-[#8a95a1]">Zoom</span>
        <button type="button" onClick={() => setZoom((z) => Math.max(1, Math.round((z - 0.25) * 100) / 100))} className="flex h-7 w-7 items-center justify-center rounded-[6px] border-2 border-[#e0e6eb] bg-white text-[14px] font-bold text-[#5a6672]">−</button>
        <span className="w-10 text-center text-[11px] font-semibold tabular-nums text-[#5a6672]">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((z) => Math.min(4, Math.round((z + 0.25) * 100) / 100))} className="flex h-7 w-7 items-center justify-center rounded-[6px] border-2 border-[#e0e6eb] bg-white text-[14px] font-bold text-[#5a6672]">+</button>
        <button type="button" onClick={() => setZoom(1)} className="rounded-[6px] border-2 border-[#e0e6eb] bg-white px-2 py-1 text-[10px] font-bold text-[#5a6672]">Reset</button>
        <button type="button" onClick={hapus} className="ml-auto rounded-[6px] border-2 border-[#f3d5da] bg-[#fff1f3] px-3 py-1 text-[10px] font-bold text-[#e06873]">Hapus Anotasi</button>
      </div>

      {/* Area gambar + kanvas (scroll saat zoom) */}
      <div ref={scrollRef} className="overflow-auto rounded-[8px] border-2 border-[#e0e6eb] bg-[#0a0e1a]" style={{ height: KANVAS_H }}>
        <div className="relative" style={{ width: KANVAS_W * zoom, height: KANVAS_H * zoom }}>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Citra original"
              draggable={false}
              className="absolute inset-0 h-full w-full select-none object-contain"
            />
          ) : null}
          {/* Kanvas utama: sapuan yang sudah di-commit (read-only) */}
          <canvas
            ref={canvasRef}
            width={KANVAS_W}
            height={KANVAS_H}
            style={{ width: KANVAS_W * zoom, height: KANVAS_H * zoom }}
            className="pointer-events-none absolute inset-0"
          />
          {/* Lapisan live: sapuan berjalan (preview), opacity mengikuti mode */}
          <canvas
            ref={liveRef}
            width={KANVAS_W}
            height={KANVAS_H}
            onMouseDown={mulai}
            onMouseMove={gerak}
            onMouseUp={selesai}
            onMouseLeave={selesai}
            style={{
              width: KANVAS_W * zoom,
              height: KANVAS_H * zoom,
              cursor: alat === "geser" ? "grab" : "crosshair",
              opacity: mode === "highlight" ? HIGHLIGHT_ALPHA : 1,
            }}
            className="absolute inset-0 touch-none"
          />
        </div>
      </div>
      <p className="mt-1.5 text-[10px] text-[#8a95a1]">
        {alat === "geser"
          ? "Mode Geser: klik & seret untuk menggeser gambar (gunakan saat di-zoom)."
          : `Mode ${mode === "highlight" ? "Highlight" : "Kuas Biasa"}: klik & seret pada citra untuk menandai area.`}
      </p>
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
  onSubmit: (koreksi: KoreksiData) => void;
  onBack: () => void;
}) {
  const [sisiAktif, setSisiAktif] = useState<"kanan" | "kiri">("kanan");
  const [koreksi, setKoreksi] = useState<KoreksiData>(() => ({
    kanan: {
      label: (prediksiKanan?.label as "Benign" | "Malignant") || "Benign",
      birads: biradsDefault(prediksiKanan),
      brushDataUrl: null,
    },
    kiri: {
      label: (prediksiKiri?.label as "Benign" | "Malignant") || "Benign",
      birads: biradsDefault(prediksiKiri),
      brushDataUrl: null,
    },
  }));

  const perbarui = (patch: Partial<SisiKoreksi>) =>
    setKoreksi((prev) => ({ ...prev, [sisiAktif]: { ...prev[sisiAktif], ...patch } }));

  const dataSisi = dataPasien[sisiAktif];
  const prediksiSisi = sisiAktif === "kanan" ? prediksiKanan : prediksiKiri;
  const nilai = koreksi[sisiAktif];
  const isMalignant = nilai.label === "Malignant";

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-6 rounded-[16px] bg-white p-6 shadow-md">
        <h2 className="text-[18px] font-bold text-[#1a2a3a]">Verifikasi &amp; Anotasi</h2>
        <p className="mt-1 text-[12px] text-[#8a95a1]">
          Bandingkan tebakan AI (Grad-CAM) dengan citra asli. Anotasi area pada citra original,
          lalu koreksi klasifikasi bila perlu.
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

      {/* Tab pilih sisi */}
      <div className="mb-4 flex gap-2">
        {([
          { key: "kanan", label: "Mammogram Kanan", pred: koreksi.kanan },
          { key: "kiri", label: "Mammogram Kiri", pred: koreksi.kiri },
        ] as const).map((t) => {
          const aktif = sisiAktif === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setSisiAktif(t.key)}
              className={`flex items-center gap-2 rounded-[10px] border-2 px-5 py-2.5 text-[13px] font-bold transition ${
                aktif ? "border-[#0a5c4f] bg-[#0a5c4f] text-white shadow-sm" : "border-[#e0e6eb] bg-white text-[#5a6672] hover:bg-[#f8fafc]"
              }`}
            >
              {t.label}
              <span className={`h-2 w-2 rounded-full ${t.pred.label === "Malignant" ? "bg-[#e22a39]" : "bg-[#0a8a59]"}`} />
            </button>
          );
        })}
      </div>

      {/* Kartu editor: kiri = AI/Grad-CAM (referensi), kanan = original (anotasi) */}
      <div className="rounded-[12px] bg-white p-6 shadow-md">
        <div className="grid grid-cols-2 gap-5">
          {/* KIRI: Hasil AI + Grad-CAM (read-only) */}
          <div>
            <h3 className="text-[13px] font-bold text-[#1a2a3a]">Hasil AI (Grad-CAM)</h3>
            <p className="mb-2 text-[10px] text-[#8a95a1]">Referensi tebakan model — tidak dapat diedit</p>
            <div className="overflow-hidden rounded-[8px] border-2 border-[#e0e6eb] bg-[#0a0e1a]" style={{ height: KANVAS_H }}>
              {dataSisi.gradcam ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dataSisi.gradcam} alt="Grad-CAM" className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-[11px] text-[#5a6672]">No Heatmap</div>
              )}
            </div>
            {prediksiSisi ? (
              <p className="mt-2 text-[11px] font-semibold text-[#5a6672]">
                Prediksi AI:{" "}
                <span className={prediksiSisi.label === "Malignant" ? "text-[#e22a39]" : "text-[#0a8a59]"}>
                  {prediksiSisi.label} ({prediksiSisi.confidence.toFixed(1)}%)
                </span>
              </p>
            ) : null}
          </div>

          {/* KANAN: Citra original + editor kuas */}
          <div>
            <h3 className="text-[13px] font-bold text-[#1a2a3a]">Citra Original (Anotasi Dokter)</h3>
            <p className="mb-2 text-[10px] text-[#8a95a1]">Tandai area temuan dengan kuas highlight</p>
            <BrushEditor
              key={sisiAktif}
              imageUrl={dataSisi.original}
              brushDataUrl={nilai.brushDataUrl}
              onChange={(url) => perbarui({ brushDataUrl: url })}
            />
          </div>
        </div>

        {/* Koreksi klasifikasi */}
        <div
          className={`mt-5 grid grid-cols-2 gap-4 rounded-[10px] border-2 p-4 ${
            isMalignant ? "border-[#f4c0c8] bg-[#fff6f7]" : "border-[#c5e8d8] bg-[#f2fbf7]"
          }`}
        >
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#8a95a1]">Klasifikasi (Status)</span>
            <select
              value={nilai.label}
              onChange={(e) => perbarui({ label: e.target.value as "Benign" | "Malignant" })}
              className={`mt-1 h-11 w-full rounded-[8px] border-2 bg-white px-3 text-[14px] font-bold outline-none ${
                isMalignant ? "border-[#e22a39] text-[#e22a39]" : "border-[#0a8a59] text-[#0a8a59]"
              }`}
            >
              {OPSI_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s} {s === "Malignant" ? "(Ganas)" : "(Jinak)"}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#8a95a1]">Kategori BI-RADS</span>
            <select
              value={nilai.birads}
              onChange={(e) => perbarui({ birads: e.target.value })}
              className="mt-1 h-11 w-full rounded-[8px] border-2 border-[#0a5c4f] bg-white px-3 text-[14px] font-bold text-[#1a2a3a] outline-none"
            >
              {OPSI_BIRADS.map((b) => (
                <option key={b} value={b}>
                  BI-RADS {b}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={onBack}
          className="rounded-[8px] border-2 border-[#cfd8df] bg-white px-6 py-3 text-[13px] font-semibold text-[#5a6672] transition hover:bg-[#f8fafc]"
        >
          ← Kembali
        </button>
        {sisiAktif === "kanan" ? (
          <button
            onClick={() => setSisiAktif("kiri")}
            className="rounded-[8px] bg-[#0a5c4f] px-8 py-3 text-[13px] font-semibold text-white transition hover:bg-[#087765]"
          >
            Lihat Kiri →
          </button>
        ) : (
          <button
            onClick={() => onSubmit(koreksi)}
            className="rounded-[8px] bg-[#0a5c4f] px-8 py-3 text-[13px] font-semibold text-white transition hover:bg-[#087765]"
          >
            ✓ Simpan ke Riwayat Pasien
          </button>
        )}
      </div>
    </div>
  );
}
