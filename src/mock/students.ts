import type { Student } from "@/types";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { getStoredSession } from "@/lib/auth";
import type { TKey, TParams } from "@/lib/i18n";
import { ApiError, apiFetch } from "@/lib/api-client";
import { bumpDataVersion } from "@/lib/data-version";
import { isStaffRole } from "@/lib/roles";

export const SEED_STUDENTS: Student[] = [];

const STUDENTS_KEY = "kas-sekolah.students.v2";

export const SERVER_STUDENT_SNAPSHOT: { active: Student[]; archived: Student[] } = {
 active: SEED_STUDENTS,
 archived: [],
};

type Listener = () => void;

const listeners = new Set<Listener>();

// Cache so reads stay stable within a tick.
let cachedRaw: string | null | undefined;
let cachedList: Student[] = [];
let snapshotRaw: string | null | undefined;
let snapshotCache: { active: Student[]; archived: Student[] } | undefined;

function toSeed(): Student[] {
 return SEED_STUDENTS.map((s) => ({ ...s }));
}

function readStore(): Student[] {
 if (typeof window === "undefined") return toSeed();

 const raw = window.localStorage.getItem(STUDENTS_KEY);
 if (raw === cachedRaw) return cachedList;

 cachedRaw = raw;
 if (!raw) {
 cachedList = toSeed();
 return cachedList;
 }

 try {
 const parsed = JSON.parse(raw) as Student[];
 cachedList = Array.isArray(parsed) ? parsed : toSeed();
 } catch {
 cachedList = toSeed();
 }
 return cachedList;
}

function writeStore(next: Student[]): void {
 cachedList = next;
 if (typeof window !== "undefined") {
 window.localStorage.setItem(STUDENTS_KEY, JSON.stringify(next));
 cachedRaw = window.localStorage.getItem(STUDENTS_KEY);
 }
 listeners.forEach((listener) => listener());
}

export function subscribeStudents(listener: Listener): () => void {
 listeners.add(listener);
 return () => {
 listeners.delete(listener);
 };
}

export function getAllStudents(): Student[] {
 return [...readStore()].sort((a, b) => a.nis.localeCompare(b.nis));
}

export function getActiveStudents(): Student[] {
 return getAllStudents().filter((s) => !s.archived);
}

// Stable snapshot for useSyncExternalStore: the same object reference is
// returned until the underlying store value actually changes.
export function getStudentsSnapshot(): { active: Student[]; archived: Student[] } {
 if (typeof window === "undefined") return SERVER_STUDENT_SNAPSHOT;

 const raw = window.localStorage.getItem(STUDENTS_KEY);
 if (raw === snapshotRaw && snapshotCache) return snapshotCache;

 readStore();
 snapshotRaw = raw;
 snapshotCache = {
 active: cachedList.filter((s) => !s.archived),
 archived: cachedList.filter((s) => s.archived),
 };
 return snapshotCache;
}

export function getStudentById(id: string): Student | undefined {
 return readStore().find((s) => s.id === id);
}

export function getStudentByUserId(userId: string): Student | undefined {
 return readStore().find((s) => s.userId === userId);
}

export function getStudentByNis(nis: string): Student | undefined {
 return readStore().find((s) => s.nis === nis);
}

export function getStudentByNisn(nisn: string): Student | undefined {
 const q = nisn.trim();
 if (!q) return undefined;
 return readStore().find((s) => s.nisn === q);
}

// Mengganti seluruh daftar siswa (dipakai sinkronisasi dari API).
export function replaceStudents(list: Student[]): void {
 writeStore(list);
}

// Menempel userId ke record siswa di store lokal setelah akun login dibuat.
export function setStudentUserId(id: string, userId: string): void {
 writeStore(readStore().map((s) => (s.id === id ? { ...s, userId } : s)));
}

export interface StudentInput {
 nis: string;
 nisn: string;
 name: string;
 email?: string;
 /** Hanya Super Admin yang boleh mengirim ini; Admin Kelas diabaikan server. */
 classId?: string;
 className?: string;
 gender?: "L" | "P";
 phone?: string;
 address?: string;
}

export type StudentMutationResult =
 | { ok: true; student: Student }
 | { ok: false; error: TKey; errorParams?: TParams };

type AccountMutationResult =
 | { ok: true }
 | { ok: false; error: TKey };

function sanitize(input: StudentInput): {
 nis: string;
 nisn: string;
 name: string;
 email?: string;
 classId?: string;
 className?: string;
 gender?: "L" | "P";
 phone?: string;
 address?: string;
} {
 return {
 nis: input.nis.trim(),
 nisn: input.nisn.trim(),
 name: input.name.trim(),
 email: input.email?.trim() || undefined,
 classId: input.classId?.trim() || undefined,
 className: input.className?.trim() || undefined,
 gender: input.gender,
 phone: input.phone?.trim() || undefined,
 address: input.address?.trim() || undefined,
 };
}

// Simulates server-side authorization: only admins can mutate student data.
function assertAdmin(): { key: TKey } | null {
 const user = getStoredSession();
 if (!user || !isStaffRole(user.role)) {
 return { key: "students.errDenied" };
 }
 return null;
}

// Pesan error dari API (string Indonesia) dipakai apa adanya; t() akan
// mengembalikan teks itu sendiri bila bukan kunci yang dikenal.
function serverError(err: unknown, fallback: TKey): TKey {
 if (err instanceof ApiError && err.status > 0 && err.message) {
 return err.message as TKey;
 }
 return fallback;
}

export async function addStudent(input: StudentInput): Promise<StudentMutationResult> {
 const denied = assertAdmin();
 if (denied) return { ok: false, error: denied.key };

 const { nis, nisn, name, email, classId, className, gender, phone } = sanitize(input);
 if (!nisn) return { ok: false, error: "students.errNisnRequired" };
 if (!nis) return { ok: false, error: "students.errNisRequired" };
 if (!name) return { ok: false, error: "students.errNameRequired" };

 try {
 const res = await apiFetch<{ student: Student }>("/api/students", {
 method: "POST",
 body: JSON.stringify({ nis, nisn, name, email, classId, className, gender, phone }),
 });
 writeStore([...readStore(), res.student]);
 bumpDataVersion();
 return { ok: true, student: res.student };
 } catch (err) {
 return { ok: false, error: serverError(err, "students.errorUnknown") };
 }
}

export async function updateStudent(id: string, input: StudentInput): Promise<StudentMutationResult> {
 const denied = assertAdmin();
 if (denied) return { ok: false, error: denied.key };

 const existing = getStudentById(id);
 if (!existing) return { ok: false, error: "students.errNotFound" };
 if (existing.archived) return { ok: false, error: "students.errArchivedLocked" };

 const { nis, nisn, name, email, classId, className, gender, phone } = sanitize(input);
 if (!nisn) return { ok: false, error: "students.errNisnRequired" };
 if (!nis) return { ok: false, error: "students.errNisRequired" };
 if (!name) return { ok: false, error: "students.errNameRequired" };

 try {
 const res = await apiFetch<{ student: Student }>(
 `/api/students/${encodeURIComponent(id)}`,
 { method: "PATCH", body: JSON.stringify({ nis, nisn, name, email, classId, className, gender, phone }) },
 );
 writeStore(readStore().map((s) => (s.id === id ? res.student : s)));
 bumpDataVersion();
 return { ok: true, student: res.student };
 } catch (err) {
 return { ok: false, error: serverError(err, "students.errorUnknown") };
 }
}

export async function archiveStudent(id: string): Promise<StudentMutationResult> {
 const denied = assertAdmin();
 if (denied) return { ok: false, error: denied.key };

 const existing = getStudentById(id);
 if (!existing) return { ok: false, error: "students.errNotFound" };
 if (existing.archived) return { ok: false, error: "students.errAlreadyArchived" };

 return setArchived(id, true);
}

export async function restoreStudent(id: string): Promise<StudentMutationResult> {
 const denied = assertAdmin();
 if (denied) return { ok: false, error: denied.key };

 const existing = getStudentById(id);
 if (!existing) return { ok: false, error: "students.errNotFound" };
 if (!existing.archived) return { ok: false, error: "students.errNotArchived" };

 return setArchived(id, false);
}

async function setArchived(id: string, archived: boolean): Promise<StudentMutationResult> {
 try {
 const res = await apiFetch<{ student: Student }>(
 `/api/students/${encodeURIComponent(id)}`,
 { method: "PATCH", body: JSON.stringify({ archived }) },
 );
 writeStore(readStore().map((s) => (s.id === id ? res.student : s)));
 bumpDataVersion();
 return { ok: true, student: res.student };
 } catch (err) {
 return { ok: false, error: serverError(err, "students.errorUnknown") };
 }
}

// ─── Student login-account management ────────────────────────────────────────

function validatePassword(pw: string): TKey | null {
 if (pw.length < PASSWORD_MIN_LENGTH) return "students.errPasswordTooShort";
 return null;
}

async function postAccount(studentId: string, password: string): Promise<AccountMutationResult> {
 try {
 await apiFetch<{ ok: boolean }>(`/api/students/${encodeURIComponent(studentId)}/account`, {
 method: "POST",
 body: JSON.stringify({ password }),
 });
 return { ok: true };
 } catch (err) {
 return { ok: false, error: serverError(err, "students.errorUnknown") };
 }
}

export async function createStudentLoginAccount(
 studentId: string,
 password: string,
): Promise<AccountMutationResult> {
 const denied = assertAdmin();
 if (denied) return { ok: false, error: denied.key };

 const student = getStudentById(studentId);
 if (!student) return { ok: false, error: "students.errNotFound" };
 if (student.archived) return { ok: false, error: "students.errAccountArchived" };

 const pwErr = validatePassword(password);
 if (pwErr) return { ok: false, error: pwErr };

 if (student.userId) return { ok: false, error: "students.errAccountExists" };

 const result = await postAccount(studentId, password);
 if (!result.ok) return result;

 setStudentUserId(studentId, `su-${studentId}`);
 bumpDataVersion();
 return { ok: true };
}

export async function resetStudentLoginPassword(
 studentId: string,
 password: string,
): Promise<AccountMutationResult> {
 const denied = assertAdmin();
 if (denied) return { ok: false, error: denied.key };

 const student = getStudentById(studentId);
 if (!student) return { ok: false, error: "students.errNotFound" };

 const pwErr = validatePassword(password);
 if (pwErr) return { ok: false, error: pwErr };

 return postAccount(studentId, password);
}