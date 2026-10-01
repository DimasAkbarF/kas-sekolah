import { z } from "zod";
import { getDb } from "@/lib/db";
import { error, guard, json, parseBody, unauthorized, withRouteErrors } from "@/lib/api";
import { imageDataUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PATCH_SCHEMA = z.object({
 name: z.string().trim().min(1, "Nama wajib diisi").max(80).optional(),
 accountNumber: z.string().trim().max(80).optional(),
 accountHolder: z.string().trim().max(120).optional(),
 qrisImage: imageDataUrl(1_000_000, "Gambar QRIS harus PNG/JPG/WebP maksimal 1 MB").optional(),
 active: z.boolean().optional(),
});

export const PATCH = withRouteErrors(async (
 request: Request,
 { params }: { params: Promise<{ id: string }> },
) => {
 const auth = await guard(["super_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const { id } = await params;
 const body = await parseBody(request, PATCH_SCHEMA);
 if (!body.ok) return body.response;

 const db = await getDb();
 const existing = await db.query(
 "SELECT id, type FROM payment_methods WHERE id = $1",
 [id],
 );
 if (existing.rows.length === 0) return error("Metode pembayaran tidak ditemukan.", 404);

 const p = body.value;
 const sets: string[] = [];
 const vals: unknown[] = [id];
 if (p.name !== undefined) {
 sets.push(`name = $${vals.push(p.name)}`);
 }
 if (p.accountNumber !== undefined) {
 sets.push(`account_number = $${vals.push(p.accountNumber)}`);
 }
 if (p.accountHolder !== undefined) {
 sets.push(`account_holder = $${vals.push(p.accountHolder)}`);
 }
 if (p.qrisImage !== undefined) {
 sets.push(`qris_image = $${vals.push(p.qrisImage)}`);
 }
 if (p.active !== undefined) {
 sets.push(`active = $${vals.push(p.active)}`);
 }
 if (sets.length === 0) return json({ ok: true });

 await db.query(`UPDATE payment_methods SET ${sets.join(", ")} WHERE id = $1`, vals);
 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'payment_method_update', 'payment_method', $2)",
 [auth.user.id, id],
 );

 return json({ ok: true });
});

export const DELETE = withRouteErrors(async (
 _request: Request,
 { params }: { params: Promise<{ id: string }> },
) => {
 const auth = await guard(["super_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const { id } = await params;
 const db = await getDb();
 await db.query("DELETE FROM payment_methods WHERE id = $1", [id]);
 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'payment_method_delete', 'payment_method', $2)",
 [auth.user.id, id],
 );

 return json({ ok: true });
});