"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StatSummary } from "@/components/dashboard/stat-summary";
import { AnimatedMoney } from "@/components/dashboard/animated-money";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSummary, getPaymentTrendData } from "@/services/dashboard.service";
import { useI18n } from "@/hooks/use-i18n";
import { useStudents } from "@/hooks/use-students";
import { calculatePaymentOverview, calculateClassBreakdown } from "@/lib/calculations";
import { useWorkspaceClass } from "@/hooks/use-workspace-class";
import { transactions as mockTransactions } from "@/mock/transactions";
import { bills as mockBills } from "@/mock/bills";
import dynamic from "next/dynamic";

const TrendChart = dynamic(
 () => import("@/components/dashboard/trend-chart").then((m) => m.TrendChart),
 { ssr: false },
);

const ClassBreakdownChart = dynamic(
 () =>
  import("@/components/dashboard/class-breakdown-chart").then(
   (m) => m.ClassBreakdownChart,
  ),
 { ssr: false },
);

export default function PrincipalStatisticsPage() {
 const { t } = useI18n();
 const summary = getDashboardSummary();
 const { active: students } = useStudents();
 const className = useWorkspaceClass();
 const overview = calculatePaymentOverview(students, mockTransactions, className);
 const trendData = getPaymentTrendData();
 const classRows = calculateClassBreakdown(mockBills, mockTransactions, students);

 return (
 <AppShell
 role="super_admin"
 breadcrumbs={[
 { label: t("role.super_admin"), href: "/principal/dashboard" },
 { label: t("nav.statistics") },
 ]}
 >
 <div className="space-y-6">
 <PageHeader
 title={t("principal.statisticsTitle")}
 subtitle={t("principal.statisticsSubtitle", { className: overview.className })}
 accent="indigo"
 icon={<TrendingUp className="h-5 w-5" />}
 badge={
 <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md bg-neutral-soft text-neutral-ink border-neutral-line">
 Kelas {overview.className}
 </span>
 }
 />

 <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
 <StatSummary
 label={t("dashboard.totalStudents")}
 value={<AnimatedNumber value={students.length} locales="id-ID" />}
 variant="secondary"
 />
 <StatSummary
 label={t("dashboard.totalBills")}
 value={<AnimatedMoney value={summary.totalBills} />}
 variant="primary"
 />
 <StatSummary
 label={t("dashboard.totalPaid")}
 value={<AnimatedMoney value={summary.totalPaid} />}
 variant="success"
 />
 <StatSummary
 label={t("dashboard.collectionRateEn")}
 value={
 <AnimatedNumber
 value={summary.collectionRate / 100}
 format={{ style: "percent", maximumFractionDigits: 1 }}
 />
 }
 variant="default"
 />
 </div>

 <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
 <Card className="border-border/70 shadow-xs">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium">{t("dashboard.paymentTrend")}</CardTitle>
 </CardHeader>
 <CardContent className="pt-0">
 <div className="h-[250px]">
 <TrendChart
 data={trendData}
 height="100%"
 compact
 paidName={t("dashboard.paidTrend")}
 unpaidName={t("dashboard.unpaidTrend")}
 />
 </div>
 </CardContent>
 </Card>

 {/*
  Yang tadinya di sini cuma satu progress bar untuk SELURUH sekolah, jadi
  kartu itu tidak menjawab apa pun yang belum dijawab kartu angka di atas.
  Diganti breakdown tunggakan per kelas: dari sini kepala sekolah langsung tahu
  kelas mana yang perlu ditindak.
 */}
 <ClassBreakdownChart
  className="border-border/70 shadow-xs"
  title={t("principal.classBreakdown")}
  emptyTitle={t("principal.classBreakdownEmpty")}
  emptyDesc={t("principal.classBreakdownEmptyDesc")}
  rows={classRows}
  labels={{
   outstanding: t("principal.outstanding"),
   paid: t("dashboard.totalPaid"),
   rate: t("dashboard.collectionRateEn"),
   students: t("dashboard.totalStudents"),
  }}
 />
 </div>
 </div>
 </AppShell>
 );
}
