import type { Transaction, PaymentMethod, PaymentMethodInfo } from "@/types";
import { apiFetch } from "@/lib/api-client";
import { refreshAll } from "@/lib/sync";

export interface PaymentRequest {
 billId: string;
 studentId: string;
 amount: number;
 paymentMethod: PaymentMethod;
}

export interface PaymentResponse {
 success: boolean;
 transaction?: Transaction;
 error?: string;
}

export interface DokuCreateResponse {
 ok: boolean;
 paymentUrl?: string;
 message?: string;
}

// Inisiasi sesi pembayaran DOKU Checkout QRIS
export async function createDokuPayment(billId: string): Promise<DokuCreateResponse> {
 try {
 const res = await apiFetch<DokuCreateResponse>("/api/payment/doku/create", {
 method: "POST",
 body: JSON.stringify({ billId }),
 });
 return res;
 } catch (err) {
 return {
 ok: false,
 message: err instanceof Error && err.message ? err.message : "Gagal membuat sesi pembayaran DOKU",
 };
 }
}

// Daftar metode pembayaran manual aktif (untuk siswa) atau semua (admin).
export async function getPaymentMethods(all = false): Promise<PaymentMethodInfo[]> {
 const res = await apiFetch<{ methods: PaymentMethodInfo[] }>(
 `/api/payment-methods${all ? "?all=1" : ""}`,
 );
 return res.methods ?? [];
}

// Kirim bukti pembayaran manual → transaksi PENDING menunggu konfirmasi admin.
export async function submitManualPayment(input: {
 billId: string;
 amount: number;
 paymentMethod: PaymentMethod;
 methodId: string;
 proofImage: string;
}): Promise<{ ok: boolean; message?: string }> {
 try {
 const res = await apiFetch<{ transaction: Transaction }>("/api/payments", {
 method: "POST",
 body: JSON.stringify({
 billId: input.billId,
 amount: input.amount,
 paymentMethod: input.paymentMethod,
 methodId: input.methodId,
 proofImage: input.proofImage,
 }),
 });
 await refreshAll();
 return { ok: true, message: res.transaction.id };
 } catch (err) {
 return {
 ok: false,
 message: err instanceof Error && err.message ? err.message : "Gagal mengirim bukti pembayaran",
 };
 }
}

// Memulai pembayaran via API (transaksi PENDING + reference gateway).
export async function createPaymentRequest(
 request: PaymentRequest,
): Promise<PaymentResponse> {
 try {
 const res = await apiFetch<{ transaction: Transaction }>("/api/payments", {
 method: "POST",
 body: JSON.stringify({
 billId: request.billId,
 studentId: request.studentId,
 amount: request.amount,
 paymentMethod: request.paymentMethod,
 }),
 });
 await refreshAll();
 return { success: true, transaction: res.transaction };
 } catch (err) {
 return {
 success: false,
 error: err instanceof Error && err.message ? err.message : undefined,
 };
 }
}