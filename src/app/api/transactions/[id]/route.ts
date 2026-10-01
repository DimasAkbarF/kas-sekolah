import { z } from "zod";
import { getDb } from "@/lib/db";
import { applyScope, error, guard, json, parseBody, unauthorized, withRouteErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

// Semua akses by-id diverifikasi terhadap kelas user sebelum membaca/menulis.
function scopedId(user: { classId: string | null; role: string }, id: string) {
 const conds: string[] = ["t.id = $1"];
 const vals: unknown[] = [id];
 applyScope(user as never, conds, vals, "t");
 return { where: conds.join(" AND "), vals };
}

const PATCH_SCHEMA = z.object({
 status: z.enum(["PAID", "CANCELLED"]),
});

// Satu transaksi lengkap termasuk bukti transfer. Dipanggil saat dialog bukti
// dibuka: daftar sengaja tidak membawa gambar (1 MB per baris).
export const GET = withRouteErrors(
 async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
 const auth = await guard(["super_admin", "class_admin", "treasurer"]);
 if (!auth.ok) return unauthorized(auth);

 const { id } = await params;
 const db = await getDb();
 const scope = scopedId(auth.user, id);
 const tx = await db.query(
 `SELECT t.id, t.bill_id AS "billId", t.student_id AS "studentId", t.amount,
 t.payment_method AS "paymentMethod", t.status,
 t.external_reference AS "externalReference", t.proof_image AS "proofImage",
 t.method_id AS "methodId", t.paid_at AS "paidAt", t.created_at AS "createdAt",
 s.name AS "studentName", b.name AS "billName", b.amount AS "billAmount"
 FROM transactions t
 JOIN students s ON s.id = t.student_id
 JOIN bills b ON b.id = t.bill_id
 WHERE ${scope.where}`,
 scope.vals,
 );
 if (tx.rows.length === 0) return error("Transaksi tidak ditemukan.", 404);
 return json({ transaction: tx.rows[0] });
 },
);

export const PATCH = withRouteErrors(
 async (
 request: Request,
 { params }: { params: Promise<{ id: string }> },
 ) => {
 const auth = await guard(["super_admin", "class_admin", "treasurer"]);
 if (!auth.ok) return unauthorized(auth);

 const { id } = await params;
 const body = await parseBody(request, PATCH_SCHEMA);
 if (!body.ok) return body.response;

 const db = await getDb();
 const scope = scopedId(auth.user, id);
 const tx = await db.query(
 `SELECT t.id, t.status, t.bill_id AS "billId", t.student_id AS "studentId"
 FROM transactions t WHERE ${scope.where}`,
 scope.vals,
 );
 if (tx.rows.length === 0) return error("Transaksi tidak ditemukan.", 404);
 if (tx.rows[0].status !== "PENDING") return error("Hanya transaksi PENDING yang dapat diubah.", 400);

 const newStatus = body.value.status;
 if (newStatus === "PAID") {
 const dup = await db.query(
 "SELECT id FROM transactions WHERE bill_id = $1 AND student_id = $2 AND status = 'PAID'",
 [tx.rows[0].billId, tx.rows[0].studentId],
 );
 if (dup.rows.length > 0) return error("Tagihan ini sudah dibayar lunas.", 409);
 }
  // Parameter scope.vals sudah memakai $1..$n, jadi newStatus harus menjadi
  // placeholder SESUDAH-nya. Menaruhnya di depan menggeser semua placeholder
  // scope sehingga $1 dipakai untuk dua nilai sekaligus dan Postgres menolak
  // statement-nya ("requires 1"): konfirmasi pembayaran selalu berakhir 500 dan
  // transaksi tidak pernah berubah sama sekali.
  const statusParam = `$${scope.vals.length + 1}`;
  await db.query(
  `UPDATE transactions AS t SET status = ${statusParam}, paid_at = CASE WHEN ${statusParam} = 'PAID' THEN now() ELSE paid_at END WHERE ${scope.where}`,
  [...scope.vals, newStatus],
  );

 if (newStatus === "PAID") {
 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'payment_confirm', 'transaction', $2)",
 [auth.user.id, id],
 );
 } else {
 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'payment_cancel', 'transaction', $2)",
 [auth.user.id, id],
 );
 }

 return json({ ok: true, status: newStatus });
});

export const DELETE = withRouteErrors(
 async (
 _request: Request,
 { params }: { params: Promise<{ id: string }> },
 ) => {
 const auth = await guard(["super_admin", "class_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const { id } = await params;
 const db = await getDb();
 const scope = scopedId(auth.user, id);
 const tx = await db.query(`SELECT t.id FROM transactions t WHERE ${scope.where}`, scope.vals);
 if (tx.rows.length === 0) return error("Transaksi tidak ditemukan.", 404);

 await db.query(`DELETE FROM transactions AS t WHERE ${scope.where}`, scope.vals);
 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'transaction_delete', 'transaction', $2)",
 [auth.user.id, id],
 );
 return json({ ok: true });
});
