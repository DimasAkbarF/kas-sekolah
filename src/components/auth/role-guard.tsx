"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { isHydrated, subscribeHydrated } from "@/lib/sync";
import { roleDashboardPath } from "@/services/auth.service";
import type { UserRole } from "@/types";

interface RoleGuardProps {
 /** Satu role atau daftar role yang boleh masuk. */
 allowedRoles: UserRole | UserRole[];
 children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
 const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
 const router = useRouter();
 const pathname = usePathname();
 const { user } = useAuth();

 // `hydrated` = percobaan `/api/auth/me` di `hydrate()` sudah selesai, bukan
 // sekadar"komponen terpasang". Menunggu ini mencegah session localStorage
 // yang sudah basi sempat menampilkan UI terproteksi, dan membuat redirect
 // tidak berlomba dengan proxy.
 const hydrated = useSyncExternalStore(subscribeHydrated, isHydrated, () => false);

 useEffect(() => {
 if (!hydrated) return;
 if (!user) {
 const redirect = `/login?redirect=${encodeURIComponent(pathname)}`;
 router.replace(redirect);
 return;
 }

 // Kelas sedang pemeliharaan: seluruh route API sudah membalas 503, jadi
 // di sini kita hentikan sebelum halaman tries memuat data. Layout server
 // tidak menangkap kasus ini karena layout tidak re-run saat navigasi klien.
 if (user.classMaintenance) {
 router.replace("/maintenance");
 return;
 }

 // Role yang tidak diizinkan (atau kelasnya dinonaktifkan) diarahkan ke
 // dashboard-nya sendiri, bukan ke halaman yang sedang dibuka.
 if (!allowed.includes(user.role)) {
 router.replace(roleDashboardPath(user.role));
 }
 // `allowedRoles` biasanya array literal dari layout, jadi ia diserialkan
 // agar efek tidak berjalan ulang tiap render.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [hydrated, user, allowed.join(","), pathname, router]);

 if (!user) {
 return (
 <div className="flex min-h-svh items-center justify-center bg-muted/30">
 <p className="text-sm text-muted-foreground">Memuat...</p>
 </div>
 );
 }

 if (user.classMaintenance) return null;

 if (!allowed.includes(user.role)) {
 return null;
 }

 return <>{children}</>;
}
