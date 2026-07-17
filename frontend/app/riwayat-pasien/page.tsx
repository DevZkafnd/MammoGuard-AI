"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import DokterSidebar from "@/components/dokter/DokterSidebar";
import {
  ambilSesiDemo,
  hapusSesiDemo,
  subscribeSesiDemo,
} from "@/lib/demoAuth";

const URL_DASAR_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Birads = "0" | "1" | "2" | "3" | "4A" | "4B" | "4C" | "5" | "6";
type StatusLabel = "Malignant" | "Benign" | "Follow-up";

type RiwayatPasien = {
  id: string;
  nama: string;
  tanggal: string;
  status: StatusLabel;
  birads: Birads;
  confidence: number;
  catatan: string;
};

const RIWAYAT_KEY = "mammoguard-riwayat";

const dataAwal: RiwayatPasien[] = [
  {
    id: "PAT-20240101",
    nama: "Siti Rahajeng",
    tanggal: "2 Jun 2025",
    status: "Malignant",
    birads: "5",
    confidence: 97,
    catatan:
      "Massa irregular berukuran ±2.3 cm pada kuadran atas-luar payuadara kiri. Tepi tidak beraturan, densitas tinggi. Calcification pleomorfik ditemukan.",
  },
  {
    id: "PAT-20240102",
    nama: "Dewi Kusumawati",
    tanggal: "5 Jun 2025",
    status: "Benign",
    birads: "2",
    confidence: 91,
    catatan:
      "Tampak kalsifikasi makro di kuadran lateral. Pola jinak, tidak ditemukan tanda suspikasi. Direkomendasikan kontrol rutin 12 bulan.",
  },
  {
    id: "PAT-20240103",
    nama: "Rina Hartanti",
    tanggal: "8 Jun 2025",
    status: "Follow-up",
    birads: "3",
    confidence: 78,
    catatan:
      "Lesi fokal batas tidak tegas di kuadran medial. Tidak ditemukan mikrokalsifikasi. Disarankan evaluasi kembali 6 bulan.",
  },
  {
    id: "PAT-20240104",
    nama: "Lestari Wulandari",
    tanggal: "10 Jun 2025",
    status: "Malignant",
    birads: "4C",
    confidence: 88,
    catatan:
      "Terdapat distorsi arsitektur jaringan dan massa spikulasi kecil di kuadran bawah-luar kiri. Curiga ganas, perlu biopsi.",
  },
  {
    id: "PAT-20240105",
    nama: "Nur Aini Putri",
    tanggal: "14 Jun 2025",
    status: "Benign",
    birads: "1",
    confidence: 96,
    catatan:
      "Citra normal, jaringan fibroglandular simetris bilateral. Tidak ditemukan lesi fokal maupun kalsifikasi mencurigakan.",
  },
  {
    id: "PAT-20240106",
    nama: "Endang Susilowati",
    tanggal: "18 Jun 2025",
    status: "Follow-up",
    birads: "3",
    confidence: 72,
    catatan:
      "Asimetri jaringan ringan di kuadran atas. Tidak tampak massa dominan. Disarankan evaluasi USG dan follow-up 6 bulan.",
  },
  {
    id: "PAT-20240107",
    nama: "Fitria Handayani",
    tanggal: "20 Jun 2025",
    status: "Malignant",
    birads: "5",
    confidence: 94,
    catatan:
      "Massa multipel di kuadran atas-luar kanan, densitas tinggi, tepi spikulasi. Curiga ganas tinggi. Rujuk onkologi bedah.",
  },
  {
    id: "PAT-20240108",
    nama: "Rini Marliani",
    tanggal: "23 Jun 2025",
    status: "Benign",
    birads: "2",
    confidence: 89,
    catatan:
      "Kalsifikasi jinak coarse di kuadran bawah. Tidak tampak distorsi arsitektur. Pola BIRADS 2, kontrol 12 bulan.",
  },
];

function StatusBadge({ status }: { status: StatusLabel }) {
  const warna = {
    Malignant: "border-[#f4c0c8] bg-gradient-to-r from-[#fff1f3] to-[#ffe8eb] text-[#e22a39]",
    Benign: "border-[#c5e8d8] bg-gradient-to-r from-[#effaf5] to-[#e6f7f0] text-[#0a8a59]",
    "Follow-up": "border-[#f4e0a4] bg-gradient-to-r from-[#fff7e3] to-[#fff0c4] text-[#b8860b]",
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] font-bold ${warna}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status === "Malignant"
        ? "BI-RADS 5 — Malignant"
        : status === "Benign"
          ? "BI-RADS 2 — Benign"
          : "BI-RADS 3 — Follow-up"}
    </span>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-[#8a95a1]" aria-hidden="true">
      <circle cx="9" cy="9" r="5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13 13L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <rect
        x="3.5"
        y="4.5"
        width="13"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M3.5 8H16.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 2.5V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 2.5V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M10 3V12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M6.5 8.5L10 12L13.5 8.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3.5 15.5H16.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M2 10C3.5 6.5 6.5 4.5 10 4.5C13.5 4.5 16.5 6.5 18 10C16.5 13.5 13.5 15.5 10 15.5C6.5 15.5 3.5 13.5 2 10Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M10 3L17.5 16H2.5L10 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M10 8V11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="14" r="0.8" fill="currentColor" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type FilterKey = "semua" | "malignant" | "benign" | "follow-up";

const filterTabs: { key: FilterKey; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "malignant", label: "Malignant" },
  { key: "benign", label: "Benign" },
  { key: "follow-up", label: "Follow-up" },
];

function escapeHtml(nilai: string): string {
  return String(nilai).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );
}

function kelasStatus(status: StatusLabel): string {
  return status === "Malignant" ? "malignant" : status === "Benign" ? "benign" : "followup";
}

/**
 * Membuka jendela cetak berisi dokumen HTML lengkap (bukan screenshot),
 * lalu memicu dialog print browser sehingga pengguna bisa "Save as PDF".
 */
function cetakLaporan(judul: string, isiHtml: string) {
  const win = window.open("", "_blank", "width=900,height=680");
  if (!win) {
    alert("Popup diblokir browser. Izinkan popup untuk situs ini agar bisa mengunduh PDF.");
    return;
  }
  win.document.write(
    `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${escapeHtml(judul)}</title>
    <style>
      *{box-sizing:border-box;}
      body{font-family:Arial,Helvetica,sans-serif;color:#1a2a3a;padding:32px;margin:0;}
      h1{font-size:20px;margin:0 0 4px;}
      .brand{color:#0a5c4f;font-weight:bold;letter-spacing:.04em;font-size:12px;margin-bottom:2px;}
      .sub{color:#6a7582;font-size:12px;margin-bottom:20px;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th,td{border:1px solid #d5dde3;padding:7px 9px;text-align:left;vertical-align:top;}
      th{background:#f0f5f9;text-transform:uppercase;font-size:9px;letter-spacing:.06em;color:#5a6672;}
      .malignant{color:#e22a39;font-weight:bold;}
      .benign{color:#0a8a59;font-weight:bold;}
      .followup{color:#b8860b;font-weight:bold;}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;}
      .card{border:1px solid #d5dde3;border-radius:8px;padding:12px 14px;}
      .card.wide{grid-column:1 / -1;}
      .label{font-size:9px;color:#8a95a1;text-transform:uppercase;letter-spacing:.08em;}
      .val{font-size:13px;font-weight:600;margin-top:3px;line-height:1.5;}
      .footer{margin-top:26px;border-top:1px solid #e0e6eb;padding-top:10px;font-size:10px;color:#8a95a1;}
      @media print{body{padding:0;}}
    </style></head><body>${isiHtml}
    <div class="footer">Dicetak dari MammoGuard AI — ${new Date().toLocaleString("id-ID")}</div>
    </body></html>`,
  );
  win.document.close();
  win.focus();
  win.setTimeout(() => win.print(), 350);
}

function DetailModal({
  item,
  onClose,
  onUnduhPdf,
}: {
  item: RiwayatPasien;
  onClose: () => void;
  onUnduhPdf: (item: RiwayatPasien) => void;
}) {
  const rekomendasi = item.status === "Malignant"
    ? "Segera lakukan biopsi jarum inti (core needle biopsy). Rujuk ke onkologi bedah."
    : item.status === "Follow-up"
      ? "Lakukan evaluasi USG dan follow-up mammogram dalam 6 bulan untuk memantau perubahan."
      : "Tidak ada tindakan invasif. Jadwalkan kontrol rutin 12 bulan.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-[440px] rounded-[14px] bg-white p-6 shadow-[0_30px_80px_rgba(15,30,45,0.25)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#8a95a1]">
              {item.id}
            </p>
            <p className="mt-1 text-[16px] font-bold text-[#1a2a3a]">{item.nama}</p>
            <p className="mt-1 text-[11px] font-medium text-[#6a7582]">
              {item.tanggal} · Dr. Ayu Permata Sari, Sp.Rad
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#8a95a1] transition hover:bg-[#f0f4f8] hover:text-[#1a2a3a]"
            aria-label="Tutup"
          >
            ×
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="col-span-2 rounded-[10px] border border-[#f4c0c8] bg-gradient-to-r from-[#fff1f3] to-[#ffe8eb] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#e22a39]">
                HASIL PREDIKSI AI
              </p>
              <StatusBadge status={item.status} />
            </div>
            <div className="mt-3 flex items-end justify-between">
              <p
                className={`font-mono text-[24px] font-bold ${
                  item.status === "Malignant"
                    ? "text-[#e22a39]"
                    : item.status === "Benign"
                      ? "text-[#0a8a59]"
                      : "text-[#b8860b]"
                }`}
              >
                {item.status}
              </p>
              <div className="text-right">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8a95a1]">
                  Confidence Score
                </p>
                <p className="font-mono text-[18px] font-bold text-[#1a2a3a]">
                  {item.confidence}%
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[10px] bg-[#f7fafc] p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8a95a1]">
              ID PASIEN
            </p>
            <p className="mt-1 font-mono text-[12px] font-semibold text-[#1a2a3a]">
              {item.id}
            </p>
          </div>
          <div className="rounded-[10px] bg-[#f7fafc] p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8a95a1]">
              TANGGAL ANALISIS
            </p>
            <p className="mt-1 text-[12px] font-semibold text-[#1a2a3a]">{item.tanggal}</p>
          </div>
          <div className="rounded-[10px] bg-[#f7fafc] p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8a95a1]">
              KATEGORI BI-RADS
            </p>
            <p className="mt-1 font-mono text-[12px] font-semibold text-[#1a2a3a]">
              BI-RADS {item.birads}
            </p>
          </div>
          <div className="rounded-[10px] bg-[#f7fafc] p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8a95a1]">
              RADIOLOG
            </p>
            <p className="mt-1 text-[12px] font-semibold text-[#1a2a3a]">
              Dr. Ayu Permata Sari, Sp.Rad
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a95a1]">
            TEMUAN KLINIS
          </p>
          <p className="mt-2 rounded-[10px] bg-[#f7fafc] p-3 text-[12px] font-medium leading-[1.6] text-[#2a3947]">
            {item.catatan}
          </p>
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a95a1]">
            REKOMENDASI TINDAK LANJUT
          </p>
          <div className="mt-2 flex items-start gap-2 rounded-[10px] border border-[#f4d0a4] bg-[#fff5e6] p-3">
            <span className="mt-0.5 text-[#d98a1a]">
              <WarningIcon />
            </span>
            <p className="text-[12px] font-medium leading-[1.55] text-[#8a5d0f]">
              {rekomendasi}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-[8px] border-2 border-[#cfd8df] bg-white text-[12px] font-bold text-[#5a6672] transition hover:bg-[#f8fafc]"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => onUnduhPdf(item)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#0a5c4f] px-4 text-[12px] font-bold text-white shadow-sm transition hover:bg-[#087765]"
          >
            <DownloadIcon />
            Unduh Laporan PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function EksporDropdown({
  onEkspor,
  jumlahData,
}: {
  onEkspor: (format: "csv" | "pdf") => void;
  jumlahData: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#0a5c4f] px-4 text-[12px] font-bold text-white shadow-sm transition hover:bg-[#087765]"
      >
        <DownloadIcon />
        Ekspor Data
        <ChevronIcon open={open} />
      </button>
      {open ? (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 z-40 mt-2 w-44 overflow-hidden rounded-[10px] border border-[#e0e6eb] bg-white shadow-[0_18px_45px_rgba(15,30,45,0.18)]">
            <button
              type="button"
              onClick={() => {
                onEkspor("csv");
                setOpen(false);
              }}
              className="block w-full px-4 py-2.5 text-left text-[12px] font-semibold text-[#2a3947] transition hover:bg-[#f0f8f5]"
            >
              <span className="block">Excel / CSV</span>
              <span className="block text-[10px] font-medium text-[#8a95a1]">
                {jumlahData} baris data
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                onEkspor("pdf");
                setOpen(false);
              }}
              className="block w-full border-t border-[#e8edf2] px-4 py-2.5 text-left text-[12px] font-semibold text-[#2a3947] transition hover:bg-[#f0f8f5]"
            >
              PDF
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function RiwayatPasienPage() {
  const router = useRouter();
  const session = useSyncExternalStore(
    subscribeSesiDemo,
    () => ambilSesiDemo(),
    () => null,
  );

  // State untuk data real dari backend
  const [items, setItems] = useState<RiwayatPasien[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [kataKunci, setKataKunci] = useState("");
  const [filterAktif, setFilterAktif] = useState<FilterKey>("semua");
  const [itemDetail, setItemDetail] = useState<RiwayatPasien | null>(null);
  
  // Fetch data dari backend
  useEffect(() => {
    const fetchRiwayat = async () => {
      try {
        const response = await fetch(`${URL_DASAR_API}/analisis/riwayat?limit=100`);
        const data = await response.json();
        
        if (data.status === "berhasil" && Array.isArray(data.data)) {
          // Transform data backend ke format frontend
          const transformed: RiwayatPasien[] = data.data.map((item: any) => {
            const hasilAnalisis = item.hasil_analisis || {};
            const label = hasilAnalisis.label || "Unknown";
            const confidence = hasilAnalisis.confidence_score 
              ? Math.round(hasilAnalisis.confidence_score * 100) 
              : 0;
            
            // Tentukan status berdasarkan label AI
            let status: StatusLabel;
            if (label === "Malignant") {
              status = "Malignant";
            } else if (label === "Benign") {
              status = "Benign";
            } else {
              status = "Follow-up";
            }
            
            // Tentukan BI-RADS berdasarkan status
            let birads: Birads;
            if (status === "Malignant" && confidence > 90) {
              birads = "5";
            } else if (status === "Malignant") {
              birads = "4C";
            } else if (status === "Follow-up") {
              birads = "3";
            } else if (status === "Benign" && confidence > 90) {
              birads = "1";
            } else {
              birads = "2";
            }
            
            return {
              id: item._id || `PAT-${Date.now()}`,
              nama: item.nama_berkas || "Unknown",
              tanggal: new Date(item.waktu_unggah || Date.now()).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
              status,
              birads,
              confidence,
              catatan: `Hasil analisis AI model ${hasilAnalisis.model_info?.nama || 'default'}. Confidence score: ${confidence}%.`,
            };
          });
          
          setItems(transformed);
        } else {
          // Jika backend belum ada data, gunakan dummy data
          setItems(dataAwal);
        }
      } catch (error) {
        console.error("Error fetching riwayat:", error);
        // Fallback ke dummy data jika backend error
        setItems(dataAwal);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (session?.role === "dokter") {
      fetchRiwayat();
    }
  }, [session]);

  const dataTersaring = useMemo(() => {
    const keyword = kataKunci.trim().toLowerCase();

    return items.filter((item) => {
      const cocokFilter =
        filterAktif === "semua"
          ? true
          : filterAktif === "malignant"
            ? item.status === "Malignant"
            : filterAktif === "benign"
              ? item.status === "Benign"
              : item.status === "Follow-up";

      const cocokKata =
        !keyword ||
        item.id.toLowerCase().includes(keyword) ||
        item.nama.toLowerCase().includes(keyword);

      return cocokFilter && cocokKata;
    });
  }, [items, kataKunci, filterAktif]);

  // Redirect bila tidak ada sesi dokter.
  if (!session || session.role !== "dokter") {
    if (typeof window !== "undefined") {
      router.replace("/");
    }
    return null;
  }

  const dataEkspor = dataTersaring;

  const tanganiEkspor = (format: "csv" | "pdf") => {
    if (format === "csv") {
      const bungkus = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
      const header = ["ID", "Nama", "Tanggal", "Status", "BI-RADS", "Confidence", "Catatan"];
      const rows = dataEkspor.map((item) =>
        [
          item.id,
          item.nama,
          item.tanggal,
          item.status,
          item.birads,
          `${item.confidence}%`,
          item.catatan,
        ]
          .map(bungkus)
          .join(","),
      );
      const csv = [header.map(bungkus).join(","), ...rows].join("\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "riwayat-pasien.csv";
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    // PDF: dokumen HTML lengkap berisi SELURUH data (bukan screenshot layar)
    const baris = dataEkspor
      .map(
        (item) => `<tr>
          <td>${escapeHtml(item.id)}</td>
          <td>${escapeHtml(item.nama)}</td>
          <td>${escapeHtml(item.tanggal)}</td>
          <td class="${kelasStatus(item.status)}">${escapeHtml(item.status)}</td>
          <td>BI-RADS ${escapeHtml(item.birads)}</td>
          <td>${item.confidence}%</td>
          <td>${escapeHtml(item.catatan)}</td>
        </tr>`,
      )
      .join("");

    const isi = `
      <div class="brand">MAMMOGUARD AI</div>
      <h1>Riwayat Pasien</h1>
      <div class="sub">${dataEkspor.length} rekam analisis • Diekspor ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
      <table>
        <thead><tr>
          <th>ID Pasien</th><th>Nama</th><th>Tanggal</th><th>Status</th>
          <th>BI-RADS</th><th>Confidence</th><th>Temuan Klinis</th>
        </tr></thead>
        <tbody>${baris}</tbody>
      </table>`;
    cetakLaporan("Riwayat Pasien — MammoGuard AI", isi);
  };

  const tanganiUnduhPdfPasien = (item: RiwayatPasien) => {
    const rekomendasi =
      item.status === "Malignant"
        ? "Segera lakukan biopsi jarum inti (core needle biopsy). Rujuk ke onkologi bedah."
        : item.status === "Follow-up"
          ? "Lakukan evaluasi USG dan follow-up mammogram dalam 6 bulan untuk memantau perubahan."
          : "Tidak ada tindakan invasif. Jadwalkan kontrol rutin 12 bulan.";

    const isi = `
      <div class="brand">MAMMOGUARD AI</div>
      <h1>Laporan Analisis Pasien</h1>
      <div class="sub">${escapeHtml(item.id)} • ${escapeHtml(item.tanggal)}</div>
      <div class="grid">
        <div class="card"><div class="label">Nama Pasien</div><div class="val">${escapeHtml(item.nama)}</div></div>
        <div class="card"><div class="label">Tanggal Analisis</div><div class="val">${escapeHtml(item.tanggal)}</div></div>
        <div class="card"><div class="label">Hasil Prediksi AI</div><div class="val ${kelasStatus(item.status)}">${escapeHtml(item.status)}</div></div>
        <div class="card"><div class="label">Confidence Score</div><div class="val">${item.confidence}%</div></div>
        <div class="card"><div class="label">Kategori BI-RADS</div><div class="val">BI-RADS ${escapeHtml(item.birads)}</div></div>
        <div class="card"><div class="label">Radiolog</div><div class="val">Dr. Ayu Permata Sari, Sp.Rad</div></div>
        <div class="card wide"><div class="label">Temuan Klinis</div><div class="val">${escapeHtml(item.catatan)}</div></div>
        <div class="card wide"><div class="label">Rekomendasi Tindak Lanjut</div><div class="val">${escapeHtml(rekomendasi)}</div></div>
      </div>`;
    cetakLaporan(`Laporan ${item.nama} — MammoGuard AI`, isi);
  };

  const tanganiLogout = () => {
    hapusSesiDemo();
    router.push("/");
  };

  return (
    <main className="flex h-screen overflow-hidden bg-gradient-to-br from-[#f0f6fb] to-[#e6eef5] text-[#21303d]">
      <DokterSidebar session={session} onLogout={tanganiLogout} />

      <section className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden px-6 py-5">
        <header className="flex shrink-0 items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold text-[#1a2a3a]">Riwayat Pasien</h1>
            <p className="mt-1 text-[11px] font-medium text-[#6a7582]">
              {items.length} total rekam analisis tersimpan
            </p>
          </div>
          <EksporDropdown onEkspor={tanganiEkspor} jumlahData={dataTersaring.length} />
        </header>

        <div className="mt-5 flex shrink-0 items-center gap-3">
          <div className="relative flex-1 max-w-[320px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2">
              <SearchIcon />
            </span>
            <input
              value={kataKunci}
              onChange={(event) => setKataKunci(event.target.value)}
              placeholder="Cari Nama / ID Pasien..."
              className="h-9 w-full rounded-[8px] border-2 border-[#e0e6eb] bg-white pl-9 pr-3 text-[12px] text-[#24323f] outline-none placeholder:text-[#a0abb5] focus:border-[#0a5c4f]"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-[8px] bg-white p-1 shadow-sm">
            {filterTabs.map((tab) => {
              const aktif = filterAktif === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterAktif(tab.key)}
                  className={`h-7 rounded-[6px] px-3 text-[11px] font-bold transition ${
                    aktif
                      ? "bg-[#0a5c4f] text-white shadow-sm"
                      : "text-[#5a6672] hover:bg-[#f0f4f8]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#cfd8df] bg-white px-3 text-[11px] font-bold text-[#5a6672] transition hover:bg-[#f8fafc]"
          >
            <CalendarIcon />
            Filter Tanggal
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-[12px] border border-[#e0e6eb] bg-white shadow-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <p className="text-[13px] text-[#8a95a1]">Memuat data riwayat...</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
            <thead className="bg-gradient-to-r from-[#f8fafc] to-[#f0f5f9]">
              <tr className="border-b border-[#e8edf1] text-left">
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6a7582]">
                  ID PASIEN
                </th>
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6a7582]">
                  NAMA PASIEN
                </th>
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6a7582]">
                  TANGGAL ANALISIS
                </th>
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6a7582]">
                  STATUS BI-RADS
                </th>
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6a7582]">
                  CONFIDENCE
                </th>
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6a7582]">
                  AKSI
                </th>
              </tr>
            </thead>
            <tbody>
              {dataTersaring.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[#edf1f4] last:border-b-0 transition-colors duration-150 hover:bg-[#f8fafc]"
                >
                  <td className="px-5 py-3.5 font-mono text-[12px] font-semibold text-[#5a6672]">
                    {item.id}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-[#1a2a3a]">
                    {item.nama}
                  </td>
                  <td className="px-5 py-3.5 text-[12px] font-medium text-[#5a6672]">
                    {item.tanggal}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[12px] font-semibold text-[#1a2a3a]">
                    {item.confidence}%
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => setItemDetail(item)}
                      className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#92e0c4] bg-gradient-to-r from-[#effaf5] to-[#e6f7f0] px-3 py-1.5 text-[11px] font-bold text-[#0a8a59] transition hover:shadow-sm"
                    >
                      <EyeIcon />
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
              {dataTersaring.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-[13px] font-medium text-[#8a95a1]"
                  >
                    Tidak ada data pasien yang sesuai pencarian/filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          )}
        </div>
      </section>

      {itemDetail ? (
        <DetailModal
          item={itemDetail}
          onClose={() => setItemDetail(null)}
          onUnduhPdf={tanganiUnduhPdfPasien}
        />
      ) : null}
    </main>
  );
}