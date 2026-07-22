"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DokterSidebar from "@/components/dokter/DokterSidebar";
import {
  ambilSesiDemo,
  hapusSesiDemo,
  subscribeSesiDemo,
} from "@/lib/demoAuth";

const URL_DASAR_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Statistik = {
  analisis_hari_ini: number;
  pending_validasi: number;
  total_pasien: number;
};

type PasienItem = {
  id: string;
  nama: string;
  tanggal: string;
  status: "completed" | "pending";
  prediksi_kanan: string;
  prediksi_kiri: string;
};

export default function DashboardDokterPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [statistik, setStatistik] = useState<Statistik>({
    analisis_hari_ini: 0,
    pending_validasi: 0,
    total_pasien: 0,
  });
  const [daftarPasien, setDaftarPasien] = useState<PasienItem[]>([]);

  useEffect(() => {
    const sesi = ambilSesiDemo();
    setSession(sesi);
    if (!sesi || sesi.role !== "dokter") {
      router.replace("/");
    } else {
      muatStatistik();
      muatDaftarPasien();
    }
  }, [router]);

  const muatDaftarPasien = async () => {
    try {
      const res = await fetch(`${URL_DASAR_API}/pasien/?limit=10`);
      const data = await res.json();
      
      if (data.status === "berhasil" && Array.isArray(data.data)) {
        const transformed: PasienItem[] = data.data.map((item: any) => ({
          id: item.id_pasien,
          nama: item.nama,
          tanggal: new Date(item.tanggal_pemeriksaan).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          status: item.status,
          prediksi_kanan: item.kanan?.prediksi || "Unknown",
          prediksi_kiri: item.kiri?.prediksi || "Unknown",
        }));
        setDaftarPasien(transformed);
      }
    } catch (error) {
      console.error("Error fetching pasien:", error);
    }
  };

  const muatStatistik = async () => {
    try {
      const res = await fetch(`${URL_DASAR_API}/analisis/statistik`);
      const data = await res.json();
      if (data.data) {
        setStatistik(data.data);
      }
    } catch {
      // Keep default values
    }
  };

  const handleLogout = () => {
    hapusSesiDemo();
    router.replace("/");
  };

  const handleTambahPasien = () => {
    router.push("/profil-pasien");
  };

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
              Dashboard Dokter
            </h1>
            <p className="text-[12px] text-[#8a95a1]">
              Selamat datang, {session.nama}
            </p>
          </div>
          <button
            onClick={handleTambahPasien}
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#0a5c4f] px-5 py-2.5 text-[13px] font-semibold text-white shadow-md transition hover:bg-[#087765]"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                d="M10 4V16M4 10H16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Tambah Pasien Baru
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {/* Statistik Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <StatCard
              label="Analisis Hari Ini"
              value={statistik.analisis_hari_ini}
              icon="chart"
              color="green"
            />
            <StatCard
              label="Pending Validasi"
              value={statistik.pending_validasi}
              icon="warning"
              color="orange"
            />
            <StatCard
              label="Total Pasien"
              value={statistik.total_pasien}
              icon="users"
              color="blue"
            />
          </div>

          {/* Daftar Pasien Terbaru */}
          <div className="rounded-[16px] bg-white p-6 shadow-md">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-bold text-[#1a2a3a]">
                  Pasien Terbaru
                </h2>
                <p className="text-[11px] text-[#8a95a1]">
                  Daftar pasien yang baru dianalisis
                </p>
              </div>
              <button
                onClick={() => router.push("/riwayat-pasien")}
                className="text-[12px] font-semibold text-[#0a5c4f] transition hover:text-[#087765]"
              >
                Lihat Semua →
              </button>
            </div>

            <div className="space-y-3">
              {daftarPasien.map((pasien) => (
                <PasienCard key={pasien.id} pasien={pasien} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: "chart" | "warning" | "users";
  color: "green" | "orange" | "blue";
}) {
  const colorClasses = {
    green: {
      bg: "from-[#e4f3ef] to-[#d6ece5]",
      icon: "#0a5c4f",
      iconBg: "#dff3eb",
    },
    orange: {
      bg: "from-[#fdf3e3] to-[#f9ead0]",
      icon: "#d98a1a",
      iconBg: "#fbecd2",
    },
    blue: {
      bg: "from-[#e8eef9] to-[#dde6f3]",
      icon: "#3a5fb0",
      iconBg: "#dde6f5",
    },
  };

  const colors = colorClasses[color];

  return (
    <div
      className={`rounded-[14px] bg-gradient-to-br ${colors.bg} p-6 shadow-sm`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8a95a1]">
            {label}
          </p>
          <p className="mt-2 text-[32px] font-bold text-[#1a2a3a]">{value}</p>
        </div>
        <span
          className="flex h-11 w-11 items-center justify-center rounded-[10px] shadow-sm"
          style={{ backgroundColor: colors.iconBg, color: colors.icon }}
        >
          {icon === "chart" && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M5 21V13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M12 21V8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M19 21V14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
          {icon === "warning" && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M12 3.5L21.5 20H2.5L12 3.5Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M12 10V14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="17" r="0.9" fill="currentColor" />
            </svg>
          )}
          {icon === "users" && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M3.5 19.5C4.5 16.5 6.6 15 9 15C11.4 15 13.5 16.5 14.5 19.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle cx="16" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M14.5 14.5C17 14.5 19 15.7 20.2 18"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          )}
        </span>
      </div>
    </div>
  );
}

function PasienCard({ pasien }: { pasien: PasienItem }) {
  const router = useRouter();

  return (
    <div
      className="flex cursor-pointer items-center justify-between rounded-[10px] border-2 border-[#e0e6eb] bg-white p-4 transition hover:border-[#0a5c4f] hover:bg-[#f8fafc]"
      onClick={() => router.push(`/detail-pasien/${pasien.id}`)}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#0a5c4f] to-[#0d7a68] text-white">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
            <path
              d="M5 20C5 16.6863 7.68629 14 11 14H13C16.3137 14 19 16.6863 19 20"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <p className="text-[14px] font-bold text-[#1a2a3a]">{pasien.nama}</p>
          <p className="text-[11px] text-[#8a95a1]">
            ID: {pasien.id} • {pasien.tanggal}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8a95a1]">
            Hasil Analisis
          </p>
          <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold">
            <span
              className={
                pasien.prediksi_kanan === "Benign"
                  ? "text-[#0a8a59]"
                  : "text-[#e22a39]"
              }
            >
              Kanan: {pasien.prediksi_kanan}
            </span>
            <span className="text-[#cfd8df]">|</span>
            <span
              className={
                pasien.prediksi_kiri === "Benign"
                  ? "text-[#0a8a59]"
                  : "text-[#e22a39]"
              }
            >
              Kiri: {pasien.prediksi_kiri}
            </span>
          </div>
        </div>

        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-5 w-5 text-[#8a95a1]"
          aria-hidden="true"
        >
          <path
            d="M7 4L13 10L7 16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
