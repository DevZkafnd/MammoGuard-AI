export type DemoAccount = {
  id: string;
  nama: string;
  email: string;
  password: string;
  peran: string;
  role: "dokter" | "admin";
};

export const demoAccounts: DemoAccount[] = [
  {
    id: "dokter",
    nama: "Dr. Ayu Permata Sari",
    email: "dr.ayu@mammoguard.id",
    password: "dokter123",
    peran: "Dokter Spesialis",
    role: "dokter",
  },
  {
    id: "admin",
    nama: "Admin Sistem",
    email: "admin@mammoguard.id",
    password: "admin123",
    peran: "Admin IT",
    role: "admin",
  },
];
