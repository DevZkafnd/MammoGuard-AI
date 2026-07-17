"use client";

import {
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";

import DokterSidebar from "@/components/dokter/DokterSidebar";
import {
  ambilSesiDemo,
  hapusSesiDemo,
  subscribeSesiDemo,
} from "@/lib/demoAuth";

const URL_DASAR_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Phase = "idle" | "processing" | "workspace";

type Prediction = {
  label: "Benign" | "Malignant";
  confidence: number;
};

type StatistikKey = "analisis_hari_ini" | "pending_validasi" | "total_pasien";

const statistikKlinik: {
  key: StatistikKey;
  label: string;
  aksen: string;
  iconColor: string;
  iconBg: string;
}[] = [
  {
    key: "analisis_hari_ini",
    label: "Analisis Hari Ini",
    aksen: "from-[#e4f3ef] to-[#d6ece5]",
    iconColor: "#0a5c4f",
    iconBg: "#dff3eb",
  },
  {
    key: "pending_validasi",
    label: "Pending Validasi",
    aksen: "from-[#fdf3e3] to-[#f9ead0]",
    iconColor: "#d98a1a",
    iconBg: "#fbecd2",
  },
  {
    key: "total_pasien",
    label: "Total Pasien",
    aksen: "from-[#e8eef9] to-[#dde6f3]",
    iconColor: "#3a5fb0",
    iconBg: "#dde6f5",
  },
];

type Statistik = Record<StatistikKey, number>;

const opsiBirads = [
  { value: "0", label: "0 - Incomplete" },
  { value: "1", label: "1 - Negative" },
  { value: "2", label: "2 - Benign" },
  { value: "3", label: "3 - Probably Benign" },
  { value: "4A", label: "4A - Low Suspicion" },
  { value: "4B", label: "4B - Moderate Suspicion" },
  { value: "4C", label: "4C - High Suspicion" },
];

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M5 21V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 21V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 21V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 3.5L21.5 20H2.5L12 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 10V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" />
    </svg>
  );
}

function UserGroupIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 19.5C4.5 16.5 6.6 15 9 15C11.4 15 13.5 16.5 14.5 19.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="16" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M14.5 14.5C17 14.5 19 15.7 20.2 18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

const ikonStatistik = [ChartIcon, WarningIcon, UserGroupIcon];

function CloudUploadIcon() {
  return (
    <span className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-[#eef5f3] text-[#0a5c4f]">
      <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7" aria-hidden="true">
        <path
          d="M8.5 22.5C6.01472 22.5 4 20.4853 4 18C4 15.8578 5.52735 14.0637 7.55376 13.639C7.84639 10.3857 10.5416 7.83333 13.8333 7.83333C16.6122 7.83333 18.9573 9.63806 19.7908 12.1229C20.1879 12.0417 20.6 12 21 12C23.7614 12 26 14.2386 26 17C26 19.7614 23.7614 22 21 22H8.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 20V27"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M12 23L16 20L20 23"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function HeartbeatIcon() {
  return (
    <span className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-[#eef5f3] text-[#0a5c4f]">
      <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7" aria-hidden="true">
        <path
          d="M3 16H7L9 11L13 22L15 16H19L21 13L23 19L25 16H29"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function ImageMock({ heatmap }: { heatmap: boolean }) {
  // Placeholder breast mammogram-ish circle to mimic the UI on gambar.
  // Saat heatmap=true, tambahkan overlay orange-red di pusat (Grad-CAM style).
  return (
    <div className="relative h-full w-full bg-[#0a0e1a]">
      <svg
        viewBox="0 0 400 400"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        {/* Bentuk mammogram sederhana: lengkung + nipple */}
        <path
          d="M120 360 C 120 200, 200 80, 260 80 C 320 80, 360 180, 340 280 C 320 360, 240 380, 180 380 Z"
          fill="#1f2640"
          stroke="#2d3556"
          strokeWidth="1"
        />
        <ellipse cx="225" cy="220" rx="35" ry="45" fill="#262e4d" />
        <circle cx="225" cy="220" r="6" fill="#3a4570" />

        {/* Grad-CAM heatmap overlay */}
        {heatmap ? (
          <>
            <defs>
              <radialGradient id="heatGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ff4d2e" stopOpacity="0.95" />
                <stop offset="35%" stopColor="#ff7a2b" stopOpacity="0.7" />
                <stop offset="70%" stopColor="#ffb04a" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ffb04a" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="225" cy="220" r="70" fill="url(#heatGrad)" />
            <circle
              cx="225"
              cy="220"
              r="14"
              fill="#fff"
              stroke="#ff3d2e"
              strokeWidth="2"
            />
          </>
        ) : null}

        {/* Label sudut */}
        <text x="20" y="28" fill="#5a6480" fontSize="13" fontFamily="monospace">
          L CC
        </text>
        <text x="20" y="380" fill="#5a6480" fontSize="11" fontFamily="monospace">
          MammoGuard AI
        </text>
      </svg>
    </div>
  );
}

function ImageToolbar({
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onRotate,
  onReset,
}: {
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center gap-3 text-[#a4adc0]">
      <button
        type="button"
        onClick={onZoomIn}
        className="flex h-8 w-8 items-center justify-center rounded-[8px] hover:bg-white/10 hover:text-white transition"
        aria-label="Zoom in"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          <circle cx="9" cy="9" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M13 13L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M9 7V11M7 9H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        className="flex h-8 w-8 items-center justify-center rounded-[8px] hover:bg-white/10 hover:text-white transition"
        aria-label="Zoom out"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          <circle cx="9" cy="9" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M13 13L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M7 9H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onRotate}
        className="flex h-8 w-8 items-center justify-center rounded-[8px] hover:bg-white/10 hover:text-white transition"
        aria-label="Rotate"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          <path
            d="M3 10C3 6.13401 6.13401 3 10 3C12.5 3 14.7 4.4 15.8 6.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M16 4V7H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onReset}
        className="flex h-8 w-8 items-center justify-center rounded-[8px] hover:bg-white/10 hover:text-white transition"
        aria-label="Reset"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          <path
            d="M4 10C4 6.68629 6.68629 4 10 4C12.5 4 14.6 5.4 15.7 7.4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M15.7 4.5V7.4H12.8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <span className="w-10 text-right text-[11px] font-medium tabular-nums">{zoomPercent}%</span>
    </div>
  );
}

function IdleView({ onPilihFile }: { onPilihFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const bukaPemilihFile = () => inputRef.current?.click();

  const tanganiFile = (file: File | undefined) => {
    if (!file) return;
    onPilihFile(file);
  };

  return (
    <div
      className={`relative mx-auto w-full max-w-[560px] rounded-[16px] border bg-white p-12 shadow-[0_18px_60px_rgba(15,30,40,0.06)] transition-colors ${
        isDragOver ? "border-[#0a5c4f] bg-[#f3faf7]" : "border-dashed border-[#cfd8df]"
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        tanganiFile(event.dataTransfer.files[0]);
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <CloudUploadIcon />
        <div className="text-center">
          <p className="text-[15px] font-bold text-[#1a2a3a]">
            Tarik &amp; Lepas Gambar Mammogram di Sini
          </p>
          <p className="mt-1 text-[12px] font-medium text-[#8a95a1]">
            Mendukung format .JPG, .PNG, .DICOM
          </p>
        </div>
        <button
          type="button"
          onClick={bukaPemilihFile}
          className="mt-2 inline-flex h-10 items-center justify-center rounded-[8px] bg-[#0a5c4f] px-6 text-[12px] font-semibold text-white shadow-md transition hover:bg-[#087765]"
        >
          Pilih dari Komputer
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.dcm,.dicom"
          className="hidden"
          onChange={(event) => tanganiFile(event.target.files?.[0])}
        />
      </div>
    </div>
  );
}

function ProcessingView({ progress, namaFile }: { progress: number; namaFile: string }) {
  const stepAktif =
    progress < 33 ? "Preprocessing" : progress < 95 ? "Running inference" : "Complete";

  return (
    <div className="mx-auto w-full max-w-[560px] rounded-[16px] bg-white p-12 shadow-[0_18px_60px_rgba(15,30,40,0.06)]">
      <div className="flex flex-col items-center gap-5">
        <HeartbeatIcon />
        <p className="text-[14px] font-bold text-[#1a2a3a]">
          Mengekstrak fitur citra ke server AI...
        </p>
        <p className="-mt-3 text-[10px] font-mono text-[#8a95a1]">{namaFile}</p>
        <p className="text-[12px] font-mono font-semibold text-[#0a5c4f]">
          {progress}% selesai
        </p>
        <div className="w-full">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#e3e8ee]">
            <div
              className="h-full bg-[#0a5c4f] transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 text-[10px] font-medium text-[#8a95a1]">
            <span className={stepAktif === "Preprocessing" ? "font-bold text-[#0a5c4f]" : ""}>
              Preprocessing
            </span>
            <span
              className={`text-center ${
                stepAktif === "Running inference" ? "font-bold text-[#0a5c4f]" : ""
              }`}
            >
              Running inference...
            </span>
            <span className={`text-right ${stepAktif === "Complete" ? "font-bold text-[#0a5c4f]" : ""}`}>
              Complete
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkspaceView({
  prediction,
  biradsAkhir,
  namaFile,
  gambarUrl,
  heatmapUrl,
  showKoreksiDropdown,
  onChangeBirads,
  onToggleKoreksi,
  onKoreksi,
  onValidasi,
}: {
  prediction: Prediction;
  biradsAkhir: string;
  namaFile: string;
  gambarUrl: string;
  heatmapUrl: string;
  showKoreksiDropdown: boolean;
  onChangeBirads: (value: string) => void;
  onToggleKoreksi: () => void;
  onKoreksi: (label: "Benign" | "Malignant") => void;
  onValidasi: () => void;
}) {
  const isMalignant = prediction.label === "Malignant";

  // Zoom, rotasi & geser (pan) untuk panel Citra Original
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const zoomIn = () => setScale((s) => Math.min(4, Math.round((s + 0.25) * 100) / 100));
  const zoomOut = () => setScale((s) => Math.max(0.5, Math.round((s - 0.25) * 100) / 100));
  const rotate = () => setRotation((r) => (r + 90) % 360);
  const resetView = () => {
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const mulaiDrag = (e: ReactMouseEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    setIsDragging(true);
  };
  const gerakDrag = (e: ReactMouseEvent) => {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.ox + (e.clientX - dragRef.current.x),
      y: dragRef.current.oy + (e.clientY - dragRef.current.y),
    });
  };
  const selesaiDrag = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  const transform = `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-[#1a8a59]" />
          <p className="text-[12px] font-semibold text-[#1a2a3a]">
            Workspace Analisis /{" "}
            <span className="font-mono text-[#0a5c4f]">{namaFile}</span>
          </p>
        </div>
        <p className="text-[10px] font-mono text-[#8a95a1]">
          {new Date().toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-4 overflow-hidden">
        <div className="flex min-h-0 flex-col rounded-[12px] border border-[#1f2640] bg-[#0a0e1a] shadow-lg overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-[#1f2640] px-4 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#cbd2e2]">
              CITRA ORIGINAL
            </span>
            <ImageToolbar
              zoomPercent={Math.round(scale * 100)}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onRotate={rotate}
              onReset={resetView}
            />
          </div>
          <div
            className={`min-h-0 flex-1 overflow-hidden bg-[#0a0e1a] ${
              gambarUrl ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
            }`}
            onMouseDown={gambarUrl ? mulaiDrag : undefined}
            onMouseMove={isDragging ? gerakDrag : undefined}
            onMouseUp={selesaiDrag}
            onMouseLeave={selesaiDrag}
          >
            {gambarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={gambarUrl}
                alt={`Citra mammogram ${namaFile}`}
                style={{ transform }}
                draggable={false}
                className={`h-full w-full select-none object-contain ${
                  isDragging ? "" : "transition-transform duration-150 ease-out"
                }`}
              />
            ) : (
              <ImageMock heatmap={false} />
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col rounded-[12px] border border-[#1f2640] bg-[#0a0e1a] shadow-lg overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-[#1f2640] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#cbd2e2]">
                GRAD-CAM HEATMAP
              </span>
              <span className="rounded-[4px] bg-[#ff3d2e] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-white">
                LIVE
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1.5 text-[#7e8aa8]">
                <span className="h-2 w-2 rounded-full bg-[#4a78ff]" /> Low
              </span>
              <span className="flex items-center gap-1.5 text-[#7e8aa8]">
                <span className="h-2 w-2 rounded-full bg-[#ffd23d]" /> Mid
              </span>
              <span className="flex items-center gap-1.5 text-[#7e8aa8]">
                <span className="h-2 w-2 rounded-full bg-[#ff3d2e]" /> High
              </span>
            </div>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden bg-[#0a0e1a]">
            {heatmapUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heatmapUrl}
                alt="Grad-CAM heatmap"
                className="h-full w-full object-contain"
              />
            ) : (
              <>
                <ImageMock heatmap />
                <p className="absolute inset-x-0 bottom-3 text-center text-[10px] font-medium text-[#7e8aa8]">
                  Grad-CAM belum tersedia (aktifkan model penuh)
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 rounded-[12px] border border-[#e0e6eb] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className={`rounded-[10px] border px-4 py-3 shadow-sm ${
              isMalignant
                ? "border-[#f4c0c8] bg-gradient-to-r from-[#fff1f3] to-[#ffe8eb]"
                : "border-[#c5e8d8] bg-gradient-to-r from-[#effaf5] to-[#e6f7f0]"
            }`}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#8a95a1]">
              PREDIKSI AI
            </p>
            <p
              className={`mt-1 font-mono text-[16px] font-bold ${
                isMalignant ? "text-[#e22a39]" : "text-[#0a8a59]"
              }`}
            >
              {prediction.label} {isMalignant ? "(Ganas)" : "(Jinak)"}
            </p>
            <p className="mt-0.5 font-mono text-[10px] font-semibold text-[#5a6672]">
              Confidence Score: {prediction.confidence.toFixed(2)}%
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#8a95a1]">
              KATEGORI BI-RADS AKHIR
            </span>
            <div className="relative">
              <select
                value={biradsAkhir}
                onChange={(event) => onChangeBirads(event.target.value)}
                className="h-10 min-w-[200px] appearance-none rounded-[8px] border-2 border-[#0a5c4f] bg-white pl-3 pr-9 text-[12px] font-bold text-[#1a2a3a] outline-none focus:border-[#087765]"
              >
                {opsiBirads.map((opsi) => (
                  <option key={opsi.value} value={opsi.value}>
                    {opsi.label}
                  </option>
                ))}
              </select>
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-[#0a5c4f]"
                aria-hidden="true"
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={onToggleKoreksi}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] border-2 border-[#cfd8df] bg-white px-4 text-[11px] font-bold text-[#5a6672] transition hover:bg-[#f8fafc]"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                <path
                  d="M14 3.5L16.5 6L7 15.5L4 16L4.5 13L14 3.5Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
              Koreksi Hasil AI
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-3 w-3"
                aria-hidden="true"
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            
            {showKoreksiDropdown ? (
              <div className="absolute bottom-full left-0 z-20 mb-2 w-48 rounded-[10px] border border-[#e0e6eb] bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => onKoreksi("Benign")}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-[11px] font-semibold text-[#1a2a3a] transition hover:bg-[#f0faf7]"
                >
                  <span className="h-2 w-2 rounded-full bg-[#0a8a59]" />
                  Benign (Jinak)
                </button>
                <div className="h-px bg-[#e0e6eb]" />
                <button
                  type="button"
                  onClick={() => onKoreksi("Malignant")}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-[11px] font-semibold text-[#1a2a3a] transition hover:bg-[#fff5f6]"
                >
                  <span className="h-2 w-2 rounded-full bg-[#e22a39]" />
                  Malignant (Ganas)
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onValidasi}
            className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#0a5c4f] px-5 text-[11px] font-bold text-white shadow-md transition hover:bg-[#087765]"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
              <path
                d="M4 10.5L8 14.5L16 6.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Validasi &amp; Simpan ke Riwayat
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BerandaDokterPage() {
  const router = useRouter();
  const session = useSyncExternalStore(
    subscribeSesiDemo,
    () => ambilSesiDemo(),
    () => null,
  );

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [namaFile, setNamaFile] = useState<string>("");
  const [gambarUrl, setGambarUrl] = useState<string>("");
  const [heatmapUrl, setHeatmapUrl] = useState<string>("");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [biradsAkhir, setBiradsAkhir] = useState<string>("4C");
  const [showKoreksiDropdown, setShowKoreksiDropdown] = useState(false);
  const [analisisId, setAnalisisId] = useState<string>("");
  const [statistik, setStatistik] = useState<Statistik>({
    analisis_hari_ini: 0,
    pending_validasi: 0,
    total_pasien: 0,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gambarUrlRef = useRef<string>("");

  const muatStatistik = async () => {
    try {
      const res = await fetch(`${URL_DASAR_API}/analisis/statistik`);
      const data = await res.json();
      if (data.data) {
        setStatistik(data.data as Statistik);
      }
    } catch {
      /* biarkan nilai lama jika gagal */
    }
  };

  useEffect(() => {
    if (session?.role === "dokter") {
      muatStatistik();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.role]);

  useEffect(() => {
    if (!session || session.role !== "dokter") {
      router.replace("/");
    }
  }, [session, router]);

  // Cleanup timer & object URL on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (gambarUrlRef.current) {
        URL.revokeObjectURL(gambarUrlRef.current);
      }
    };
  }, []);

  const aturGambarUrl = (url: string) => {
    if (gambarUrlRef.current) {
      URL.revokeObjectURL(gambarUrlRef.current);
    }
    gambarUrlRef.current = url;
    setGambarUrl(url);
  };

  const mulaiAnalisis = async (file: File) => {
    setNamaFile(file.name);
    aturGambarUrl(URL.createObjectURL(file));
    setProgress(0);
    setPhase("processing");
    
    // Upload ke backend dan dapatkan hasil AI REAL
    try {
      const formData = new FormData();
      formData.append("berkas", file);
      
      const response = await fetch(`${URL_DASAR_API}/analisis/unggah`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Gagal upload");
      }
      
      const data = await response.json();

      // Simpan id analisis (untuk persist validasi ke backend nanti)
      setAnalisisId(data.data?.id || "");

      // Ekstrak hasil AI
      const hasilAI = data.data?.analisis;

      if (hasilAI && hasilAI.model_status === "loaded" && hasilAI.label) {
        setPrediction({
          label: hasilAI.label as "Benign" | "Malignant",
          confidence: hasilAI.confidence_score ? hasilAI.confidence_score * 100 : parseFloat(hasilAI.confidence) || 0,
        });
        // Grad-CAM heatmap (prefix backend jika URL relatif dari local storage)
        const rawHeatmap: string = hasilAI.heatmap_url || "";
        setHeatmapUrl(
          rawHeatmap.startsWith("/") ? `${URL_DASAR_API}${rawHeatmap}` : rawHeatmap,
        );
      } else {
        // Bukan hasil "loaded": bedakan model belum aktif vs error inferensi
        setPrediction({
          label: "Benign",
          confidence: 0,
        });
        setHeatmapUrl("");
        if (hasilAI?.model_status === "error") {
          alert(
            `Analisis gagal diproses: ${hasilAI.error || hasilAI.pesan || "kesalahan pada model"}`,
          );
        } else {
          alert(
            "Model AI belum aktif. Silakan aktifkan model di halaman Manajemen Model AI.",
          );
        }
      }

    } catch (error) {
      console.error("Error analisis:", error);
      alert("Gagal melakukan analisis. Pastikan backend berjalan.");
      setPhase("idle");
      return;
    }
  };

  // Drive the simulated progress while in 'processing'.
  useEffect(() => {
    if (phase !== "processing") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setProgress((current) => {
        if (current >= 100) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // Pindah ke workspace setelah selesai
          queueMicrotask(() => setPhase("workspace"));
          return 100;
        }
        // Progress simulation
        const delta = current < 70 ? 8 : current < 90 ? 4 : 2;
        return Math.min(100, current + delta);
      });
    }, 150);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase]);
  
  const tanganiKoreksi = (koreksiLabel: "Benign" | "Malignant") => {
    // Update prediction dengan koreksi dokter
    const updatedPrediction: Prediction = {
      label: koreksiLabel,
      confidence: 100, // Koreksi manual = 100% confidence
    };
    
    // Simpan koreksi
    try {
      if (typeof window !== "undefined") {
        const koreksi = {
          namaFile,
          prediksiAsli: prediction,
          koreksiDokter: updatedPrediction,
          waktu: new Date().toISOString(),
        };
        const existing = window.localStorage.getItem("mammoguard-koreksi");
        const list = existing ? JSON.parse(existing) : [];
        list.unshift(koreksi);
        window.localStorage.setItem("mammoguard-koreksi", JSON.stringify(list));
      }
    } catch {
      /* abaikan jika storage tidak tersedia */
    }
    
    // Terapkan koreksi ke tampilan prediksi dan TETAP di workspace
    // (jangan reset), agar dokter bisa lanjut mengatur BI-RADS & validasi.
    setPrediction(updatedPrediction);
    setShowKoreksiDropdown(false);
  };

  const tanganiValidasi = async () => {
    // Persist validasi ke backend (menandai divalidasi + BI-RADS akhir)
    if (analisisId) {
      try {
        await fetch(`${URL_DASAR_API}/analisis/${analisisId}/validasi`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            birads: biradsAkhir,
            label_final: prediction?.label,
            dokter: session?.nama,
          }),
        });
        // Segarkan statistik (pending validasi berkurang)
        await muatStatistik();
      } catch (error) {
        console.error("Gagal menyimpan validasi:", error);
      }
    }

    setPhase("idle");
    setProgress(0);
    setNamaFile("");
    setAnalisisId("");
    aturGambarUrl("");
    setHeatmapUrl("");
  };

  const tanganiLogout = () => {
    hapusSesiDemo();
    router.push("/");
  };

  if (!session || session.role !== "dokter") {
    return null;
  }

  return (
    <main className="flex h-screen overflow-hidden bg-gradient-to-br from-[#f0f6fb] to-[#e6eef5] text-[#21303d]">
      <DokterSidebar session={session} onLogout={tanganiLogout} />

      <section className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden px-6 py-5">
        <header className="shrink-0">
          <h1 className="text-[20px] font-bold text-[#1a2a3a]">
            Analisis Mammogram Baru
          </h1>
          <p className="mt-1 text-[11px] font-medium text-[#6a7582]">
            Unggah citra mammogram untuk dianalisis oleh sistem AI
          </p>
        </header>

        {phase === "idle" ? (
          <>
            <div className="mt-5 grid shrink-0 grid-cols-3 gap-4">
              {statistikKlinik.map((stat, index) => {
                const Ikon = ikonStatistik[index];
                return (
                  <div
                    key={stat.label}
                    className={`flex items-center gap-4 rounded-[12px] bg-gradient-to-r ${stat.aksen} p-5 shadow-sm`}
                  >
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-[10px]"
                      style={{ backgroundColor: stat.iconBg, color: stat.iconColor }}
                    >
                      <Ikon />
                    </span>
                    <div>
                      <p className="font-mono text-[20px] font-bold text-[#1a2a3a]">
                        {statistik[stat.key]}
                      </p>
                      <p className="text-[11px] font-medium text-[#5a6672]">{stat.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex min-h-0 flex-1 items-center justify-center pb-4">
              <IdleView onPilihFile={mulaiAnalisis} />
            </div>
          </>
        ) : null}

        {phase === "processing" ? (
          <div className="mt-8 flex min-h-0 flex-1 items-center justify-center pb-4">
            <ProcessingView progress={progress} namaFile={namaFile} />
          </div>
        ) : null}

        {phase === "workspace" && prediction ? (
          <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden">
            <WorkspaceView
              prediction={prediction}
              biradsAkhir={biradsAkhir}
              namaFile={namaFile}
              gambarUrl={gambarUrl}
              heatmapUrl={heatmapUrl}
              showKoreksiDropdown={showKoreksiDropdown}
              onChangeBirads={setBiradsAkhir}
              onToggleKoreksi={() => setShowKoreksiDropdown(!showKoreksiDropdown)}
              onKoreksi={tanganiKoreksi}
              onValidasi={tanganiValidasi}
            />
          </div>
        ) : null}
      </section>
    </main>
  );
}