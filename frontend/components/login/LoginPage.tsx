"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BrandSidebar from "@/components/login/BrandSidebar";
import { demoAccounts, type DemoAccount } from "@/components/login/data";
import LoginFormCard from "@/components/login/LoginFormCard";
import { buatSesiDemo, simpanSesiDemo } from "@/lib/demoAuth";

export default function LoginPage() {
  const router = useRouter();
  const akunAwal = useMemo(() => demoAccounts[0], []);
  const [email, setEmail] = useState(akunAwal.email);
  const [password, setPassword] = useState(akunAwal.password);
  const [activeAccountId, setActiveAccountId] = useState<string>(akunAwal.id);
  const [errorMessage, setErrorMessage] = useState("");

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

  const tanganiMasuk = () => {
    const akunDemo = demoAccounts.find(
      (account) => account.email === email && account.password === password,
    );

    if (!akunDemo) {
      setErrorMessage("Email atau password demo tidak cocok.");
      return;
    }

    if (akunDemo.role !== "admin") {
      setErrorMessage("Untuk saat ini hanya akun demo admin yang membuka halaman ini.");
      return;
    }

    simpanSesiDemo(buatSesiDemo(akunDemo));
    router.push("/user-manajemen");
  };

  return (
    <main className="grid min-h-screen bg-gradient-to-br from-[#f0f8ff] to-[#e6f2ff] lg:grid-cols-[280px_minmax(0,1fr)]">
      <BrandSidebar />

      <section className="flex items-center justify-center px-8 py-12 lg:px-20">
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
