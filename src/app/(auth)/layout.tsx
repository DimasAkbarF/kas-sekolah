import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/auth-gate";

export const metadata: Metadata = {
 title: "Masuk",
 description:
 "Masuk ke sistem kas sekolah SMP Negeri 17 Tangerang Selatan sebagai administrator atau siswa untuk mengelola dan melihat tagihan SPP.",
 alternates: {
 canonical: "/login",
 },
 robots: {
 index: true,
 follow: true,
 },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
 return <AuthGate>{children}</AuthGate>;
}
