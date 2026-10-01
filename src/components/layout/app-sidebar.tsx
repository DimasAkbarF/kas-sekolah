"use client";

import {
 Sidebar,
 SidebarContent,
 SidebarHeader,
 SidebarFooter,
 SidebarRail,
} from "@/components/ui/sidebar";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuGroup,
 DropdownMenuItem,
 DropdownMenuLabel,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarNav } from "./sidebar-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SchoolLogo } from "@/components/school-logo";
import { Button } from "@/components/ui/button";
import { LogOut, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useSchool } from "@/hooks/use-school";
import { useI18n } from "@/hooks/use-i18n";
import type { TKey } from "@/lib/i18n";
import type { UserRole } from "@/types";

interface AppSidebarProps {
 role: UserRole;
 userName: string;
 userEmail?: string;
 /** Nama kelas workspace Admin Kelas. Super Admin = null (seluruh sekolah). */
 className?: string | null;
}

const roleLabelKey: Record<UserRole, TKey> = {
 super_admin: "role.super_admin",
 class_admin: "role.class_admin",
 treasurer: "role.treasurer",
 student: "role.student",
};

export function AppSidebar({ role, userName, userEmail, className }: AppSidebarProps) {
 const router = useRouter();
 const { signOut } = useAuth();
 const school = useSchool();
 const { t } = useI18n();

 function handleLogout() {
 void signOut().then(() => router.replace("/login"));
 }

 return (
 <Sidebar collapsible="icon" variant="sidebar">
 <SidebarHeader className="border-b border-sidebar-border p-3">
 <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
 <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal text-white shadow-teal-sm border border-white/40 dark:border-teal-line group-data-[collapsible=icon]:size-8">
 <SchoolLogo
 className="h-8 w-8 group-data-[collapsible=icon]:size-6"
 iconClassName="h-5 w-5 text-white"
 imageClassName="h-full w-full object-contain"
 />
 </span>
 <div className="group-data-[collapsible=icon]:hidden min-w-0 flex-1">
 <p className="text-sm font-bold tracking-tight text-foreground leading-tight">
 {t("app.name")}
 </p>
 <p className="truncate text-xs text-muted-foreground mt-0.5">{school.name}</p>
 <p className="mt-1 inline-flex w-fit items-center rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-primary dark:text-teal-ink">
 {t("classes.workspaceBadge", { name: className ?? t("classes.scopeSchool") })}
 </p>
 </div>
 </div>
 </SidebarHeader>

 <SidebarContent>
 <SidebarNav role={role} />
 </SidebarContent>

 <SidebarFooter className="border-t border-sidebar-border p-2">
 <DropdownMenu>
 <DropdownMenuTrigger
 render={
 <Button
 variant="ghost"
 className="w-full justify-start h-10 px-2 hover:bg-secondary/40 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
 />
 }
 >
 <Avatar className="h-7 w-7 shrink-0">
 <AvatarFallback className="text-[11px] font-semibold bg-secondary border border-border text-primary dark:text-teal-ink">
 {userName
 .split("")
 .map((n) => n[0])
 .join("")
 .slice(0, 2)
 .toUpperCase()}
 </AvatarFallback>
 </Avatar>
 <div className="flex-1 min-w-0 text-left group-data-[collapsible=icon]:hidden pl-1">
 <p className="text-xs font-semibold text-foreground truncate leading-tight">{userName}</p>
 <p className="text-[11px] text-muted-foreground truncate">{t(roleLabelKey[role])}</p>
 </div>
 <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground group-data-[collapsible=icon]:hidden shrink-0" />
 </DropdownMenuTrigger>
 <DropdownMenuContent
 align="start"
 side="top"
 className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56"
 >
 <DropdownMenuGroup>
 <DropdownMenuLabel>
 <p className="text-xs font-semibold text-foreground truncate">{userName}</p>
 {userEmail && (
 <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-normal">
 {userEmail}
 </p>
 )}
 </DropdownMenuLabel>
 </DropdownMenuGroup>
 <DropdownMenuSeparator />
 <DropdownMenuItem
 onClick={handleLogout}
 className="text-destructive focus:text-destructive cursor-pointer text-xs"
 >
 <LogOut className="mr-2 h-3.5 w-3.5" />
 {t("app.logout")}
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </SidebarFooter>
 <SidebarRail />
 </Sidebar>
 );
}
