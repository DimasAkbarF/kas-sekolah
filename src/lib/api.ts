import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, type SessionUser } from "@/lib/session";
import type { UserRole } from "@/types";
import { isSuperAdmin } from "@/lib/roles";

export function json(data: unknown, status = 200): NextResponse {
 return NextResponse.json(data, { status });
}

export function error(message: string, status = 400): NextResponse {
 return NextResponse.json({ error: message }, { status });
}

export function dashboardPathFor(role: UserRole): string {
 const map: Record<UserRole, string> = {
 super_admin: "/admin/dashboard",
 class_admin: "/admin/dashboard",
 treasurer: "/treasurer/dashboard",
 student: "/student/dashboard",
 };
 return map[role];
}

// IP asli klien: ambil hop TERAKHIR dari x-forwarded-for (ditambahkan proxy, tak
// bisa dipalsukan klien) atau x-real-ip. Entry pertama bisa diisi tangan oleh
// penyerang saat app di belakang proxy longgar.
export function clientIp(request: Request): string {
 const forwarded = request.headers
 .get("x-forwarded-for")
 ?.split(",")
 .map((s) => s.trim())
 .filter(Boolean);
 if (forwarded && forwarded.length > 0) return forwarded[forwarded.length - 1] ?? "unknown";
 return request.headers.get("x-real-ip") ?? "local";
}

export async function parseBody<T>(
 request: Request,
 schema: z.ZodType<T>,
): Promise<{ ok: true; value: T } | { ok: false; response: NextResponse }> {
 let raw: unknown;
 try {
 raw = await request.json();
 } catch {
 return { ok: false, response: error("Request body tidak valid.", 400) };
 }
 const parsed = schema.safeParse(raw);
 if (!parsed.success) {
 const detail = parsed.error.issues
 .map((i) => `"${String(i.path.join("."))}": ${i.message}`)
 .join("; ");
 return { ok: false, response: error(`Validasi gagal: ${detail}`, 400) };
 }
 return { ok: true, value: parsed.data };
}

export type GuardResult =
 | { ok: true; user: SessionUser }
 | { ok: false; status: number; reason?: "maintenance" };

// Memeriksa autentikasi & otorisasi role di sisi server. Guard ini dipakai di
// setiap route handler sebelum akses data.
//
// Menolak juga Admin Kelas yang:
// - belum punya kelas yang di-assign, atau
// - kelasnya dinonaktifkan (workspace ditutup, data historis tetap utuh).
//
// Maintenance dicek DI SINI, sekali saja, dan berlaku ke seluruh route karena
// semua route handler memanggil guard(). Inilah yang membuat UI tidak bisa
// dilewati: walau halaman sempat ter-render, tidak ada data yang bisa dibaca
// atau ditulis. Balas 503 (Service Unavailable), bukan 403 karena aksesnya
// memang sah; yang tidak tersedia adalah layanannya.
//
// Catatan: `classMaintenance` hanya true bila `class_id` menunjuk kelas yang
// dimatikan. Super Admin dan bendahara global punya class_id NULL sehingga
// otomatis lolos tanpa perlu percabangan role.
export async function guard(roles?: UserRole[]): Promise<GuardResult> {
 const user = await getSessionUser();
 if (!user) return { ok: false, status: 401 };
 if (roles && !roles.includes(user.role)) return { ok: false, status: 403 };
 if (user.role === "class_admin" && (!user.classId || !user.classActive)) {
 return { ok: false, status: 403 };
 }
 if (user.classMaintenance) {
 return { ok: false, status: 503, reason: "maintenance" };
 }
 return { ok: true, user };
}

/** Super Admin (dan bendahara global) melihat seluruh sekolah. */
export function isGlobalScope(user: SessionUser): boolean {
 return isSuperAdmin(user.role) || user.role === "treasurer";
}

/**
 * Tambahkan filter kelas ke kumpulan kondisi SQL.
 *
 * Super Admin/bendahara: tidak ada filter (lihat semua kelas).
 * Admin Kelas: `WHERE ... AND <alias>.class_id = $n` dengan classId dari
 * session. Nilai dari body/query TIDAK pernah dipakai.
 *
 * Targetkan tabel yang punya kolom class_id: students, bills, transactions,
 * incomes, expenses, reminders, payment_methods.
 */
export function applyScope(
 user: SessionUser,
 conds: string[],
 vals: unknown[],
 alias = "s",
): void {
 if (isGlobalScope(user)) return;
 if (user.role === "class_admin" && user.classId) {
 conds.push(`${alias}.class_id = $${vals.push(user.classId)}`);
 }
}

/**
 * Sama seperti applyScope, tapi juga menyertakan tagihan sekolah (class_id IS
 * NULL) milik Super Admin. Dipakai di mana data global harus ikut tampil
 * (tagihan & metode pembayaran).
 */
export function applyScopeWithSchoolWide(
 user: SessionUser,
 conds: string[],
 vals: unknown[],
 alias = "b",
): void {
 if (isGlobalScope(user)) return;
 if (user.role === "class_admin" && user.classId) {
 conds.push(
 `(${alias}.class_id = $${vals.push(user.classId)} OR ${alias}.class_id IS NULL)`,
 );
 }
}

/** Kelas milik user, atau null bila user global. */
export function userClassId(user: SessionUser): string | null {
 return isGlobalScope(user) ? null : user.classId;
}

export function unauthorized(result: GuardResult): NextResponse {
 if (!result.ok && result.status === 401) {
 return error("Tidak terautentikasi.", 401);
 }
 // 503 punya pesan sendiri: kelasnya sedang dipelihara, bukan penolakan akses.
 if (!result.ok && result.reason === "maintenance") {
 return error(
 "Kelas ini sedang dalam pemeliharaan. Layanan sementara tidak tersedia.",
 503,
 );
 }
 return error("Akses ditolak.", 403);
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Webhook masuk dari server DOKU, bukan browser, jadi tidak punya Origin/Referer
// yang cocok dengan domain aplikasi. Check ini tidak boleh menutupnya.
const ORIGIN_EXEMPT_PATHS = new Set(["/api/payment/doku/notification"]);

/**
 * Lapis kedua CSRF untuk request yang mengubah data.
 *
 * Cookie sesi sudah `SameSite=Lax` sehingga browser modern tidak mengirimnya
 * pada POST lintas situs — tapi itu satu-satunya pertahanan, dan tidak berlaku
 * pada navigasi antar-subdomain maupun klien lama. Memeriksa Origin/Referer
 * menutup jalur itu tanpa mengubah signature route handler.
 */
function sameOrigin(request: Request): boolean {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return true;
  const source =
    request.headers.get("origin") ?? request.headers.get("referer") ?? "";
  // Tanpa Origin DAN tanpa Referer tidak ada yang bisa dicocokkan. Untuk app ini
  // semua request datang dari browser (fetch selalu mengirim Origin pada
  // non-GET), jadi ini ditolak, bukan di-longgarkan.
  if (!source) return false;
  try {
    return new URL(source).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

// Bungkus handler route yang bisa menyentuh DB. Tanpa ini, error runtime
// (violasi constraint, koneksi putus, JSONB rusak) jadi respons 500 tanpa body
// JSON, sehingga di sisi klien cuma tampil "Permintaan gagal (500)" tanpa
// konteks apa yang salah.
//
// withRouteErrors juga satu-satunya titik yang dilewati SETIAP route handler
// (dicek: tidak ada route yang mengekspor handler tanpa membungkusnya), jadi
// penolakan Origin di sini berlaku menyeluruh tanpa perlu diulang per route.
export function withRouteErrors<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
): (...args: T) => Promise<NextResponse> {
  return async (...args: T) => {
  const request = args[0] as Request | undefined;
  if (
    request instanceof Request &&
    !ORIGIN_EXEMPT_PATHS.has(new URL(request.url).pathname) &&
    !sameOrigin(request)
  ) {
    return error("Permintaan ditolak: asal tidak cocok.", 403);
  }
  try {
    return await handler(...args);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "23505") {
      return error("Data sudah ada (duplikat).", 409);
    }
    console.error("[api]", err);
    return error("Terjadi kesalahan di server. Coba ulangi.", 500);
  }
  };
}

// JSONB dari PG bisa arrive sebagai string (postgres.js) atau array (PGlite).
// JSON.parse tanpa guard = satu baris rusak membuat seluruh halaman 500.
export function parseJsonArray(value: unknown): unknown[] {
 if (Array.isArray(value)) return value;
 if (typeof value === "string") {
 try {
 const parsed: unknown = JSON.parse(value);
 return Array.isArray(parsed) ? parsed : [];
 } catch {
 return [];
 }
 }
 return [];
}