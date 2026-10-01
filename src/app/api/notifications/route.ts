import { getDb } from "@/lib/db";
import { guard, json, unauthorized, withRouteErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

interface NotificationDbRow {
 id: string;
 reminderId: string | null;
 title: string;
 message: string;
 isRead: boolean;
 createdAt: string;
}

/**
 * GET /api/notifications
 * Mengambil daftar notifikasi milik pengguna yang sedang login.
 */
export const GET = withRouteErrors(async () => {
 const auth = await guard();
 if (!auth.ok) return unauthorized(auth);

 const db = await getDb();

 const [notifRes, unreadRes] = await Promise.all([
 db.query<NotificationDbRow>(
 `SELECT id,
 reminder_id AS "reminderId",
 title,
 message,
 is_read AS "isRead",
 created_at AS "createdAt"
 FROM notifications
 WHERE user_id = $1
 ORDER BY created_at DESC
 LIMIT 40`,
 [auth.user.id],
 ),
 db.query<{ count: number }>(
 `SELECT count(*)::int AS count
 FROM notifications
 WHERE user_id = $1 AND is_read = false`,
 [auth.user.id],
 ),
 ]);

 const unreadCount = unreadRes.rows[0]?.count ?? 0;

 return json({
 notifications: notifRes.rows,
 unreadCount,
 });
});
