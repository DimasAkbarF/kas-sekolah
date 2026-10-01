import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Server Component: 404 harus bisa dirender tanpa hydration, jadi teksnya
// langsung (bukan lewat `useI18n`) dan tanpa interaksi di luar Link.
export const metadata: Metadata = {
 title: "Halaman tidak ditemukan",
};

export default function NotFound() {
 return (
 <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
 <div className="space-y-2">
 <p className="text-5xl font-bold tracking-tight text-primary tabular-nums">404</p>
 <h1 className="text-lg font-semibold">Halaman tidak ditemukan</h1>
 <p className="mx-auto max-w-sm text-sm text-muted-foreground">
 Alamat yang Anda buka tidak ada, sudah dipindahkan, atau tidak tersedia untuk akun ini.
 </p>
 </div>
 <div className="flex flex-wrap items-center justify-center gap-2">
 <Button nativeButton={false} render={<Link href="/" />}>
 Kembali ke beranda
 </Button>
 <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>
 Masuk
 </Button>
 </div>
 </main>
 );
}
