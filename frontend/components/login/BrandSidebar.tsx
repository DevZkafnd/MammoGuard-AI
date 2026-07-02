const statistikPlatform = [
  { label: "Akurasi Model Aktif", value: "93.8%" },
  { label: "Total Analisis", value: "2.847" },
  { label: "Dokter Terdaftar", value: "5" },
];

function LogoMark() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/12">
      <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
    </span>
  );
}

export default function BrandSidebar() {
  return (
    <aside className="flex min-h-[320px] flex-col bg-[#00443b] px-5 py-6 text-white lg:min-h-screen lg:px-5">
      <div className="space-y-18 lg:space-y-24">
        <div className="flex items-start gap-3">
          <LogoMark />
          <div className="space-y-0.5">
            <p className="text-[13px] font-semibold tracking-[0.01em] text-white">
              MammoGuard AI
            </p>
            <p className="text-[8.5px] font-medium uppercase tracking-[0.2em] text-white/55">
              Diagnostic Platform
            </p>
          </div>
        </div>

        <div className="max-w-[214px] space-y-4.5">
          <h1 className="text-[28px] font-semibold leading-[1.12] tracking-[-0.04em] text-white">
            Deteksi dini kanker payudara dengan kecerdasan buatan.
          </h1>
          <p className="max-w-[206px] text-[12px] leading-[1.85] text-white/74">
            Platform analisis mammogram berbasis AI untuk mendukung keputusan
            klinis dokter spesialis dengan akurasi hingga 95%.
          </p>
        </div>
      </div>

      <div className="mt-auto overflow-hidden rounded-[14px] border border-white/10 bg-[#055248]">
        {statistikPlatform.map((item, index) => (
          <div
            key={item.label}
            className={`grid min-h-[46px] grid-cols-[1fr_auto] items-center gap-4 px-4 ${
              index > 0 ? "border-t border-white/10" : ""
            }`}
          >
            <span className="text-[10.5px] leading-none text-white/70">
              {item.label}
            </span>
            <span className="text-[13px] font-semibold leading-none tracking-[0.01em] text-white">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
