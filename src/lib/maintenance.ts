import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

/**
 * Gerbang pemeliharaan untuk halaman yang dirender di server.
 *
 * `guard()` di `src/lib/api.ts` sudah memblokir semua API dengan 503, jadi ini
 * lapisan kedua: mencegah halaman itself sampai ter-render. Tanpa ini, Admin
 * Kelas yang sedang dipelihara akan melihat dashboard kosong yang gagal
 * dimuat di mana-mana: UX yang membingungkan, dan terlihat seperti
 * datanya hilang.
 *
 * Hanya perlu dipanggil dari layout yang punya pengguna terikat kelas
 * (`class_admin`, `student`). Super Admin dan bendahara global tidak pernah
 * punya `class_id`, jadi `classMaintenance` selalu false untuk mereka.
 *
 * Hard refresh dan URL langsung lewat sini. Navigasi antar halaman di dalam
 * app ditangani `RoleGuard` (client) karena layout tidak re-run saat
 * navigasi klien.
 */
export async function requireClassNotInMaintenance(): Promise<void> {
 const user = await getSessionUser();
 if (user?.classMaintenance) redirect("/maintenance");
}
