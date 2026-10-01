import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { applyScopeWithSchoolWide, error, guard, json, parseBody, parseJsonArray, unauthorized, userClassId, withRouteErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const BILL_SCHEMA = z.object({
 name: z.string().trim().min(1, "Nama wajib diisi").max(120),
 category: z.string().trim().min(1, "Kategori wajib diisi").max(80),
 amount: z.number().int().positive(),
 period: z.string().trim().min(1).max(30),
 startDate: z.string().min(1),
 dueDate: z.string().min(1),
 targetType: z.enum(["all", "class", "specific"]),
 targetIds: z.array(z.string().max(64)).default([]),
 classId: z.string().trim().max(64).optional(),
});

interface BillRow {
 id: string;
 name: string;
 category: string;
 amount: number;
 period: string;
 startDate: string;
 dueDate: string;
 targetType: string;
 targetIds: string[] | string;
 status: string;
 createdAt: string;
}

export const GET = withRouteErrors(async () => {
 const auth = await guard(["super_admin", "class_admin", "treasurer", "student"]);
 if (!auth.ok) return unauthorized(auth);

  const db = await getDb();
  // Admin Kelas: tagihan kelasnya + tagihan sekolah (class_id IS NULL).
  // Siswa: hanya tagihan yang benar-benar berlaku untuk dirinya — applyScope*
  // tidak menambah apa pun untuk role student, jadi tanpa blok di bawah ini
  // `conds` kosong dan seluruh tagihan sekolah (termasuk tagihan kelas lain
  // dan tagihan `specific` milik siswa lain) ikut terkirim.
  const conds: string[] = [];
  const vals: unknown[] = [];
  if (auth.user.role === "student") {
  const own = await db.query<{ id: string; class_id: string | null }>(
  "SELECT id, class_id FROM students WHERE user_id = $1 AND archived = false",
  [auth.user.id],
  );
  if (own.rows.length === 0) return json({ bills: [] });
  const sId = String(own.rows[0].id);
  const sClassId = own.rows[0].class_id;
  conds.push(
  `(
  b.target_type = 'all'
  OR (b.target_type = 'class' AND (b.class_id = $${vals.push(sClassId)} OR b.class_id IS NULL))
  OR (b.target_type = 'specific' AND b.target_ids ? $${vals.push(sId)})
  )`,
  );
  } else {
  applyScopeWithSchoolWide(auth.user, conds, vals, "b");
  }
 const { rows } = await db.query<BillRow>(
 `SELECT b.id, b.class_id AS "classId", b.name, b.category, b.amount, b.period,
 b.start_date AS "startDate", b.due_date AS "dueDate",
 b.target_type AS "targetType", b.target_ids AS "targetIds",
 b.status, b.created_at AS "createdAt"
 FROM bills b
 ${conds.length ? `WHERE ${conds.join(" AND ")}` : ""}
 ORDER BY b.created_at DESC`,
 vals,
 );
 return json({ bills: rows.map((b) => ({ ...b, targetIds: parseJsonArray(b.targetIds) })) });
});

export const POST = withRouteErrors(async (request: Request) => {
 const auth = await guard(["super_admin", "class_admin", "treasurer"]);
 if (!auth.ok) return unauthorized(auth);

 const body = await parseBody(request, BILL_SCHEMA);
 if (!body.ok) return body.response;
 const b = body.value;
 if (b.targetType === "specific" && b.targetIds.length === 0) {
 return error("Pilih minimal satu siswa untuk target spesifik.", 400);
 }

 const db = await getDb();
 // Tagihan milik kelas untuk Admin Kelas (tidak bisa dipilih dari body).
 // Super Admin boleh tagihan sekolah (null) maupun tagihan kelas tertentu.
 const classId = userClassId(auth.user) ?? (b.classId || null);
 if (auth.user.role === "class_admin" && b.targetType === "specific") {
 const own = await db.query<{ id: string }>(
 `SELECT id FROM students WHERE id = ANY($1::text[]) AND class_id = $2`,
 [b.targetIds, classId],
 );
 if (own.rows.length !== b.targetIds.length) {
 return error("Siswa yang dipilih tidak semuanya berada di kelas Anda.", 403);
 }
 }

 const id = randomUUID();
 await db.query(
 `INSERT INTO bills (id, name, category, amount, period, start_date, due_date, target_type, target_ids, class_id)
 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
 [id, b.name, b.category, b.amount, b.period, b.startDate, b.dueDate, b.targetType, JSON.stringify(b.targetIds), classId],
 );
 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'bill_create', 'bill', $2)",
 [auth.user.id, id],
 );

 return json(
 { bill: { id, ...b, classId, status: "active", createdAt: new Date().toISOString() } },
 201,
 );
});

