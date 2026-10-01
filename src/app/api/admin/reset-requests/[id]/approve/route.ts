import { z } from "zod";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { applyScope, error, guard, json, parseBody, unauthorized, withRouteErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const SCHEMA = z.object({
 newPassword: z
 .string()
 .min(PASSWORD_MIN_LENGTH, `Password minimal ${PASSWORD_MIN_LENGTH} karakter`)
 .max(200),
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

 // Setujui hanya permintaan siswa di kelas Admin Kelas (anti-IDOR lintas kelas).
 const conds: string[] = ["r.id = $1"];
 const vals: unknown[] = [id];
 applyScope(auth.user, conds, vals, "s");
 const reqRes = await db.query<{
 id: string;
 student_id: string;
 nisn: string;
 student_name: string;
 status: string;
 }>(
 `SELECT r.id, r.student_id, r.nisn, r.student_name, r.status
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

 // Retrieve student
 const studentRes = await db.query<{
 id: string;
 user_id: string | null;
 nisn: string;
 name: string;
 classId: string | null;
 }>("SELECT id, user_id, nisn, name, class_id AS \"classId\" FROM students WHERE id = $1", [resetReq.student_id]);

 if (studentRes.rows.length === 0) {
 return error("Data siswa tidak ditemukan.", 404);
 }

 const student = studentRes.rows[0];
 const hash = await hashPassword(body.value.newPassword);
 const userId = student.user_id ?? `su-${student.id}`;
 const studentEmail = `nisn-${student.nisn}@student.sma-n1.sch.id`;

 // Upsert user record
 await db.query(
 `INSERT INTO users (id, nisn, email, password_hash, name, role, class_id)
 VALUES ($1, $2, $3, $4, $5, 'student', $6)
 ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash,
 class_id = EXCLUDED.class_id`,
 [userId, student.nisn, studentEmail, hash, student.name, student.classId ?? null],
 );

 // Password baru → cabut semua sesi lama milik user tsb.
 await db.query("DELETE FROM sessions WHERE user_id = $1", [userId]);

 // Link user_id to students if not already linked
 if (!student.user_id) {
 await db.query("UPDATE students SET user_id = $1 WHERE id = $2", [userId, student.id]);
 }

 // Mark request as approved
 await db.query(
 `UPDATE password_reset_requests
 SET status = 'approved',
 resolved_by = $1,
 resolved_at = now()
 WHERE id = $2`,
 [auth.user.id, id],
 );

 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'reset_request_approve', 'password_reset_request', $2)",
 [auth.user.id, id],
 );

 return json({ ok: true, message: "Password siswa berhasil diperbarui." });
});
