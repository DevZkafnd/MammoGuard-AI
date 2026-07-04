"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import DokterSidebar from "@/components/dokter/DokterSidebar";
import {
  ambilSesiDemo,
  hapusSesiDemo,
  subscribeSesiDemo,
} from "@/lib/demoAuth";

type RiwayatItem = {
  namaFile: string;
  prediksi: { label: "Benign" | "Malignant"; confidence: number };
  birads: string;
  waktu: string;
};

const RIWAYAT_KEY = "mammoguard-riwayat";

function bacaRiwayat(): RiwayatItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RIWAYAT_KEY);
    return raw ? (JSON.parse(raw) as RiwayatItem[]) : [];
  } catch {
    return [];
  }
}

function subscribeRiwayat(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handle = (event: StorageEvent) => {
    if (event.key === RIWAYAT_KEY) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", handle);
  return () => window.removeEventListener("storage", handle);
}

export default function RiwayatPasienPage() {
  const router = useRouter();
  const session = useSyncExternalStore(
    subscribeSesiDemo,
    () => ambilSesiDemo(),
    () => null,
  );
  const items = useSyncExternalStore(
    subscribeRiwayat,
    bacaRiwayat,
    () => [] as RiwayatItem[],
  );

  useEffect(() => {
    if (!session || session.role !== "dokter") {
      router.replace("/");
    }
  }, [session, router]);

  const tanganiLogout = () => {
    hapusSesiDemo();
    router.push("/");
  };

  if (!session || session.role !== "dokter") {
    return null;
  }

  return (
    <main className="flex h-screen overflow-hidden bg-gradient-to-br from-[#f0f6fb] to-[#e6eef5] text-[#21303d]">
      <DokterSidebar session={session} onLogout={tanganiLogout} />

      <section className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden px-6 py-5">
        <header className="shrink-0">
          <h1 className="text-[20px] font-bold text-[#1a2a3a]">Riwayat Pasien</h1>
          <p className="mt-1 text-[11px] font-medium text-[#6a7582]">
            Daftar analisis yang telah divalidasi oleh dokter.
          </p>
        </header>

        <div className="mt-6 min-h-0 flex-1 overflow-hidden rounded-[12px] border border-[#e0e6eb] bg-white shadow-lg">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef5f3] text-[#0a5c4f]">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
                  <path
                    d="M6 4H18C19.1046 4 20 4.89543 20 6V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V6C4 4.89543 4.89543 4 6 4Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path d="M8 4V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M16 4V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M4 10H20" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </span>
              <p className="text-[14px] font-bold text-[#1a2a3a]">
                Belum ada analisis yang divalidasi.
              </p>
              <p className="max-w-[360px] text-[12px] font-medium text-[#8a95a1]">
                Unggah citra mammogram dari menu Beranda, lalu klik tombol
                &quot;Validasi &amp; Simpan ke Riwayat&quot; untuk menambahkan entri di sini.
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="bg-gradient-to-r from-[#f8fafc] to-[#f0f5f9]">
                <tr className="border-b border-[#e8edf1] text-left">
                  <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6a7582]">
                    File Citra
                  </th>
                  <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6a7582]">
                    Prediksi
                  </th>
                  <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6a7582]">
                    BI-RADS
                  </th>
                  <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6a7582]">
                    Waktu
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={`${item.waktu}-${index}`}
                    className="border-b border-[#edf1f4] last:border-b-0 hover:bg-[#f8fafc]"
                  >
                    <td className="px-5 py-3.5 font-mono text-[12px] font-semibold text-[#2a3947]">
                      {item.namaFile}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-[#2a3947]">
                      {item.prediksi.label} ({item.prediksi.confidence}%)
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[12px] font-bold text-[#0a5c4f]">
                      {item.birads}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] font-medium text-[#5a6672]">
                      {new Date(item.waktu).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}