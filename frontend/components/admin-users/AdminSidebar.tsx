"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { DemoSession } from "@/lib/demoAuth";

function LogoMark() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#0a5c4f] to-[#0d7a68] shadow-sm">
      <span className="h-4 w-4 rounded-full bg-white/90" />
    </span>
  );
}

function SidebarIcon({ active }: { active?: boolean }) {
  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-[8px] transition-all duration-200 ${
        active ? "bg-[#0a5c4f] text-white shadow-sm" : "bg-[#f0f4f8] text-[#8a95a1]"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
        <path d="M5 8H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5 12H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5 16H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

type AdminSidebarProps = {
  session: DemoSession;
  onLogout: () => void;
};

const menuItems = [
  { label: "Manajemen Akun", href: "/user-manajemen" },
  { label: "Manajemen Model AI", href: "/manajemen-model-ai" },
];

export default function AdminSidebar({ session, onLogout }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[280px] shrink-0 flex-col border-r border-[#e0e6eb] bg-white shadow-sm">
      <div className="px-6 py-6">
        <div className="flex items-start gap-3 rounded-[12px] px-3 py-3">
          <LogoMark />
          <div className="min-w-0">
            <p className="text-[16px] font-bold text-[#1a2a3a]">MammoGuard</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#8a95a1]">
              AI DIAGNOSTICS
            </p>
          </div>
        </div>

        <nav className="mt-8 space-y-2.5">
          {menuItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-[12px] px-4 py-4 text-left transition-all duration-200 ${
                  active
                    ? "border-l-4 border-[#0a5c4f] bg-[#f0f8f5] text-[#0a5c4f] shadow-sm"
                    : "text-[#6a7582] hover:bg-[#f8fafc] hover:pl-5 hover:text-[#4a5562]"
                }`}
              >
                <SidebarIcon active={active} />
                <span className="text-[15px] font-medium leading-[1.4]">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-[#e8edf2] bg-[#f9fbfd] px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#0a5c4f] to-[#0d7a68] text-[14px] font-bold text-white shadow-sm">
              {session.nama
                .split(" ")
                .map((bagian) => bagian[0])
                .join("")
                .toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-[#2a3949]">{session.nama}</p>
              <p className="truncate text-[11px] font-medium text-[#8a95a1]">
                {session.peran}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-[8px] p-2.5 text-[#8a95a1] transition-all duration-200 hover:bg-[#f0f4f8] hover:text-[#1a2a3a] hover:shadow-sm"
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
              <path
                d="M14 12H4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
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
