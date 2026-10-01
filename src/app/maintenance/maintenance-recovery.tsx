"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { roleDashboardPath } from "@/services/auth.service";
import { apiFetch, ApiError } from "@/lib/api-client";

/** Seberapa sering status dicek ulang. 15 detik: Super Admin baru saja mengubah
 * flag, dan lebih sering dari itu hanya membebani server tanpa manfaat. */
const POLL_MS = 15_000;

interface MaintenanceRecoveryProps {
 signedIn: boolean;
}

/**
 * Pemulihan dari halaman maintenance: aksi keluar/masuk, tombol "Coba lagi",
 * dan laporan status yang jujur.
 *
 * Sumber kebenaran selalu server. Session di localStorage dibuat saat login,
 * jadi flag `classMaintenance` di sana bisa basi: Super Admin bisa menyalakan
 * maintenance setelah pengguna itu login. Karena itu endpoint `/api/auth/me`
 * dipakai, dan itu endpoint yang SENGAJA tidak ikut diblokir `guard()`.
 */
export function MaintenanceRecovery({ signedIn }: MaintenanceRecoveryProps) {
 const { user, signOut } = useAuth();
 const router = useRouter();
 const [checking, setChecking] = useState(false);
 const [note, setNote] = useState<string | null>(null);
 const alive = useRef(true);

 useEffect(() => {
 alive.current = true;
 return () => {
 alive.current = false;
 };
 }, []);

 const check = useCallback(async () => {
 setChecking(true);
 try {
 const res = await apiFetch<{ user: { classMaintenance?: boolean } }>(
 "/api/auth/me",
 );
 if (!alive.current) return;
 // Session sudah tidak berlaku (mis. dicabut dari luar): jangan loop di sini.
 if (!res.user) {
 void signOut().then(() => router.replace("/login"));
 return;
 }
 if (res.user.classMaintenance) {
 setNote("Kelas ini masih dalam pemeliharaan.");
 return;
 }
 // Sudah selesai: masuk ke dashboard, jangan tinggal di halaman ini.
 router.replace(user ? roleDashboardPath(user.role) : "/login");
 } catch (err) {
 if (!alive.current) return;
 setNote(
 err instanceof ApiError && err.status >= 500
 ? "Server belum bisa dihubungi. Dicoba lagi otomatis."
 : "Status belum bisa diperiksa. Dicoba lagi otomatis.",
 );
 } finally {
 if (alive.current) setChecking(false);
 }
 }, [router, signOut, user]);

 // Auto-retry: begitu Super Admin mencabut maintenance, pengguna masuk sendiri
 // tanpa harus login ulang atau menekan apa pun.
 useEffect(() => {
 if (!user) return;
 const timer = setInterval(() => void check(), POLL_MS);
 return () => clearInterval(timer);
 }, [user, check]);

 if (!signedIn) {
 return (
 <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
 <Button nativeButton={false} render={<Link href="/" />}>
 Kembali ke Beranda
 </Button>
 <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>
 Masuk
 </Button>
 </div>
 );
 }

 return (
 <div className="mt-8">
 <div className="flex flex-wrap items-center justify-center gap-2">
 <Button
 disabled={checking}
 onClick={() => {
 setNote(null);
 void check();
 }}
 >
 {checking && <Loader2 className="animate-spin" aria-hidden="true" />}
 Coba lagi
 </Button>
 <Button
 variant="outline"
 disabled={checking}
 onClick={() => {
 setChecking(true);
 void signOut().then(() => router.replace("/login"));
 }}
 >
 Keluar
 </Button>
 </div>

 {/*
 `role="status"` supaya perubahan kalimatnya diumumkan pembaca layar. Isinya
 hanya kalau sedang memeriksa atau ada hasil: saat idle, halaman sudah
 menjelaskan situasinya di atas.
 */}
 <p role="status" className="mt-5 min-h-4 text-xs text-muted-foreground">
 {checking ? "Memeriksa status pemeliharaan..." : note ?? ""}
 </p>
 </div>
 );
}
