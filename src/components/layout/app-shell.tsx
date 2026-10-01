"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "./app-sidebar";
import { Header } from "./header";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import type { UserRole } from "@/types";

interface AppShellProps {
 children: React.ReactNode;
 role?: UserRole;
 breadcrumbs: { label: string; href?: string }[];
}

export function AppShell({ children, role, breadcrumbs }: AppShellProps) {
 const { user } = useAuth();
 const { t } = useI18n();

 // Session is the source of truth once available (PRD: navigation follows role).
 const effectiveRole = (user?.role ?? role) as UserRole;
 const effectiveName = user?.name ?? "";

 // Label crumb pertama selalu mengikuti role sesi. Beberapa halaman masih
 // menuliskan"Super Admin"secara statis — menyesatkan untuk Admin Kelas.
 const crumbs =
 breadcrumbs.length > 0
 ? [{ label: t(`role.${effectiveRole}`), href: breadcrumbs[0].href }, ...breadcrumbs.slice(1)]
 : breadcrumbs;

 return (
 <TooltipProvider>
 <SidebarProvider>
 <AppSidebar
 role={effectiveRole}
 userName={effectiveName}
 userEmail={user?.email}
 className={user?.className ?? null}
 />
 <SidebarInset className="bg-background min-h-screen flex flex-col">
 {/* Sidebar datang lebih dulu di DOM; tanpa ini pengguna keyboard harus
 menabakan 10+ link tiap halaman (WCAG 2.4.1). */}
 <a
 href="#main-content"
 className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:ring-2 focus:ring-ring"
 >
 {t("common.skipToContent")}
 </a>
 <Header breadcrumbs={crumbs} />
 {/* SidebarInset sudah <main>; pakai section agar tidak ada dua landmark. */}
 <div
 id="main-content"
 tabIndex={-1}
 className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto focus:outline-none"
 >
 {children}
 </div>
 </SidebarInset>
 </SidebarProvider>
 </TooltipProvider>
 );
}
