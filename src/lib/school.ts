const SCHOOL_KEY = "kas-sekolah.school";

export interface SchoolProfile {
 name: string;
 logoUrl?: string;
 email?: string;
 address?: string;
 phone?: string;
 /** Single active class of the school cash system. */
 className?: string;
 /** Academic year, e.g. "2026/2027". */
 academicYear?: string;
 /** Default nominal tagihan baru (rupiah). */
 defaultAmount?: number;
 /** Default jatuh tempo tagihan baru (hari). */
 defaultDueDays?: number;
 /** Template nomor invoice, mis. INV-{YEAR}-{SEQ}. */
 invoiceFormat?: string;
 /** Dibawa dari API; dipakai sebagai key remount form. */
 updatedAt?: string;
}

export const DEFAULT_SCHOOL: SchoolProfile = {
 name: "SMP Negeri 17 Tangerang Selatan",
 address: "Jl. Pamulang Permai I, Pamulang, Tangerang Selatan, Banten",
 className: "Regular",
 academicYear: "2026/2027",
};

// Fakta resmi SMP Negeri 17 Tangsel (Wikipedia/website sekolah).
export const SCHOOL_FACTS = {
 motto: "PENCETAK SANG JUARA",
 accreditation: "A",
 website: "smpn17tangsel.sch.id",
 principal: "Drs. AA Suprayogi, M.Pd",
 programs: ["Regular", "Bilingual", "Olahraga"],
 kelasRentang: "VII – IX",
 kurikulum: "Kurikulum Merdeka",
} as const;

export type SchoolProfilePatch = Omit<Partial<SchoolProfile>, "logoUrl"> & {
 logoUrl?: string | null;
};

export function getActiveClassName(): string {
 return getSchoolProfile().className ?? DEFAULT_SCHOOL.className ?? "";
}

export function getActiveAcademicYear(): string {
 return getSchoolProfile().academicYear ?? DEFAULT_SCHOOL.academicYear ?? "";
}

type Listener = () => void;

const listeners = new Set<Listener>();

// Snapshot cache so useSyncExternalStore sees a stable reference.
let cachedRaw: string | null | undefined;
let cachedValue: SchoolProfile | undefined;

export function subscribeSchool(listener: Listener): () => void {
 listeners.add(listener);
 return () => {
 listeners.delete(listener);
 };
}

function notify(): void {
 listeners.forEach((listener) => listener());
}

export function getSchoolProfile(): SchoolProfile {
 if (typeof window === "undefined") return DEFAULT_SCHOOL;

 const raw = window.localStorage.getItem(SCHOOL_KEY);
 if (raw === cachedRaw) {
 return cachedValue ?? DEFAULT_SCHOOL;
 }
 cachedRaw = raw;

 let parsed: SchoolProfile = DEFAULT_SCHOOL;
 try {
 if (raw) {
 parsed = { ...DEFAULT_SCHOOL, ...(JSON.parse(raw) as Partial<SchoolProfile>) };
 }
 } catch {
 cachedValue = DEFAULT_SCHOOL;
 return DEFAULT_SCHOOL;
 }
 cachedValue = parsed;
 return parsed;
}

export function setSchoolProfile(partial: SchoolProfilePatch): void {
 if (typeof window === "undefined") return;
 const next = { ...getSchoolProfile(), ...partial };
 if (partial.logoUrl === null) delete next.logoUrl;
 window.localStorage.setItem(SCHOOL_KEY, JSON.stringify(next));
 cachedRaw = undefined;
 cachedValue = undefined;
 notify();
}

// Simpan lokal + persist ke API. Dipakai dari UI; hydration memakai
// setSchoolProfile agar tidak memicu PATCH saat sinkronisasi awal.
/**
 * Simpan profil sekolah: optimistic di store lokal, lalu persist ke API.
 *
 * Kembalikan promise yang menolak saat persist gagal. Sebelumnya fire-and-forget
 * dengan `.catch(() => {})`, jadi UI selalu menampilkan "Tersimpan" walaupun
 * server menolak — perubahan hilang saat reload.
 */
export function updateSchoolProfile(partial: SchoolProfilePatch): Promise<void> {
  setSchoolProfile(partial);
  if (typeof window === "undefined") return Promise.resolve();
  return fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(partial),
  }).then(async (res) => {
    if (!res.ok) throw new Error(`Gagal menyimpan profil sekolah (${res.status})`);
  });
}