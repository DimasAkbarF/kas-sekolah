import { z } from "zod";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { error, guard, json, parseBody, unauthorized, withRouteErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const UPDATE_SCHEMA = z.object({
 name: z.string().trim().min(1).max(120).optional(),
 role: z.enum(["super_admin", "class_admin"]).optional(),
 classId: z.string().trim().max(64).nullable().optional(),
 password: z
 .string()
 .min(PASSWORD_MIN_LENGTH, `Password minimal ${PASSWORD_MIN_LENGTH} karakter`)
 .max(200)
 .optional(),
});

/**
 * Edit akun admin: ganti nama, pindah kelas, atau reset password.
 * Memindahkan kelas langsung menutup workspace admin lama dan membuka yang baru
 * karena guard() membaca classId dari session.
 */
export const PATCH = withRouteErrors(
 async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
 const auth = await guard(["super_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const { id } = await params;
 const body = await parseBody(request, UPDATE_SCHEMA);
 if (!body.ok) return body.response;
 const v = body.value;

 const db = await getDb();
 const current = await db.query<{ id: string; role: string; class_id: string | null }>(
 "SELECT id, role, class_id FROM users WHERE id = $1",
 [id],
 );
 if (current.rows.length === 0) return error("Akun admin tidak ditemukan.", 404);
 if (current.rows[0].role === "student") {
 return error("Akun siswa dikelola dari halaman Siswa, bukan dari sini.", 400);
 }

 const nextRole = v.role ?? current.rows[0].role;
 const nextClassId = v.classId !== undefined ? v.classId : current.rows[0].class_id;
 if (nextRole === "class_admin" && !nextClassId) {
 return error("Admin Kelas harus ditugaskan ke satu kelas.", 400);
 }
 if (nextClassId) {
 const cls = await db.query("SELECT id, is_active FROM classes WHERE id = $1", [nextClassId]);
 if (cls.rows.length === 0) return error("Kelas tidak ditemukan.", 404);
 if (!cls.rows[0].is_active) {
 return error("Tidak bisa menugaskan admin ke kelas yang nonaktif.", 400);
 }
 }

 const sets: string[] = [];
 const vals: unknown[] = [];
 if (v.name !== undefined) {
 sets.push(`name = $${vals.push(v.name)}`);
 }
 if (v.role !== undefined) {
 sets.push(`role = $${vals.push(v.role)}`);
 }
 if (v.classId !== undefined) {
 sets.push(`class_id = $${vals.push(nextRole === "class_admin" ? nextClassId : null)}`);
 } else if (v.role === "super_admin") {
 sets.push("class_id = NULL");
 }
 if (v.password) {
 sets.push(`password_hash = $${vals.push(await hashPassword(v.password))}`);
 // Ganti password = cabut sesi lama, sama seperti reset password siswa.
 await db.query("DELETE FROM sessions WHERE user_id = $1", [id]);
 }
 if (sets.length === 0) return error("Tidak ada perubahan.", 400);

 await db.query(`UPDATE users SET ${sets.join(", ")} WHERE id = $${vals.push(id)}`, vals);
 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'staff_update', 'user', $2)",
 [auth.user.id, id],
 );

 const { rows } = await db.query(
 `SELECT u.id, u.name, u.email, u.role, u.class_id AS "classId",
 c.name AS "className", c.is_active AS "classActive",
 u.created_at AS "createdAt"
 FROM users u LEFT JOIN classes c ON c.id = u.class_id
 WHERE u.id = $1`,
 [id],
 );
 return json({ staff: rows[0] });
 },
);
