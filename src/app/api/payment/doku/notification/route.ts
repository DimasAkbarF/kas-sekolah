import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { json, withRouteErrors } from "@/lib/api";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// Lihat catatan pada pengecekan timestamp di bawah: jendela kesegaran
// webhook DOKU dibuat longgar agar pengulangan resmi dari DOKU tidak ditolak.
const TIMESTAMP_TOLERANCE_MS = 30 * 60 * 1000;

export const POST = withRouteErrors(async (request: Request) => {
 const text = await request.text();
 const db = await getDb();

 // Retrieve DOKU secret_key from gateway_settings DB or environment
 const gwRes = await db.query<{ secret_key: string }>(
 "SELECT secret_key FROM gateway_settings WHERE id = 1",
 );
 const dbSecret = gwRes.rows[0]?.secret_key?.trim();
 const secretKey = dbSecret || process.env.DOKU_SECRET_KEY;

 // 1. Signature Verification
 const signatureHeader = request.headers.get("Signature");
 const clientId = request.headers.get("Client-Id");
 const requestId = request.headers.get("Request-Id");
 const timestamp = request.headers.get("Request-Timestamp");
 const digestHeader = request.headers.get("Digest");

  if (!signatureHeader || !secretKey || !digestHeader || !requestId || !timestamp || !clientId) {
    return json({ ok: false, message: "Missing required headers or secret key" }, 403);
  }

  // Anti replay: signature saja tidak membuktikan request ini baru. Tanpa cek
  // ini, paket webhook yang pernah terekam bisa dikirim ulang kapan saja dan
  // tetap lolos verifikasi.
  //
  // Toleransinya 30 menit, bukan 5: DOKU mengirim ulang notifikasi bila belum
  // dapat HTTP 200, dan 5 menit akan menolak pengulangan yang sah sehingga
  // pembayaran tercatat belum lunas. Replay di luar jendela itu sendiri
  // sudah tidak berbahaya — lihat klaim atomik di bawah, notifikasi ulangan
  // hanya menghasilkan {ok:true} tanpa efek samping.
  const requestTime = Date.parse(timestamp);
  if (Number.isNaN(requestTime) || Math.abs(Date.now() - requestTime) > TIMESTAMP_TOLERANCE_MS) {
    return json({ ok: false, message: "request timestamp expired" }, 403);
  }


 // Verifikasi Digest. DOKU memakai base64 RAW tanpa prefix "SHA256=" (sesuai
 // format yang dikirim di create/route.ts). Terima juga varian ber-prefix agar
 // tidak gagal bila provider menambahkannya, lalu bandingkan dengan constant-time.
 const digestRaw = digestHeader.replace(/^SHA256=/, "");
 const expectedDigest = createHash("sha256").update(text).digest("base64");
 const digestA = Buffer.from(digestRaw);
 const digestB = Buffer.from(expectedDigest);
 if (digestA.length !== digestB.length || !timingSafeEqual(digestA, digestB)) {
 return json({ ok: false, message: "invalid digest" }, 403);
 }

 // Verifikasi Signature (base memakai digest raw tanpa prefix)
 const requestTarget = "/api/payment/doku/notification";
 const signatureBase = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${requestTarget}\nDigest:${digestRaw}`;
 const expectedSignature = createHmac("sha256", secretKey).update(signatureBase).digest("base64");

 const sigRaw = signatureHeader.replace(/^HMACSHA256=/, "");
 const sigA = Buffer.from(sigRaw);
 const sigB = Buffer.from(expectedSignature);
 if (sigA.length !== sigB.length || !timingSafeEqual(sigA, sigB)) {
 return json({ ok: false, message: "invalid signature" }, 403);
 }

 // 2. Process Notification
 interface DokuNotificationPayload {
 order?: {
 invoice_number?: string;
 amount?: number | string;
 status?: string;
 };
 transaction?: {
 status?: string;
 amount?: number | string;
 };
 // Struktur notifikasi Checkout: kanal pembayaran aktual yang dipakai.
 // Mis. "VIRTUAL_ACCOUNT_DOKU", "OVO", "DANA", "SHOPEEPAY", "QRIS".
 channel?: {
 id?: string;
 };
 }

 let body: DokuNotificationPayload;
 try {
 body = JSON.parse(text) as DokuNotificationPayload;
 } catch {
 return json({ ok: false, message: "invalid json" }, 400);
 }

 // Kanal aktual → payment_method agar catatan tidak menyebut "qris" bila
 // pembayaran lewat kanal lain.
 function mapDokuChannel(id: string): string {
 const c = id.toUpperCase();
 if (c === "DANA" || c === "OVO" || c === "GOPAY" || c === "SHOPEEPAY" || c.includes("WALLET")) {
 return "ewallet";
 }
 if (
 c.includes("VIRTUAL_ACCOUNT") ||
 /(?:^|_)VA(?:$|_)/.test(c) ||
 c.includes("CLICK") ||
 c.includes("KLIK") ||
 c.includes("_PAY") ||
 c.includes("_YAP")
 ) {
 return "bank_transfer";
 }
 if (c.includes("QRIS")) return "qris";
 return "qris";
 }
 const actualChannel = body.channel?.id ? mapDokuChannel(body.channel.id) : null;

 const order = body.order;
 const transactionData = body.transaction;
 const status = (transactionData?.status ?? order?.status ?? "").toUpperCase();

 if (!order || !order.invoice_number) {
 return json({ ok: false, message: "invalid payload: missing invoice_number" }, 400);
 }

 const txRes = await db.query<{
 id: string;
 status: string;
 amount: number;
 bill_id: string;
 student_id: string;
 }>(
 "SELECT id, status, amount, bill_id, student_id FROM transactions WHERE external_reference = $1",
 [order.invoice_number],
 );

 if (txRes.rows.length === 0) {
 return json({ ok: false, message: "transaction not found" }, 404);
 }

 const tx = txRes.rows[0];

 // 3. Idempotency Check
 if (tx.status === "PAID") {
 // Already processed and PAID; return HTTP 200 without re-triggering GAP
 return json({ ok: true });
 }

 // 4. Amount Verification. `order.amount` undefined → NaN, yang akan lolos dari
 // Number.isFinite di bawah sehingga notifikasi tanpa nominal tetap menandai
 // lunas. Tolak saja: nominal wajib ada.
 const notifiedAmount = Number(order.amount ?? transactionData?.amount);
 if (!Number.isFinite(notifiedAmount)) {
 console.error("DOKU Webhook missing amount:", order.invoice_number);
 return json({ ok: false, message: "missing amount" }, 400);
 }
 if (notifiedAmount !== tx.amount) {
 console.error(`DOKU Webhook Amount mismatch: expected ${tx.amount}, received ${notifiedAmount}`);
 return json({ ok: false, message: "amount mismatch" }, 400);
 }

 // 5. Check payment outcome
 const isSuccess = status === "SUCCESS" || status === "SUCCESSFUL" || status === "SETTLEMENT";

 if (!isSuccess) {
 if (status === "FAILED" || status === "EXPIRED" || status === "CANCELLED") {
 // Hanya boleh menutup transaksi yang masih PENDING. Tanpa guard ini,
 // notifikasi EXPIRED yang tiba bersamaan dengan SUCCESS akan menimpa
 // PAID menjadi EXPIRED — transaksi lunas jadi tidak lunas.
 await db.query(
 "UPDATE transactions SET status = $1 WHERE id = $2 AND status = 'PENDING'",
 [status, tx.id],
 );
 }
 return json({ ok: true });
 }

 // 6. Klaim PAID secara atomik. DOKU bisa mengirim notifikasi berulang hampir
 // bersamaan; tanpa guard di dalam UPDATE keduanya akan lolos dan mengirim
 // email + Sheets dua kali.
 const claim = await db.query(
 `UPDATE transactions
 SET status = 'PAID', paid_at = now(), payment_method = COALESCE($2, payment_method)
 WHERE id = $1 AND status <> 'PAID'
 RETURNING id`,
 [tx.id, actualChannel],
 );
 if (claim.rows.length === 0) {
 return json({ ok: true });
 }

 // 7. Trigger Google Apps Script (GAP) for Email Notification & Sheets Sync
 const gasUrlStr = process.env.GAS_WEB_APP_URL;
 if (gasUrlStr) {
 try {
 const info = await db.query<{
 student_name: string;
 email: string;
 bill_name: string;
 amount: number;
 paid_at: Date;
 }>(
 `SELECT s.name as student_name, u.email, b.name as bill_name, t.amount, t.paid_at
 FROM transactions t
 JOIN students s ON t.student_id = s.id
 JOIN users u ON s.user_id = u.id
 JOIN bills b ON t.bill_id = b.id
 WHERE t.id = $1`,
 [tx.id],
 );

 if (info.rows.length > 0) {
 const data = info.rows[0];
 const payload = {
 transaction_id: tx.id,
 nama_mahasiswa: data.student_name,
 email: data.email,
 nominal: data.amount,
 tanggal_bayar: data.paid_at ? new Date(data.paid_at).toISOString() : new Date().toISOString(),
 bulan_tagihan: data.bill_name,
 };

 // Non-blocking trigger with retry (max 2 attempts)
 for (let attempt = 0; attempt < 2; attempt++) {
 try {
 const resp = await fetch(gasUrlStr, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(payload),
 });
 if (resp.ok) break;
 console.warn(`GAS trigger attempt ${attempt + 1} status: ${resp.status}`);
 } catch (e) {
 if (attempt === 1) console.error("GAS sync failed after retry:", e);
 }
 }
 }
 } catch (gasErr) {
 console.error("Error executing GAP notification:", gasErr);
 }
 }

 return json({ ok: true });
});
