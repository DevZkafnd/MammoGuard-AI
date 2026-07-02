import type { DemoAccount } from "@/components/login/data";

type DemoAccountCardProps = {
  account: DemoAccount;
  isActive: boolean;
  onSelect: (account: DemoAccount) => void;
};

function UserIcon({ active }: { active: boolean }) {
  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-[8px] border ${
        active
          ? "border-[#0a5c4f] bg-[#0a5c4f] text-white"
          : "border-[#d8dee5] bg-[#f7f9fb] text-[#b0b8c2]"
      }`}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path
          d="M10 10.5C12.0711 10.5 13.75 8.82107 13.75 6.75C13.75 4.67893 12.0711 3 10 3C7.92893 3 6.25 4.67893 6.25 6.75C6.25 8.82107 7.92893 10.5 10 10.5Z"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M4.5 16.2501C5.49473 14.1852 7.60829 12.75 10 12.75C12.3917 12.75 14.5053 14.1852 15.5 16.2501"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export default function DemoAccountCard({
  account,
  isActive,
  onSelect,
}: DemoAccountCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(account)}
      className={`flex w-full items-center justify-between rounded-[8px] border px-3 py-2 text-left transition ${
        isActive
          ? "border-[#0b5c50] bg-white shadow-[0_0_0_1px_rgba(11,92,80,0.18)]"
          : "border-[#e3e8ee] bg-white hover:border-[#cad4dd]"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <UserIcon active={isActive} />
        <span className="min-w-0">
          <span className="block truncate text-[10px] font-semibold text-[#22323f]">
            {account.nama}
          </span>
          <span className="mt-0.5 block truncate text-[8px] text-[#97a1ae]">
            {account.email}
          </span>
        </span>
      </span>

      <span
        className={`shrink-0 rounded-full px-2 py-1 text-[7px] font-semibold ${
          isActive
            ? "bg-[#e8f3f1] text-[#0a5c4f]"
            : "bg-[#eef2f6] text-[#94a0ab]"
        }`}
      >
        {account.peran}
      </span>
    </button>
  );
}
