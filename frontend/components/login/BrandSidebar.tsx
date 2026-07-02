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
    <aside className="flex h-screen min-w-[340px] shrink-0 flex-col overflow-hidden bg-gradient-to-b from-[#00443b] to-[#006655] px-7 py-7 text-white shadow-lg">
      <div className="flex h-full flex-col">
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

        <div className="mt-12 max-w-[292px] space-y-5">
          <h1 className="text-[30px] font-bold leading-[1.12] tracking-[-0.03em] text-white">
            Deteksi dini kanker payudara dengan kecerdasan buatan.
          </h1>
          <p className="max-w-[270px] text-[13px] font-medium leading-[1.7] text-white/80">
            Platform analisis mammogram berbasis AI untuk mendukung keputusan
            klinis dokter spesialis dengan akurasi hingga 95%.
          </p>
        </div>

        <div className="mt-auto overflow-hidden rounded-[16px] border border-white/15 bg-gradient-to-b from-[#055248] to-[#066a5a] shadow-lg">
          {statistikPlatform.map((item, index) => (
            <div
              key={item.label}
              className={`grid min-h-[52px] grid-cols-[1fr_auto] items-center gap-4 px-5 transition-all duration-200 hover:bg-white/5 ${
                index > 0 ? "border-t border-white/10" : ""
              }`}
            >
              <span className="text-[12px] font-medium leading-none text-white/75">
                {item.label}
              </span>
              <span className="text-[15px] font-bold leading-none tracking-[0.01em] text-white">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
