import type { InputHTMLAttributes, ReactNode } from "react";

type LoginInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  trailingIcon?: ReactNode;
};

export default function LoginInput({
  label,
  trailingIcon,
  className = "",
  ...props
}: LoginInputProps) {
  return (
    <label className="block space-y-2">
      <span className="text-[8.5px] font-semibold uppercase tracking-[0.18em] text-[#8f99a6]">
        {label}
      </span>
      <span className="relative block">
        <input
          {...props}
          className={`h-10.5 w-full rounded-[7px] border border-[#e2e7ec] bg-[#fbfbfc] px-3.5 text-[10.5px] font-medium text-[#23323f] outline-none transition placeholder:text-[#b2bcc7] focus:border-[#0a5c4f] focus:ring-2 focus:ring-[#0a5c4f]/10 ${trailingIcon ? "pr-10" : ""} ${className}`}
        />
        {trailingIcon ? (
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[#a6afb9]">
            {trailingIcon}
          </span>
        ) : null}
      </span>
    </label>
  );
}
