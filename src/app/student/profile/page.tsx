"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/dashboard/empty-state";
import { User } from "lucide-react";
import { getStudentProfile } from "@/services/student.service";
import { useI18n } from "@/hooks/use-i18n";
import { useDataVersion } from "@/hooks/use-data-version";

export default function StudentProfilePage() {
 const { t } = useI18n();
 useDataVersion();
 const profile = getStudentProfile();

 if (!profile) {
 return (
 <AppShell
 role="student"
 breadcrumbs={[
 { label: t("role.student"), href: "/student/dashboard" },
 { label: t("student.profileTitle") },
 ]}
 >
 <EmptyState title={t("student.recordMissing")} description={t("student.recordMissingDesc")} />
 </AppShell>
 );
 }

 const { student, className, email } = profile;

 return (
 <AppShell
 role="student"
 breadcrumbs={[
 { label: t("role.student"), href: "/student/dashboard" },
 { label: t("student.profileTitle") },
 ]}
 >
 <div className="space-y-6 max-w-lg">
 <PageHeader
 title={t("student.profileTitle")}
 subtitle={t("student.profileSubtitle")}
 accent="teal"
 icon={<User className="h-5 w-5" />}
 />

 <Card className="shadow-card border-border">
 <CardContent className="p-6">
 <div className="flex items-center gap-4">
 <Avatar className="h-16 w-16">
 <AvatarFallback className="text-lg bg-secondary text-primary font-semibold border border-border">
 {student.name
 .split("")
 .map((n) => n[0])
 .join("")
 .slice(0, 2)}
 </AvatarFallback>
 </Avatar>
 <div>
 <h2 className="text-lg font-semibold">{student.name}</h2>
 <p className="text-sm text-muted-foreground">
 {t("student.classLabel")} {className ?? "-"}
 </p>
 </div>
 </div>

 <Separator className="my-4" />

 <div className="space-y-3">
 <div className="flex justify-between gap-4 text-sm">
 <span className="text-muted-foreground">{t("student.profileName")}</span>
 <span className="font-medium text-right">{student.name}</span>
 </div>
 <div className="flex justify-between gap-4 text-sm">
 <span className="text-muted-foreground">{t("student.profileNis")}</span>
 <span className="font-medium tabular-nums">{student.nis}</span>
 </div>
 <div className="flex justify-between gap-4 text-sm">
 <span className="text-muted-foreground">{t("student.profileNisn")}</span>
 <span className="font-medium tabular-nums">{student.nisn}</span>
 </div>
 <div className="flex justify-between gap-4 text-sm">
 <span className="text-muted-foreground">{t("student.profileEmail")}</span>
 <span className="font-medium text-right truncate max-w-[60%]">{email}</span>
 </div>
 <div className="flex justify-between gap-4 text-sm">
 <span className="text-muted-foreground">{t("student.profileClass")}</span>
 <span className="font-medium">{className ?? "-"}</span>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 </AppShell>
 );
}
