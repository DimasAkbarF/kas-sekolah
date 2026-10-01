import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { applyScope, guard, json, parseBody, unauthorized, userClassId, withRouteErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const SCHEMA = z.object({
 title: z.string().trim().min(1).max(120),
 category: z.string().trim().min(1).max(80),
 amount: z.number().int().positive(),
 date: z.string().min(1),
 source: z.string().trim().max(120).optional(),
});

async function listDb(user: Parameters<typeof applyScope>[0]) {
 const db = await getDb();
 const conds: string[] = [];
 const vals: unknown[] = [];
 // Catatan kas ter-scope kelas: Admin Kelas hanya melihat kas kelasnya.
 applyScope(user, conds, vals, "i");
 return db.query(
 `SELECT i.id, i.class_id AS "classId", i.title, i.category, i.amount, i.date, i.source,
 i.created_at AS "createdAt"
 FROM incomes i
 ${conds.length ? `WHERE ${conds.join(" AND ")}` : ""}
 ORDER BY i.date DESC, i.created_at DESC`,
 vals,
 );
}

export const GET = withRouteErrors(async () => {
 const auth = await guard(["super_admin", "class_admin", "treasurer"]);
 if (!auth.ok) return unauthorized(auth);
 const { rows } = await listDb(auth.user);
 return json({ incomes: rows });
});

export const POST = withRouteErrors(async (request: Request) => {
 const auth = await guard(["super_admin", "class_admin", "treasurer"]);
 if (!auth.ok) return unauthorized(auth);

 const body = await parseBody(request, SCHEMA);
 if (!body.ok) return body.response;
 const v = body.value;

 const db = await getDb();
 const id = randomUUID();
 await db.query(
 `INSERT INTO incomes (id, title, category, amount, date, source, class_id)
 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
 [id, v.title, v.category, v.amount, v.date, v.source ?? "", userClassId(auth.user)],
 );
 return json({ income: { id, ...v, source: v.source ?? "", createdAt: new Date().toISOString() } }, 201);
});