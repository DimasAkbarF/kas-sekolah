import type { Metadata } from "next";

// Halaman kwitansi hanya untuk pengguna yang sudah login. Root layout mengizinkan
// index, jadi tanpa noindex URL ini akan ter-indeks sebagai halaman kosong
// (crawler tidak punya localStorage untuk melewati guard klien).
export const metadata: Metadata = {
 title: "Kwitansi",
 robots: { index: false, follow: false },
};

export default function KwitansiLayout({ children }: { children: React.ReactNode }) {
 return children;
}
