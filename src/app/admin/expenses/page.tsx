"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/layout/data-table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { AnimatedMoney } from "@/components/dashboard/animated-money";
import { expenses } from "@/mock/expenses";
import { formatDate } from "@/lib/formatters";
import { useI18n } from "@/hooks/use-i18n";
import { useDataVersion } from "@/hooks/use-data-version";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordForm } from "@/components/finance/record-form";
import { TrendingDown } from "lucide-react";

export default function ExpensesPage() {
 const { t } = useI18n();
 useDataVersion();
 const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

 return (
 <AppShell
 role="super_admin"
 breadcrumbs={[
 { label: t("role.super_admin"), href: "/admin/dashboard" },
 { label: t("expenses.title") },
 ]}
 >
 <div className="space-y-6">
 <PageHeader
 title={t("expenses.title")}
 subtitle={t("expenses.subtitle")}
 accent="rose"
 icon={<TrendingDown className="h-5 w-5" />}
 badge={
 <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md bg-neutral-soft text-neutral-ink border-neutral-line">
 {expenses.length} Catatan
 </span>
 }
 />

 <RecordForm type="expense" />

 <Card className="border-danger-line bg-danger-soft shadow-xs">
 <CardHeader className="pb-2">
 <CardTitle className="text-xs font-semibold text-danger-strong-ink">
 {t("expenses.total")}
 </CardTitle>
 </CardHeader>
 <CardContent className="pt-0">
 <p className="text-2xl font-bold tracking-tight tabular-nums text-danger-strong-ink">
 <AnimatedMoney value={totalExpense} />
 </p>
 </CardContent>
 </Card>

 {expenses.length === 0 ? (
 <EmptyState title={t("expenses.emptyTitle")} description={t("expenses.emptyDesc")} />
 ) : (
 <DataTable
 headers={[
 { label: t("th.title") },
 { label: t("th.category") },
 { label: t("th.amount"), align: "right" },
 { label: t("th.date") },
 { label: t("th.notes") },
 ]}
 >
 {expenses.map((expense) => (
 <tr key={expense.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
 <td className="px-4 py-3 font-medium">{expense.title}</td>
 <td className="px-4 py-3">{expense.category}</td>
 <td className="px-4 py-3 text-right font-medium tabular-nums">
 <AnimatedMoney value={expense.amount} />
 </td>
 <td className="px-4 py-3 text-muted-foreground">{formatDate(expense.date)}</td>
 <td className="px-4 py-3 text-muted-foreground">{expense.notes}</td>
 </tr>
 ))}
 </DataTable>
 )}
 </div>
 </AppShell>
 );
}
