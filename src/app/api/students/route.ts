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
 withRouteErrors,
 userClassId,
} from "@/lib/api";

export const dynamic = "force-dynamic";

const STUDENT_SCHEMA = z.object({
 nis: z.string().trim().min(1, "NIS wajib diisi").max(30),
 nisn: z.string().trim().min(1, "NISN wajib diisi").max(30),
 name: z.string().trim().min(1, "Nama wajib diisi").max(120),
 email: z
 .string()
 .trim()
 .min(1, "Gmail wajib diisi.")
 .email("Gmail tidak valid. Masukkan alamat email yang benar.")
 .max(255),
 className: z.string().trim().max(30).optional(),
 classId: z.string().trim().max(64).optional(),
 gender: z.enum(["L", "P"]).optional(),
 phone: z.string().trim().max(30).optional(),
 address: z.string().trim().max(500).optional(),
});

export const GET = withRouteErrors(async () => {
 const auth = await guard(["super_admin", "class_admin", "treasurer", "student"]);
 if (!auth.ok) return unauthorized(auth);

 const db = await getDb();
 // Siswa hanya boleh melihat datanya sendiri. Jangan andalkan "cuma 1 baris":
 // bila relasi user_id belum terisi, filter kosong = seluruh roster terkirim.
 const own =
 auth.user.role === "student"
 ? await db.query("SELECT id FROM students WHERE user_id = $1", [auth.user.id])
 : undefined;
 if (own && own.rows.length !== 1) {
 return json({ students: [] });
 }
 const conds: string[] = [];
 const vals: unknown[] = [];
 if (own) conds.push(`s.user_id = $${vals.push(auth.user.id)}`);
 conds.push("s.archived = false");
 // Admin Kelas hanya melihat kelasnya. classId dari SESSION, bukan query/body.
 applyScope(auth.user, conds, vals, "s");
 const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
 const { rows } = await db.query(
 `SELECT s.id,
 s.user_id AS "userId",
 s.nis,
 s.nisn,
 s.name,
 s.class_id AS "classId",
 s.class_name AS "className",
 s.gender,
 s.phone,
 COALESCE(s.email, u.email, '') AS "email",
 s.address,
 s.archived,
 s.created_at AS "createdAt"
 FROM students s
 LEFT JOIN users u ON s.user_id = u.id
 ${where}
 ORDER BY s.nis`,
 vals,
 );
 return json({ students: rows });
});

export async function POST(request: Request) {
 const auth = await guard(["super_admin", "class_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const body = await parseBody(request, STUDENT_SCHEMA);
 if (!body.ok) return body.response;
 const { nis, nisn, name, email, className, gender, phone, address } = body.value;
 // Admin Kelas tidak boleh menentukan kelas sendiri: ambil dari session.
 // Super Admin boleh membuat siswa lintas kelas (classId null) atau memindah
 // siswa ke kelas tertentu lewat body.
 const classId = userClassId(auth.user) ?? (body.value.classId || null);

 const db = await getDb();
 const dup = await db.query("SELECT 1 FROM students WHERE nis = $1 OR nisn = $2 LIMIT 1", [nis, nisn]);
 if (dup.rows.length > 0) return error("NIS atau NISN sudah terdaftar.", 409);

 const id = randomUUID();
 await db.query(
 `INSERT INTO students (id, nis, nisn, name, class_name, class_id, gender, phone, email, address)
 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
 [id, nis, nisn, name, className || "", classId, gender ?? null, phone ?? null, email, address || null],
 );
 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'student_create', 'student', $2)",
 [auth.user.id, id],
 );

 return json(
 {
 student: {
 id,
 userId: "",
 nis,
 nisn,
 name,
 email,
 classId,
 className: className || "",
 gender: gender ?? null,
 phone: phone || null,
 address: address || null,
 archived: false,
 },
 },
 201,
 );
}