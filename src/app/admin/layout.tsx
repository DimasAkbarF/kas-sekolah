import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";
import { requireClassNotInMaintenance } from "@/lib/maintenance";

export const metadata: Metadata = {
 robots: { index: false, follow: false },
};

export default async function AdminLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 // Gerbang server: kelas yang sedang dipelihara tidak boleh memuat halaman
 // admin sama sekali, termasuk saat URL dibuka langsung atau di-refresh.
 await requireClassNotInMaintenance();
 return <RoleGuard allowedRoles={["super_admin", "class_admin"]}>{children}</RoleGuard>;
}
