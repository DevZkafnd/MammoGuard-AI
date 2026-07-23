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
  const [konfirmHapus, setKonfirmHapus] = useState(false);
  const [sedangHapus, setSedangHapus] = useState(false);
  const [notif, setNotif] = useState<{ tipe: "sukses" | "error"; pesan: string } | null>(null);

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

  const konfirmasiHapus = async () => {
    setSedangHapus(true);
    try {
      const response = await fetch(`${URL_DASAR_API}/pasien/${pasienId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Gagal menghapus data pasien");
      }

      setKonfirmHapus(false);
      setNotif({
        tipe: "sukses",
        pesan: `Data pasien ${pasien?.nama} berhasil dihapus.`,
      });
      setTimeout(() => router.push("/riwayat-pasien"), 1200);
    } catch (err: any) {
      setKonfirmHapus(false);
      setNotif({ tipe: "error", pesan: `Gagal menghapus data pasien: ${err.message}` });
    } finally {
      setSedangHapus(false);
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

  // Unduh laporan PDF lengkap (dokumen HTML berisi seluruh data kedua sisi + gambar)
  const unduhLaporan = () => {
    const esc = (v: unknown) =>
      String(v ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
      );
    const fullUrl = (u: string | null) => (!u ? "" : u.startsWith("http") ? u : `${URL_DASAR_API}${u}`);
    const kelas = (p: string) => (p === "Malignant" ? "malignant" : p === "Benign" ? "benign" : "followup");
    const rekomendasi = (p: string) =>
      p === "Malignant"
        ? "Segera lakukan biopsi jarum inti (core needle biopsy). Rujuk ke onkologi bedah."
        : "Tidak ada tindakan invasif. Jadwalkan kontrol rutin 12 bulan.";
    const radiolog = esc(session?.nama || pasien.dokter_id || "Dokter");

    const sisiHtml = (judul: string, g: GambarPasien) => {
      const conf = Math.round((g.confidence_score || 0) * 100);
      const img = (label: string, u: string | null) =>
        u
          ? `<div class="imgbox"><div class="cap">${label}</div><img src="${esc(fullUrl(u))}"/></div>`
          : "";
      return `
        <div class="side">
          <h3>${esc(judul)}</h3>
          <div class="imgs">
            ${img("Citra Original", g.original_url)}
            ${img("Grad-CAM (AI)", g.gradcam_url)}
            ${img("Anotasi Dokter", g.brush_url)}
          </div>
          <table class="meta">
            <tr><td>Klasifikasi</td><td class="${kelas(g.prediksi)}">${esc(g.prediksi)}</td></tr>
            <tr><td>Confidence</td><td>${conf}%</td></tr>
            <tr><td>BI-RADS</td><td>${esc(g.bi_rads || "-")}</td></tr>
          </table>
        </div>`;
    };

    const adaMalignant = pasien.kanan.prediksi === "Malignant" || pasien.kiri.prediksi === "Malignant";
    const isi = `
      <div class="brand">MAMMOGUARD AI</div>
      <h1>Laporan Analisis Pasien</h1>
      <div class="sub">${esc(pasien.id_pasien)} • ${esc(tanggal)}</div>
      <div class="grid">
        <div class="card"><div class="label">Nama Pasien</div><div class="val">${esc(pasien.nama)}</div></div>
        <div class="card"><div class="label">ID Pasien</div><div class="val">${esc(pasien.id_pasien)}</div></div>
        <div class="card"><div class="label">Tanggal Pemeriksaan</div><div class="val">${esc(tanggal)}</div></div>
        <div class="card"><div class="label">Radiolog</div><div class="val">${radiolog}</div></div>
      </div>
      <div class="sides">
        ${sisiHtml("Mammogram Kanan", pasien.kanan)}
        ${sisiHtml("Mammogram Kiri", pasien.kiri)}
      </div>
      ${pasien.catatan ? `<div class="block"><div class="label">Temuan Klinis / Catatan</div><div class="val">${esc(pasien.catatan)}</div></div>` : ""}
      <div class="block rec"><div class="label">Rekomendasi Tindak Lanjut</div><div class="val">${esc(rekomendasi(adaMalignant ? "Malignant" : "Benign"))}</div></div>`;

    const win = window.open("", "_blank", "width=950,height=720");
    if (!win) {
      alert("Popup diblokir browser. Izinkan popup untuk situs ini agar bisa mengunduh PDF.");
      return;
    }
    win.document.write(
      `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Laporan ${esc(pasien.nama)}</title>
      <style>
        @page{size:A4;margin:11mm;}
        *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        body{font-family:Arial,Helvetica,sans-serif;color:#1a2a3a;padding:0;margin:0;font-size:11px;}
        h1{font-size:18px;margin:0 0 2px;} .brand{color:#0a5c4f;font-weight:bold;letter-spacing:.05em;font-size:11px;}
        .sub{color:#6a7582;font-size:11px;margin-bottom:10px;}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;}
        .card,.block{border:1px solid #d5dde3;border-radius:6px;padding:7px 9px;}
        .label{font-size:8px;color:#8a95a1;text-transform:uppercase;letter-spacing:.06em;}
        .val{font-size:12px;font-weight:600;margin-top:2px;line-height:1.35;}
        .sides{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;}
        .side{border:1px solid #d5dde3;border-radius:8px;padding:9px;}
        .side h3{margin:0 0 6px;font-size:13px;}
        .imgs{display:flex;gap:6px;margin-bottom:8px;}
        .imgbox{flex:1;min-width:0;} .imgbox img{width:100%;height:96px;object-fit:contain;border:1px solid #d5dde3;border-radius:5px;background:#0a0e1a;}
        .cap{font-size:8px;color:#8a95a1;margin-bottom:2px;text-transform:uppercase;letter-spacing:.04em;}
        table.meta{width:100%;border-collapse:collapse;font-size:11px;}
        table.meta td{border:1px solid #e0e6eb;padding:3px 7px;} table.meta td:first-child{color:#6a7582;width:42%;}
        .malignant{color:#e22a39;font-weight:bold;} .benign{color:#0a8a59;font-weight:bold;} .followup{color:#b8860b;font-weight:bold;}
        .block{margin-bottom:8px;} .rec{background:#fff7e6;border-color:#f4d0a4;}
        .footer{margin-top:12px;border-top:1px solid #e0e6eb;padding-top:8px;font-size:9px;color:#8a95a1;}
      </style></head><body>${isi}
      <div class="footer">Dicetak dari MammoGuard AI — ${esc(new Date().toLocaleString("id-ID"))}</div>
      <script>
        window.onload=function(){var g=document.images,n=g.length,k=0;
          if(!n){setTimeout(function(){window.print();},150);return;}
          function d(){if(++k>=n)setTimeout(function(){window.print();},200);}
          for(var i=0;i<n;i++){if(g[i].complete)d();else{g[i].onload=d;g[i].onerror=d;}}};
      <\/script>
      </body></html>`,
    );
    win.document.close();
    win.focus();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f8fa]">
      {/* Notifikasi in-app (toast) */}
      {notif ? (
        <div className="fixed left-1/2 top-6 z-[60] -translate-x-1/2">
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

      {/* Modal konfirmasi hapus */}
      {konfirmHapus ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-[380px] rounded-[16px] bg-white p-6 text-center shadow-[0_25px_80px_rgba(20,33,48,0.3)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1f3] text-[#e22a39]">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <path
                  d="M8 6V5C8 4 8.5 3.5 9.5 3.5H14.5C15.5 3.5 16 4 16 5V6M4.5 7H19.5M18 7L17.4 19C17.4 20.1 16.5 21 15.4 21H8.6C7.5 21 6.6 20.1 6.6 19L6 7"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="mt-3 text-[17px] font-bold text-[#1a2a3a]">Hapus Data Pasien?</h2>
            <p className="mt-1 text-[13px] font-medium text-[#6a7582]">
              {pasien.nama} · {pasien.id_pasien}
            </p>
            <p className="mt-3 rounded-[10px] bg-[#fff3f5] px-3 py-2.5 text-[12px] font-medium text-[#e16875]">
              Seluruh data analisis pasien ini akan dihapus permanen dan tidak dapat dikembalikan.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setKonfirmHapus(false)}
                disabled={sedangHapus}
                className="h-11 rounded-[10px] border-2 border-[#e0e6eb] bg-white text-[13px] font-bold text-[#5a6672] transition hover:bg-[#f8fafc] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={konfirmasiHapus}
                disabled={sedangHapus}
                className="h-11 rounded-[10px] bg-[#e22a39] text-[13px] font-bold text-white shadow-sm transition hover:bg-[#c81e2c] disabled:opacity-60"
              >
                {sedangHapus ? "Menghapus…" : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

          <div className="flex items-center gap-2">
            <button
              onClick={unduhLaporan}
              className="flex items-center gap-2 rounded-[8px] bg-[#0a5c4f] px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#087765]"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <path d="M10 3V12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M6.5 8.5L10 12L13.5 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.5 15.5H16.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Unduh Laporan PDF
            </button>
            <button
              onClick={() => setKonfirmHapus(true)}
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
          </div>
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
  const brushUrl = getFullUrl(gambar.brush_url);

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

        {/* Anotasi Dokter (kuas) — hanya jika ada */}
        {brushUrl ? (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#8a95a1]">
              Anotasi Dokter
            </p>
            <div className="aspect-square overflow-hidden rounded-[8px] border-2 border-[#e0e6eb] bg-[#0a0e1a]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brushUrl}
                alt={`${judul} Anotasi Dokter`}
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
