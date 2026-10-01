import type { Income } from "@/types";
import { incomes } from "@/mock/income";
import { transactions } from "@/mock/transactions";
import { bills } from "@/mock/bills";

const PAYMENT_CATEGORY = "Pembayaran Tagihan";

export function paidPaymentsAsIncome(): Income[] {
 return transactions
 .filter((t) => t.status === "PAID")
 .map((t) => {
 const billName = bills.find((b) => b.id === t.billId)?.name;
 return {
 id: `${t.id}-pay`,
 title: billName ? `Pembayaran ${billName}` : PAYMENT_CATEGORY,
 category: PAYMENT_CATEGORY,
 amount: t.amount,
 date: t.paidAt || t.createdAt,
 source: billName || "",
 };
 });
}

export function allIncomes(): Income[] {
 return [...paidPaymentsAsIncome(), ...incomes].sort(
 (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
 );
}

export function totalAllIncomes(): number {
 return allIncomes().reduce((sum, i) => sum + i.amount, 0);
}