import { z } from "zod";
import { getDb } from "@/lib/db";
import { applyScope, error, guard, json, parseBody, unauthorized, withRouteErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const SCHEMA = z.object({
 note: z.string().trim().max(500).optional(),
});

export const POST = withRouteErrors(async (
 request: Request,
 { params }: { params: Promise<{ id: string }> },
) => {
 const auth = await guard(["super_admin", "class_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const { id } = await params;
 const body = await parseBody(request, SCHEMA);
 if (!body.ok) return body.response;

 const db = await getDb();

 const conds: string[] = ["r.id = $1"];
 const vals: unknown[] = [id];
 applyScope(auth.user, conds, vals, "s");
 const reqRes = await db.query<{
 id: string;
 status: string;
 }>(
 `SELECT r.id, r.status
 FROM password_reset_requests r
 JOIN students s ON s.id = r.student_id
 WHERE ${conds.join(" AND ")}`,
 vals,
 );

 if (reqRes.rows.length === 0) {
 return error("Permintaan tidak ditemukan.", 404);
 }

 const resetReq = reqRes.rows[0];
 if (resetReq.status !== "pending") {
 return error("Permintaan ini sudah diproses sebelumnya.", 400);
 }

 await db.query(
 `UPDATE password_reset_requests
 SET status = 'rejected',
 admin_note = $1,
 resolved_by = $2,
 resolved_at = now()
 WHERE id = $3`,
 [body.value.note || null, auth.user.id, id],
 );

 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'reset_request_reject', 'password_reset_request', $2)",
 [auth.user.id, id],
 );

 return json({ ok: true, message: "Permintaan reset password telah ditolak." });
});
