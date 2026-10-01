import { z } from "zod";
import { getDb } from "@/lib/db";
import { guard, json, parseBody, parseJsonArray, unauthorized, withRouteErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const SCHEMA = z.object({
 provider: z.literal("doku"),
 environment: z.enum(["sandbox", "production"]),
 activeMethods: z.array(z.enum(["qris"])).min(1),
 clientId: z.string().optional(),
 secretKey: z.string().optional(),
 notificationUrl: z.string().optional(),
});

export const GET = withRouteErrors(async () => {
 const auth = await guard(["super_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const db = await getDb();

 // Ensure columns exist (idempotent ALTER for existing DBs that lack the new columns)
 await db.query(`ALTER TABLE gateway_settings ADD COLUMN IF NOT EXISTS client_id TEXT NOT NULL DEFAULT ''`);
 await db.query(`ALTER TABLE gateway_settings ADD COLUMN IF NOT EXISTS secret_key TEXT NOT NULL DEFAULT ''`);
 await db.query(`ALTER TABLE gateway_settings ADD COLUMN IF NOT EXISTS notification_url TEXT NOT NULL DEFAULT ''`);

 const { rows } = await db.query<{
 provider: string;
 environment: string;
 activeMethods: string[] | string;
 clientId: string;
 secretKey: string;
 notificationUrl: string;
 updatedAt: string;
 }>(
 `SELECT provider, environment, active_methods AS "activeMethods",
 client_id AS "clientId", secret_key AS "secretKey",
 notification_url AS "notificationUrl",
 updated_at AS "updatedAt"
 FROM gateway_settings WHERE id = 1`,
 );
 const row = rows[0];
 if (!row) return json({ settings: null });

 // Mask secret key: return whether it's configured but never the plaintext
 const hasSecret = !!(row.secretKey && row.secretKey.length > 0);

 return json({
 settings: {
 provider: row.provider || "doku",
 environment: row.environment || "sandbox",
 activeMethods: parseJsonArray(row.activeMethods),
 clientId: row.clientId || "",
 secretKeyConfigured: hasSecret,
 notificationUrl: row.notificationUrl || "",
 },
 });
});

export const PATCH = withRouteErrors(async (request: Request) => {
 const auth = await guard(["super_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const body = await parseBody(request, SCHEMA);
 if (!body.ok) return body.response;

 const db = await getDb();

 // Ensure columns exist (idempotent ALTER for existing DBs)
 await db.query(`ALTER TABLE gateway_settings ADD COLUMN IF NOT EXISTS client_id TEXT NOT NULL DEFAULT ''`);
 await db.query(`ALTER TABLE gateway_settings ADD COLUMN IF NOT EXISTS secret_key TEXT NOT NULL DEFAULT ''`);
 await db.query(`ALTER TABLE gateway_settings ADD COLUMN IF NOT EXISTS notification_url TEXT NOT NULL DEFAULT ''`);

 const { provider, environment, activeMethods, clientId, secretKey, notificationUrl } = body.value;

 // Build dynamic SET clause: only update secretKey if a non-empty value is provided
 const hasNewSecret = secretKey !== undefined && secretKey.length > 0;

 if (hasNewSecret) {
 await db.query(
 `INSERT INTO gateway_settings (id, provider, environment, active_methods, client_id, secret_key, notification_url, updated_at)
 VALUES (1, $1, $2, $3, $4, $5, $6, now())
 ON CONFLICT (id) DO UPDATE SET
 provider = EXCLUDED.provider,
 environment = EXCLUDED.environment,
 active_methods = EXCLUDED.active_methods,
 client_id = EXCLUDED.client_id,
 secret_key = EXCLUDED.secret_key,
 notification_url = EXCLUDED.notification_url,
 updated_at = now()`,
 [
 provider,
 environment,
 JSON.stringify(activeMethods),
 clientId || "",
 secretKey,
 notificationUrl || "",
 ],
 );
 } else {
 // Don't overwrite existing secret_key
 await db.query(
 `INSERT INTO gateway_settings (id, provider, environment, active_methods, client_id, notification_url, updated_at)
 VALUES (1, $1, $2, $3, $4, $5, now())
 ON CONFLICT (id) DO UPDATE SET
 provider = EXCLUDED.provider,
 environment = EXCLUDED.environment,
 active_methods = EXCLUDED.active_methods,
 client_id = EXCLUDED.client_id,
 notification_url = EXCLUDED.notification_url,
 updated_at = now()`,
 [
 provider,
 environment,
 JSON.stringify(activeMethods),
 clientId || "",
 notificationUrl || "",
 ],
 );
 }

 return json({ ok: true });
});
