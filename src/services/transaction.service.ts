import type { TransactionStatus } from "@/types";
import { apiFetch } from "@/lib/api-client";
import { refreshAll } from "@/lib/sync";

export async function confirmTransaction(
 id: string,
 status: Extract<TransactionStatus, "PAID" | "CANCELLED">,
): Promise<{ ok: boolean; error?: string }> {
 try {
 await apiFetch<{ ok: boolean }>(`/api/transactions/${encodeURIComponent(id)}`, {
 method: "PATCH",
 body: JSON.stringify({ status }),
 });
 await refreshAll();
 return { ok: true };
 } catch (err) {
 return {
 ok: false,
 error: err instanceof Error && err.message ? err.message : undefined,
 };
 }
}

export async function deleteTransaction(
 id: string,
): Promise<{ ok: boolean; error?: string }> {
 try {
 await apiFetch<{ ok: boolean }>(`/api/transactions/${encodeURIComponent(id)}`, {
 method: "DELETE",
 });
 await refreshAll();
 return { ok: true };
 } catch (err) {
 return {
 ok: false,
 error: err instanceof Error && err.message ? err.message : undefined,
 };
 }
}

export async function deleteTransactions(
 ids: string[],
): Promise<{ ok: boolean; error?: string }> {
 try {
 await apiFetch<{ ok: boolean }>("/api/transactions/bulk-delete", {
 method: "POST",
 body: JSON.stringify({ ids }),
 });
 await refreshAll();
 return { ok: true };
 } catch (err) {
 return {
 ok: false,
 error: err instanceof Error && err.message ? err.message : undefined,
 };
 }
}
