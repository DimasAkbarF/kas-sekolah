"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";
import type { TKey } from "@/lib/i18n";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/ui/sidebar";
import {
 LayoutDashboard,
 Receipt,
 ArrowLeftRight,
 GraduationCap,
 TrendingUp,
 TrendingDown,
 BarChart3,
 CreditCard,
 Settings,
 History,
 User,
 KeyRound,
 Wallet,
 School,
 Users,
 PieChart,
} from "lucide-react";
import type { UserRole } from "@/types";

interface NavItem {
 labelKey: TKey;
 href: string;
 icon: React.ReactNode;
}

interface NavSection {
 title?: string;
 items: NavItem[];
}

// Satu dashboard untuk semua Admin Kelas. Menu Super Admin (Kelola Kelas,
// Kelola Admin, Gateway, Pengaturan) tidak muncul untuk Admin Kelas karena
// halamannya memang menolak di server.
const classAdminSections: NavSection[] = [
 {
 title: "Utama",
 items: [
 {
 labelKey: "nav.dashboard",
 href: "/admin/dashboard",
 icon: <LayoutDashboard className="h-4 w-4" />,
 },
 ],
 },
 {
 title: "Akademik & Akun",
 items: [
 { labelKey: "nav.bills", href: "/admin/bills", icon: <Receipt className="h-4 w-4" /> },
 {
 labelKey: "nav.transactions",
 href: "/admin/transactions",
 icon: <ArrowLeftRight className="h-4 w-4" />,
 },
 {
 labelKey: "nav.students",
 href: "/admin/students",
 icon: <GraduationCap className="h-4 w-4" />,
 },
 {
 labelKey: "nav.resetRequests",
 href: "/admin/reset-requests",
 icon: <KeyRound className="h-4 w-4" />,
 },
 ],
 },
 {
 title: "Arus Kas & Laporan",
 items: [
 { labelKey: "nav.income", href: "/admin/income", icon: <TrendingUp className="h-4 w-4" /> },
 {
 labelKey: "nav.expenses",
 href: "/admin/expenses",
 icon: <TrendingDown className="h-4 w-4" />,
 },
 { labelKey: "nav.reports", href: "/admin/reports", icon: <BarChart3 className="h-4 w-4" /> },
 ],
 },
];

const superAdminSections: NavSection[] = [
 {
 title: "Utama",
 items: [
 {
 labelKey: "nav.dashboard",
 href: "/admin/dashboard",
 icon: <LayoutDashboard className="h-4 w-4" />,
 },
 ],
 },
 {
 title: "Akademik & Akun",
 items: [
 { labelKey: "nav.bills", href: "/admin/bills", icon: <Receipt className="h-4 w-4" /> },
 {
 labelKey: "nav.transactions",
 href: "/admin/transactions",
 icon: <ArrowLeftRight className="h-4 w-4" />,
 },
 {
 labelKey: "nav.students",
 href: "/admin/students",
 icon: <GraduationCap className="h-4 w-4" />,
 },
 {
 labelKey: "nav.resetRequests",
 href: "/admin/reset-requests",
 icon: <KeyRound className="h-4 w-4" />,
 },
 ],
 },
 {
 title: "Arus Kas & Laporan",
 items: [
 { labelKey: "nav.income", href: "/admin/income", icon: <TrendingUp className="h-4 w-4" /> },
 {
 labelKey: "nav.expenses",
 href: "/admin/expenses",
 icon: <TrendingDown className="h-4 w-4" />,
 },
 { labelKey: "nav.reports", href: "/admin/reports", icon: <BarChart3 className="h-4 w-4" /> },
 ],
 },
 {
 title: "Sekolah",
 items: [
 { labelKey: "nav.classes", href: "/admin/classes", icon: <School className="h-4 w-4" /> },
 { labelKey: "nav.staff", href: "/admin/staff", icon: <Users className="h-4 w-4" /> },
 ],
 },
 {
 title: "Monitoring",
 items: [
 {
 labelKey: "nav.statistics",
 href: "/principal/statistics",
 icon: <PieChart className="h-4 w-4" />,
 },
 ],
 },
 {
 title: "Pembayaran",
 items: [
 {
 labelKey: "nav.paymentGateway",
 href: "/admin/payment-gateway",
 icon: <CreditCard className="h-4 w-4" />,
 },
 {
 labelKey: "nav.paymentMethods",
 href: "/admin/payment-methods",
 icon: <Wallet className="h-4 w-4" />,
 },
 ],
 },
 {
 title: "Konfigurasi",
 items: [
 { labelKey: "nav.settings", href: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
 ],
 },
];

const treasurerSections: NavSection[] = [
 {
 title: "Pembukuan Kas",
 items: [
 {
 labelKey: "nav.dashboard",
 href: "/treasurer/dashboard",
 icon: <LayoutDashboard className="h-4 w-4" />,
 },
 { labelKey: "nav.bills", href: "/treasurer/bills", icon: <Receipt className="h-4 w-4" /> },
 {
 labelKey: "nav.transactions",
 href: "/treasurer/transactions",
 icon: <ArrowLeftRight className="h-4 w-4" />,
 },
 { labelKey: "nav.reports", href: "/treasurer/reports", icon: <BarChart3 className="h-4 w-4" /> },
 ],
 },
];

const studentSections: NavSection[] = [
 {
 title: "Keuangan Siswa",
 items: [
 {
 labelKey: "nav.dashboard",
 href: "/student/dashboard",
 icon: <LayoutDashboard className="h-4 w-4" />,
 },
 { labelKey: "nav.myBills", href: "/student/bills", icon: <Receipt className="h-4 w-4" /> },
 { labelKey: "nav.history", href: "/student/history", icon: <History className="h-4 w-4" /> },
 { labelKey: "nav.profile", href: "/student/profile", icon: <User className="h-4 w-4" /> },
 ],
 },
];

const roleSectionMap: Record<UserRole, NavSection[]> = {
 super_admin: superAdminSections,
 class_admin: classAdminSections,
 treasurer: treasurerSections,
 student: studentSections,
};

interface SidebarNavProps {
 role: UserRole;
}

export function SidebarNav({ role }: SidebarNavProps) {
 const pathname = usePathname();
 const { t } = useI18n();
 const { state, isMobile } = useSidebar();
 const sections = roleSectionMap[role];
 // Mode icon-only: label disembunyikan, item di tengah, tooltip muncul di kanan.
 const collapsed = state === "collapsed" && !isMobile;

 return (
 <nav className="flex flex-col gap-3 px-2 py-3 group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:px-1.5">
 {sections.map((section, sIndex) => (
 <div key={sIndex} className="flex flex-col gap-0.5">
 {section.title && (
 <p className="px-2.5 pb-1 pt-1 text-xs font-semibold text-muted-foreground/80 r group-data-[collapsible=icon]:hidden">
 {section.title}
 </p>
 )}
 {section.items.map((item) => {
 const isActive =
 pathname === item.href ||
 (item.href !== "/admin/dashboard" &&
 item.href !== "/student/dashboard" &&
 pathname.startsWith(item.href + "/"));
 const label = t(item.labelKey);
 const link = (
 <Link
 href={item.href}
 aria-label={label}
 aria-current={isActive ? "page" : undefined}
 className={cn(
 "group/item relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all active:scale-[0.99]",
 "group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0",
         isActive
          ? "bg-teal-soft text-primary font-bold dark:text-foreground"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-primary",
         )}
     >
       {isActive && (
         <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-teal group-data-[collapsible=icon]:h-3.5 group-data-[collapsible=icon]:w-1" />
       )}
 <span
 className={cn(
 "shrink-0 transition-colors",
 isActive ? "text-primary" : "text-muted-foreground group-hover/item:text-primary",
 )}
 >
 {item.icon}
 </span>
 <span className="truncate group-data-[collapsible=icon]:hidden">{label}</span>
 </Link>
 );

 if (!collapsed) return <Fragment key={item.href}>{link}</Fragment>;

 return (
 <Tooltip key={item.href}>
 <TooltipTrigger render={link} />
 <TooltipContent side="right" align="center">
 {label}
 </TooltipContent>
 </Tooltip>
 );
 })}
 </div>
 ))}
 </nav>
 );
}
