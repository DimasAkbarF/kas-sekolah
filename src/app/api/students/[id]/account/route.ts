import { z } from "zod";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { applyScope, error, guard, json, parseBody, unauthorized, withRouteErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const ACCOUNT_SCHEMA = z.object({
 password: z
 .string()
 .min(PASSWORD_MIN_LENGTH, `Password minimal ${PASSWORD_MIN_LENGTH} karakter`)
 .max(200),
});

// Membuat akun login siswa (username = NISN) atau mereset passwordnya.
export const POST = withRouteErrors(async (
 request: Request,
 { params }: { params: Promise<{ id: string }> },
) => {
 const auth = await guard(["super_admin", "class_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const { id } = await params;
 const body = await parseBody(request, ACCOUNT_SCHEMA);
 if (!body.ok) return body.response;

 const db = await getDb();
 // Reset password + pencabutan sesi hanya untuk siswa di kelas sendiri.
 const conds: string[] = ["id = $1"];
 const scopeVals: unknown[] = [id];
 applyScope(auth.user, conds, scopeVals, "students");
 const { rows } = await db.query<{
 id: string;
 nisn: string;
 name: string;
 user_id: string | null;
 class_id: string | null;
 }>(
 `SELECT id, nisn, name, user_id, class_id FROM students WHERE ${conds.join(" AND ")}`,
 scopeVals,
 );
 if (rows.length === 0) return error("Siswa tidak ditemukan.", 404);
 const student = rows[0];

 const hash = await hashPassword(body.value.password);
 const userId = student.user_id ?? `su-${student.id}`;
 await db.query(
 `INSERT INTO users (id, nisn, email, password_hash, name, role, class_id)
 VALUES ($1, $2, $3, $4, $5, 'student', $6)
 ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash,
 class_id = EXCLUDED.class_id`,
 [userId, student.nisn, `nisn-${student.nisn}@student.sma-n1.sch.id`, hash, student.name, student.class_id ?? null],
 );
 await db.query("UPDATE students SET user_id = $1 WHERE id = $2", [userId, id]);
 await db.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'student_account', 'student', $2)",
 [auth.user.id, id],
 );

 return json({ ok: true });
});