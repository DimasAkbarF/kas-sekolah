import { z } from "zod";
import { getDb } from "@/lib/db";
import { applyScope, error, guard, json, parseBody, unauthorized, withRouteErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const UPDATE_SCHEMA = z.object({
 nis: z.string().trim().min(1).max(30).optional(),
 nisn: z.string().trim().min(1).max(30).optional(),
 name: z.string().trim().min(1).max(120).optional(),
 email: z
 .string()
 .trim()
 .min(1, "Gmail wajib diisi.")
 .email("Gmail tidak valid. Masukkan alamat email yang benar.")
 .max(255)
 .optional(),
 className: z.string().trim().max(30).nullable().optional(),
 classId: z.string().trim().max(64).nullable().optional(),
 gender: z.enum(["L", "P"]).nullable().optional(),
 phone: z.string().trim().max(30).nullable().optional(),
 address: z.string().trim().max(500).nullable().optional(),
 archived: z.boolean().optional(),
});

export const PATCH = withRouteErrors(async (
 request: Request,
 { params }: { params: Promise<{ id: string }> },
) => {
 const auth = await guard(["super_admin", "class_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const { id } = await params;
 const body = await parseBody(request, UPDATE_SCHEMA);
 if (!body.ok) return body.response;

 const db = await getDb();
 // Verifikasi kepemilikan kelas SEBELUM membaca/menulis apa pun (anti-IDOR).
 const conds: string[] = [`id = $1`];
 const scopeVals: unknown[] = [id];
 applyScope(auth.user, conds, scopeVals, "students");
 const existing = await db.query<{
 id: string;
 user_id: string | null;
 nis: string;
 nisn: string;
 archived: boolean;
 class_id: string | null;
 }>(
 `SELECT id, user_id, nis, nisn, archived, class_id FROM students
 WHERE ${conds.join(" AND ")}`,
 scopeVals,
 );
 if (existing.rows.length === 0) return error("Siswa tidak ditemukan.", 404);

 const dup = await db.query(
 "SELECT 1 FROM students WHERE id != $1 AND (nis = $2 OR nisn = $3) LIMIT 1",
 [id, body.value.nis ?? existing.rows[0].nis, body.value.nisn ?? existing.rows[0].nisn],
 );
 if (dup.rows.length > 0) return error("NIS atau NISN sudah terdaftar.", 409);

 // Admin Kelas terkunci pada kelasnya: classId dari body diabaikan sepenuhnya.
 const patch: Partial<typeof body.value> = { ...body.value };
 if (auth.user.role === "class_admin") delete patch.classId;

 const sets: string[] = [];
 const vals: unknown[] = [id];
 const fields: [keyof typeof patch, string][] = [
 ["nis", "nis"],
 ["classId", "class_id"],
 ["nisn", "nisn"],
 ["name", "name"],
 ["email", "email"],
 ["className", "class_name"],
 ["gender", "gender"],
 ["phone", "phone"],
 ["address", "address"],
 ["archived", "archived"],
 ];
 for (const [key, col] of fields) {
 if (patch[key] !== undefined) {
 const v = patch[key];
 sets.push(`${col} = $${vals.length + 1}`);
 vals.push(v === "" ? null : v);
 }
 }
 if (sets.length > 0) {
 await db.query(`UPDATE students SET ${sets.join(", ")} WHERE id = $1`, vals);

 // Jika email diubah dan siswa memiliki user_id, perbarui email di tabel users juga
 if (patch.email && existing.rows[0].user_id) {
 await db.query("UPDATE users SET email = $1 WHERE id = $2", [
 patch.email,
 existing.rows[0].user_id,
 ]);
 }

 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'student_update', 'student', $2)",
 [auth.user.id, id],
 );
 }

 const { rows } = await db.query(
 `SELECT s.id,
 s.user_id AS "userId",
 s.nis,
 s.nisn,
 s.name,
 s.class_name AS "className",
 s.gender,
 s.phone,
 COALESCE(s.email, u.email, '') AS "email",
 s.address,
 s.archived,
 s.created_at AS "createdAt"
 FROM students s
 LEFT JOIN users u ON s.user_id = u.id
 WHERE s.id = $1`,
 [id],
 );
 return json({ student: rows[0] });
});

export const GET = withRouteErrors(async (
 _request: Request,
 { params }: { params: Promise<{ id: string }> },
) => {
 const auth = await guard(["super_admin", "class_admin", "treasurer"]);
 if (!auth.ok) return unauthorized(auth);

 const { id } = await params;
 const db = await getDb();
 const conds: string[] = ["s.id = $1"];
 const vals: unknown[] = [id];
 applyScope(auth.user, conds, vals, "s");
 // Bendahara butuh identitas untuk bukti pembayaran, bukan data kontak siswa.
 // `phone`/`address` hanya untuk pengelola data (admin sekolah & admin kelas).
 const seesContact = auth.user.role !== "treasurer";
 const { rows } = await db.query(
 `SELECT s.id,
 s.user_id AS "userId",
 s.nis,
 s.nisn,
 s.name,
 s.class_id AS "classId",
 s.class_name AS "className",
 s.gender,
 ${seesContact ? "s.phone" : "NULL"} AS "phone",
 COALESCE(s.email, u.email, '') AS "email",
 ${seesContact ? "s.address" : "NULL"} AS "address",
 s.archived,
 s.created_at AS "createdAt"
 FROM students s
 LEFT JOIN users u ON s.user_id = u.id
 WHERE ${conds.join(" AND ")}`,
 vals,
 );
 if (rows.length === 0) return error("Siswa tidak ditemukan.", 404);
 return json({ student: rows[0] });
});