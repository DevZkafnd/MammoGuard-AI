export type DemoAccount = {
  id: string;
  nama: string;
  email: string;
  password: string;
  peran: string;
};

export const demoAccounts: DemoAccount[] = [
  {
    id: "dokter",
    nama: "Dr. Ayu Permata Sari",
    email: "dr.ayu@mammoguard.id",
    password: "dokter123",
    peran: "Dokter Spesialis",
  },
  {
    id: "admin",
    nama: "Admin Sistem",
    email: "admin@mammoguard.id",
    password: "admin123",
    peran: "Admin IT",
  },
];
