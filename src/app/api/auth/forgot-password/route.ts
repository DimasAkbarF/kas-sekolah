import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { clientIp, error, json, parseBody, withRouteErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const SCHEMA = z.object({
 nisn: z
 .string()
 .trim()
 .min(1, "NISN wajib diisi")
 .regex(/^\d{10}$/, "NISN harus 10 digit angka"),
});

const REQUESTS_PER_WINDOW = 5;
const WINDOW_MINUTES = 15;

const GENERIC_MESSAGE =
 "Jika NISN terdaftar dan valid, permintaan reset password berhasil diajukan. Silakan tunggu persetujuan administrator.";

export const POST = withRouteErrors(async (request: Request) => {
 const body = await parseBody(request, SCHEMA);
 if (!body.ok) return body.response;

 const db = await getDb();
 const { nisn } = body.value;
 const ip = clientIp(request);

 const recent = await db.query<{ n: number }>(
 `SELECT count(*)::int AS n FROM password_reset_requests
 WHERE ip = $1 AND created_at > now() - ($2 || ' minutes')::interval`,
 [ip, WINDOW_MINUTES],
 );
 if (recent.rows[0].n >= REQUESTS_PER_WINDOW) {
 return error("Terlalu banyak permintaan. Coba beberapa saat lagi.", 429);
 }

 const studentRes = await db.query<{ id: string; name: string; nisn: string }>(
 "SELECT id, name, nisn FROM students WHERE nisn = $1 AND archived = false LIMIT 1",
 [nisn],
 );

 if (studentRes.rows.length === 0) {
 // Respon identik untuk NISN tak dikenal agar tidak terjadi enumerasi.
 return json({ ok: true, message: GENERIC_MESSAGE }, 201);
 }

 const student = studentRes.rows[0];

 const existingRes = await db.query<{ id: string }>(
 "SELECT id FROM password_reset_requests WHERE student_id = $1 AND status = 'pending' LIMIT 1",
 [student.id],
 );
 if (existingRes.rows.length > 0) {
 return json({ ok: true, message: GENERIC_MESSAGE }, 201);
 }

 const reqId = randomUUID();
 await db.query(
 `INSERT INTO password_reset_requests (id, student_id, nisn, student_name, status, ip)
 VALUES ($1, $2, $3, $4, 'pending', $5)`,
 [reqId, student.id, student.nisn, student.name, ip],
 );

 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES (NULL, 'password_reset_request', 'student', $1)",
 [reqId],
 );

 return json({ ok: true, message: GENERIC_MESSAGE }, 201);
});