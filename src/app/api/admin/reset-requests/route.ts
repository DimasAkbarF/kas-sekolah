import { getDb } from "@/lib/db";
import { applyScope, guard, json, unauthorized, withRouteErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

interface ResetRequestRow {
 id: string;
 studentId: string;
 nisn: string;
 studentName: string;
 status: "pending" | "approved" | "rejected";
 adminNote: string | null;
 resolvedBy: string | null;
 resolvedAt: string | null;
 createdAt: string;
 resolvedByName: string | null;
}

export const GET = withRouteErrors(async () => {
 const auth = await guard(["super_admin", "class_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const db = await getDb();
 // Hanya permintaan reset-password siswa di kelas sendiri.
 const conds: string[] = [];
 const vals: unknown[] = [];
 applyScope(auth.user, conds, vals, "s");
 const { rows } = await db.query<ResetRequestRow>(
 `SELECT r.id, r.student_id AS "studentId", r.nisn, r.student_name AS "studentName",
 r.status, r.admin_note AS "adminNote", r.resolved_by AS "resolvedBy",
 r.resolved_at AS "resolvedAt", r.created_at AS "createdAt",
 u.name AS "resolvedByName"
 FROM password_reset_requests r
 JOIN students s ON s.id = r.student_id
 LEFT JOIN users u ON u.id = r.resolved_by
 ${conds.length ? `WHERE ${conds.join(" AND ")}` : ""}
 ORDER BY (CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END), r.created_at DESC`,
 vals,
 );

 const pendingCount = rows.filter((r) => r.status === "pending").length;

 return json({ requests: rows, pendingCount });
});
