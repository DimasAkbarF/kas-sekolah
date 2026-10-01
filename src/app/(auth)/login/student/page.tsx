"use client";

import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";
import { useI18n } from "@/hooks/use-i18n";
import { ArrowLeft } from "lucide-react";

export default function StudentLoginPage() {
 const { t } = useI18n();
 return (
 <AuthLayout title={t("login.titleStudent")} subtitle={t("login.subtitleStudent")}>
 <LoginForm role="student" />

 <div className="mt-6 pt-4 border-t border-border text-center">
 <Link
 href="/login"
 className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
 >
 <ArrowLeft
 aria-hidden="true"
 className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-1"
 />
 <span>{t("login.goBackChoice")}</span>
 </Link>
 </div>
 </AuthLayout>
 );
}
