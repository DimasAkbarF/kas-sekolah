import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { error, guard, json, parseBody, unauthorized, withRouteErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const CLASS_SCHEMA = z.object({
 name: z.string().trim().min(1, "Nama kelas wajib diisi.").max(40),
 grade: z.string().trim().min(1, "Tingkat wajib diisi.").max(20),
 academicYear: z.string().trim().min(1, "Tahun ajaran wajib diisi.").max(20),
});

interface ClassRow {
 id: string;
 name: string;
 grade: string;
 academicYear: string;
 isActive: boolean;
 maintenance: boolean;
 adminName: string | null;
 adminEmail: string | null;
 studentCount: number;
}

/** Super Admin saja. Kelas tidak pernah dihapus (ON DELETE SET NULL). */
export const GET = withRouteErrors(async (request: Request) => {
 const auth = await guard(["super_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const url = new URL(request.url);
 const includeInactive = url.searchParams.get("all") === "1";

 const db = await getDb();
 const { rows } = await db.query<ClassRow>(
 `SELECT c.id, c.name, c.grade, c.academic_year AS "academicYear",
 c.is_active AS "isActive", c.maintenance,
 (SELECT u.name FROM users u WHERE u.class_id = c.id AND u.role = 'class_admin'
 ORDER BY u.created_at LIMIT 1) AS "adminName",
 (SELECT u.email FROM users u WHERE u.class_id = c.id AND u.role = 'class_admin'
 ORDER BY u.created_at LIMIT 1) AS "adminEmail",
 (SELECT count(*)::int FROM students s
 WHERE s.class_id = c.id AND s.archived = false) AS "studentCount"
 FROM classes c
 ${includeInactive ? "" : "WHERE c.is_active = true"}
 ORDER BY c.grade, c.name`,
 );
 return json({ classes: rows });
});

export const POST = withRouteErrors(async (request: Request) => {
 const auth = await guard(["super_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const body = await parseBody(request, CLASS_SCHEMA);
 if (!body.ok) return body.response;
 const v = body.value;

 const db = await getDb();
 const dup = await db.query(
 "SELECT 1 FROM classes WHERE name = $1 AND academic_year = $2 LIMIT 1",
 [v.name, v.academicYear],
 );
 if (dup.rows.length > 0) {
 return error(`Kelas "${v.name}" sudah ada untuk tahun ajaran ${v.academicYear}.`, 409);
 }

 const id = randomUUID();
 await db.query(
 "INSERT INTO classes (id, name, grade, academic_year) VALUES ($1, $2, $3, $4)",
 [id, v.name, v.grade, v.academicYear],
 );
 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'class_create', 'class', $2)",
 [auth.user.id, id],
 );
 return json(
 { class: { id, ...v, isActive: true } },
 201,
 );
});
