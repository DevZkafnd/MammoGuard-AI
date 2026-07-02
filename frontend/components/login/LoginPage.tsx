"use client";

import { useMemo, useState } from "react";

import BrandSidebar from "@/components/login/BrandSidebar";
import { demoAccounts, type DemoAccount } from "@/components/login/data";
import LoginFormCard from "@/components/login/LoginFormCard";

export default function LoginPage() {
  const akunAwal = useMemo(() => demoAccounts[0], []);
  const [email, setEmail] = useState(akunAwal.email);
  const [password, setPassword] = useState(akunAwal.password);
  const [activeAccountId, setActiveAccountId] = useState<string>(akunAwal.id);

  const tanganiPilihAkunDemo = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setActiveAccountId(account.id);
  };

  const tanganiUbahEmail = (value: string) => {
    setEmail(value);
    if (value !== demoAccounts.find((account) => account.id === activeAccountId)?.email) {
      setActiveAccountId("");
    }
  };

  const tanganiUbahPassword = (value: string) => {
    setPassword(value);
    if (value !== demoAccounts.find((account) => account.id === activeAccountId)?.password) {
      setActiveAccountId("");
    }
  };

  return (
    <main className="grid min-h-screen bg-[#edf1f4] lg:grid-cols-[244px_minmax(0,1fr)]">
      <BrandSidebar />

      <section className="flex items-center justify-center px-6 py-12 lg:px-16">
        <LoginFormCard
          email={email}
          password={password}
          activeAccountId={activeAccountId}
          demoAccounts={demoAccounts}
          onEmailChange={tanganiUbahEmail}
          onPasswordChange={tanganiUbahPassword}
          onSelectDemoAccount={tanganiPilihAkunDemo}
        />
      </section>
    </main>
  );
}
