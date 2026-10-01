import type {
 Bill,
 Student,
 TransactionWithDetails,
} from "@/types";
import { getCurrentUser } from "@/services/auth.service";
import { getStudentByUserId } from "@/mock/students";
import { bills as mockBills } from "@/mock/bills";
import { transactions as mockTransactions } from "@/mock/transactions";
import { getActiveClassName } from "@/lib/school";
import {
 calculateStudentTotalBills,
 calculateStudentTotalPaid,
 calculateStudentOutstanding,
 calculateStudentPaymentRate,
} from "@/lib/calculations";

export interface StudentSummary {
 totalBills: number;
 totalPaid: number;
 outstanding: number;
 paymentRate: number;
}

export interface StudentProfile {
 student: Student;
 className?: string;
 email: string;
}

export function getCurrentStudent(): Student | null {
 const user = getCurrentUser();
 if (!user) return null;
 return getStudentByUserId(user.id) ?? null;
}

export function getStudentProfile(): StudentProfile | null {
 const user = getCurrentUser();
 const student = getCurrentStudent();
 if (!user || !student) return null;

 return {
 student,
 className: getActiveClassName(),
 email: user.email,
 };
}

export function getStudentBills(student?: Student): Bill[] {
 const current = student ?? getCurrentStudent();
 if (!current) return [];

 return mockBills
 .filter((b) => {
 if (b.status !== "active") return false;
 if (b.targetType === "all") return true;
 // Tagihan kelas hanya berlaku untuk siswa kelas yang sama; classId null = sekolah.
 if (b.targetType === "class") return !b.classId || b.classId === current.classId;
 if (b.targetType === "specific") return b.targetIds.includes(current.id);
 return false;
 })
 .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
}

export function getStudentBillById(billId: string, student?: Student): Bill | undefined {
 const current = student ?? getCurrentStudent();
 if (!current) return undefined;
 const bill = mockBills.find((b) => b.id === billId);
 if (!bill) return undefined;

 const applicable =
 bill.targetType === "all" ||
 (bill.targetType === "class" && (!bill.classId || bill.classId === current.classId)) ||
 (bill.targetType === "specific" && bill.targetIds.includes(current.id));

 return applicable ? bill : undefined;
}

export function getStudentTransactions(student?: Student): TransactionWithDetails[] {
 const current = student ?? getCurrentStudent();
 if (!current) return [];

 return mockTransactions
 .filter((t) => t.studentId === current.id)
 .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
 .map((t) => {
 const bill = mockBills.find((b) => b.id === t.billId);
 return {
 ...t,
 studentName: current.name,
 className: getActiveClassName(),
 billName: bill?.name ?? "Unknown",
 billAmount: bill?.amount ?? t.amount,
 };
 });
}

export function getStudentRecentTransactions(limit = 4): TransactionWithDetails[] {
 return getStudentTransactions().slice(0, limit);
}

export function getStudentSummary(student?: Student): StudentSummary {
 const bills = getStudentBills(student);
 const transactions = getStudentTransactions(student);

 return {
 totalBills: calculateStudentTotalBills(bills),
 totalPaid: calculateStudentTotalPaid(transactions),
 outstanding: calculateStudentOutstanding(bills, transactions),
 paymentRate: calculateStudentPaymentRate(bills, transactions),
 };
}

export function getStudentPaymentTrend(student?: Student): { time: number; value: number }[] {
 const current = student ?? getCurrentStudent();
 if (!current) return [];

 let cumulative = 0;
 return getStudentTransactions(current)
 .filter((t) => t.status === "PAID")
 .sort((a, b) => new Date(a.paidAt || a.createdAt).getTime() - new Date(b.paidAt || b.createdAt).getTime())
 .map((t) => {
 cumulative += t.amount;
 return {
 time: new Date(t.paidAt || t.createdAt).getTime() / 1000,
 value: cumulative,
 };
 });
}