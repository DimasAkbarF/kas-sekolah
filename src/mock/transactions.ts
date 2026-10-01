import type { Transaction } from "@/types";

export const transactions: Transaction[] = [
];

export function getTransactionsByStudent(studentId: string): Transaction[] {
 return transactions.filter((t) => t.studentId === studentId);
}

export function getTransactionsByStatus(status: Transaction["status"]): Transaction[] {
 return transactions.filter((t) => t.status === status);
}

export function getTransactionById(id: string): Transaction | undefined {
 return transactions.find((t) => t.id === id);
}
