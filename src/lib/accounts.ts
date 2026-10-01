import {
 getAllStudents,
 setStudentUserId,
 subscribeStudents,
} from "@/mock/students";
import { apiFetch } from "@/lib/api-client";
import type { Student, User } from "@/types";
import type { TKey } from "@/lib/i18n";

// Akun yang dikelola admin: akun login siswa (userId terisi). Akun staff
// direset langsung lewat database — belum ada endpoint untuk itu.
export interface Account {
 id: string;
 studentId: string;
 name: string;
 email: string;
 role: "student";
 password: string;
 updatedAt: string;
}

export const roleLabelKey: Record<User["role"], TKey> = {
 super_admin: "role.super_admin",
 class_admin: "role.class_admin",
 treasurer: "role.treasurer",
 student: "role.student",
};

type Listener = () => void;

const listeners = new Set<Listener>();
let cachedAccounts: Account[] = [];
let cacheKey = "";

export function subscribeAccounts(listener: Listener): () => void {
 listeners.add(listener);
 const unsub = subscribeStudents(listener);
 return () => {
 listeners.delete(listener);
 unsub();
 };
}

function notify(): void {
 listeners.forEach((listener) => listener());
}

function studentEmail(s: Student): string {
 return `nisn-${s.nisn}@student.sma-n1.sch.id`;
}

function compute(): Account[] {
 return getAllStudents()
 .filter((s) => s.userId)
 .map((s) => ({
 id: s.userId,
 studentId: s.id,
 name: s.name,
 email: studentEmail(s),
 role: "student" as const,
 password: "",
 updatedAt: "",
 }));
}

export function getAccounts(): Account[] {
 const key =
 typeof window !== "undefined"
 ? window.localStorage.getItem("kas-sekolah.students.v2") ?? ""
 : "";
 if (key !== cacheKey) {
 cacheKey = key;
 cachedAccounts = compute();
 }
 return cachedAccounts;
}

// Reset password siswa. Mengembalikan promise supaya pemanggil bisa menampilkan
// error; sebelumnya error ditelan dan dialog tetap menutup sehingga admin
// mengira password sudah berubah.
export function resetAccountPassword(userId: string, newPassword: string): Promise<void> {
 const student = getAllStudents().find((s) => s.userId === userId);
 if (!student) return Promise.resolve();
 return apiFetch<{ ok: boolean }>(`/api/students/${encodeURIComponent(student.id)}/account`, {
 method: "POST",
 body: JSON.stringify({ password: newPassword }),
 }).then(() => {
 if (!student.userId) setStudentUserId(student.id, `su-${student.id}`);
 cacheKey = "";
 notify();
 });
}