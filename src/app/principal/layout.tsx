import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";

export const metadata: Metadata = {
 robots: { index: false, follow: false },
};

export default function PrincipalLayout({ children }: { children: React.ReactNode }) {
 return <RoleGuard allowedRoles="super_admin">{children}</RoleGuard>;
}
