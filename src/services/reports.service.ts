import type { Bill, Expense, Income, Student, Transaction } from "@/types";
import { bills as mockBills } from "@/mock/bills";
import { transactions as mockTransactions } from "@/mock/transactions";
import { incomes as mockIncomes } from "@/mock/income";
import { expenses as mockExpenses } from "@/mock/expenses";
import { getActiveStudents } from "@/mock/students";
import { countEligibleStudents } from "@/lib/calculations";
import { getLocale, translate, type TKey, type TParams } from "@/lib/i18n";

function tl(key: TKey, params?: TParams): string {
 return translate(getLocale(), key, params);
}

/**
 * Satu sel CSV, tetap aman saat dibuka di Excel/LibreOffice.
 *
 * Dua lapis: kutip untuk pemisah/baris baru, dan awalan kutip satu untuk
 * formula. Tanpa lapisan kedua, deskripsi pengeluaran seperti
 * `=HYPERLINK("http://evil","klik")` dieksekusi begitu bendahara membuka
 * hasil unduhan. Sel kosong dibiarkan kosong.
 */
export function csvCell(value: unknown): string {
 const raw = String(value ?? "");
 const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
 return `"${safe.replace(/"/g, '""')}"`;
}

export type ReportPeriodKey = "all" | "thisMonth" | "lastMonth" | "thisYear";

export interface ReportRange {
 start: Date;
 end: Date;
}

export interface ReportSummary {
 totalBills: number;
 totalPaid: number;
 outstanding: number;
 collectionRate: number;
 transactionCount: number;
}

export interface CashflowPoint {
 label: string;
 income: number;
 expense: number;
}

export interface BillStatusSlice {
 name: string;
 value: number;
}

export interface CashflowBar {
 name: string;
 value: number;
}

export interface ReportData {
 summary: ReportSummary;
 totalIncome: number;
 totalExpense: number;
 balance: number;
 cashflow: CashflowPoint[];
 billStatus: BillStatusSlice[];
 cashflowBars: CashflowBar[];
}

const ALL_RANGE: ReportRange = {
 start: new Date(0),
 end: new Date(8640000000000000),
};

export function getPeriodRange(key: ReportPeriodKey): ReportRange {
 if (key === "all") return ALL_RANGE;

 const now = new Date();
 if (key === "thisYear") {
 return {
 start: new Date(now.getFullYear(), 0, 1),
 end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
 };
 }

 const monthOffset = key === "thisMonth" ? 0 : -1;
 return {
 start: new Date(now.getFullYear(), now.getMonth() + monthOffset, 1),
 end: new Date(
 now.getFullYear(),
 now.getMonth() + monthOffset + 1,
 0,
 23,
 59,
 59,
 999,
 ),
 };
}

function toDate(value: string): Date {
 return new Date(value);
}

function inRange(date: Date, range: ReportRange): boolean {
 return date >= range.start && date <= range.end;
}

function computeBillStatus(
 bills: Bill[],
 transactions: Transaction[],
 students: Student[],
): BillStatusSlice[] {
 let paid = 0;
 let unpaid = 0;

 for (const bill of bills) {
 let targetStudents: string[];
 if (bill.targetType === "all") {
 targetStudents = students.map((s) => s.id);
 } else if (bill.targetType === "class") {
 // Tagihan kelas: hanya siswa di kelas tagihan itu (classId null = semua).
 targetStudents = bill.classId
 ? students.filter((s) => s.classId === bill.classId).map((s) => s.id)
 : students.map((s) => s.id);
 } else {
 targetStudents = bill.targetIds.filter((id) =>
 students.some((s) => s.id === id),
 );
 }

 const paidIds = new Set(
 transactions
 .filter((t) => t.billId === bill.id && t.status === "PAID")
 .map((t) => t.studentId),
 );
 for (const id of targetStudents) {
 if (paidIds.has(id)) paid += 1;
 else unpaid += 1;
 }
 }

 return [
 { name: "Sudah Dibayar", value: paid },
 { name: "Belum Dibayar", value: unpaid },
 ];
}

function buildCashflow(incomes: Income[], expenses: Expense[], range: ReportRange): CashflowPoint[] {
 const isShort = range.end.getTime() - range.start.getTime() <= 62 * 86400000;
 const buckets = new Map<number, { label: string; income: number; expense: number }>();

 function add(dateStr: string, key: "income" | "expense", amount: number) {
 const date = toDate(dateStr);
 const bucketKey = isShort
 ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
 : new Date(date.getFullYear(), date.getMonth(), 1).getTime();
 const display = new Date(bucketKey);
 const label = isShort
 ? display.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
 : display.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
 const bucket = buckets.get(bucketKey) ?? { label, income: 0, expense: 0 };
 bucket[key] += amount;
 buckets.set(bucketKey, bucket);
 }

 incomes.forEach((i) => add(i.date, "income", i.amount));
 expenses.forEach((e) => add(e.date, "expense", e.amount));

 return [...buckets.entries()]
 .sort((a, b) => a[0] - b[0])
 .map(([, value]) => value);
}

export interface ReportDataSource {
 bills?: Bill[];
 transactions?: Transaction[];
 incomes?: Income[];
 expenses?: Expense[];
 students?: Student[];
}

export function computeReportData(
 key: ReportPeriodKey,
 data: ReportDataSource = {},
): ReportData {
 const { bills: dsBills, transactions: dsTx, incomes: dsIncomes, expenses: dsExpenses, students: dsStudents } = data;
 const range = getPeriodRange(key);

 const bills = (dsBills ?? mockBills).filter(
 (b) => b.status !== "inactive" && inRange(toDate(b.startDate), range),
 );
 const transactions = (dsTx ?? mockTransactions).filter((t) =>
 inRange(toDate(t.createdAt), range),
 );
 const incomes = (dsIncomes ?? mockIncomes).filter((i) => inRange(toDate(i.date), range));
 const expenses = (dsExpenses ?? mockExpenses).filter((e) => inRange(toDate(e.date), range));
 const students = dsStudents ?? getActiveStudents();

 const totalBills = bills.reduce(
 (sum, b) => sum + b.amount * countEligibleStudents(b, students),
 0,
 );
 const totalPaid = transactions
 .filter((t) => t.status === "PAID")
 .reduce((sum, t) => sum + t.amount, 0);
 const outstanding = Math.max(totalBills - totalPaid, 0);
 const collectionRate =
 totalBills > 0 ? Math.round((totalPaid / totalBills) * 10000) / 100 : 0;

 const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
 const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

 return {
 summary: {
 totalBills,
 totalPaid,
 outstanding,
 collectionRate,
 transactionCount: transactions.length,
 },
 totalIncome,
 totalExpense,
 balance: totalIncome - totalExpense,
 cashflow: buildCashflow(incomes, expenses, range),
 billStatus: computeBillStatus(bills, transactions, students),
 cashflowBars: [
 { name: "Pemasukan", value: totalIncome },
 { name: "Pengeluaran", value: totalExpense },
 { name: "Saldo", value: totalIncome - totalExpense },
 ],
 };
}

export function buildReportCsv(data: ReportData): string {
 const rows: (string | number)[][] = [];
 rows.push([tl("app.name")]);
 rows.push([]);
 rows.push([tl("reports.csvSummary")]);
 rows.push([tl("dashboard.totalBills"), data.summary.totalBills]);
 rows.push([tl("dashboard.totalPaid"), data.summary.totalPaid]);
 rows.push([tl("reports.outstanding"), data.summary.outstanding]);
 rows.push([tl("dashboard.collectionRate"), `${data.summary.collectionRate}%`]);
 rows.push([tl("reports.transactionCount"), data.summary.transactionCount]);
 rows.push([tl("income.total"), data.totalIncome]);
 rows.push([tl("expenses.total"), data.totalExpense]);
 rows.push([tl("dashboard.balance"), data.balance]);
 rows.push([]);
 rows.push([tl("reports.csvCashflow")]);
 rows.push([tl("th.period"), tl("income.title"), tl("expenses.title")]);
 data.cashflow.forEach((p) => rows.push([p.label, p.income, p.expense]));
 rows.push([]);
 rows.push([tl("reports.csvBillStatus")]);
 rows.push([tl("status.statusLabel"), tl("th.amount")]);
 data.billStatus.forEach((s) =>
 rows.push([s.name === "Sudah Dibayar" ? tl("dashboard.paidStudents") : tl("dashboard.unpaidStudents"), s.value]),
 );

  return rows
    .map((row) => row.map((cell) => csvCell(cell)).join(","))
    .join("\n");
}