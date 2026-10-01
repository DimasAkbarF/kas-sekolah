"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/layout/data-table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { AnimatedMoney } from "@/components/dashboard/animated-money";
import { allIncomes, totalAllIncomes } from "@/lib/cash-flow";
import { formatDate } from "@/lib/formatters";
import { useI18n } from "@/hooks/use-i18n";
import { useDataVersion } from "@/hooks/use-data-version";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordForm } from "@/components/finance/record-form";
import { TrendingUp } from "lucide-react";

export default function IncomePage() {
 const { t } = useI18n();
 useDataVersion();
 const incomeList = allIncomes();
 const totalIncome = totalAllIncomes();

 return (
 <AppShell
 role="super_admin"
 breadcrumbs={[
 { label: t("role.super_admin"), href: "/admin/dashboard" },
 { label: t("income.title") },
 ]}
 >
 <div className="space-y-6">
 <PageHeader
 title={t("income.title")}
 subtitle={t("income.subtitle")}
 accent="emerald"
 icon={<TrendingUp className="h-5 w-5" />}
 badge={
 <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md bg-neutral-soft text-neutral-ink border-neutral-line">
 {incomeList.length} Catatan
 </span>
 }
 />

 <RecordForm type="income" />

 <Card className="border-success-line bg-success-soft shadow-xs">
 <CardHeader className="pb-2">
 <CardTitle className="text-xs font-semibold text-success-ink">
 {t("income.total")}
 </CardTitle>
 </CardHeader>
 <CardContent className="pt-0">
 <p className="text-2xl font-bold tracking-tight tabular-nums text-success-ink">
 <AnimatedMoney value={totalIncome} />
 </p>
 </CardContent>
 </Card>

 {incomeList.length === 0 ? (
 <EmptyState title={t("income.emptyTitle")} description={t("income.emptyDesc")} />
 ) : (
 <DataTable
 headers={[
 { label: t("th.title") },
 { label: t("th.category") },
 { label: t("th.amount"), align: "right" },
 { label: t("th.date") },
 { label: t("th.source") },
 ]}
 >
 {incomeList.map((income) => (
 <tr key={income.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
 <td className="px-4 py-3 font-medium">{income.title}</td>
 <td className="px-4 py-3">{income.category}</td>
 <td className="px-4 py-3 text-right font-medium tabular-nums">
 <AnimatedMoney value={income.amount} />
 </td>
 <td className="px-4 py-3 text-muted-foreground">{formatDate(income.date)}</td>
 <td className="px-4 py-3 text-muted-foreground">{income.source}</td>
 </tr>
 ))}
 </DataTable>
 )}
 </div>
 </AppShell>
 );
}
