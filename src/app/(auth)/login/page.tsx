"use client";

import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";
import { useI18n } from "@/hooks/use-i18n";
import { GraduationCap, UserCog, ChevronRight, HelpCircle } from "lucide-react";

export default function LoginPage() {
 const { t } = useI18n();

 return (
 <AuthLayout title={t("login.title")} subtitle={t("login.subtitle")} boxed={false}>
 <div className="space-y-3.5">
 <RoleCard
 href="/login/admin"
 icon={<UserCog className="h-5 w-5" aria-hidden="true" />}
 title={t("login.titleAdmin")}
 subtitle={t("login.subtitleAdmin")}
 />
 <RoleCard
 href="/login/student"
 icon={<GraduationCap className="h-5 w-5" aria-hidden="true" />}
 title={t("login.titleStudent")}
 subtitle={t("login.subtitleStudent")}
 />
 </div>

 <div className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
 <HelpCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
 <span>Kendala akses akun? Hubungi pengelola Tata Usaha.</span>
 </div>
 </AuthLayout>
 );
}

interface RoleCardProps {
 href: string;
 icon: React.ReactNode;
 title: string;
 subtitle: string;
}

function RoleCard({ href, icon, title, subtitle }: RoleCardProps) {
 return (
 <Link
 href={href}
 className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-card transition-all duration-150 hover:border-primary/40 hover:bg-secondary/50 hover:shadow-teal-sm active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
 >
 <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/60 text-primary transition-colors group-hover:border-primary/30 group-hover:bg-primary/10">
 {icon}
 </span>
 <span className="min-w-0 flex-1">
 <span className="block text-sm sm:text-base font-semibold text-foreground leading-snug">
 {title}
 </span>
 <span className="mt-0.5 block text-xs sm:text-sm leading-relaxed text-muted-foreground">
 {subtitle}
 </span>
 </span>
 <ChevronRight
 aria-hidden="true"
 className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-150 ease-out group-hover:translate-x-1 group-hover:text-primary"
 />
 </Link>
 );
}
