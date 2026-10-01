import type { Bill } from "@/types";
import { bills as mockBills } from "@/mock/bills";

export function getAllBills(): Bill[] {
 return [...mockBills].sort(
 (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
 );
}

export function getBillById(id: string): Bill | undefined {
 return mockBills.find((b) => b.id === id);
}

export function getBillsByStatus(status: Bill["status"]): Bill[] {
 return mockBills.filter((b) => b.status === status);
}

export function getActiveBills(): Bill[] {
 return mockBills.filter((b) => b.status === "active");
}
