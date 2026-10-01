import type { Student } from "@/types";
import {
 getAllStudents,
 getStudentById,
 subscribeStudents,
} from "@/mock/students";

// Akun login siswa kini diturunkan dari record students (kolom userId), bukan
// disimpan terpisah. Pembuatan/reset akun lewat API; store diisi oleh siswa tsb.
export interface StudentAccount {
 studentId: string;
 userId: string;
 password: string;
 updatedAt: string;
}

export function subscribeStudentAccounts(listener: () => void): () => void {
 return subscribeStudents(listener);
}

function toAccount(s: Student): StudentAccount {
 return { studentId: s.id, userId: s.userId, password: "", updatedAt: "" };
}

export function getStudentAccountByStudentId(studentId: string): StudentAccount | undefined {
 const s = getStudentById(studentId);
 return s?.userId ? toAccount(s) : undefined;
}

export function getStudentAccountByUserId(userId: string): StudentAccount | undefined {
 const s = getAllStudents().find((x) => x.userId === userId);
 return s ? toAccount(s) : undefined;
}

export function hasStudentAccount(studentId: string): boolean {
 return !!getStudentById(studentId)?.userId;
}

export function getStudentAccounts(): StudentAccount[] {
 return getAllStudents().filter((s) => s.userId).map(toAccount);
}

const ACCOUNTS_KEY = "kas-sekolah.students.v2";

let accountsRaw: string | null | undefined;
let accountsCache: StudentAccount[] = [];

export function getStudentAccountsSnapshot(): StudentAccount[] {
 if (typeof window === "undefined") return [];
 const raw = window.localStorage.getItem(ACCOUNTS_KEY);
 if (raw === accountsRaw && accountsCache) return accountsCache;
 accountsRaw = raw;
 accountsCache = getAllStudents().filter((s) => s.userId).map(toAccount);
 return accountsCache;
}

// Referensi harus stabil: React 19 membandingkan `getSnapshot()` dengan
// `getServerSnapshot()` saat hidrasi, dan array baru tiap panggilan memicu
// warning "should be cached to avoid an infinite loop".
const EMPTY_ACCOUNTS: StudentAccount[] = [];

export function getStudentAccountsServerSnapshot(): StudentAccount[] {
 return EMPTY_ACCOUNTS;
}