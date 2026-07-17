"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BrandSidebar from "@/components/login/BrandSidebar";
import { demoAccounts, type DemoAccount } from "@/components/login/data";
import LoginFormCard from "@/components/login/LoginFormCard";
import { simpanSesiDemo, type DemoSession } from "@/lib/demoAuth";
import { apiFetch } from "@/services/apiLayanan";

export default function LoginPage() {
  const router = useRouter();
  const akunAwal = useMemo(() => demoAccounts[0], []);
  const [email, setEmail] = useState(akunAwal.email);
  const [password, setPassword] = useState(akunAwal.password);
  const [activeAccountId, setActiveAccountId] = useState<string>(akunAwal.id);
  const [errorMessage, setErrorMessage] = useState("");
  const [sedangMasuk, setSedangMasuk] = useState(false);

  const tanganiPilihAkunDemo = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setActiveAccountId(account.id);
    setErrorMessage("");
  };

  const tanganiUbahEmail = (value: string) => {
    setEmail(value);
    setErrorMessage("");
    if (value !== demoAccounts.find((account) => account.id === activeAccountId)?.email) {
      setActiveAccountId("");
    }
  };

  const tanganiUbahPassword = (value: string) => {
    setPassword(value);
    setErrorMessage("");
    if (value !== demoAccounts.find((account) => account.id === activeAccountId)?.password) {
      setActiveAccountId("");
    }
  };

  const tanganiMasuk = async () => {
    if (sedangMasuk) {
      return;
    }

    setErrorMessage("");
    setSedangMasuk(true);

    try {
      const respons = await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!respons.ok) {
        if (respons.status === 401) {
          setErrorMessage("Email atau password salah.");
        } else if (respons.status === 403) {
          setErrorMessage("Akun dinonaktifkan. Hubungi admin.");
        } else {
          setErrorMessage("Gagal masuk. Pastikan server backend berjalan.");
        }
        return;
      }

      const data = await respons.json();
      const pengguna = data.data;
      const session: DemoSession = {
        id: pengguna.id,
        nama: pengguna.nama,
        email: pengguna.email,
        peran: pengguna.peran,
        role: pengguna.role,
      };

      simpanSesiDemo(session, data.token);

      if (session.role === "admin") {
        router.push("/user-manajemen");
        return;
      }

      router.push("/beranda-dokter");
    } catch (error) {
      console.error("Error login:", error);
      setErrorMessage("Gagal terhubung ke server. Pastikan backend berjalan.");
    } finally {
      setSedangMasuk(false);
    }
  };

  return (
    <main className="grid h-screen overflow-hidden bg-gradient-to-br from-[#f0f8ff] to-[#e6f2ff] lg:grid-cols-[340px_minmax(0,1fr)]">
      <BrandSidebar />

      <section className="flex h-screen min-w-0 items-center justify-center overflow-hidden px-8 py-6 lg:px-16">
        <LoginFormCard
          email={email}
          password={password}
          activeAccountId={activeAccountId}
          demoAccounts={demoAccounts}
          errorMessage={errorMessage}
          onEmailChange={tanganiUbahEmail}
          onPasswordChange={tanganiUbahPassword}
          onSelectDemoAccount={tanganiPilihAkunDemo}
          onSubmit={tanganiMasuk}
        />
      </section>
    </main>
  );
}
