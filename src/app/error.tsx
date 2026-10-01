"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Boundary error per segment. Tanpa file ini, satu render gagal di server
// component = layar putih tanpa tombol pemulihan.
export default function Error({
 error,
 reset,
}: {
 error: Error & { digest?: string };
 reset: () => void;
}) {
 useEffect(() => {
 // Server component tidak pernah mengirim pesan yang aman untuk ditampilkan,
 // jadi cukup catat di console browser untuk Developers Tools.
 console.error("[app] render gagal", error);
 }, [error]);

 return (
 <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
 <div className="space-y-2">
 <h1 className="text-lg font-semibold">Terjadi kesalahan</h1>
 <p className="mx-auto max-w-sm text-sm text-muted-foreground">
 Kami tidak dapat memuat bagian ini. Coba lagi, atau kembali ke beranda.
 </p>
 {error.digest && (
 <p className="text-xs text-muted-foreground/70 font-mono">Kode: {error.digest}</p>
 )}
 </div>
 <div className="flex flex-wrap items-center justify-center gap-2">
 <Button onClick={reset}>Coba lagi</Button>
 <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
 Kembali ke beranda
 </Button>
 </div>
 </main>
 );
}
