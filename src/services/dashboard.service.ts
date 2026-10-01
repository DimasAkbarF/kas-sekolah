import type {
 DashboardSummary,
 PaymentTrend,
 TransactionWithDetails,
 Transaction,
 Bill,
 MonthlyBalance,
} from "@/types";
import { bills as mockBills } from "@/mock/bills";
import { transactions as mockTransactions } from "@/mock/transactions";
import { getActiveStudents } from "@/mock/students";
import { expenses as mockExpenses } from "@/mock/expenses";
import { incomes as mockIncomes } from "@/mock/income";
import { paidPaymentsAsIncome } from "@/lib/cash-flow";
import { getActiveClassName } from "@/lib/school";
import {
 calculateDashboardSummary,
 calculatePaymentTrend,
 calculateMonthlyBalance,
 calculateBalance,
 calculateTotalPaid,
} from "@/lib/calculations";

function withDetails(t: Transaction): TransactionWithDetails {
 const student = getActiveStudents().find((s) => s.id === t.studentId);
 const bill = mockBills.find((b) => b.id === t.billId);
 return {
 ...t,
 studentName: student?.name || "Unknown",
 className: getActiveClassName(),
 billName: bill?.name || "Unknown",
 billAmount: bill?.amount || 0,
 };
}

export function getDashboardSummary(): DashboardSummary {
 return calculateDashboardSummary(mockBills, mockTransactions, getActiveStudents());
}

export function getPaymentTrendData(): PaymentTrend[] {
 return calculatePaymentTrend(mockTransactions, mockBills, getActiveStudents());
}

export function getMonthlyBalanceData(): MonthlyBalance[] {
 return calculateMonthlyBalance([...mockIncomes, ...paidPaymentsAsIncome()], mockExpenses);
}

export function getBalance(): number {
 return calculateBalance(mockIncomes, mockExpenses) + calculateTotalPaid(mockTransactions);
}

export function getRecentTransactions(limit: number = 5): TransactionWithDetails[] {
 return [...mockTransactions]
 .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
 .slice(0, limit)
 .map(withDetails);
}

export function getAllBills(): Bill[] {
 return [...mockBills].sort(
 (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
 );
}

export function getAllTransactions(): TransactionWithDetails[] {
 return [...mockTransactions]
 .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
 .map(withDetails);
}

export function getTransactionsByStudent(studentId: string): TransactionWithDetails[] {
 return mockTransactions
 .filter((t) => t.studentId === studentId)
 .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
 .map(withDetails);
}
