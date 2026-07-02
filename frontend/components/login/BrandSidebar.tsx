const statistikPlatform = [
  { label: "Akurasi Model Aktif", value: "93.8%" },
  { label: "Total Analisis", value: "2.847" },
  { label: "Dokter Terdaftar", value: "5" },
];

function LogoMark() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-white/20 to-white/10 shadow-sm">
      <span className="h-4 w-4 rounded-full bg-white/90" />
    </span>
  );
}

export default function BrandSidebar() {
  return (
    <aside className="flex min-h-[320px] flex-col bg-gradient-to-b from-[#00443b] to-[#006655] px-6 py-8 text-white lg:min-h-screen lg:px-6 shadow-lg">
      <div className="space-y-20 lg:space-y-28">
        <div className="flex items-start gap-4">
          <LogoMark />
          <div className="space-y-1">
            <p className="text-[18px] font-bold tracking-[0.01em] text-white">
              MammoGuard AI
            </p>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
              Diagnostic Platform
            </p>
          </div>
        </div>

        <div className="max-w-[280px] space-y-6">
          <h1 className="text-[32px] font-bold leading-[1.15] tracking-[-0.03em] text-white">
            Deteksi dini kanker payudara dengan kecerdasan buatan.
          </h1>
          <p className="max-w-[260px] text-[14px] leading-[1.8] text-white/80 font-medium">
            Platform analisis mammogram berbasis AI untuk mendukung keputusan
            klinis dokter spesialis dengan akurasi hingga 95%.
          </p>
        </div>
      </div>

      <div className="mt-auto overflow-hidden rounded-[16px] border border-white/15 bg-gradient-to-b from-[#055248] to-[#066a5a] shadow-lg">
        {statistikPlatform.map((item, index) => (
          <div
            key={item.label}
            className={`grid min-h-[56px] grid-cols-[1fr_auto] items-center gap-5 px-5 transition-all duration-200 hover:bg-white/5 ${
              index > 0 ? "border-t border-white/10" : ""
            }`}
          >
            <span className="text-[13px] leading-none text-white/75 font-medium">
              {item.label}
            </span>
            <span className="text-[16px] font-bold leading-none tracking-[0.01em] text-white">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
