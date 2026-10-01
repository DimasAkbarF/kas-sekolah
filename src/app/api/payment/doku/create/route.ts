import { randomUUID, createHmac, createHash } from "node:crypto";
import { guard, json, parseBody, parseJsonArray, unauthorized, withRouteErrors } from "@/lib/api";
import { getDb } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const SCHEMA = z.object({
 billId: z.string().min(1),
});

export const POST = withRouteErrors(async (request: Request) => {
 const auth = await guard(["student", "super_admin", "class_admin", "treasurer"]);
 if (!auth.ok) return unauthorized(auth);

 const body = await parseBody(request, SCHEMA);
 if (!body.ok) return body.response;

 const db = await getDb();

 const billRes = await db.query<{
 id: string;
 name: string;
 amount: number;
 target_type: string;
 target_ids: string[] | string;
 status: string;
 class_id: string | null;
 }>(
 "SELECT id, name, amount, target_type, target_ids, status, class_id FROM bills WHERE id = $1",
 [body.value.billId],
 );
 if (billRes.rows.length === 0) return json({ ok: false, message: "Tagihan tidak ditemukan" }, 404);
 const bill = billRes.rows[0];

 if (bill.status !== "active") {
 return json({ ok: false, message: "Tagihan tidak aktif" }, 400);
 }

 let studentId: string;
 if (auth.user.role === "student") {
 const own = await db.query(
 "SELECT id, class_id FROM students WHERE user_id = $1 AND archived = false",
 [auth.user.id],
 );
 if (own.rows.length === 0) return json({ ok: false, message: "Akun siswa tidak ditemukan" }, 404);
 studentId = String(own.rows[0].id);
 const studentClassId = (own.rows[0].class_id as string | null) ?? null;

 // Tagihan harus benar-benar berlaku untuk siswa ini: boleh `specific`
 // (siswa ada di daftar) atau `class` (tagihan milik kelasnya sendiri).
 // Tanpa cek `class_id` di sini, siswa bisa membayar tagihan kelas lain.
 const targetType = bill.target_type;
 const targetIds = parseJsonArray(bill.target_ids) as string[];

 if (targetType === "specific" && !targetIds.includes(studentId)) {
 return json({ ok: false, message: "Tagihan tidak berlaku untuk siswa ini" }, 403);
 }
 if (targetType === "class" && bill.class_id !== null && bill.class_id !== studentClassId) {
 return json({ ok: false, message: "Tagihan tidak berlaku untuk kelas siswa ini" }, 403);
 }
 } else {
 return json({ ok: false, message: "Pilihan siswa diperlukan untuk akun non-siswa" }, 400);
 }

 // Cegah pembayaran ganda. PENDING juga dihitung: `uq_tx_active` akan menolak
 // insert kedua, jadi lebih baik dispesifikan supaya siswa dapat pesan jelas
 // alih-alih 500.
 const existingPaid = await db.query(
 "SELECT id, status FROM transactions WHERE bill_id = $1 AND student_id = $2 AND status IN ('PENDING', 'PAID')",
 [bill.id, studentId],
 );
 if (existingPaid.rows.length > 0) {
 const pending = existingPaid.rows[0].status === "PENDING";
 return json(
 {
 ok: false,
 message: pending
 ? "Pembayaran ini sedang diproses. Tunggu sebentar sebelum mencoba lagi."
 : "Tagihan ini sudah lunas",
 },
 409,
 );
 }

 // Retrieve DOKU configuration from DB (gateway_settings) with fallback to env
 const gwRes = await db.query<{
 provider: string;
 environment: string;
 client_id: string;
 secret_key: string;
 notification_url: string;
 }>("SELECT provider, environment, client_id, secret_key, notification_url FROM gateway_settings WHERE id = 1");

 const gw = gwRes.rows[0];
 const clientId = (gw?.client_id && gw.client_id.trim()) || process.env.DOKU_CLIENT_ID || "";
 const secretKey = (gw?.secret_key && gw.secret_key.trim()) || process.env.DOKU_SECRET_KEY || "";
 const envMode = (gw?.environment && gw.environment.trim()) || process.env.DOKU_ENV || "sandbox";

 if (!clientId || !secretKey) {
 return json({ ok: false, message: "Layanan pembayaran belum siap. Hubungi admin sekolah." }, 503);
 }

 const invoiceRef = `KAS-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
 const txId = randomUUID();
 await db.query(
 "INSERT INTO transactions (id, bill_id, student_id, amount, payment_method, status, external_reference) VALUES ($1, $2, $3, $4, $5, $6, $7)",
 [txId, bill.id, studentId, bill.amount, "qris", "PENDING", invoiceRef],
 );

 // Transaksi sudah PENDING sebelum DOKU dipanggil, jadi setiap jalur gagal
 // setelah titik ini WAJIB menutupnya lagi. Kalau tidak, `uq_tx_active`
 // memblokir semua percobaan bayar berikutnya untuk tagihan ini (siswa
 // terkunci permanen karena tidak ada webhook yang akan pernah datang).
 const abandon = async (reason: string) => {
 await db
 .query("UPDATE transactions SET status = 'EXPIRED' WHERE id = $1 AND status = 'PENDING'", [txId])
 .catch((err) => console.error("[doku] gagal menutup transaksi PENDING", reason, err));
 };

 const callbackUrl =
 (gw?.notification_url && gw.notification_url.trim()) ||
 `${process.env.BASE_URL ?? "http://localhost:3000"}/api/payment/doku/notification`;

 const dokuPayload = {
 order: {
 invoice_number: invoiceRef,
 amount: bill.amount,
 currency: "IDR",
 description: bill.name,
 },
 payment: {
 payment_due_date: 60,
 },
 callback_url: callbackUrl,
 };

 const requestId = randomUUID();
 const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
 const payloadString = JSON.stringify(dokuPayload);

 // DOKU Signature generation (Digest is base64 hash of payload without prefix)
 const digest = createHash("sha256").update(payloadString).digest("base64");
 const requestTarget = "/checkout/v1/payment";
 const signatureBase = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${requestTarget}\nDigest:${digest}`;
 const signature = createHmac("sha256", secretKey).update(signatureBase).digest("base64");

 const primaryUrl =
 envMode === "production"
 ? "https://api.doku.com/checkout/v1/payment"
 : "https://api-sandbox.doku.com/checkout/v1/payment";

 const headers = {
 "Content-Type": "application/json",
 "Client-Id": clientId,
 "Request-Id": requestId,
 "Request-Timestamp": timestamp,
 Signature: `HMACSHA256=${signature}`,
 Digest: digest,
 };

 let dokuResponse: Response;
 try {
 dokuResponse = await fetch(primaryUrl, {
 method: "POST",
 headers,
 body: payloadString,
 signal: AbortSignal.timeout(20_000),
 });
 } catch (err) {
 console.error("[doku] panggilan create payment gagal:", err);
 await abandon("fetch-error");
 return json({ ok: false, message: "Tidak dapat menghubungi layanan pembayaran. Coba lagi." }, 502);
 }

 if (!dokuResponse.ok) {
 const errText = await dokuResponse.text();
 console.error("DOKU create payment error:", dokuResponse.status, errText);
 let errMsg = "Gagal membuat sesi pembayaran DOKU";
 try {
 const parsed = JSON.parse(errText);
 errMsg = parsed.error?.message ?? parsed.message?.[0] ?? errMsg;
 } catch (parseErr) {
 console.error("[doku] body error tidak bisa dibaca:", parseErr);
 }
 await abandon(`doku-${dokuResponse.status}`);
 return json({ ok: false, message: errMsg }, 502);
 }

 let dokuData: Record<string, unknown>;
 try {
 dokuData = (await dokuResponse.json()) as Record<string, unknown>;
 } catch (err) {
 console.error("[doku] body sukses tidak bisa dibaca:", err);
 await abandon("bad-json");
 return json({ ok: false, message: "Respons pembayaran tidak valid. Coba lagi." }, 502);
 }
 const data = dokuData as {
 response?: { payment?: { url?: string } };
 payment?: { url?: string };
 checkout_url?: string;
 payment_url?: string;
 redirect_url?: string;
 };
 const paymentUrl =
 data.response?.payment?.url ??
 data.payment?.url ??
 data.checkout_url ??
 data.payment_url ??
 data.redirect_url;

 if (!paymentUrl) {
 console.error("DOKU response missing checkout URL:", dokuData);
 await abandon("no-url");
 return json({ ok: false, message: "URL pembayaran tidak ditemukan dari respons DOKU" }, 502);
 }

 return json({ ok: true, paymentUrl }, 201);
});