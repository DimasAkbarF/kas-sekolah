import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";

export const metadata: Metadata = {
 robots: { index: false, follow: false },
};

export default function TreasurerLayout({ children }: { children: React.ReactNode }) {
 return <RoleGuard allowedRoles="treasurer">{children}</RoleGuard>;
}
