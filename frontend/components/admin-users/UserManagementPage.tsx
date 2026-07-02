"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import {
  ambilSesiDemo,
  hapusSesiDemo,
  subscribeSesiDemo,
  type DemoSession,
} from "@/lib/demoAuth";
import AdminSidebar from "@/components/admin-users/AdminSidebar";

type UserStatus = "aktif" | "nonaktif";

type DoctorUser = {
  id: string;
  nama: string;
  spesialisasi: string;
  tanggalDibuat: string;
  status: UserStatus;
  email: string;
};

type FormTambahUser = {
  nama: string;
  email: string;
  password: string;
  konfirmasiPassword: string;
  spesialisasi: string;
  status: UserStatus;
};

type FormEditUser = {
  nama: string;
  spesialisasi: string;
  status: UserStatus;
};

const dataDokterAwal: DoctorUser[] = [
  {
    id: "dokter-1",
    nama: "Dr. Ayu Permata Sari, Sp.Rad",
    spesialisasi: "Radiologi",
    tanggalDibuat: "15 Jan 2025",
    status: "aktif",
    email: "dr.ayu@mediclinic.co.id",
  },
  {
    id: "dokter-2",
    nama: "Dr. Bambang Irawan, Sp.OnkRad",
    spesialisasi: "Onkologi Radiasi",
    tanggalDibuat: "12 Feb 2025",
    status: "aktif",
    email: "dr.bambang@mediclinic.co.id",
  },
  {
    id: "dokter-3",
    nama: "Dr. Citra Dewi, Sp.Rad",
    spesialisasi: "Radiologi",
    tanggalDibuat: "3 Mar 2025",
    status: "aktif",
    email: "dr.citra@mediclinic.co.id",
  },
  {
    id: "dokter-4",
    nama: "Dr. Dani Pratama, Sp.B-Onk",
    spesialisasi: "Bedah Onkologi",
    tanggalDibuat: "11 Apr 2025",
    status: "nonaktif",
    email: "dr.dani@mediclinic.co.id",
  },
  {
    id: "dokter-5",
    nama: "Dr. Eka Wahyuni, Sp.Rad",
    spesialisasi: "Radiologi",
    tanggalDibuat: "28 May 2025",
    status: "aktif",
    email: "dr.eka@mediclinic.co.id",
  },
];

const formTambahAwal: FormTambahUser = {
  nama: "",
  email: "",
  password: "",
  konfirmasiPassword: "",
  spesialisasi: "",
  status: "aktif",
};

function StatusBadge({ status }: { status: UserStatus }) {
  const isAktif = status === "aktif";

  return (
    <span
      className={`inline-flex min-w-[70px] items-center justify-center rounded-full px-4 py-2 text-[12px] font-bold ${
        isAktif
          ? "bg-gradient-to-r from-[#e4f7ef] to-[#d4f2e5] text-[#0a8a59] shadow-sm"
          : "bg-gradient-to-r from-[#f1f3f5] to-[#e8ebee] text-[#6a7582] shadow-sm"
      }`}
    >
      {isAktif ? "Aktif" : "Nonaktif"}
    </span>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#6a7582]">
        {label}
        {required ? <span className="text-[#e06873]"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-12 w-full rounded-[10px] border-2 border-[#e0e6eb] bg-white px-4 text-[14px] text-[#2a3949] outline-none placeholder:text-[#a0abb5] focus:border-[#0a5c4f] focus:shadow-md transition-all duration-200"
    />
  );
}

function StatusSelector({
  value,
  onChange,
}: {
  value: UserStatus;
  onChange: (value: UserStatus) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => onChange("aktif")}
        className={`h-12 rounded-[10px] border-2 text-[13px] font-bold transition-all duration-200 ${
          value === "aktif"
            ? "border-[#92e0c4] bg-gradient-to-r from-[#e9f8f2] to-[#d9f2e8] text-[#0a8a59] shadow-md"
            : "border-[#e0e6eb] bg-white text-[#6a7582] hover:shadow-sm"
        }`}
      >
        Aktif
      </button>
      <button
        type="button"
        onClick={() => onChange("nonaktif")}
        className={`h-12 rounded-[10px] border-2 text-[13px] font-bold transition-all duration-200 ${
          value === "nonaktif"
            ? "border-[#d0d6dc] bg-gradient-to-r from-[#f3f5f7] to-[#e8ebee] text-[#5a6672] shadow-md"
            : "border-[#e0e6eb] bg-white text-[#6a7582] hover:shadow-sm"
        }`}
      >
        Nonaktif
      </button>
    </div>
  );
}

function TambahDokterModal({
  form,
  errorMessage,
  onChange,
  onClose,
  onSubmit,
}: {
  form: FormTambahUser;
  errorMessage: string;
  onChange: <K extends keyof FormTambahUser>(field: K, value: FormTambahUser[K]) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-6">
      <div className="w-full max-w-[480px] rounded-[18px] bg-white p-6 shadow-[0_25px_80px_rgba(20,33,48,0.25)]">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[20px] font-bold text-[#1a2a3a]">
            Tambah Akun Dokter Baru
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[20px] leading-none text-[#8a95a1] hover:text-[#6a7582] transition-colors duration-200"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <FormField label="Nama Lengkap" required>
            <TextInput
              value={form.nama}
              onChange={(value) => onChange("nama", value)}
              placeholder="Dr. Nama Dokter, Sp.Rad"
            />
          </FormField>

          <FormField label="Email" required>
            <TextInput
              value={form.email}
              onChange={(value) => onChange("email", value)}
              placeholder="dokter@mediclinic.co.id"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Password" required>
              <TextInput
                value={form.password}
                onChange={(value) => onChange("password", value)}
                placeholder="Min. 8 karakter"
              />
            </FormField>

            <FormField label="Konfirmasi" required>
              <TextInput
                value={form.konfirmasiPassword}
                onChange={(value) => onChange("konfirmasiPassword", value)}
                placeholder="Ulangi password"
              />
            </FormField>
          </div>

          <FormField label="Spesialisasi" required>
            <TextInput
              value={form.spesialisasi}
              onChange={(value) => onChange("spesialisasi", value)}
              placeholder="Radiologi"
            />
          </FormField>

          <FormField label="Status">
            <StatusSelector
              value={form.status}
              onChange={(value) => onChange("status", value)}
            />
          </FormField>

          {errorMessage ? (
            <p className="text-[13px] font-bold text-[#e06873] pt-2">{errorMessage}</p>
          ) : null}

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-12 rounded-[10px] border-2 border-[#e0e6eb] bg-white text-[14px] font-bold text-[#6a7582] hover:bg-[#f8fafc] hover:shadow-sm transition-all duration-200"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="h-12 rounded-[10px] bg-gradient-to-r from-[#8aa6a0] to-[#0a5c4f] text-[14px] font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
            >
              Buat Akun
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditDokterModal({
  form,
  onChange,
  onClose,
  onSubmit,
}: {
  form: FormEditUser;
  onChange: <K extends keyof FormEditUser>(field: K, value: FormEditUser[K]) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-6">
      <div className="w-full max-w-[480px] rounded-[18px] bg-white p-6 shadow-[0_25px_80px_rgba(20,33,48,0.25)]">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[20px] font-bold text-[#1a2a3a]">Edit Akun Dokter</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[20px] leading-none text-[#8a95a1] hover:text-[#6a7582] transition-colors duration-200"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <FormField label="Nama Lengkap" required>
            <TextInput
              value={form.nama}
              onChange={(value) => onChange("nama", value)}
              placeholder="Nama dokter"
            />
          </FormField>

          <FormField label="Spesialisasi" required>
            <TextInput
              value={form.spesialisasi}
              onChange={(value) => onChange("spesialisasi", value)}
              placeholder="Radiologi"
            />
          </FormField>

          <FormField label="Status">
            <StatusSelector
              value={form.status}
              onChange={(value) => onChange("status", value)}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-12 rounded-[10px] border-2 border-[#e0e6eb] bg-white text-[14px] font-bold text-[#6a7582] hover:bg-[#f8fafc] hover:shadow-sm transition-all duration-200"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="h-12 rounded-[10px] bg-gradient-to-r from-[#00473f] to-[#0a5c4f] text-[14px] font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
            >
              Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  const router = useRouter();
  const session = useSyncExternalStore(
    subscribeSesiDemo,
    () => ambilSesiDemo(),
    () => null,
  );
  const [kataKunci, setKataKunci] = useState("");
  const [dataDokter, setDataDokter] = useState(dataDokterAwal);
  const [isTambahOpen, setIsTambahOpen] = useState(false);
  const [dokterSedangEdit, setDokterSedangEdit] = useState<DoctorUser | null>(null);
  const [formTambah, setFormTambah] = useState<FormTambahUser>(formTambahAwal);
  const [formEdit, setFormEdit] = useState<FormEditUser>({
    nama: "",
    spesialisasi: "",
    status: "aktif",
  });
  const [errorTambah, setErrorTambah] = useState("");

  useEffect(() => {
    if (!session || session.role !== "admin") {
      router.replace("/");
    }
  }, [session, router]);

  const dataTersaring = useMemo(() => {
    const keyword = kataKunci.trim().toLowerCase();

    if (!keyword) {
      return dataDokter;
    }

    return dataDokter.filter((item) =>
      [item.nama, item.spesialisasi, item.email].some((value) =>
        value.toLowerCase().includes(keyword),
      ),
    );
  }, [kataKunci, dataDokter]);

  const bukaTambahModal = () => {
    setFormTambah(formTambahAwal);
    setErrorTambah("");
    setIsTambahOpen(true);
  };

  const tutupTambahModal = () => {
    setIsTambahOpen(false);
    setErrorTambah("");
  };

  const bukaEditModal = (dokter: DoctorUser) => {
    setDokterSedangEdit(dokter);
    setFormEdit({
      nama: dokter.nama,
      spesialisasi: dokter.spesialisasi,
      status: dokter.status,
    });
  };

  const tutupEditModal = () => {
    setDokterSedangEdit(null);
  };

  const tanganiTambahDokter = () => {
    if (
      !formTambah.nama ||
      !formTambah.email ||
      !formTambah.password ||
      !formTambah.konfirmasiPassword ||
      !formTambah.spesialisasi
    ) {
      setErrorTambah("Semua field wajib diisi.");
      return;
    }

    if (formTambah.password.length < 8) {
      setErrorTambah("Password minimal 8 karakter.");
      return;
    }

    if (formTambah.password !== formTambah.konfirmasiPassword) {
      setErrorTambah("Konfirmasi password belum sesuai.");
      return;
    }

    setDataDokter((current) => [
      {
        id: `dokter-${current.length + 1}-${Date.now()}`,
        nama: formTambah.nama,
        email: formTambah.email,
        spesialisasi: formTambah.spesialisasi,
        tanggalDibuat: new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        status: formTambah.status,
      },
      ...current,
    ]);

    tutupTambahModal();
  };

  const tanganiSimpanEdit = () => {
    if (!dokterSedangEdit) {
      return;
    }

    setDataDokter((current) =>
      current.map((item) =>
        item.id === dokterSedangEdit.id
          ? {
              ...item,
              nama: formEdit.nama,
              spesialisasi: formEdit.spesialisasi,
              status: formEdit.status,
            }
          : item,
      ),
    );

    tutupEditModal();
  };

  const tanganiHapus = (id: string) => {
    setDataDokter((current) => current.filter((item) => item.id !== id));
  };

  const tanganiLogout = () => {
    hapusSesiDemo();
    router.push("/");
  };

  if (!session || session.role !== "admin") {
    return null;
  }

  return (
    <main className="flex h-screen overflow-hidden bg-gradient-to-br from-[#f8fbff] to-[#f0f7ff] text-[#21303d]">
      <AdminSidebar session={session} onLogout={tanganiLogout} />

      <section className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden px-6 py-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-[20px] font-bold text-[#1a2a3a]">
              Manajemen Akun Dokter
            </h1>
            <p className="mt-2 text-[12px] text-[#6a7582] font-medium">
              {dataDokter.length} akun dokter terdaftar
            </p>
          </div>

          <button
            type="button"
            onClick={bukaTambahModal}
            className="inline-flex h-10 items-center gap-3 rounded-[10px] bg-gradient-to-r from-[#00473f] to-[#0a5c4f] px-5 text-[13px] font-bold text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
          >
            <span className="text-[16px] leading-none">+</span>
            Tambah Akun Dokter Baru
          </button>
        </div>

        <div className="mt-5 shrink-0">
          <input
            value={kataKunci}
            onChange={(event) => setKataKunci(event.target.value)}
            placeholder="Cari nama dokter atau spesialisasi..."
            className="h-10 w-full max-w-[280px] rounded-[10px] border-2 border-[#e0e6eb] bg-white px-4 text-[13px] text-[#24323f] outline-none placeholder:text-[#a0abb5] focus:border-[#0a5c4f] focus:shadow-md transition-all duration-200"
          />
        </div>

        <div className="mt-5 min-h-0 flex-1 overflow-hidden rounded-[12px] border border-[#e0e6eb] bg-white shadow-lg">
          <table className="w-full border-collapse">
            <thead className="bg-gradient-to-r from-[#f8fafc] to-[#f0f5f9]">
              <tr className="border-b border-[#e8edf1] text-left">
                <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6a7582]">
                  Nama Dokter
                </th>
                <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6a7582]">
                  Spesialisasi
                </th>
                <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6a7582]">
                  Tanggal Dibuat
                </th>
                <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6a7582]">
                  Status
                </th>
                <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6a7582]">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {dataTersaring.map((dokter) => (
                <tr key={dokter.id} className="border-b border-[#edf1f4] transition-colors duration-150 last:border-b-0 hover:bg-[#f8fafc]">
                  <td className="px-5 py-3.5 text-[14px] font-semibold text-[#2a3947]">
                    {dokter.nama}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] font-medium text-[#5a6672]">
                    {dokter.spesialisasi}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] font-medium text-[#5a6672]">
                    {dokter.tanggalDibuat}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={dokter.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => bukaEditModal(dokter)}
                        className="rounded-[8px] border-2 border-[#93e0c2] bg-gradient-to-r from-[#effaf5] to-[#e6f7f0] px-4 py-2 text-[12px] font-bold text-[#0a8a59] transition-all duration-200 hover:scale-[1.03] hover:shadow-md"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => tanganiHapus(dokter.id)}
                        className="rounded-[8px] border-2 border-[#f3d5da] bg-gradient-to-r from-[#fff1f3] to-[#ffe8eb] px-4 py-2 text-[12px] font-bold text-[#e06873] transition-all duration-200 hover:scale-[1.03] hover:shadow-md"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {dataTersaring.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-[14px] text-[#8a95a1] font-medium"
                  >
                    Tidak ada data dokter yang sesuai pencarian.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {isTambahOpen ? (
        <TambahDokterModal
          form={formTambah}
          errorMessage={errorTambah}
          onChange={(field, value) =>
            setFormTambah((current) => ({ ...current, [field]: value }))
          }
          onClose={tutupTambahModal}
          onSubmit={tanganiTambahDokter}
        />
      ) : null}

      {dokterSedangEdit ? (
        <EditDokterModal
          form={formEdit}
          onChange={(field, value) =>
            setFormEdit((current) => ({ ...current, [field]: value }))
          }
          onClose={tutupEditModal}
          onSubmit={tanganiSimpanEdit}
        />
      ) : null}
    </main>
  );
}
