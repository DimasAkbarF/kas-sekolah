import type { Bill } from "@/types";

export const bills: Bill[] = [
];

export function getBillById(id: string): Bill | undefined {
 return bills.find((b) => b.id === id);
}

export function getBillsByStatus(status: Bill["status"]): Bill[] {
 return bills.filter((b) => b.status === status);
}

export function getActiveBills(): Bill[] {
 return bills.filter((b) => b.status === "active");
}