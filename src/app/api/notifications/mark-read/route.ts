import { z } from "zod";
import { getDb } from "@/lib/db";
import { guard, json, parseBody, unauthorized, withRouteErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const MARK_READ_SCHEMA = z.object({
 id: z.string().optional(),
 all: z.boolean().optional(),
});

/**
 * POST /api/notifications/mark-read
 * Menandai notifikasi sebagai sudah dibaca (tunggal atau seluruhnya).
 */
export const POST = withRouteErrors(async (request: Request) => {
 const auth = await guard();
 if (!auth.ok) return unauthorized(auth);

 const body = await parseBody(request, MARK_READ_SCHEMA);
 if (!body.ok) return body.response;

 const { id, all } = body.value;
 const db = await getDb();

 if (all) {
 await db.query(
 "UPDATE notifications SET is_read = true WHERE user_id = $1",
 [auth.user.id],
 );
 } else if (id) {
 await db.query(
 "UPDATE notifications SET is_read = true WHERE user_id = $1 AND id = $2",
 [auth.user.id, id],
 );
 }

 return json({ ok: true });
});
