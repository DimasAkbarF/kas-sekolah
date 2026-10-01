"use client";

import dynamic from "next/dynamic";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StatSummary } from "@/components/dashboard/stat-summary";
import { AnimatedMoney } from "@/components/dashboard/animated-money";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportExportControls } from "@/components/reports/report-export-controls";
import { ChartGridSkeleton } from "@/components/reports/report-skeletons";
import { useReportData } from "@/hooks/use-reports";
import type { ReportPeriodKey } from "@/services/reports.service";
import { useI18n } from "@/hooks/use-i18n";
import { useDataVersion } from "@/hooks/use-data-version";
import type { TKey } from "@/lib/i18n";
import { BarChart3 } from "lucide-react";

const ReportCharts = dynamic(
 () => import("@/components/reports/report-charts").then((m) => m.ReportCharts),
 {
 ssr: false,
 loading: () => <ChartGridSkeleton />,
 },
);

const PERIOD_OPTIONS: { value: ReportPeriodKey; labelKey: TKey }[] = [
 { value: "all", labelKey: "reportPeriod.all" },
 { value: "thisMonth", labelKey: "reportPeriod.thisMonth" },
 { value: "lastMonth", labelKey: "reportPeriod.lastMonth" },
 { value: "thisYear", labelKey: "reportPeriod.thisYear" },
];

export default function ReportsPage() {
 const { t } = useI18n();
 const { period, data, changePeriod } = useReportData();
 useDataVersion();

 return (
 <AppShell
 role="super_admin"
 breadcrumbs={[
 { label: t("role.super_admin"), href: "/admin/dashboard" },
 { label: t("reports.title") },
 ]}
 >
 <div className="space-y-6">
 <PageHeader
 title={t("reports.title")}
 subtitle={t("reports.subtitle")}
 accent="teal"
 icon={<BarChart3 className="h-5 w-5" />}
 badge={
 <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md bg-secondary text-primary border border-border">
 {t(PERIOD_OPTIONS.find((o) => o.value === period)?.labelKey ?? "reportPeriod.all")}
 </span>
 }
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

 <section aria-labelledby="finance-statistics-title">
 <h2 id="finance-statistics-title" className="text-base font-semibold">
 {t("reports.financeStatistics")}
 </h2>
 <p className="mt-0.5 text-sm text-muted-foreground">{t("reports.financeStatisticsDesc")}</p>
 <div className="mt-4">
 <ReportCharts data={data} />
 </div>
 </section>
 </div>
 </AppShell>
 );
}
