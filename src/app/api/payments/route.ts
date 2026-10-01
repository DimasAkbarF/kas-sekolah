import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
 applyScope,
 applyScopeWithSchoolWide,
 error,
 guard,
 json,
 parseBody,
 parseJsonArray,
 unauthorized,
 userClassId,
 withRouteErrors,
} from "@/lib/api";
import { imageDataUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SCHEMA = z.object({
 billId: z.string().min(1).max(64),
 amount: z.number().int().positive(),
 paymentMethod: z.enum(["bank_transfer", "ewallet", "cash", "qris"]),
 studentId: z.string().min(1).max(64).optional(),
 methodId: z.string().min(1).max(64).optional(),
 proofImage: imageDataUrl(1_000_000, "Bukti transfer harus PNG/JPG/WebP maksimal 1 MB").optional(),
});

// Memulai pembayaran: membuat transaksi PENDING + reference untuk gateway.
// Integrasi gateway asli menyusul; endpoint sudah menyiapkan contract-nya.
export const POST = withRouteErrors(async (request: Request) => {
 const auth = await guard(["student", "super_admin", "class_admin", "treasurer"]);
 if (!auth.ok) return unauthorized(auth);

 const body = await parseBody(request, SCHEMA);
 if (!body.ok) return body.response;

 const db = await getDb();
 // Scope bill: Admin Kelas hanya tagihan kelasnya + tagihan sekolah.
 const billConds: string[] = ["id = $1"];
 const billVals: unknown[] = [body.value.billId];
 applyScopeWithSchoolWide(auth.user, billConds, billVals, "b");
 const bill = await db.query(
 `SELECT id, name, amount, status, class_id AS "classId",
 target_type AS "targetType", target_ids AS "targetIds"
 FROM bills b WHERE ${billConds.join(" AND ")}`,
 billVals,
 );
 if (bill.rows.length === 0) return error("Tagihan tidak ditemukan.", 404);
 if (bill.rows[0].status !== "active") return error("Tagihan tidak aktif.", 400);
 if (bill.rows[0].amount !== body.value.amount) return error("Nominal tidak sesuai tagihan.", 400);

 let studentId: string;
 let studentClassId: string | null = null;
 if (auth.user.role === "student") {
 const own = await db.query<{ id: string; class_id: string | null }>(
 "SELECT id, class_id FROM students WHERE user_id = $1 AND archived = false",
 [auth.user.id],
 );
 if (own.rows.length === 0) return error("Akun siswa tidak ditemukan.", 404);
 studentId = String(own.rows[0].id);
 studentClassId = own.rows[0].class_id ?? null;
 const target = bill.rows[0] as { targetType: string; targetIds: string[] | string; classId: string | null };
 // Tagihan milik kelas lain tidak berlaku untuk siswa ini (class_id null = sekolah).
 if (target.classId && target.classId !== studentClassId) {
 return error("Tagihan tidak berlaku untuk siswa ini.", 403);
 }
 const targetIds = parseJsonArray(target.targetIds) as string[];
 if (target.targetType === "specific" && !targetIds.includes(studentId)) {
 return error("Tagihan tidak berlaku untuk siswa ini.", 403);
 }
 } else {
 if (!body.value.studentId) return error("Siswa wajib dipilih.", 400);
 // Admin Kelas hanya boleh membuat pembayaran untuk siswa kelasnya.
 const sConds: string[] = ["id = $1", "archived = false"];
 const sVals: unknown[] = [body.value.studentId];
 applyScope(auth.user, sConds, sVals, "students");
 const s = await db.query<{ class_id: string | null }>(
 `SELECT class_id FROM students WHERE ${sConds.join(" AND ")}`,
 sVals,
 );
 if (s.rows.length === 0) return error("Siswa tidak ditemukan.", 400);
 studentId = body.value.studentId;
 studentClassId = s.rows[0].class_id;
 }

 const id = randomUUID();
 const reference = `KS-${Date.now().toString(36)}-${id.slice(0, 6)}`;
 const existing = await db.query(
 "SELECT status FROM transactions WHERE bill_id = $1 AND student_id = $2",
 [body.value.billId, studentId],
 );
 if (existing.rows.some((r) => r.status === "PAID")) {
 return error("Tagihan ini sudah dibayar lunas.", 400);
 }
 if (existing.rows.some((r) => r.status === "PENDING")) {
 return error("Masih ada pembayaran tagihan ini yang menunggu konfirmasi.", 400);
 }
 await db.query(
 `INSERT INTO transactions (id, bill_id, student_id, amount, payment_method, status, external_reference, proof_image, method_id, class_id)
 VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7, $8, $9)`,
 [
 id,
 body.value.billId,
 studentId,
 body.value.amount,
 body.value.paymentMethod,
 reference,
 body.value.proofImage ?? "",
 body.value.methodId ?? null,
 studentClassId ?? userClassId(auth.user),
 ],
 );

 return json(
 {
 transaction: {
 id,
 billId: body.value.billId,
 studentId,
 amount: body.value.amount,
 paymentMethod: body.value.paymentMethod,
 status: "PENDING",
 externalReference: reference,
 proofImage: body.value.proofImage ?? "",
 methodId: body.value.methodId ?? null,
 createdAt: new Date().toISOString(),
 },
 },
 201,
 );
});