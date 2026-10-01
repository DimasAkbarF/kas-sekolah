"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StatSummary } from "@/components/dashboard/stat-summary";
import { AnimatedMoney } from "@/components/dashboard/animated-money";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportExportControls } from "@/components/reports/report-export-controls";
import { useReportData } from "@/hooks/use-reports";
import { BarChart3 } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { useDataVersion } from "@/hooks/use-data-version";

export default function TreasurerReportsPage() {
 const { t } = useI18n();
 const { period, data, changePeriod } = useReportData();
 useDataVersion();
 return (
 <AppShell
 role="treasurer"
 breadcrumbs={[
 { label: t("role.treasurer"), href: "/treasurer/dashboard" },
 { label: t("reports.title") },
 ]}
 >
 <div className="space-y-6">
 <PageHeader
 title={t("reports.title")}
 subtitle={t("reports.treasurerSubtitle")}
 accent="teal"
 icon={<BarChart3 className="h-5 w-5" />}
 />

 <ReportExportControls period={period} data={data} changePeriod={changePeriod} />

 <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
 <StatSummary
 label={t("dashboard.totalBills")}
 value={<AnimatedMoney value={data.summary.totalBills} />}
 variant="primary"
 />
 <StatSummary
 label={t("dashboard.totalPaid")}
 value={<AnimatedMoney value={data.summary.totalPaid} />}
 variant="success"
 />
 <StatSummary
 label={t("reports.outstanding")}
 value={<AnimatedMoney value={data.summary.outstanding} />}
 variant="warning"
 />
 <StatSummary
 label={t("reports.transactionCount")}
 value={<AnimatedNumber value={data.summary.transactionCount} locales="id-ID" />}
 variant="secondary"
 />
 </div>

 <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
 <Card className="border-border/70 shadow-xs">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium">{t("income.title")}</CardTitle>
 </CardHeader>
 <CardContent className="pt-0">
 <p className="text-2xl font-semibold tabular-nums text-success">
 <AnimatedMoney value={data.totalIncome} />
 </p>
 </CardContent>
 </Card>
 <Card className="border-border/70 shadow-xs">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium">{t("expenses.title")}</CardTitle>
 </CardHeader>
 <CardContent className="pt-0">
 <p className="text-2xl font-semibold tabular-nums text-destructive">
 <AnimatedMoney value={data.totalExpense} />
 </p>
 </CardContent>
 </Card>
 <Card className="border-border/70 shadow-xs">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium">{t("dashboard.balance")}</CardTitle>
 </CardHeader>
 <CardContent className="pt-0">
 <p className="text-2xl font-semibold tabular-nums">
 <AnimatedMoney value={data.balance} />
 </p>
 </CardContent>
 </Card>
 </div>
 </div>
 </AppShell>
 );
}
