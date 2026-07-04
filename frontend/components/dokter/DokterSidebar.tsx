"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { DemoSession } from "@/lib/demoAuth";

function LogoMark() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#0a5c4f] to-[#0d7a68] shadow-sm">
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" aria-hidden="true">
        <path
          d="M3 12H7L9 7L13 17L15 12H21"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function MenuIcon({ iconKey, active }: { iconKey: "beranda" | "riwayat"; active?: boolean }) {
  const stroke = active ? "#ffffff" : "#8a95a1";

  if (iconKey === "beranda") {
    return (
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-[8px] transition-all duration-200 ${
          active ? "bg-[#0a5c4f] text-white shadow-sm" : "bg-[#f0f4f8] text-[#8a95a1]"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path
            d="M3 11.5L12 4L21 11.5V20C21 20.5523 20.5523 21 20 21H15V14H9V21H4C3.44772 21 3 20.5523 3 20V11.5Z"
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-[8px] transition-all duration-200 ${
        active ? "bg-[#0a5c4f] text-white shadow-sm" : "bg-[#f0f4f8] text-[#8a95a1]"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
        <path
          d="M6 4H18C19.1046 4 20 4.89543 20 6V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V6C4 4.89543 4.89543 4 6 4Z"
          stroke={stroke}
          strokeWidth="1.8"
        />
        <path d="M8 4V8" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 4V8" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 10H20" stroke={stroke} strokeWidth="1.8" />
      </svg>
    </span>
  );
}

type DokterSidebarProps = {
  session: DemoSession;
  onLogout: () => void;
};

const menuItems = [
  { label: "Beranda", href: "/beranda-dokter", icon: "beranda" as const },
  { label: "Riwayat Pasien", href: "/riwayat-pasien", icon: "riwayat" as const },
];

export default function DokterSidebar({ session, onLogout }: DokterSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col border-r border-[#e0e6eb] bg-white shadow-sm">
      <div className="px-5 py-5">
        <div className="flex items-start gap-3 rounded-[10px] px-2 py-2">
          <LogoMark />
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-[#1a2a3a]">MammoGuard</p>
            <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-[#8a95a1]">
              AI DIAGNOSTICS
            </p>
          </div>
        </div>

        <div className="mt-5 flex w-full items-center gap-2.5 rounded-[10px] border-l-4 border-[#0a5c4f] bg-[#f0f8f5] px-3 py-3">
          <MenuIcon iconKey="beranda" active />
          <span className="text-[14px] font-semibold leading-[1.4] text-[#0a5c4f]">
            Dokter Spesialis
          </span>
        </div>

        <nav className="mt-4 space-y-2">
          {menuItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left transition-all duration-200 ${
                  active
                    ? "border-l-4 border-[#0a5c4f] bg-[#f0f8f5] text-[#0a5c4f] shadow-sm"
                    : "text-[#6a7582] hover:bg-[#f8fafc] hover:pl-4 hover:text-[#4a5562]"
                }`}
              >
                <MenuIcon iconKey={item.icon} active={active} />
                <span className="text-[14px] font-medium leading-[1.4]">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-[#e8edf2] bg-[#f9fbfd] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#0a5c4f] to-[#0d7a68] text-[12px] font-bold text-white shadow-sm">
              {session.nama
                .split(" ")
                .map((bagian) => bagian[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[#2a3949]">{session.nama}</p>
              <p className="truncate text-[10px] font-medium text-[#8a95a1]">
                {session.peran}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-[8px] p-2 text-[#8a95a1] transition-all duration-200 hover:bg-[#f0f4f8] hover:text-[#1a2a3a] hover:shadow-sm"
            aria-label="Keluar"
            title="Keluar"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path
                d="M9 7.5V6.5C9 5.94772 9.44772 5.5 10 5.5H17C17.5523 5.5 18 5.94772 18 6.5V17.5C18 18.0523 17.5523 18.5 17 18.5H10C9.44772 18.5 9 18.0523 9 17.5V16.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path d="M14 12H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path
                d="M7 9L4 12L7 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}