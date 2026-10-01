import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { error, guard, json, parseBody, unauthorized, withRouteErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const STAFF_SCHEMA = z.object({
 name: z.string().trim().min(1, "Nama wajib diisi.").max(120),
 email: z.string().trim().email("Email tidak valid.").max(255),
 role: z.enum(["super_admin", "class_admin"]),
 // Wajib untuk class_admin; null (seluruh sekolah) hanya untuk super_admin.
 classId: z.string().trim().max(64).nullable().optional(),
 password: z
 .string()
 .min(PASSWORD_MIN_LENGTH, `Password minimal ${PASSWORD_MIN_LENGTH} karakter`)
 .max(200),
});

interface StaffRow {
 id: string;
 name: string;
 email: string;
 role: string;
 classId: string | null;
 className: string | null;
 classActive: boolean | null;
 createdAt: string;
}

const SELECT_STAFF = `
 SELECT u.id, u.name, u.email, u.role, u.class_id AS "classId",
 c.name AS "className", c.is_active AS "classActive",
 u.created_at AS "createdAt"
 FROM users u
 LEFT JOIN classes c ON c.id = u.class_id
`;

export const GET = withRouteErrors(async () => {
 const auth = await guard(["super_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const db = await getDb();
 const { rows } = await db.query<StaffRow>(
 `${SELECT_STAFF}
 WHERE u.role IN ('super_admin', 'class_admin')
 ORDER BY u.role, c.name NULLS FIRST, u.name`,
 );
 return json({ staff: rows });
});

export const POST = withRouteErrors(async (request: Request) => {
 const auth = await guard(["super_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const body = await parseBody(request, STAFF_SCHEMA);
 if (!body.ok) return body.response;
 const v = body.value;

 // Admin Kelas harus punya satu kelas; Super Admin minimal satu (opsional).
 if (v.role === "class_admin" && !v.classId) {
 return error("Admin Kelas harus ditugaskan ke satu kelas.", 400);
 }

 const db = await getDb();
 if (v.classId) {
 const cls = await db.query("SELECT id, is_active FROM classes WHERE id = $1", [v.classId]);
 if (cls.rows.length === 0) return error("Kelas tidak ditemukan.", 404);
 if (!cls.rows[0].is_active) {
 return error("Tidak bisa menugaskan admin ke kelas yang nonaktif.", 400);
 }
 }

 const dup = await db.query("SELECT 1 FROM users WHERE email = $1 LIMIT 1", [v.email]);
 if (dup.rows.length > 0) return error("Email tersebut sudah terdaftar.", 409);

 const id = `u-${randomUUID()}`;
 await db.query(
 `INSERT INTO users (id, email, password_hash, name, role, class_id)
 VALUES ($1, $2, $3, $4, $5, $6)`,
 [id, v.email, await hashPassword(v.password), v.name, v.role, v.role === "class_admin" ? v.classId : null],
 );
 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'staff_create', 'user', $2)",
 [auth.user.id, id],
 );

 const { rows } = await db.query<StaffRow>(`${SELECT_STAFF} WHERE u.id = $1`, [id]);
 return json({ staff: rows[0] }, 201);
});
