import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
 applyScope,
 error,
 guard,
 json,
 parseBody,
 unauthorized,
 userClassId,
 withRouteErrors,
} from "@/lib/api";

export const dynamic = "force-dynamic";

const CREATE_SCHEMA = z.object({
 billId: z.string().min(1).max(64),
 studentId: z.string().min(1).max(64),
 amount: z.number().int().positive(),
 paymentMethod: z.enum(["bank_transfer", "ewallet", "cash", "qris"]),
});

export const GET = withRouteErrors(async (request: Request) => {
 const auth = await guard(["super_admin", "class_admin", "treasurer", "student"]);
 if (!auth.ok) return unauthorized(auth);

 const url = new URL(request.url);
 const status = url.searchParams.get("status");
 const studentId = url.searchParams.get("studentId");
 const search = url.searchParams.get("search")?.toLowerCase();

 const db = await getDb();
 const conds: string[] = [];
 const vals: unknown[] = [];
 if (auth.user.role === "student") {
 const own = await db.query(
 "SELECT id FROM students WHERE user_id = $1 AND archived = false",
 [auth.user.id],
 );
 if (own.rows.length === 0) return json({ transactions: [], className: "" });
 conds.push(`t.student_id = $${vals.push(String(own.rows[0].id))}`);
 }
 // Admin Kelas: hanya transaksi kelasnya._tx.class_id ikut ditulis saat insert.
 applyScope(auth.user, conds, vals, "t");
 if (status) conds.push(`t.status = $${vals.push(status)}`);
 if (studentId) conds.push(`t.student_id = $${vals.push(studentId)}`);
 if (search) conds.push(`(lower(s.name) LIKE $${vals.push(`%${search}%`)} OR t.id LIKE $${vals.push(`%${search}%`)} OR lower(t.external_reference) LIKE $${vals.push(`%${search}%`)})`);

 // limit/offset opsional. Tanpa keduanya endpoint tetap mengembalikan seluruh
 // data (dipakai sinkronisasi store klien); halaman daftar mengirim parameternya
 // sendiri untuk tidak menarik ratusan baris.
 const limitParam = Number(url.searchParams.get("limit"));
 const offsetParam = Number(url.searchParams.get("offset") ?? 0);
 const usePaging = Number.isFinite(limitParam) && limitParam > 0;
 const limit = Math.min(Math.trunc(limitParam), 200);
 const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? Math.trunc(offsetParam) : 0;

 const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
 // Bukti transfer (data-URL bisa 1 MB per baris) TIDAK ikut daftar. Klien
 // hanya menerima penanda hasProof dan mengambil gambarnya lewat
 // GET /api/transactions/[id] saat dialog dibuka.
 const { rows } = await db.query<{ classId: string | null; methodName: string | null }>(
 `SELECT t.id, t.bill_id AS "billId", t.student_id AS "studentId", t.amount,
 t.class_id AS "classId",
 t.payment_method AS "paymentMethod", t.status,
 t.external_reference AS "externalReference",
 (t.proof_image IS NOT NULL AND t.proof_image <> '') AS "hasProof",
 t.method_id AS "methodId", t.paid_at AS "paidAt", t.created_at AS "createdAt",
 s.name AS "studentName", b.name AS "billName", b.amount AS "billAmount",
 pm.name AS "methodName"
 FROM transactions t
 JOIN students s ON s.id = t.student_id
 JOIN bills b ON b.id = t.bill_id
 LEFT JOIN payment_methods pm ON pm.id = t.method_id
 ${where}
 ORDER BY t.created_at DESC
 ${usePaging ? `LIMIT $${vals.push(limit)} OFFSET $${vals.push(offset)}` : "LIMIT 500"}`,
 vals,
 );

 const countRes = await db.query<{ count: number }>(
 `SELECT count(*)::int AS count
 FROM transactions t
 JOIN students s ON s.id = t.student_id
 JOIN bills b ON b.id = t.bill_id
 ${where}`,
 vals.slice(0, vals.length - (usePaging ? 2 : 0)),
 );

 // Label kelas diambil dari tabel kelas (bukan seluruh roster siswa), supaya
 // Admin Kelas tidak menarik data siswa sekolah lain hanya untuk bikin label.
 const classNames = new Map<string, string>(
 (
 await db.query<{ classId: string; className: string }>(
 `SELECT id AS "classId", name AS "className" FROM classes`,
 )
 ).rows.map((r) => [r.classId, r.className]),
 );
 return json({
 transactions: rows.map((r) => ({
 ...r,
 methodName: r.methodName ?? null,
 className: classNames.get(r.classId ?? "") ?? "",
 })),
 total: countRes.rows[0]?.count ?? rows.length,
 limit: usePaging ? limit : null,
 offset: usePaging ? offset : 0,
 });
});

// Pencatatan pembayaran manual (tunai) langsung PAID, tanpa gateway.
export const POST = withRouteErrors(async (request: Request) => {
 const auth = await guard(["super_admin", "class_admin", "treasurer"]);
 if (!auth.ok) return unauthorized(auth);

 const body = await parseBody(request, CREATE_SCHEMA);
 if (!body.ok) return body.response;

 const db = await getDb();
 const bill = await db.query("SELECT id, amount FROM bills WHERE id = $1 AND status = 'active'", [body.value.billId]);
 if (bill.rows.length === 0) return error("Tagihan tidak ditemukan atau tidak aktif.", 404);
 if (bill.rows[0].amount !== body.value.amount) return error("Nominal tidak sesuai tagihan.", 400);
 // Siswa yang dibayar harus berada di kelas Admin Kelas (anti-IDOR).
 const studentConds: string[] = ["id = $1", "archived = false"];
 const studentVals: unknown[] = [body.value.studentId];
 applyScope(auth.user, studentConds, studentVals, "students");
 const student = await db.query<{ class_id: string | null }>(
 `SELECT class_id FROM students WHERE ${studentConds.join(" AND ")}`,
 studentVals,
 );
 if (student.rows.length === 0) return error("Siswa tidak ditemukan.", 404);

 const existing = await db.query(
 "SELECT status FROM transactions WHERE bill_id = $1 AND student_id = $2",
 [body.value.billId, body.value.studentId],
 );
 if (existing.rows.some((r) => r.status === "PAID")) {
 return error("Tagihan ini sudah dibayar lunas.", 400);
 }

 const id = randomUUID();
 await db.query(
 `INSERT INTO transactions (id, bill_id, student_id, amount, payment_method, status, paid_at, external_reference, class_id)
 VALUES ($1, $2, $3, $4, $5, 'PAID', now(), $6, $7)`,
 [
 id,
 body.value.billId,
 body.value.studentId,
 body.value.amount,
 body.value.paymentMethod,
 `manual-${id.slice(0, 8)}`,
 student.rows[0].class_id ?? userClassId(auth.user),
 ],
 );
 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'transaction_create', 'transaction', $2)",
 [auth.user.id, id],
 );

 return json({ transaction: { id, ...body.value, status: "PAID", paidAt: new Date().toISOString(), createdAt: new Date().toISOString() } }, 201);
});