import DemoAccountCard from "@/components/login/DemoAccountCard";
import type { DemoAccount } from "@/components/login/data";
import LoginInput from "@/components/login/LoginInput";

type LoginFormCardProps = {
  email: string;
  password: string;
  activeAccountId?: string;
  demoAccounts: DemoAccount[];
  errorMessage?: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSelectDemoAccount: (account: DemoAccount) => void;
  onSubmit: () => void;
};

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        d="M2.5 10C3.83333 7.41667 6.31917 5.83334 10 5.83334C13.6808 5.83334 16.1667 7.41667 17.5 10C16.1667 12.5833 13.6808 14.1667 10 14.1667C6.31917 14.1667 3.83333 12.5833 2.5 10Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 11.6667C10.9205 11.6667 11.6667 10.9205 11.6667 10C11.6667 9.07953 10.9205 8.33334 10 8.33334C9.07953 8.33334 8.33334 9.07953 8.33334 10C8.33334 10.9205 9.07953 11.6667 10 11.6667Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export default function LoginFormCard({
  email,
  password,
  activeAccountId,
  demoAccounts,
  errorMessage,
  onEmailChange,
  onPasswordChange,
  onSelectDemoAccount,
  onSubmit,
}: LoginFormCardProps) {
  return (
    <section className="w-full max-w-[372px]">
      <div className="space-y-1.5">
        <h2 className="text-[30px] font-semibold tracking-[-0.035em] text-[#1e2937]">
          Masuk ke akun Anda
        </h2>
        <p className="max-w-[320px] text-[10.5px] leading-[1.6] text-[#98a2af]">
          Sistem hanya dapat diakses oleh staf medis yang berwenang.
        </p>
      </div>

      <form
        className="mt-6 space-y-4.5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <LoginInput
          label="Email"
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          autoComplete="username"
          placeholder="dr.ayu@mammoguard.id"
        />

        <LoginInput
          label="Password"
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          autoComplete="current-password"
          trailingIcon={<EyeIcon />}
          placeholder="Masukkan password"
        />

        <button
          type="submit"
          className="flex h-10.5 w-full items-center justify-center rounded-[8px] bg-[#00473f] text-[10.5px] font-semibold text-white transition hover:bg-[#005247]"
        >
          Masuk
        </button>

        {errorMessage ? (
          <p className="text-[9.5px] font-medium text-[#cf5a63]">{errorMessage}</p>
        ) : null}
      </form>

      <div className="mt-5.5">
        <div className="relative mb-3.5 text-center">
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-[#dde3e9]" />
          <span className="relative inline-block bg-[#edf1f4] px-3 text-[8.5px] font-medium text-[#a2acb8]">
            Akun Demo
          </span>
        </div>

        <div className="space-y-2">
          {demoAccounts.map((account) => (
            <DemoAccountCard
              key={account.id}
              account={account}
              isActive={account.id === activeAccountId}
              onSelect={onSelectDemoAccount}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
