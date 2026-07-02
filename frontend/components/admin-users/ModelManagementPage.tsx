"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import AdminSidebar from "@/components/admin-users/AdminSidebar";
import {
  ambilSesiDemo,
  hapusSesiDemo,
  subscribeSesiDemo,
} from "@/lib/demoAuth";

type AIModel = {
  id: string;
  nama: string;
  arsitektur: string;
  tanggal: string;
  fileName: string;
  ukuran: string;
  akurasi: string;
  aktif: boolean;
  sedangDigunakan: boolean;
};

type UploadForm = {
  fileName: string;
  modelId: string;
  arsitektur: string;
  namaTampilan: string;
  akurasi: string;
  catatan: string;
};

const dataModelAwal: AIModel[] = [
  {
    id: "resnet50-v1",
    nama: "ResNet50 V1",
    arsitektur: "ResNet50",
    tanggal: "2 Jan 2025",
    fileName: "ResNet50_V1.pth",
    ukuran: "54.4 MB",
    akurasi: "87.4%",
    aktif: false,
    sedangDigunakan: false,
  },
  {
    id: "resnet50-v2-high-acc",
    nama: "ResNet50 V2 High Acc",
    arsitektur: "ResNet50",
    tanggal: "5 Mar 2025",
    fileName: "ResNet50_V2_High_Acc.pth",
    ukuran: "94.6 MB",
    akurasi: "89.8%",
    aktif: true,
    sedangDigunakan: true,
  },
  {
    id: "densenet121-v1",
    nama: "DenseNet121 V1",
    arsitektur: "DenseNet121",
    tanggal: "19 Apr 2025",
    fileName: "DenseNet121_V1.pth",
    ukuran: "29.7 MB",
    akurasi: "91.2%",
    aktif: false,
    sedangDigunakan: false,
  },
  {
    id: "efficientnet-b4-beta",
    nama: "EfficientNet B4 (Beta)",
    arsitektur: "EfficientNet-B4",
    tanggal: "7 Jun 2025",
    fileName: "EfficientNet_B4.pth",
    ukuran: "74.3 MB",
    akurasi: "90.1%",
    aktif: false,
    sedangDigunakan: false,
  },
];

const uploadAwal: UploadForm = {
  fileName: "",
  modelId: "ResNet50_V3",
  arsitektur: "ResNet",
  namaTampilan: "ResNet50 V3 Improved",
  akurasi: "92.5",
  catatan: "Misalnya dilatih dengan augmentasi CLAHE, dataset 4.200 gambar.",
};

function FileIcon({ active }: { active?: boolean }) {
  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-[9px] border ${
        active
          ? "border-[#8de8d5] bg-[#dff8f2] text-[#0a5c4f]"
          : "border-[#e2e8ee] bg-[#f7f9fb] text-[#94a0ab]"
      }`}
    >
      <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
        <path
          d="M6.25 3.75H11.25L14.5833 7.08333V15.4167C14.5833 15.8769 14.2102 16.25 13.75 16.25H6.25C5.78976 16.25 5.41667 15.8769 5.41667 15.4167V4.58333C5.41667 4.1231 5.78976 3.75 6.25 3.75Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M11.25 3.75V7.08333H14.5833" stroke="currentColor" strokeWidth="1.3" />
        <path d="M7.91667 10H12.0833" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M7.91667 12.5H11.25" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-[#8da0b1]" aria-hidden="true">
      <circle cx="10" cy="10" r="6.25" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10 8V12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="10" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  );
}

function ToggleSwitch({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-5 w-10 rounded-full transition ${
        active ? "bg-[#14bf85]" : "bg-[#cfd7df]"
      }`}
      aria-label={active ? "Nonaktifkan model" : "Aktifkan model"}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
          active ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-6.5 items-center justify-center rounded-full border border-[#dce8e4] bg-white px-3 text-[10px] font-semibold text-[#6b7b88] transition hover:border-[#b8d7ce] hover:bg-[#f8fffd]"
    >
      {children}
    </button>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-6.5 w-6.5 items-center justify-center rounded-full border border-[#f4d8dd] bg-[#fff3f5] text-[#f0747d] transition hover:bg-[#ffecef]"
      aria-label="Hapus model"
    >
      <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3" aria-hidden="true">
        <path d="M6 6L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M14 6L6 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[9.5px] font-medium text-[#8d9aa8]">
      <span className="h-1 w-1 rounded-full bg-[#c6d0da]" />
      {children}
    </span>
  );
}

function UploadModelModal({
  form,
  errorMessage,
  onClose,
  onSubmit,
  onChange,
}: {
  form: UploadForm;
  errorMessage: string;
  onClose: () => void;
  onSubmit: () => void;
  onChange: <K extends keyof UploadForm>(field: K, value: UploadForm[K]) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-6">
      <div className="w-full max-w-[450px] rounded-[18px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between border-b border-[#edf2f7] px-5 py-4">
          <div className="flex items-center gap-2">
            <FileIcon active />
            <h2 className="text-[16px] font-bold text-[#233240]">Upload Model AI Baru</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[18px] text-[#97a4b1] transition hover:text-[#6a7582]"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7e8d9b]">
              File Model `.pth`
            </p>
            <button
              type="button"
              onClick={() => onChange("fileName", "resnet50_v3_improved.pth")}
              className="flex w-full items-start gap-3 rounded-[12px] border border-[#e3ebf0] bg-[#fbfcfd] px-4 py-3 text-left transition hover:border-[#c7dad3]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#edf5f2] text-[#6e8191]">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M10 4.16667V12.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M6.66667 7.5L10 4.16667L13.3333 7.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4.16667 15H15.8333"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold text-[#233240]">
                  {form.fileName || "Klik atau seret file .pth ke sini"}
                </span>
                <span className="mt-0.5 block text-[10px] text-[#8d9aa8]">
                  Maks. 1 file dan ekstensi `.pth` untuk model klasifikasi.
                </span>
              </span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7e8d9b]">
                Model ID
              </span>
              <input
                value={form.modelId}
                onChange={(event) => onChange("modelId", event.target.value)}
                className="h-10 w-full rounded-[10px] border border-[#e2e8ee] bg-[#f9fbfc] px-3 text-[12px] text-[#263442] outline-none focus:border-[#90d5c3]"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7e8d9b]">
                Arsitektur
              </span>
              <input
                value={form.arsitektur}
                onChange={(event) => onChange("arsitektur", event.target.value)}
                className="h-10 w-full rounded-[10px] border border-[#e2e8ee] bg-[#f9fbfc] px-3 text-[12px] text-[#263442] outline-none focus:border-[#90d5c3]"
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7e8d9b]">
              Nama Tampilan
            </span>
            <input
              value={form.namaTampilan}
              onChange={(event) => onChange("namaTampilan", event.target.value)}
              className="h-10 w-full rounded-[10px] border border-[#e2e8ee] bg-[#f9fbfc] px-3 text-[12px] text-[#263442] outline-none focus:border-[#90d5c3]"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7e8d9b]">
              Akurasi Validasi (%)
            </span>
            <input
              value={form.akurasi}
              onChange={(event) => onChange("akurasi", event.target.value)}
              className="h-10 w-full rounded-[10px] border border-[#e2e8ee] bg-[#f9fbfc] px-3 text-[12px] text-[#263442] outline-none focus:border-[#90d5c3]"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7e8d9b]">
              Catatan Opsional
            </span>
            <textarea
              value={form.catatan}
              onChange={(event) => onChange("catatan", event.target.value)}
              className="min-h-[76px] w-full rounded-[10px] border border-[#e2e8ee] bg-[#f9fbfc] px-3 py-2.5 text-[12px] text-[#263442] outline-none focus:border-[#90d5c3]"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-[10px] bg-[#fff2f4] px-3 py-2 text-[11px] font-semibold text-[#df5d70]">
              {errorMessage}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-[10px] border border-[#e2e8ee] bg-white text-[12px] font-semibold text-[#72808d] transition hover:bg-[#f8fafc]"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="h-10 rounded-[10px] bg-[#89a79f] text-[12px] font-semibold text-white transition hover:bg-[#6f9288]"
            >
              Upload Model
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteModelModal({
  model,
  onClose,
  onConfirm,
}: {
  model: AIModel;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-6">
      <div className="w-full max-w-[340px] rounded-[18px] bg-white px-5 py-6 text-center shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#fff1f3] text-[#f16a76]">
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
            <path
              d="M10 6.25V10.4167"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <circle cx="10" cy="13.3333" r="0.9" fill="currentColor" />
            <path
              d="M8.55662 3.57086L3.18162 12.7375C2.79713 13.3931 3.27013 14.1667 4.06298 14.1667H14.813C15.6058 14.1667 16.0788 13.3931 15.6943 12.7375L10.3193 3.57086C9.92389 2.89653 8.95205 2.89653 8.55662 3.57086Z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 className="mt-3 text-[16px] font-bold text-[#24313f]">Hapus Model AI?</h2>
        <p className="mt-1 text-[12px] font-medium text-[#6f7d89]">{model.nama}</p>

        <div className="mt-2 text-[11px] text-[#82909e]">
          Arsitektur: {model.arsitektur} | Akurasi: {model.akurasi} | {model.ukuran}
        </div>

        <p className="mt-3 rounded-[10px] bg-[#fff3f5] px-3 py-2 text-[11px] font-medium text-[#e16875]">
          File yang dihapus tidak bisa dikembalikan dan versi ini tidak dapat dipakai lagi.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-[10px] border border-[#e2e8ee] bg-white text-[12px] font-semibold text-[#72808d] transition hover:bg-[#f8fafc]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-10 rounded-[10px] bg-[#ff404b] text-[12px] font-semibold text-white transition hover:bg-[#ec2d39]"
          >
            Ya, hapus
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ModelManagementPage() {
  const router = useRouter();
  const session = useSyncExternalStore(subscribeSesiDemo, () => ambilSesiDemo(), () => null);
  const [models, setModels] = useState(dataModelAwal);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState(uploadAwal);
  const [uploadError, setUploadError] = useState("");
  const [modelHapus, setModelHapus] = useState<AIModel | null>(null);
  const [modelDetail, setModelDetail] = useState<AIModel | null>(null);

  useEffect(() => {
    if (!session || session.role !== "admin") {
      router.replace("/");
    }
  }, [session, router]);

  const modelAktif = useMemo(
    () => models.find((model) => model.sedangDigunakan) ?? null,
    [models],
  );

  const tanganiLogout = () => {
    hapusSesiDemo();
    router.push("/");
  };

  const tanganiToggleModel = (id: string) => {
    setModels((current) =>
      current.map((model) =>
        model.id === id
          ? { ...model, aktif: !model.aktif, sedangDigunakan: !model.aktif }
          : { ...model, aktif: false, sedangDigunakan: false },
      ),
    );
  };

  const tanganiBukaUpload = () => {
    setUploadForm(uploadAwal);
    setUploadError("");
    setIsUploadOpen(true);
  };

  const tanganiSimpanUpload = () => {
    if (!uploadForm.fileName || !uploadForm.modelId || !uploadForm.arsitektur) {
      setUploadError("File model, model ID, dan arsitektur wajib diisi.");
      return;
    }

    setModels((current) => [
      {
        id: `${uploadForm.modelId.toLowerCase()}-${Date.now()}`,
        nama: uploadForm.namaTampilan || uploadForm.modelId,
        arsitektur: uploadForm.arsitektur,
        tanggal: new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        fileName: uploadForm.fileName,
        ukuran: "64.8 MB",
        akurasi: `${uploadForm.akurasi}%`,
        aktif: false,
        sedangDigunakan: false,
      },
      ...current,
    ]);

    setIsUploadOpen(false);
  };

  const tanganiKonfirmasiHapus = () => {
    if (!modelHapus) {
      return;
    }

    setModels((current) => current.filter((model) => model.id !== modelHapus.id));
    setModelHapus(null);
  };

  if (!session || session.role !== "admin") {
    return null;
  }

  return (
    <main className="flex h-screen overflow-hidden bg-[#f4f7fa] text-[#21303d]">
      <AdminSidebar session={session} onLogout={tanganiLogout} />

      <section className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden px-5 py-4">
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div>
            <h1 className="text-[19px] font-bold text-[#243240]">Manajemen Model AI</h1>
            <p className="mt-0.5 text-[10.5px] font-medium text-[#8a97a4]">
              Kelola dan aktifkan model inferensi mammogram
            </p>
          </div>

          <button
            type="button"
            onClick={tanganiBukaUpload}
            className="inline-flex h-8 items-center gap-2 rounded-[8px] bg-[#00473f] px-3.5 text-[10.5px] font-semibold text-white shadow-sm transition hover:bg-[#02574b]"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M10 5V12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path
                d="M7.5 7.5L10 5L12.5 7.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5 15H15"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            Upload Model (`.pth`) Baru
          </button>
        </div>

        <div className="mt-3 shrink-0 rounded-[10px] border border-[#b7eee0] bg-[#ecfbf6] px-4 py-2.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#00473f] text-white">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M6.25 4.58333H11.25L13.75 7.08333V14.5833C13.75 15.0436 13.3769 15.4167 12.9167 15.4167H6.25C5.78976 15.4167 5.41667 15.0436 5.41667 14.5833V5.41667C5.41667 4.95643 5.78976 4.58333 6.25 4.58333Z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M11.25 4.58333V7.08333H13.75"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#3ba588]">
                  Model Aktif Sekarang
                </p>
                <p className="text-[13px] font-bold text-[#1e2f3d]">
                  {modelAktif?.nama ?? "Belum ada model aktif"}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold text-[#4b6171]">
                  {modelAktif?.arsitektur ?? "-"} • Akurasi {modelAktif?.akurasi ?? "-"}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-2 text-[10px] font-semibold text-[#42b57f]">
              <span className="h-2 w-2 rounded-full bg-[#42d58a]" />
              Online
            </span>
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-hidden">
          {models.map((model) => (
            <div
              key={model.id}
              className={`rounded-[10px] border bg-white px-3 py-2.5 shadow-sm ${
                model.sedangDigunakan
                  ? "border-[#8de8d5] ring-1 ring-[#b8f0e2]"
                  : "border-[#e6ebef]"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <FileIcon active={model.sedangDigunakan} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[10.5px] font-bold text-[#22323f]">{model.nama}</p>
                      {model.sedangDigunakan ? (
                        <span className="rounded-full bg-[#d8f8ee] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-[#2da87c]">
                          Sedang Digunakan
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <MetaChip>Akurasi {model.akurasi}</MetaChip>
                      <MetaChip>{model.arsitektur}</MetaChip>
                      <MetaChip>{model.tanggal}</MetaChip>
                      <MetaChip>{model.fileName}</MetaChip>
                      <MetaChip>{model.ukuran}</MetaChip>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                  <SecondaryButton onClick={() => setModelDetail(model)}>Detail</SecondaryButton>
                  <span
                    className={`text-[9.5px] font-semibold ${
                      model.aktif ? "text-[#20a874]" : "text-[#9aa7b4]"
                    }`}
                  >
                    {model.aktif ? "Aktif" : "Nonaktif"}
                  </span>
                  <ToggleSwitch active={model.aktif} onClick={() => tanganiToggleModel(model.id)} />
                  <DeleteButton onClick={() => setModelHapus(model)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 shrink-0 flex items-center gap-2 text-[9.5px] font-medium text-[#8a97a4]">
          <InfoIcon />
          Mengganti model baru akan otomatis menonaktifkan model yang sedang berjalan.
          Pemakaian terakhir disimpan untuk audit inferensi.
        </div>
      </section>

      {isUploadOpen ? (
        <UploadModelModal
          form={uploadForm}
          errorMessage={uploadError}
          onClose={() => setIsUploadOpen(false)}
          onSubmit={tanganiSimpanUpload}
          onChange={(field, value) =>
            setUploadForm((current) => ({ ...current, [field]: value }))
          }
        />
      ) : null}

      {modelHapus ? (
        <DeleteModelModal
          model={modelHapus}
          onClose={() => setModelHapus(null)}
          onConfirm={tanganiKonfirmasiHapus}
        />
      ) : null}

      {modelDetail ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-[420px] rounded-[18px] bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[16px] font-bold text-[#22323f]">{modelDetail.nama}</p>
                <p className="mt-1 text-[11px] font-medium text-[#8a97a4]">
                  {modelDetail.fileName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModelDetail(null)}
                className="text-[18px] text-[#97a4b1] transition hover:text-[#6a7582]"
              >
                ×
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[12px] bg-[#f7fafc] px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#90a0ae]">
                  Arsitektur
                </p>
                <p className="mt-1 text-[13px] font-semibold text-[#22323f]">
                  {modelDetail.arsitektur}
                </p>
              </div>
              <div className="rounded-[12px] bg-[#f7fafc] px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#90a0ae]">
                  Akurasi
                </p>
                <p className="mt-1 text-[13px] font-semibold text-[#22323f]">
                  {modelDetail.akurasi}
                </p>
              </div>
              <div className="rounded-[12px] bg-[#f7fafc] px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#90a0ae]">
                  Tanggal
                </p>
                <p className="mt-1 text-[13px] font-semibold text-[#22323f]">
                  {modelDetail.tanggal}
                </p>
              </div>
              <div className="rounded-[12px] bg-[#f7fafc] px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#90a0ae]">
                  Ukuran File
                </p>
                <p className="mt-1 text-[13px] font-semibold text-[#22323f]">
                  {modelDetail.ukuran}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModelDetail(null)}
              className="mt-4 h-10 w-full rounded-[10px] border border-[#e2e8ee] bg-white text-[12px] font-semibold text-[#72808d] transition hover:bg-[#f8fafc]"
            >
              Tutup
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
