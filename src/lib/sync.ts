// Sinkronisasi data klien ↔ API. Modul ringan: menarik semua resource sesuai
// role pengguna dan menulisnya ke array/store yang selama ini dipakai mock,
// jadi halaman & service lama tetap jalan tanpa dirombak.
import type { Bill, Expense, Income, Student, Transaction, User } from "@/types";
import { apiFetch, ApiError } from "@/lib/api-client";
import { bumpDataVersion } from "@/lib/data-version";
import { getStoredSession, setStoredSession } from "@/lib/auth";
import { bills } from "@/mock/bills";
import { transactions } from "@/mock/transactions";
import { incomes } from "@/mock/income";
import { expenses } from "@/mock/expenses";
import { replaceStudents } from "@/mock/students";
import { setSchoolProfile } from "@/lib/school";

let hydrated = false;
// Jaring pengaman terhadap tabrakan muat: `refreshAll()` dipanggil dari beberapa
// efek mount sekaligus. Tanpa ini, navigasi cepat menjalankan load paralel dan
// respons lama bisa menimpa data baru (stale write).
let inflight: Promise<void> | null = null;
const hydrateListeners = new Set<() => void>();

export function isHydrated(): boolean {
 return hydrated;
}

/**
 * Berlangganan status hidrasi. `hydrated` adalah flag modul biasa, jadi tanpa
 * store ini komponen tidak pernah tahu kapan percobaan `/api/auth/me` selesai
 * — dan akan memutuskan redirect berdasarkan session localStorage yang sudah
 * basi (loop proxy ↔ AuthGate).
 */
export function subscribeHydrated(listener: () => void): () => void {
 hydrateListeners.add(listener);
 return () => hydrateListeners.delete(listener);
}

function put<T>(target: T[], source: T[]): void {
 target.splice(0, target.length, ...source);
}

async function load<T>(path: string): Promise<T | null> {
 try {
 return await apiFetch<T>(path);
 } catch (err) {
 // 503 + maintenance BUKAN kegagalan: itu status yang diharapkan saat kelasnya
 // sedang dipelihara, dan halaman /maintenance sudah menjelaskannya. Tanpa
 // pengecualian ini tiap muat halaman menghasilkan enam baris error yang
 // terlihat seperti bug padahal memang Kondisi yang dirancang.
 if (err instanceof ApiError && err.status === 503) return null;
 // Pernah ditelan diam-diam: array tidak terisi, halaman tampil kosong tanpa
 // penjelasan apa pun. Tetap swallow (supaya satu endpoint gagal tidak
 // memblokir sisa data), tapi jangan hilangkan jejaknya.
 console.error(`[sync] gagal memuat ${path}`, err);
 return null;
 }
}

// Dipanggil sekali saat aplikasi dimuat. Mengisi session + seluruh data dari
// cookie yang masih aktif.
export async function hydrate(): Promise<void> {
 if (hydrated || typeof window === "undefined") return;
 if (inflight) return inflight;

 inflight = (async () => {
 let user: User | null = null;
 try {
 const me = await apiFetch<{ user: User }>("/api/auth/me");
 user = me.user;
 } catch (err) {
 // 401 = pengunjung memang belum masuk (wajar di halaman login), bukan bug.
 // Yang penting: `hydrated` TIDAK dikunci di sini — kegagalan jaringan akan
 // membuat aplikasi kosong sampai hard reload, tanpa jalur retry.
 if (!(err instanceof ApiError) || err.status !== 401) {
 console.error("[sync] gagal memuat session", err);
 }
 return;
 }
 hydrated = true;
 if (!user) {
 hydrateListeners.forEach((l) => l());
 return;
 }
 // Session baru ditulis setelah data masuk store. Kalau urutannya dibalik,
 // `RoleGuard` sudah melepas halaman sementara store masih kosong — hasilnya
 // "tidak ada data" untuk akun yang sebenarnya punya data.
 await loadFor(user);
 setStoredSession(user);
 })();

 try {
 await inflight;
 } finally {
 inflight = null;
 // Kegagalan juga harus memberi tahu subscribers: tanpa ini AuthGate/
 // RoleGuard menunggu selamanya karena `hydrated` tidak pernah berubah.
 hydrateListeners.forEach((l) => l());
 }
}

// Muat ulang semua data untuk pengguna yang sedang login.
export function refreshAll(): Promise<void> {
 const user = getStoredSession();
 if (!user) return Promise.resolve();
 if (inflight) return inflight;
 inflight = loadFor(user);
 return inflight.finally(() => {
 inflight = null;
 });
}

async function loadFor(user: User): Promise<void> {
 // Kelas sedang dipelihara: guard() membalas 503 untuk semua endpoint ini, jadi
 // memuatnya pasti gagal enam kali. Lewati seluruhnya, dan biarkan
 // `RoleGuard`/layout mengarahkan pengguna ke /maintenance. Tanpa cek ini,
 // login Admin Kelas yang kelasnya maintenance akan showers console dengan
 // error sebelum sempat sampai ke halaman maintenance.
 if (user.classMaintenance) return;

 const staff = user.role !== "student";
 const tasks: Promise<unknown>[] = [
 load<{ students: Student[] }>("/api/students"),
 load<{ bills: Bill[] }>("/api/bills"),
 load<{ transactions: Transaction[] }>("/api/transactions"),
 load<{ school: object }>("/api/settings"),
 ];
 if (staff) {
 tasks.push(load<{ incomes: Income[] }>("/api/incomes"), load<{ expenses: Expense[] }>("/api/expenses"));
 }

 const [studentsRes, billsRes, txRes, settingsRes, incomesRes, expensesRes] = await Promise.all(tasks);

 const students = (studentsRes as { students?: Student[] } | null)?.students;
 const billList = (billsRes as { bills?: Bill[] } | null)?.bills;
 if (billList) put(bills, billList);
 const txList = (txRes as { transactions?: Transaction[] } | null)?.transactions;
 if (txList) put(transactions, txList);
 const incomeList = (incomesRes as { incomes?: Income[] } | null)?.incomes;
 if (incomeList) put(incomes, incomeList);
 const expenseList = (expensesRes as { expenses?: Expense[] } | null)?.expenses;
 if (expenseList) put(expenses, expenseList);

 const school = (settingsRes as { school?: object } | null)?.school;
 if (school) setSchoolProfile(school);
 // Notif terakhir setelah semua array terisi, agar re-render konsumen
 // (dashboard via useStudents) melihat data lengkap.
 if (students) replaceStudents(students);
 bumpDataVersion();
}

// ─── Mutasi ringan (persist ke API, lalu perbarui store lokal) ───────────────

export interface NewBill {
 name: string;
 category: string;
 amount: number;
 period: string;
 startDate: string;
 dueDate: string;
 targetType: "all" | "class" | "specific";
 targetIds: string[];
}

export async function createBill(input: NewBill): Promise<Bill> {
 const res = await apiFetch<{ bill: Bill }>("/api/bills", {
 method: "POST",
 body: JSON.stringify(input),
 });
 bills.unshift(res.bill);
 bumpDataVersion();
 return res.bill;
}

export async function deleteBill(id: string): Promise<void> {
 await apiFetch<{ ok: boolean }>(`/api/bills/${encodeURIComponent(id)}`, { method: "DELETE" });
 const i = bills.findIndex((b) => b.id === id);
 if (i >= 0) bills.splice(i, 1);
 bumpDataVersion();
}

export async function updateBill(
 id: string,
 patch: Partial<NewBill> & { status?: Bill["status"] },
): Promise<Bill> {
 const res = await apiFetch<{ bill: Bill }>(`/api/bills/${encodeURIComponent(id)}`, {
 method: "PATCH",
 body: JSON.stringify(patch),
 });
 const i = bills.findIndex((b) => b.id === id);
 if (i >= 0) bills[i] = res.bill;
 else bills.unshift(res.bill);
 bumpDataVersion();
 return res.bill;
}

export async function createIncome(input: {
 title: string;
 category: string;
 amount: number;
 date: string;
 source?: string;
}): Promise<Income> {
 const res = await apiFetch<{ income: Income }>("/api/incomes", {
 method: "POST",
 body: JSON.stringify(input),
 });
 incomes.unshift(res.income);
 bumpDataVersion();
 return res.income;
}

export async function createExpense(input: {
 title: string;
 category: string;
 amount: number;
 date: string;
 notes?: string;
}): Promise<Expense> {
 const res = await apiFetch<{ expense: Expense }>("/api/expenses", {
 method: "POST",
 body: JSON.stringify(input),
 });
 expenses.unshift(res.expense);
 bumpDataVersion();
 return res.expense;
}