import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { error, guard, json, parseBody, unauthorized, withRouteErrors } from "@/lib/api";
import { imageDataUrl } from "@/lib/utils";
import type { ManualMethodType } from "@/types";

export const dynamic = "force-dynamic";

const CREATE_SCHEMA = z.object({
 type: z.enum(["qris", "bank", "ewallet"]),
 name: z.string().trim().min(1, "Nama wajib diisi").max(80),
 className: z.string().trim().max(80).optional(),
 accountNumber: z.string().trim().max(80).optional(),
 accountHolder: z.string().trim().max(120).optional(),
 qrisImage: imageDataUrl(1_000_000, "Gambar QRIS harus PNG/JPG/WebP maksimal 1 MB").optional(),
 active: z.boolean().optional(),
});

function parseMethod(row: {
 id: string;
 type: ManualMethodType;
 name: string;
 class_id?: string | null;
 class_name: string;
 account_number: string;
 account_holder: string;
 qris_image: string;
 active: boolean;
}) {
 return {
 id: row.id,
 type: row.type,
 name: row.name,
 classId: row.class_id ?? null,
 className: row.class_name,
 accountNumber: row.account_number,
 accountHolder: row.account_holder,
 qrisImage: row.qris_image,
 active: row.active,
 };
}

export const GET = withRouteErrors(async (request: Request) => {
 // Class Admin boleh baca (harus bisa mencatat pembayaran siswanya), menulis tetap super_admin.
 const auth = await guard(["super_admin", "class_admin", "treasurer", "student"]);
 if (!auth.ok) return unauthorized(auth);

 const db = await getDb();
 const url = new URL(request.url);
 const includeInactive = url.searchParams.get("all") === "1";

 const isAdmin = auth.user.role !== "student";
 const cond = isAdmin && includeInactive ? "" : "WHERE active = true";
 // Metode milik kelas (class_id) + metode sekolah (NULL). Siswa hanya melihat
 // metode aktif; method_key dipakai student/payment untuk memfilter per kelas.
 const conds: string[] = [];
 const vals: unknown[] = [];
 if (cond) conds.push("pm.active = true");
 const sc = auth.user;
 if (sc.role === "class_admin" && sc.classId) {
 conds.push(`(pm.class_id = $${vals.push(sc.classId)} OR pm.class_id IS NULL)`);
 } else if (sc.role === "student") {
 // Siswa: metode aktif untuk kelasnya. class_id NULL = untuk semua kelas.
 const own = await db.query<{ class_id: string | null }>(
 "SELECT class_id FROM students WHERE user_id = $1",
 [sc.id],
 );
 const myClass = own.rows[0]?.class_id ?? null;
 if (myClass) conds.push(`(pm.class_id = $${vals.push(myClass)} OR pm.class_id IS NULL)`);
 }
 const { rows } = await db.query<{
 id: string;
 type: ManualMethodType;
 name: string;
 class_id: string | null;
 class_name: string;
 account_number: string;
 account_holder: string;
 qris_image: string;
 active: boolean;
 }>(
 `SELECT pm.id, pm.type, pm.name, pm.class_id, pm.class_name, pm.account_number,
 pm.account_holder, pm.qris_image, pm.active
 FROM payment_methods pm
 ${conds.length ? `WHERE ${conds.join(" AND ")}` : ""}
 ORDER BY pm.type, pm.name`,
 vals,
 );

 return json({ methods: rows.map(parseMethod) });
});

export const POST = withRouteErrors(async (request: Request) => {
 const auth = await guard(["super_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const body = await parseBody(request, CREATE_SCHEMA);
 if (!body.ok) return body.response;
 const m = body.value;

 if (m.type === "qris" && !m.qrisImage) {
 return error("Unggah gambar QRIS untuk metode QRIS.", 400);
 }

 const db = await getDb();
 const id = randomUUID();
 await db.query(
 `INSERT INTO payment_methods (id, type, name, class_name, account_number, account_holder, qris_image, active)
 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
 [id, m.type, m.name, m.className ?? "", m.accountNumber ?? "", m.accountHolder ?? "", m.qrisImage ?? "", m.active ?? true],
 );
 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'payment_method_create', 'payment_method', $2)",
 [auth.user.id, id],
 );

 return json(
 {
 method: {
 id,
 type: m.type,
 name: m.name,
 className: m.className ?? "",
 accountNumber: m.accountNumber ?? "",
 accountHolder: m.accountHolder ?? "",
 qrisImage: m.qrisImage ?? "",
 active: m.active ?? true,
 },
 },
 201,
 );
});