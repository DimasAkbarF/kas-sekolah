import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import type { UserRole } from "@/types";

const COOKIE_NAME = "ks_session";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari

export interface SessionUser {
 id: string;
 name: string;
 email: string;
 role: UserRole;
 avatar: string | null;
 /** Sumber kebenaran scope. Diambil dari cookie/session, BUKAN dari request. */
 classId: string | null;
 className: string | null;
  /** false = kelas dinonaktifkan, workspace Admin Kelas ditutup. */
  classActive: boolean;
  /**
   * true = kelas sedang dalam pemeliharaan. Satu-satunya sumber kebenaran.
   *
   * Pengguna tanpa `class_id` (Super Admin, bendahara global) selalu mendapat
   * `false` di sini karena `c.maintenance` NULL. Jadi pengecekan maintenance
   * tidak perlu memfilter role di lapisan mana pun.
   */
  classMaintenance: boolean;
}

export function hashToken(token: string): string {
 return createHash("sha256").update(token).digest("hex");
}

async function cookieStore() {
 return cookies();
}

export async function setSessionCookie(token: string): Promise<void> {
 (await cookieStore()).set(COOKIE_NAME, token, {
 httpOnly: true,
 secure: process.env.NODE_ENV === "production",
 sameSite: "lax",
 path: "/",
 maxAge: TTL_MS / 1000,
 });
}

export async function createSession(userId: string): Promise<void> {
 const token = randomBytes(32).toString("base64url");
 const db = await getDb();
 await db.query(
 "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
 [hashToken(token), userId, new Date(Date.now() + TTL_MS).toISOString()],
 );
 await setSessionCookie(token);
}

export async function getSessionUser(): Promise<SessionUser | null> {
 const token = (await cookieStore()).get(COOKIE_NAME)?.value;
 if (!token) return null;

 const db = await getDb();
 const { rows } = await db.query<SessionUser>(
 `SELECT u.id, u.name, u.email, u.role, u.avatar,
 u.class_id AS "classId",
 c.name AS "className",
  COALESCE(c.is_active, true) AS "classActive",
  COALESCE(c.maintenance, false) AS "classMaintenance"
  FROM sessions s
 JOIN users u ON u.id = s.user_id
 LEFT JOIN classes c ON c.id = u.class_id
 WHERE s.token_hash = $1 AND s.expires_at > now()`,
 [hashToken(token)],
 );
 return rows[0] ?? null;
}

export async function destroySession(): Promise<void> {
 const token = (await cookieStore()).get(COOKIE_NAME)?.value;
 if (token) {
 const db = await getDb();
 await db.query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
 }
 (await cookieStore()).delete(COOKIE_NAME);
}