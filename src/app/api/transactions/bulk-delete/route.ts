import { z } from "zod";
import { getDb } from "@/lib/db";
import {
 applyScope,
 guard,
 json,
 parseBody,
 unauthorized,
 withRouteErrors,
} from "@/lib/api";

export const dynamic = "force-dynamic";

const BULK_SCHEMA = z.object({
 ids: z.array(z.string().max(64)).min(1).max(200),
});

export const POST = withRouteErrors(async (request: Request) => {
 const auth = await guard(["super_admin", "class_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const body = await parseBody(request, BULK_SCHEMA);
 if (!body.ok) return body.response;

 const db = await getDb();
 // Hanya id yang benar-benar milik kelas user yang dihapus; sisanya diabaikan
 // (delete by list tanpa per-item check akan menghapus data kelas lain).
 const conds: string[] = ["t.id = ANY($1::text[])"];
 const vals: unknown[] = [body.value.ids];
 applyScope(auth.user, conds, vals, "t");
 await db.query(
 `DELETE FROM transactions t WHERE ${conds.join(" AND ")}`,
 vals,
 );
 await db.query(
 "INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'transactions_bulk_delete', 'transaction', $2)",
 [auth.user.id, JSON.stringify({ ids: body.value.ids })],
 );
 return json({ ok: true });
});