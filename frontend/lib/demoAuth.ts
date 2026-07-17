import type { DemoAccount } from "@/components/login/data";

const SESSION_KEY = "mammoguard-demo-session";
const TOKEN_KEY = "mammoguard-token";
const LAST_PAGE_KEY = "mammoguard-last-page";
const SESSION_TIMEOUT_KEY = "mammoguard-session-timeout";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 menit
let cachedSessionRaw: string | null | undefined;
let cachedSessionParsed: DemoSession | null = null;

export type DemoSession = Pick<
  DemoAccount,
  "id" | "nama" | "email" | "peran" | "role"
>;

export function buatSesiDemo(account: DemoAccount): DemoSession {
  return {
    id: account.id,
    nama: account.nama,
    email: account.email,
    peran: account.peran,
    role: account.role,
  };
}

export function simpanSesiDemo(session: DemoSession, token?: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.localStorage.setItem(SESSION_TIMEOUT_KEY, (Date.now() + SESSION_TIMEOUT_MS).toString());
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

export function ambilToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

export function ambilSesiDemo(): DemoSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const sessionRaw = window.localStorage.getItem(SESSION_KEY);
  const timeoutRaw = window.localStorage.getItem(SESSION_TIMEOUT_KEY);

  if (!sessionRaw || !timeoutRaw) {
    cachedSessionRaw = null;
    cachedSessionParsed = null;
    return null;
  }

  // Cek apakah session sudah expired
  const timeout = parseInt(timeoutRaw, 10);
  if (Date.now() > timeout) {
    hapusSesiDemo();
    cachedSessionRaw = null;
    cachedSessionParsed = null;
    return null;
  }

  if (sessionRaw === cachedSessionRaw) {
    return cachedSessionParsed;
  }

  try {
    cachedSessionRaw = sessionRaw;
    cachedSessionParsed = JSON.parse(sessionRaw) as DemoSession;
    return cachedSessionParsed;
  } catch {
    cachedSessionRaw = sessionRaw;
    cachedSessionParsed = null;
    return null;
  }
}

export function hapusSesiDemo() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(LAST_PAGE_KEY);
  window.localStorage.removeItem(SESSION_TIMEOUT_KEY);
}

export function simpanHalamanTerakhir(path: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LAST_PAGE_KEY, path);
}

export function ambilHalamanTerakhir(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(LAST_PAGE_KEY);
}

export function perbaruiSessionTimeout() {
  if (typeof window === "undefined") {
    return;
  }

  const sessionRaw = window.localStorage.getItem(SESSION_KEY);
  if (sessionRaw) {
    window.localStorage.setItem(SESSION_TIMEOUT_KEY, (Date.now() + SESSION_TIMEOUT_MS).toString());
  }
}

export function subscribeSesiDemo(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === SESSION_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}
