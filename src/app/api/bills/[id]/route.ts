import { z } from "zod";
import { getDb } from "@/lib/db";
import { applyScope, error, guard, json, parseBody, parseJsonArray, unauthorized, withRouteErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const UPDATE_SCHEMA = z.object({
 name: z.string().trim().min(1).max(120).optional(),
 category: z.string().trim().min(1).max(80).optional(),
 amount: z.number().int().positive().optional(),
 period: z.string().trim().min(1).max(30).optional(),
 startDate: z.string().min(1).optional(),
 dueDate: z.string().min(1).optional(),
 targetType: z.enum(["all", "class", "specific"]).optional(),
 targetIds: z.array(z.string().max(64)).optional(),
 status: z.enum(["active", "inactive", "expired"]).optional(),
});

// Tulis: Admin Kelas hanya boleh mengubah tagihan kelasnya sendiri. Tagihan
// sekolah (class_id NULL) terbaca tapi tidak bisa diedit/dihapus Admin Kelas --
// kalau tidak, satu kelas bisa mengubah tagihan yang berlaku untuk semua siswa.
function billWriteScope(user: Parameters<typeof applyScope>[0], id: string) {
 const conds: string[] = ["b.id = $1"];
 const vals: unknown[] = [id];
 applyScope(user, conds, vals, "b");
 return { where: conds.join(" AND "), vals };
}

export const PATCH = withRouteErrors(async (
 request: Request,
 { params }: { params: Promise<{ id: string }> },
) => {
 const auth = await guard(["super_admin", "class_admin", "treasurer"]);
 if (!auth.ok) return unauthorized(auth);

 const { id } = await params;
 const body = await parseBody(request, UPDATE_SCHEMA);
 if (!body.ok) return body.response;

 const db = await getDb();
 const scope = billWriteScope(auth.user, id);
 const existing = await db.query(`SELECT b.id FROM bills b WHERE ${scope.where}`, scope.vals);
 if (existing.rows.length === 0) return error("Tagihan tidak ditemukan.", 404);

 const sets: string[] = [];
 const vals: unknown[] = [id];
 const fields: [string, string][] = [
 ["name", "name"],
 ["category", "category"],
 ["amount", "amount"],
 ["period", "period"],
 ["startDate", "start_date"],
 ["dueDate", "due_date"],
 ["targetType", "target_type"],
 ["status", "status"],
 ];
 const bodyAny = body.value as Record<string, unknown>;
 for (const [key, col] of fields) {
 if (bodyAny[key] !== undefined) {
 sets.push(`${col} = $${vals.length + 1}`);
 vals.push(bodyAny[key]);
 }
 }
 if (bodyAny.targetIds !== undefined) {
 sets.push(`target_ids = $${vals.length + 1}`);
 vals.push(JSON.stringify(bodyAny.targetIds));
 }
 if (sets.length > 0) {
 await db.query(`UPDATE bills SET ${sets.join(", ")} WHERE id = $1`, vals);
 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'bill_update', 'bill', $2)",
 [auth.user.id, id],
 );
 }

 const { rows } = await db.query<{
 id: string;
 classId: string | null;
 name: string;
 category: string;
 amount: number;
 period: string;
 startDate: string;
 dueDate: string;
 targetType: string;
 targetIds: string[] | string;
 status: string;
 createdAt: string;
 }>(
 `SELECT id, class_id AS "classId", name, category, amount, period,
 start_date AS "startDate", due_date AS "dueDate",
 target_type AS "targetType", target_ids AS "targetIds",
 status, created_at AS "createdAt"
 FROM bills WHERE id = $1`,
 [id],
 );
 const bill = rows[0];
 return json({ bill: { ...bill, targetIds: parseJsonArray(bill.targetIds) } });
});

export const DELETE = withRouteErrors(async (
 _request: Request,
 { params }: { params: Promise<{ id: string }> },
) => {
 const auth = await guard(["super_admin", "class_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const { id } = await params;
 const db = await getDb();
 const scope = billWriteScope(auth.user, id);
 const { rows } = await db.query(`SELECT b.id FROM bills b WHERE ${scope.where}`, scope.vals);
 if (rows.length === 0) return error("Tagihan tidak ditemukan.", 404);

 const paid = await db.query<{ count: number }>(
 "SELECT COUNT(*)::int AS count FROM transactions WHERE bill_id = $1 AND status = 'PAID'",
 [id],
 );
 if (Number(paid.rows[0].count) > 0) {
 return error(
 "Tidak dapat menghapus tagihan yang sudah memiliki transaksi lunas. Hapus riwayat pembayarannya terlebih dahulu.",
 409,
 );
 }

 await db.query("DELETE FROM transactions WHERE bill_id = $1", [id]);
 await db.query("DELETE FROM bills WHERE id = $1", [id]);
 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'bill_delete', 'bill', $2)",
 [auth.user.id, id],
 );
 return json({ ok: true });
});