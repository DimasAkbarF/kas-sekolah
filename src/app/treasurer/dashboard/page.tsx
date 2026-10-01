"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FinancialOverview } from "@/components/dashboard/financial-overview";
import { FinancialStatisticsRow } from "@/components/dashboard/financial-statistics-row";
import { AnimatedMoney } from "@/components/dashboard/animated-money";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import {
 getDashboardSummary,
 getRecentTransactions,
 getBalance,
 getMonthlyBalanceData,
} from "@/services/dashboard.service";
import { totalAllIncomes } from "@/lib/cash-flow";
import { expenses as mockExpenses } from "@/mock/expenses";
import { transactions as mockTransactions } from "@/mock/transactions";
import { useStudents } from "@/hooks/use-students";
import { useI18n } from "@/hooks/use-i18n";
import { useDataVersion } from "@/hooks/use-data-version";
import { calculatePaymentOverview } from "@/lib/calculations";
import { useWorkspaceClass } from "@/hooks/use-workspace-class";
import { Wallet } from "lucide-react";
import dynamic from "next/dynamic";

const FinancialTrendChart = dynamic(
 () => import("@/components/dashboard/financial-trend-chart").then((m) => m.FinancialTrendChart),
 { ssr: false },
);

const PaymentStatusCard = dynamic(
 () => import("@/components/dashboard/payment-status-card").then((m) => m.PaymentStatusCard),
 { ssr: false },
);

const RecentTransactionsSection = dynamic(
 () =>
 import("@/components/dashboard/recent-transactions-section").then(
 (m) => m.RecentTransactionsSection,
 ),
 { ssr: false },
);

export default function TreasurerDashboard() {
 const { t } = useI18n();
 const dataVersion = useDataVersion();
 const { active: students } = useStudents();
 const className = useWorkspaceClass();

 const { summary, recentTransactions, overview, saldo, pemasukan, pengeluaran, monthlyBalance } =
 useMemo(() => {
 void dataVersion; // dep. nyata: store bersama berubah saat sinkronisasi
 const s = getDashboardSummary();
 return {
 summary: s,
 recentTransactions: getRecentTransactions(5),
 overview: calculatePaymentOverview(students, mockTransactions, className),
 saldo: getBalance(),
 pemasukan: totalAllIncomes(),
 pengeluaran: mockExpenses.reduce((sum, e) => sum + e.amount, 0),
 monthlyBalance: getMonthlyBalanceData(),
 };
 }, [students, className, dataVersion]);

 return (
 <AppShell
 role="treasurer"
 breadcrumbs={[{ label: t("role.treasurer") }, { label: t("nav.dashboard") }]}
 >
 <div className="space-y-6">
 {/* ── Header ── */}
 <DashboardHeader
 title={t("dashboard.title")}
 badge={`Kelas ${className}`}
 subtitle={t("dashboard.treasurerSubtitle")}
 icon={<Wallet className="h-5 w-5" />}
 accent="teal"
 />

 {/* ── 1. Featured Financial Card (Focal Point) ── */}
 <FinancialOverview
 label={t("dashboard.totalBills")}
 period={`Kelas ${className}`}
 value={<AnimatedMoney value={summary.totalBills} />}
 description="Akumulasi total tagihan kas aktif periode akademik berjalan"
 metrics={[
 {
 label: t("dashboard.totalPaid"),
 value: <AnimatedMoney value={summary.totalPaid} />,
 description: "Telah terverifikasi masuk ke kas",
 tone: "success",
 },
 {
 label: t("dashboard.outstanding"),
 value: <AnimatedMoney value={summary.outstanding} />,
 description: "Sisa kewajiban aktif siswa",
 tone: "warning",
 },
 {
 label: t("dashboard.collectionRate"),
 value: (
 <AnimatedNumber
 value={summary.collectionRate / 100}
 format={{ style: "percent", maximumFractionDigits: 1 }}
 />
 ),
 description: "Rasio penyerapan target iuran",
 tone: "info",
 },
 ]}
 footerLeft="Kondisi Kas Bendahara"
 footerRight={
 <span className="flex items-center gap-1.5">
 <span className="h-1.5 w-1.5 rounded-full bg-success" />
 Terkonsolidasi
 </span>
 }
 />

 {/* ── 2. Financial Statistics Row ── */}
 <FinancialStatisticsRow
 saldo={saldo}
 pemasukan={pemasukan}
 pengeluaran={pengeluaran}
 totalStudents={overview.totalStudents}
 paidStudents={overview.paidStudents}
 unpaidStudents={overview.unpaidStudents}
 />

 {/* ── 3. Visualizations: Financial Trend & Payment Status ── */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 <FinancialTrendChart
 className="lg:col-span-8"
 title="Perkembangan Arus Kas"
 subtitle="Perbandingan pemasukan dan pengeluaran kas aktual per periode"
 data={monthlyBalance}
 />
 <PaymentStatusCard
 className="lg:col-span-4"
 title="Status Pembayaran"
 subtitle="Rasio kelunasan kewajiban kas siswa"
 totalPaid={summary.totalPaid}
 outstanding={summary.outstanding}
 paidStudents={overview.paidStudents}
 unpaidStudents={overview.unpaidStudents}
 totalStudents={overview.totalStudents}
 collectionRate={summary.collectionRate}
 />
 </div>

 {/* ── 4. Recent Transactions (Responsive Desktop Table + Mobile Cards) ── */}
 <RecentTransactionsSection
 title={t("dashboard.recentTransactions")}
 subtitle="Catatan aktivitas penerimaan kas terbaru"
 transactions={recentTransactions}
 viewAllHref="/treasurer/transactions"
 />
 </div>
 </AppShell>
 );
}
