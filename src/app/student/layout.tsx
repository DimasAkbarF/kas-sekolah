import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";
import { requireClassNotInMaintenance } from "@/lib/maintenance";

export const metadata: Metadata = {
 robots: { index: false, follow: false },
};

export default async function StudentLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 await requireClassNotInMaintenance();
 return <RoleGuard allowedRoles="student">{children}</RoleGuard>;
}
