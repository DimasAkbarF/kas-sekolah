"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { isHydrated, subscribeHydrated } from "@/lib/sync";
import { roleDashboardPath } from "@/services/auth.service";

const serverSnapshot = () => false;

// Menjauhkan pengguna yang sudah login dari halaman auth.
//
// PENTING: redirect hanya boleh setelah `hydrate()` selesai. Sebelumnya
// AuthGate langsung percaya `localStorage`, sehingga sesi yang sudah invalid di
// server memicu siklus: /admin/* → proxy → /login → AuthGate → /admin/* → …
// Setelah hidrasi, cookie yang ditolak API sudah menghapus session lokal, jadi
// `user` bernilai null dan redirect berhenti.
export function AuthGate({ children }: { children: React.ReactNode }) {
 const router = useRouter();
 const { user } = useAuth();
 const ready = useSyncExternalStore(subscribeHydrated, isHydrated, serverSnapshot);

 useEffect(() => {
 if (ready && user) {
 router.replace(roleDashboardPath(user.role));
 }
 }, [ready, user, router]);

 if (ready && user) return null;

 return <>{children}</>;
}
