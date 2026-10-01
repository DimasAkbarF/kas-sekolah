"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/layout/data-table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { History } from "lucide-react";
import { getCurrentStudent, getStudentTransactions } from "@/services/student.service";
import { formatDate } from "@/lib/formatters";
import { AnimatedMoney } from "@/components/dashboard/animated-money";
import type { TransactionStatus } from "@/types";
import { useI18n } from "@/hooks/use-i18n";
import { useDataVersion } from "@/hooks/use-data-version";
import type { TKey } from "@/lib/i18n";

type StatusFilter = "all" | TransactionStatus;

const STATUS_FILTERS: { value: StatusFilter; labelKey: TKey }[] = [
 { value: "all", labelKey: "student.allStatuses" },
 { value: "PAID", labelKey: "student.statusPaid" },
 { value: "PENDING", labelKey: "status.pending" },
 { value: "FAILED", labelKey: "status.failed" },
 { value: "EXPIRED", labelKey: "status.expired" },
 { value: "CANCELLED", labelKey: "status.cancelled" },
];

export default function StudentHistoryPage() {
 const { t } = useI18n();
 const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
 const [periodFilter, setPeriodFilter] = useState("all");
 useDataVersion();

 const student = getCurrentStudent();

 const periods = useMemo(() => {
 if (!student) return [];
 const months = new Set(
 getStudentTransactions(student).map((t) =>
 new Date(t.paidAt || t.createdAt).toLocaleDateString("id-ID", {
 month: "long",
 year: "numeric",
 }),
 ),
 );
 return [...months].sort().reverse();
 }, [student]);

 const filtered = useMemo(() => {
 if (!student) return [];
 return getStudentTransactions(student).filter((t) => {
 const matchStatus = statusFilter === "all" || t.status === statusFilter;
 const txPeriod = new Date(t.paidAt || t.createdAt).toLocaleDateString("id-ID", {
 month: "long",
 year: "numeric",
 });
 const matchPeriod = periodFilter === "all" || txPeriod === periodFilter;
 return matchStatus && matchPeriod;
 });
 }, [student, statusFilter, periodFilter]);

 if (!student) return null;

 return (
 <AppShell
 role="student"
 breadcrumbs={[
 { label: t("role.student"), href: "/student/dashboard" },
 { label: t("nav.history") },
 ]}
 >
 <div className="space-y-4">
 <PageHeader
 title={t("student.historyTitle")}
 subtitle={t("student.historySubtitle")}
 accent="teal"
 icon={<History className="h-5 w-5" />}
 badge={
 <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md bg-secondary text-primary border border-border">
 {filtered.length} Transaksi
 </span>
 }
 />

 <div className="flex flex-col gap-3 sm:flex-row">
 <Select
 value={statusFilter}
 onValueChange={(v) => setStatusFilter((v ?? "all") as StatusFilter)}
 >
 <SelectTrigger className="w-full sm:w-[160px]">
 <SelectValue placeholder={t("th.status")} />
 </SelectTrigger>
 <SelectContent>
 {STATUS_FILTERS.map((f) => (
 <SelectItem key={f.value} value={f.value}>
 {t(f.labelKey)}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>

 <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v ?? "all")}>
 <SelectTrigger className="w-full sm:w-[180px]">
 <SelectValue placeholder={t("th.period")} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t("student.allPeriods")}</SelectItem>
 {periods.map((p) => (
 <SelectItem key={p} value={p}>
 {p}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {filtered.length === 0 ? (
 <EmptyState title={t("student.historyEmpty")} description={t("student.historyEmptyDesc")} />
 ) : (
 <DataTable
 headers={[
 { label: t("th.id") },
 { label: t("th.bill") },
 { label: t("th.amount"), align: "right" },
 { label: t("th.method") },
 { label: t("th.status") },
 { label: t("th.date") },
 ]}
 >
 {filtered.map((tx) => (
 <tr
 key={tx.id}
 className="border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/15"
 >
 <td className="px-4 py-3 font-mono text-xs">{tx.id}</td>
 <td className="px-4 py-3 font-medium">{tx.billName}</td>
 <td className="px-4 py-3 text-right font-medium tabular-nums">
 <AnimatedMoney value={tx.amount} />
 </td>
 <td className="px-4 py-3 capitalize">{tx.paymentMethod.replace("_", "")}</td>
 <td className="px-4 py-3">
 <StatusBadge status={tx.status} />
 </td>
 <td className="px-4 py-3 text-muted-foreground">{formatDate(tx.paidAt || tx.createdAt)}</td>
 </tr>
 ))}
 </DataTable>
 )}
 </div>
 </AppShell>
 );
}
