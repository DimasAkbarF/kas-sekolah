import { z } from "zod";
import { getDb } from "@/lib/db";
import { error, guard, json, parseBody, unauthorized, withRouteErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const UPDATE_SCHEMA = z.object({
 name: z.string().trim().min(1).max(40).optional(),
 grade: z.string().trim().min(1).max(20).optional(),
 academicYear: z.string().trim().min(1).max(20).optional(),
 isActive: z.boolean().optional(),
 // Nyala/mati maintenance. Toggling tidak menghapus atau mengubah data kelas,
 // hanya menutup akses pengguna kelas itu sampai flag dikembalikan.
 maintenance: z.boolean().optional(),
});

/**
 * Edit kelas. Menonaktifkan (bukan menghapus) supaya data historis siswa dan
 * keuangan kelas tetap utuh; Admin Kelas-nya langsung kehilangan akses karena
 * guard() menolak sesi dengan kelas nonaktif.
 */
export const PATCH = withRouteErrors(
 async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
 const auth = await guard(["super_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const { id } = await params;
 const body = await parseBody(request, UPDATE_SCHEMA);
 if (!body.ok) return body.response;

 const db = await getDb();
 const current = await db.query<{
 name: string;
 grade: string;
 academic_year: string;
 }>(
 "SELECT name, grade, academic_year FROM classes WHERE id = $1",
 [id],
 );
 if (current.rows.length === 0) return error("Kelas tidak ditemukan.", 404);

 const sets: string[] = [];
 const vals: unknown[] = [];
 const map: Record<string, string> = {
 name: "name",
 grade: "grade",
 academicYear: "academic_year",
 isActive: "is_active",
 maintenance: "maintenance",
 };
 for (const [key, col] of Object.entries(map)) {
 const v = (body.value as Record<string, unknown>)[key];
 if (v !== undefined) {
 sets.push(`${col} = $${vals.push(v)}`);
 }
 }
 if (sets.length === 0) return error("Tidak ada perubahan.", 400);

 const name = body.value.name ?? current.rows[0].name;
 const year = body.value.academicYear ?? current.rows[0].academic_year;
 if (body.value.name || body.value.academicYear) {
 const dup = await db.query(
 "SELECT 1 FROM classes WHERE name = $1 AND academic_year = $2 AND id <> $3 LIMIT 1",
 [name, year, id],
 );
 if (dup.rows.length > 0) {
 return error(`Kelas "${name}" sudah ada untuk tahun ajaran ${year}.`, 409);
 }
 }

 await db.query(`UPDATE classes SET ${sets.join(", ")} WHERE id = $${vals.push(id)}`, vals);
 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'class_update', 'class', $2)",
 [auth.user.id, id],
 );

 const { rows } = await db.query(
 `SELECT id, name, grade, academic_year AS "academicYear",
 is_active AS "isActive", maintenance
 FROM classes WHERE id = $1`,
 [id],
 );
 return json({ class: rows[0] });
 },
);
