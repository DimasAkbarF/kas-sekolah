"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FinancialOverview } from "@/components/dashboard/financial-overview";
import { CollectionPanel } from "@/components/dashboard/collection-panel";
import dynamic from "next/dynamic";
import { CashInfoCard } from "@/components/dashboard/cash-info-card";
import { StudentBillItem, getStudentBillStatus } from "@/components/student/student-bill-item";
import { EmptyState } from "@/components/dashboard/empty-state";
import { AnimatedMoney } from "@/components/dashboard/animated-money";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import {
 getCurrentStudent,
 getStudentBills,
 getStudentSummary,
 getStudentTransactions,
 getStudentRecentTransactions,
 getStudentPaymentTrend,
} from "@/services/student.service";
import { useI18n } from "@/hooks/use-i18n";
import { useDataVersion } from "@/hooks/use-data-version";
import { formatDate } from "@/lib/formatters";
import { tooltipCurrencyFormatter, CHART_SUCCESS, CHART_WARNING } from "@/lib/chart-utils";
import {
 AlertCircle,
 CheckCircle2,
 ReceiptText,
 Clock,
 ArrowRight,
} from "lucide-react";

const StatusPanel = dynamic(
 () => import("@/components/dashboard/status-panel").then((m) => m.StatusPanel),
 { ssr: false },
);
const FinanceChart = dynamic(
 () => import("@/components/dashboard/finance-chart").then((m) => m.FinanceChart),
 { ssr: false },
);

export default function StudentDashboard() {
 const { t } = useI18n();
 const dataVersion = useDataVersion();
 const student = getCurrentStudent();
 // Kelas siswa, bukan kelas aktif global.
 const className = student?.className ?? "";

 const {
 summary,
 activeBills,
 allTransactions,
 recentTransactions,
 paymentTrend,
 unpaidCount,
 paidCount,
 paymentData,
 } = useMemo(() => {
 void dataVersion; // dep. nyata: store bersama berubah saat sinkronisasi
 if (!student) {
 return {
 summary: { totalBills: 0, totalPaid: 0, outstanding: 0, paymentRate: 0 },
 activeBills: [],
 allTransactions: [],
 recentTransactions: [],
 paymentTrend: [],
 unpaidCount: 0,
 paidCount: 0,
 paymentData: [],
 };
 }
 const s = getStudentSummary(student);
 const bills = getStudentBills(student);
 const transactions = getStudentTransactions(student);
 const unpaid = bills.filter((b) => {
 const st = getStudentBillStatus(b, transactions);
 return st === "unpaid" || st === "failed";
 }).length;
 return {
 summary: s,
 activeBills: bills,
 allTransactions: transactions,
 recentTransactions: getStudentRecentTransactions(4),
 paymentTrend: getStudentPaymentTrend(student),
 unpaidCount: unpaid,
 paidCount: Math.max(0, bills.length - unpaid),
 paymentData: [
 { name: t("dashboard.lunas"), value: s.totalPaid, color: CHART_SUCCESS },
 { name: t("dashboard.unpaid"), value: s.outstanding, color: CHART_WARNING },
 ],
 };
 }, [student, t, dataVersion]);

 if (!student) return null;

 return (
 <AppShell
 role="student"
 breadcrumbs={[{ label: t("role.student") }, { label: t("nav.dashboard") }]}
 >
 <div className="space-y-6">
 <DashboardHeader
 title={t("student.greeting", { name: student.name })}
 badge={`${t("student.classLabel")} ${className || "-"}`}
 subtitle={`NISN: ${student.nisn || student.nis || "-"} • Portal Keuangan Siswa`}
 icon={<ReceiptText className="h-5 w-5" />}
 accent="teal"
 />

 {summary.outstanding > 0 ? (
 <div className="flex items-center gap-3 rounded-xl border border-danger-line bg-danger-soft p-3.5 text-xs shadow-xs">
 <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-danger-soft border-danger-line text-danger-ink">
 <AlertCircle className="h-4 w-4" />
 </span>
 <div className="flex-1 min-w-0">
 <span className="font-bold text-danger-strong-ink">
 Terdapat {unpaidCount} tagihan aktif (<AnimatedMoney value={summary.outstanding} />) yang
 belum diselesaikan.
 </span>
 {""}
 <span className="text-danger-ink/85 hidden sm:inline">
 Silakan lakukan pembayaran sebelum batas jatuh tempo.
 </span>
 </div>
 </div>
 ) : (
 <div className="flex items-center gap-3 rounded-xl border border-success-line bg-success-soft p-3.5 text-xs shadow-xs">
 <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-success-soft border-success-line">
 <CheckCircle2 className="h-4 w-4" />
 </span>
 <p className="font-semibold text-success-ink">
 Seluruh tagihan periode aktif telah lunas. Terima kasih atas ketepatan pembayaran Anda.
 </p>
 </div>
 )}

 <FinancialOverview
 label={t("dashboard.totalBills")}
 period={className || "-"}
 value={<AnimatedMoney value={summary.totalBills} />}
 description="Total akumulasi kewajiban iuran kas Anda pada periode aktif"
 metrics={[
 {
 label: t("dashboard.totalPaid"),
 value: <AnimatedMoney value={summary.totalPaid} />,
 description: "Telah lunas terbayar",
 tone: "success",
 },
 {
 label: t("dashboard.outstanding"),
 value: <AnimatedMoney value={summary.outstanding} />,
 description: "Sisa tunggakan aktif",
 tone: "warning",
 },
 {
 label: t("student.summaryStatus"),
 value: (
 <AnimatedNumber
 value={summary.paymentRate / 100}
 format={{ style: "percent", maximumFractionDigits: 1 }}
 />
 ),
 description: t("student.summaryRateDesc"),
 tone: "info",
 },
 ]}
 footerLeft="Status Finansial"
 footerRight={
 <span className="flex items-center gap-1.5">
 <span className="h-1.5 w-1.5 rounded-full bg-success" />
 Data Terverifikasi
 </span>
 }
 />

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
 <CollectionPanel
 className="lg:col-span-8"
 title="Progres Pembayaran Tagihan Pribadi"
 subtitle={`Tingkat kelunasan iuran kas pada semester aktif (${className || "-"})`}
 rate={summary.paymentRate}
 value={<AnimatedMoney value={summary.totalPaid} />}
 valueLabel="Total kewajiban yang telah diselesaikan"
 targetLabel={t("dashboard.targetBills")}
 target={<AnimatedMoney value={summary.totalBills} />}
 rows={[
 {
 label: t("dashboard.lunas"),
 value: <AnimatedMoney value={summary.totalPaid} />,
 footnote: `${summary.paymentRate.toFixed(1)}% dari total tagihan`,
 tone: "success",
 },
 {
 label: t("dashboard.unpaid"),
 value: <AnimatedMoney value={summary.outstanding} />,
 footnote: `${(100 - summary.paymentRate).toFixed(1)}% sisa tunggakan`,
 tone: "warning",
 },
 ]}
 chips={[
 {
 label: t("dashboard.totalBills"),
 value: (
 <>
 <AnimatedNumber value={activeBills.length} locales="id-ID" />
 {""}
 {t("dashboard.billUnit")}
 </>
 ),
 tone: "neutral",
 },
 {
 label: t("dashboard.paidStudents"),
 value: (
 <>
 <AnimatedNumber value={paidCount} locales="id-ID" />
 {""}
 {t("dashboard.billUnit")}
 </>
 ),
 tone: "success",
 },
 {
 label: t("dashboard.unpaidStudents"),
 value: (
 <>
 <AnimatedNumber value={unpaidCount} locales="id-ID" />
 {""}
 {t("dashboard.billUnit")}
 </>
 ),
 tone: "warning",
 },
 ]}
 />

 <StatusPanel
 className="lg:col-span-4"
 title="Status Pembayaran Siswa"
 subtitle={t("dashboard.ratioNominal")}
 data={paymentData}
 centerValue={`${summary.paymentRate.toFixed(0)}%`}
 centerLabel={t("dashboard.lunas")}
 legend={[
 {
 label: t("dashboard.lunas"),
 value: <AnimatedMoney value={summary.totalPaid} />,
 footnote: `${summary.paymentRate.toFixed(1)}% dari total tagihan`,
 tone: "success",
 },
 {
 label: t("dashboard.unpaid"),
 value: <AnimatedMoney value={summary.outstanding} />,
 footnote: `${(100 - summary.paymentRate).toFixed(1)}% sisa tunggakan`,
 tone: "warning",
 },
 ]}
 footerLeft="Metode Pembayaran"
 footerRight="Online & Manual"
 tooltipFormatter={tooltipCurrencyFormatter}
 />
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
 <FinanceChart
 className="lg:col-span-8"
 title={t("student.paymentTrend")}
 subtitle="Tren pembayaran kas sekolah berdasarkan riwayat transaksi Anda"
 data={paymentTrend}
 variant="teal"
 />
 <CashInfoCard
 className="lg:col-span-4"
 title={t("student.billsSummary")}
 items={[
 {
 label: t("dashboard.totalBills"),
 value: (
 <>
 <AnimatedNumber value={activeBills.length} locales="id-ID" />
 {""}
 {t("dashboard.billUnit")}
 </>
 ),
 icon: <ReceiptText className="h-4 w-4" />,
 footnote: "Jumlah kewajiban aktif",
 tone: "primary",
 },
 {
 label: t("dashboard.lunas"),
 value: (
 <>
 <AnimatedNumber value={paidCount} locales="id-ID" />
 {""}
 {t("dashboard.billUnit")}
 </>
 ),
 icon: <CheckCircle2 className="h-4 w-4" />,
 footnote: "Tagihan yang telah diselesaikan",
 tone: "success",
 },
 {
 label: t("dashboard.unpaid"),
 value: (
 <>
 <AnimatedNumber value={unpaidCount} locales="id-ID" />
 {""}
 {t("dashboard.billUnit")}
 </>
 ),
 icon: <Clock className="h-4 w-4" />,
 footnote: "Tagihan yang masih berjalan",
 tone: "warning",
 },
 ]}
 />
 </div>

 {/* Detail: Tagihan Saya & Riwayat Transaksi */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 <div className="lg:col-span-7 space-y-3">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-sm font-semibold text-foreground">{t("student.myBills")}</h2>
 <p className="text-xs text-muted-foreground mt-0.5">
 Daftar kewajiban pembayaran kas dan iuran sekolah
 </p>
 </div>
 <span className="text-xs font-semibold text-primary bg-secondary border border-border px-2.5 py-0.5 rounded-md">
 {activeBills.length} Tagihan
 </span>
 </div>

 {activeBills.length === 0 ? (
 <div className="rounded-xl border border-border/70 bg-card p-6">
 <EmptyState title={t("student.noBills")} description={t("student.noBillsDesc")} />
 </div>
 ) : (
 <div className="space-y-3">
 {activeBills.map((bill) => (
 <StudentBillItem key={bill.id} bill={bill} transactions={allTransactions} />
 ))}
 </div>
 )}
 </div>

 <div className="lg:col-span-5">
 <div className="rounded-xl border border-border bg-card shadow-card transition-colors overflow-hidden">
 <div className="p-4 flex items-center justify-between border-b border-border">
 <div>
 <h2 className="text-sm font-semibold text-foreground">
 {t("dashboard.recentTransactions")}
 </h2>
 <p className="text-xs text-muted-foreground mt-0.5">Riwayat transaksi Anda</p>
 </div>
 <Button
 variant="ghost"
 size="sm"
 nativeButton={false}
 className="h-8 text-xs font-semibold text-primary hover:text-primary hover:bg-secondary/40 gap-1 active:scale-[0.98]"
 render={<Link href="/student/history" />}
 >
 Semua <ArrowRight className="h-3.5 w-3.5" />
 </Button>
 </div>

 <div>
 {recentTransactions.length === 0 ? (
 <div className="p-6">
 <EmptyState title={t("student.noHistory")} description={t("student.noHistoryDesc")} />
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-border bg-secondary/30 text-foreground/75">
 <th scope="col" className="text-left px-4 py-2.5 text-xs font-semibold">
 {t("th.bill")}
 </th>
 <th scope="col" className="text-right px-4 py-2.5 text-xs font-semibold">
 {t("th.amount")}
 </th>
 <th scope="col" className="text-right px-4 py-2.5 text-xs font-semibold">
 {t("th.status")}
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/50">
 {recentTransactions.map((tx) => (
 <tr key={tx.id} className="hover:bg-secondary/15 transition-colors">
 <td className="px-4 py-3">
 <p className="font-medium text-foreground truncate">{tx.billName}</p>
 <p className="text-[11px] text-muted-foreground tabular-nums">
 {formatDate(tx.paidAt || tx.createdAt)}
 </p>
 </td>
 <td className="px-4 py-3 text-right font-bold tabular-nums text-foreground">
 <AnimatedMoney value={tx.amount} />
 </td>
 <td className="px-4 py-3 text-right">
 <StatusBadge status={tx.status} />
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 </AppShell>
 );
}
