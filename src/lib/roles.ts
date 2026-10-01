import type { UserRole } from "@/types";

/**
 * Helper peran yang aman dipakai di server DAN client.
 *
 * Sengaja tanpa import apa pun: `lib/api.ts` menarik `lib/session.ts` →
 * `lib/db.ts` → driver postgres, yang tidak boleh masuk ke bundel browser.
 *Catatan: JANGAN letakkan helper role di lib/api.ts.
 */
export function isStaffRole(role: UserRole | null | undefined): boolean {
 return role === "super_admin" || role === "class_admin" || role === "treasurer";
}

/** Super Admin = akses seluruh sekolah. Admin Kelas = ter-scope satu kelas. */
export function isSuperAdmin(role: UserRole | null | undefined): boolean {
 return role === "super_admin";
}
