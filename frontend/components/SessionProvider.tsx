"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ambilSesiDemo, simpanHalamanTerakhir, ambilHalamanTerakhir, perbaruiSessionTimeout } from "@/lib/demoAuth";

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Simpan halaman saat ini sebagai halaman terakhir yang diakses
    if (pathname !== "/") {
      simpanHalamanTerakhir(pathname);
    }

    // Cek session untuk halaman yang memerlukan autentikasi
    const session = ambilSesiDemo();
    
    // Jika tidak ada session dan mencoba mengakses halaman yang memerlukan autentikasi
    if (!session && pathname !== "/") {
      router.replace("/");
    }
    
    // Jika ada session dan mencoba mengakses halaman login,
    // arahkan sesuai peran (dokter -> beranda, admin/IT -> manajemen)
    if (session && pathname === "/") {
      const halamanTerakhir = ambilHalamanTerakhir();
      const berandaPeran =
        session.role === "dokter" ? "/beranda-dokter" : "/user-manajemen";
      router.push(halamanTerakhir || berandaPeran);
    }

    // Perbarui session timeout saat user aktif
    if (session) {
      perbaruiSessionTimeout();
    }
  }, [pathname, router]);

  // Tambah event listener untuk aktivitas user
  useEffect(() => {
    const handleUserActivity = () => {
      const session = ambilSesiDemo();
      if (session) {
        perbaruiSessionTimeout();
      }
    };

    // Tambah event listener untuk berbagai aktivitas user
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("click", handleUserActivity);
    window.addEventListener("scroll", handleUserActivity);

    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
      window.removeEventListener("scroll", handleUserActivity);
    };
  }, []);

  return <>{children}</>;
}