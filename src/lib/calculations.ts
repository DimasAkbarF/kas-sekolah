import type {
 Bill,
 Transaction,
 Student,
 Expense,
 Income,
 DashboardSummary,
 PaymentOverview,
 PaymentTrend,
 MonthlyBalance,
} from "@/types";

export function countEligibleStudents(bill: Bill, students: Student[]): number {
 if (bill.targetType === "all") return students.length;
 // Tagihan kelas: siswa hanya dihitung dari kelas tagihan itu.
 if (bill.targetType === "class") {
 return bill.classId ? students.filter((s) => s.classId === bill.classId).length : students.length;
 }
 return bill.targetIds.filter((id) => students.some((s) => s.id === id)).length;
}

function isRelevantBill(bill: Bill): boolean {
 return bill.status !== "inactive";
}

export function calculateTotalBills(
 bills: Bill[],
 students: Student[],
 filters?: { status?: string; period?: string; category?: string },
): number {
 let filtered = bills;
 if (filters?.status) {
 filtered = filtered.filter((b) => b.status === filters.status);
 }
 if (filters?.period) {
 filtered = filtered.filter((b) => b.period === filters.period);
 }
 if (filters?.category) {
 filtered = filtered.filter((b) => b.category === filters.category);
 }
 return filtered
 .filter(isRelevantBill)
 .reduce((sum, b) => sum + b.amount * countEligibleStudents(b, students), 0);
}

export function calculateTotalPaid(transactions: Transaction[]): number {
 return transactions
 .filter((t) => t.status === "PAID")
 .reduce((sum, t) => sum + t.amount, 0);
}

export function calculateOutstanding(bills: Bill[], transactions: Transaction[], students: Student[]): number {
 return Math.max(0, calculateTotalBills(bills, students) - calculateTotalPaid(transactions));
}

export function calculateCollectionRate(bills: Bill[], transactions: Transaction[], students: Student[]): number {
 const total = calculateTotalBills(bills, students);
 const paid = calculateTotalPaid(transactions);
 return total > 0 ? Math.round((paid / total) * 10000) / 100 : 0;
}

export function calculatePaymentOverview(
 students: Student[],
 transactions: Transaction[],
 className?: string,
): PaymentOverview {
 const active = students.filter((s) => !s.archived);
 const paidStudentIds = new Set(
 transactions
 .filter((t) => t.status === "PAID")
 .map((t) => t.studentId),
 );
 const paidStudents = active.filter((s) => paidStudentIds.has(s.id)).length;
 const totalStudents = active.length;
 const unpaidStudents = totalStudents - paidStudents;
 const rate = totalStudents > 0 ? Math.round((paidStudents / totalStudents) * 10000) / 100 : 0;
 return {
 className: className ?? "",
 totalStudents,
 paidStudents,
 unpaidStudents,
 paymentRate: rate,
 };
}

export function calculateDashboardSummary(bills: Bill[], transactions: Transaction[], students: Student[]): DashboardSummary {
 const totalBills = calculateTotalBills(bills, students);
 const totalPaid = calculateTotalPaid(transactions);
 const outstanding = Math.max(0, totalBills - totalPaid);
 const collectionRate = totalBills > 0 ? Math.round((totalPaid / totalBills) * 10000) / 100 : 0;
 return { totalBills, totalPaid, outstanding, collectionRate };
}

// Tren pembayaran berbasis tagihan: "unpaid" = kewajiban per tagihan dikurangi
// nominal yang sudah PAID, dikelompokkan per bulan mulai tagihan. Transaksi
// non-PAID (PENDING/FAILED/CANCELLED) TIDAK dihitung sebagai utang (menghindari
// double-count dari percobaan bayar yang gagal).
export function calculatePaymentTrend(
 transactions: Transaction[],
 bills: Bill[] = [],
 students: Student[] = [],
): PaymentTrend[] {
 const monthKey = (d: Date) =>
 d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
 const paidByBill = new Map<string, number>();
 for (const t of transactions) {
 if (t.status !== "PAID") continue;
 paidByBill.set(t.billId, (paidByBill.get(t.billId) ?? 0) + t.amount);
 }

 const monthlyData: Record<string, { paid: number; unpaid: number }> = {};
 for (const b of bills) {
 if (b.status === "inactive") continue;
 const month = monthKey(new Date(b.startDate));
 if (!monthlyData[month]) monthlyData[month] = { paid: 0, unpaid: 0 };
 const expected = b.amount * countEligibleStudents(b, students);
 const paid = paidByBill.get(b.id) ?? 0;
 monthlyData[month].paid += paid;
 monthlyData[month].unpaid += Math.max(expected - paid, 0);
 }
 return Object.entries(monthlyData).map(([period, data]) => ({
 period,
 ...data,
 }));
}

export function calculateMonthlyBalance(incomes: Income[], expenses: Expense[]): MonthlyBalance[] {
 const monthlyData: Record<string, { income: number; expense: number; sortKey: number }> = {};
 for (const i of incomes) {
 const date = new Date(i.date);
 const month = date.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
 const sortKey = date.getFullYear() * 100 + date.getMonth();
 if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0, sortKey };
 monthlyData[month].income += i.amount;
 }
 for (const e of expenses) {
 const date = new Date(e.date);
 const month = date.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
 const sortKey = date.getFullYear() * 100 + date.getMonth();
 if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0, sortKey };
 monthlyData[month].expense += e.amount;
 }
 return Object.entries(monthlyData)
 .sort((a, b) => a[1].sortKey - b[1].sortKey)
 .map(([month, data]) => ({
 month,
 income: data.income,
 expense: data.expense,
 balance: data.income - data.expense,
 }));
}

export function calculateBalance(incomes: Income[], expenses: Expense[]): number {
 const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
 const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
 return totalIncome - totalExpense;
}

export function calculateStudentTotalBills(bills: Bill[]): number {
 return bills.reduce((sum, b) => sum + b.amount, 0);
}

export function calculateStudentTotalPaid(transactions: Transaction[]): number {
 return transactions
 .filter((t) => t.status === "PAID")
 .reduce((sum, t) => sum + t.amount, 0);
}

export function calculateStudentOutstanding(bills: Bill[], transactions: Transaction[]): number {
 return Math.max(0, calculateStudentTotalBills(bills) - calculateStudentTotalPaid(transactions));
}

export function calculateStudentPaymentRate(bills: Bill[], transactions: Transaction[]): number {
 const total = calculateStudentTotalBills(bills);
 const paid = calculateStudentTotalPaid(transactions);
 return total > 0 ? Math.round((paid / total) * 10000) / 100 : 0;
}

/**
 * Ringkasan tagihan per kelas, untuk halaman statistik.
 *
 * Semantics-nya sama persis dengan `calculatePaymentTrend` supaya angka di
 * kartu tren dan kartu per kelas tidak berbeda口径: kewajiban = nominal tagihan
 * × jumlah siswa yang berhak, dikurangi hanya transaksi berstatus PAID
 * (PENDING/FAILED/CANCELLED bukan utang, supaya percobaan bayar yang gagal tidak
 * terhitung dua kali).
 *
 * Diurutkan dari tunggakan terbesar. Kepala sekolah tidak mencari kelas dengan
 * angka paling bagus, tapi yang paling perlu ditindak.
 *
 * `className` diambil dari siswa karena `Bill` hanya menyimpan `classId`.
 */
export interface ClassBreakdown {
 classId: string;
 className: string;
 /** Kewajiban kas yang belum dibayar, rupiah. */
 outstanding: number;
 /** Sudah dibayar, rupiah. */
 paid: number;
 studentCount: number;
 /** Persen lunas, 0–100. */
 rate: number;
}

const NO_CLASS_LABEL = "Tanpa kelas";

export function calculateClassBreakdown(
 bills: Bill[],
 transactions: Transaction[] = [],
 students: Student[] = [],
): ClassBreakdown[] {
 const active = students.filter((s) => !s.archived);

 // `classId` → nama kelas. Siswa satu-satunya sumber nama kelas di store ini.
 const nameById = new Map<string, string>();
 for (const s of active) {
  if (s.classId && s.className && !nameById.has(s.classId)) {
   nameById.set(s.classId, s.className);
  }
 }

 const paidByBill = new Map<string, number>();
 for (const t of transactions) {
  if (t.status !== "PAID") continue;
  paidByBill.set(t.billId, (paidByBill.get(t.billId) ?? 0) + t.amount);
 }

 // Tagihan untuk seluruh sekolah ikut dihitung di baris "Tanpa kelas", karena
 // uangnya benar-benar membagi rata ke semua siswa, bukan milik satu kelas.
 const byClass = new Map<string, ClassBreakdown>();
 const rowFor = (classId: string | null) => {
  const key = classId ?? NO_CLASS_LABEL;
  let row = byClass.get(key);
  if (!row) {
   row = {
    classId: key,
    className: classId ? (nameById.get(classId) ?? key) : NO_CLASS_LABEL,
    outstanding: 0,
    paid: 0,
    studentCount: classId ? active.filter((s) => s.classId === classId).length : 0,
    rate: 0,
   };
   byClass.set(key, row);
  }
  return row;
 };

 for (const b of bills) {
  if (!isRelevantBill(b)) continue;
  const row = rowFor(b.targetType === "all" ? null : (b.classId ?? null));
  const expected = b.amount * countEligibleStudents(b, students);
  const paid = paidByBill.get(b.id) ?? 0;
  row.paid += paid;
  row.outstanding += Math.max(expected - paid, 0);
 }

 for (const row of byClass.values()) {
  const total = row.paid + row.outstanding;
  row.rate = total > 0 ? Math.round((row.paid / total) * 10000) / 100 : 0;
 }

 return [...byClass.values()].sort((a, b) => b.outstanding - a.outstanding);
}
