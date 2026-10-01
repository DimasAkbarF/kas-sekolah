import type { Metadata } from "next";
import { getSessionUser } from "@/lib/session";
import { SchoolLogo } from "@/components/school-logo";
import { MaintenanceIllustration } from "./maintenance-illustration";
import { MaintenanceRecovery } from "./maintenance-recovery";

export const metadata: Metadata = {
 title: "Pemeliharaan sementara",
 robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Halaman pemeliharaan per kelas.
 *
 * Komposisinya mengikuti halaman 404 Github: satu ilustrasi di atas, lalu judul,
 * lalu penjelasan, lalu satu aksi. Bedanya, di sini tidak ada kartu, tidak ada
 * frame, tidak ada bayangan. Konten berdiri sendiri di tengah halaman dengan
 * whitespace sebagai pemisah.
 *
 * Yang menjaga ini terasa resmi dan bukan AI-landing: ilustrasi mereferensikan
 * benda nyata aplikasi (buku kas + roda gigi), bukan figur karikatur; tidak ada
 * gradien, glow, glass, blob, atau ilustrasi 3D; tidak ada langkah-langkah,
 * nomor besar, atau countdown palsu; tidak ada ikon dekoratif di sebelah teks.
 *
 * Dial: ENERGY 1 / MOTION 1. Satu-satunya gerakan adalah spinner saat tombol
 * "Coba lagi" bekerja.
 *
 * Seluruh konten dirender di server, jadi halaman tetap informatif ketika
 * JavaScript gagal dimuat.
 */
export default async function MaintenancePage() {
 const user = await getSessionUser();
 const className = user?.className ?? null;

 return (
 <main className="flex min-h-svh flex-col items-center justify-center px-6 py-16">
 <div className="flex w-full max-w-md flex-col items-center text-center">
 <div className="flex w-full items-center gap-3">
 {/*
 Logo memakai perlakuan yang sama dengan sidebar (petak teal + ikon putih):
 motif identitas produk, muncul sekali di kiri atas.
 */}
 <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-teal-dark bg-teal">
 <SchoolLogo
 className="h-10 w-10"
 iconClassName="h-5 w-5 text-white"
 imageClassName="h-full w-full object-contain"
 />
 </span>
 <div className="min-w-0 text-left">
 <p className="text-sm font-bold tracking-tight text-foreground">Kas Sekolah</p>
 <p className="truncate text-xs text-muted-foreground">Sistem administrasi kas</p>
 </div>
 </div>

 <MaintenanceIllustration className="mt-12" />

 {/* Tanpa label kecil di atas judul: judul sudah menyebut "pemeliharaan", jadi
 label itu hanya mengulang. */}
 <h1 className="mt-8 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
 {className ? (
 <>
 Kelas <span className="tabular-nums">{className}</span> sedang dalam
 pemeliharaan
 </>
 ) : (
 <>Kelas sedang dalam pemeliharaan</>
 )}
 </h1>
 <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
 Layanan untuk kelas ini sedang tidak tersedia sementara. Data yang sudah
 tersimpan tidak hilang dan tidak berubah.
 </p>
 <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
 Silakan kembali beberapa saat lagi.
 </p>

 {/* Aksi keluar/masuk, tombol coba lagi, dan laporan status. */}
 <MaintenanceRecovery signedIn={Boolean(user)} />
 </div>
 </main>
 );
}
