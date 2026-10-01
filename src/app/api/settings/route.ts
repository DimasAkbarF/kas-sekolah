import { z } from "zod";
import { getDb } from "@/lib/db";
import { guard, json, parseBody, unauthorized, withRouteErrors } from "@/lib/api";
import { imageDataUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SCHEMA = z.object({
 name: z.string().trim().min(1).max(120).optional(),
 logoUrl: imageDataUrl(1_000_000, "Logo harus PNG/JPG/WebP (data URL) maksimal 1 MB").nullable().optional(),
 email: z.string().trim().max(255).nullable().optional(),
 address: z.string().trim().max(500).nullable().optional(),
 phone: z.string().trim().max(50).nullable().optional(),
 className: z.string().trim().max(80).nullable().optional(),
 academicYear: z.string().trim().max(30).nullable().optional(),
 defaultAmount: z.number().int().positive().max(1_000_000_000).nullable().optional(),
 defaultDueDays: z.number().int().positive().max(365).nullable().optional(),
 invoiceFormat: z.string().trim().max(50).nullable().optional(),
});

export const GET = withRouteErrors(async () => {
 // Profil sekolah (nama/logo/tahun ajaran) dibaca semua role untuk branding;
 // hanya Super Admin yang boleh mengubah (lihat PATCH di bawah).
 const auth = await guard(["super_admin", "class_admin", "treasurer", "student"]);
 if (!auth.ok) return unauthorized(auth);

 const db = await getDb();
 const { rows } = await db.query(
 `SELECT name, logo_url AS "logoUrl", email, address, phone,
 class_name AS "className", academic_year AS "academicYear",
 default_amount AS "defaultAmount", default_due_days AS "defaultDueDays",
 invoice_format AS "invoiceFormat", updated_at AS "updatedAt"
 FROM school_settings WHERE id = 1`,
 );
 return json({ school: rows[0] ?? null });
});

export const PATCH = withRouteErrors(async (request: Request) => {
 const auth = await guard(["super_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const body = await parseBody(request, SCHEMA);
 if (!body.ok) return body.response;

 const db = await getDb();
 const v = body.value as Record<string, unknown>;
 await db.query(
 `INSERT INTO school_settings (id, name)
 VALUES (1, $1)
 ON CONFLICT (id) DO UPDATE SET
 name = COALESCE($2, school_settings.name),
 logo_url = CASE
 WHEN $9::boolean THEN NULL
 ELSE COALESCE($3, school_settings.logo_url)
 END,
 email = COALESCE($4, school_settings.email),
 address = COALESCE($5, school_settings.address),
 phone = COALESCE($6, school_settings.phone),
 class_name = COALESCE($7, school_settings.class_name),
 academic_year = COALESCE($8, school_settings.academic_year),
 default_amount = COALESCE($10, school_settings.default_amount),
 default_due_days = COALESCE($11, school_settings.default_due_days),
 invoice_format = COALESCE($12, school_settings.invoice_format),
 updated_at = now()`,
 [
 (v.name as string) ?? "SMP Negeri 17 Tangerang Selatan",
 v.name ?? null,
 v.logoUrl ?? null,
 v.email === undefined ? null : v.email,
 v.address === undefined ? null : v.address,
 v.phone === undefined ? null : v.phone,
 v.className === undefined ? null : v.className,
 v.academicYear === undefined ? null : v.academicYear,
 v.logoUrl === null,
 v.defaultAmount === undefined ? null : v.defaultAmount,
 v.defaultDueDays === undefined ? null : v.defaultDueDays,
 v.invoiceFormat === undefined ? null : v.invoiceFormat,
 ],
 );

 const { rows } = await db.query(
 `SELECT name, logo_url AS "logoUrl", email, address, phone,
 class_name AS "className", academic_year AS "academicYear",
 default_amount AS "defaultAmount", default_due_days AS "defaultDueDays",
 invoice_format AS "invoiceFormat", updated_at AS "updatedAt"
 FROM school_settings WHERE id = 1`,
 );
 return json({ school: rows[0] });
});