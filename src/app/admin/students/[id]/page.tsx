"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { AnimatedMoney } from "@/components/dashboard/animated-money";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { StatSummary } from "@/components/dashboard/stat-summary";
import { useStudents } from "@/hooks/use-students";
import { useI18n } from "@/hooks/use-i18n";
import { useDataVersion } from "@/hooks/use-data-version";
import {
 getStudentBills,
 getStudentSummary,
 getStudentTransactions,
} from "@/services/student.service";
import {
 getStudentBillStatus,
 type StudentBillStatus,
} from "@/components/student/student-bill-item";
import { useWorkspaceClass } from "@/hooks/use-workspace-class";
import { formatDateTime } from "@/lib/formatters";
import { useParams } from "next/navigation";
import { GraduationCap, Phone, Mail, Hash, BadgeCheck } from "lucide-react";

const BILL_STATUS_STYLES: Record<StudentBillStatus, string> = {
 unpaid: "bg-warning-soft text-warning-ink border-warning-line",
 pending:
 "bg-warning-soft text-warning-ink border-warning-line",
 paid:
 "bg-success-soft text-success-ink border-success-line",
 failed: "bg-danger-soft text-danger-strong-ink border-danger-line",
 expired: "bg-neutral-soft text-neutral-ink border-neutral-line",
};

const STATUS_LABELS: Record<StudentBillStatus, string> = {
 unpaid: "Belum Bayar",
 pending: "Menunggu",
 paid: "Lunas",
 failed: "Gagal",
 expired: "Kedaluwarsa",
};

export default function AdminStudentDetailPage() {
 const params = useParams<{ id: string }>();
 const { t } = useI18n();
 const dataVersion = useDataVersion();
 const { active, archived } = useStudents();
 const className = useWorkspaceClass();

 const student = [...active, ...archived].find((s) => s.id === params.id);

 const { bills, transactions, summary } = useMemo(() => {
 void dataVersion; // dep. nyata: store bersama berubah saat sinkronisasi
 if (!student) {
 return { bills: [], transactions: [], summary: null };
 }
 return {
 bills: getStudentBills(student),
 transactions: getStudentTransactions(student),
 summary: getStudentSummary(student),
 };
 }, [student, dataVersion]);

 if (!student || !summary) {
 return (
 <AppShell
 role="super_admin"
 breadcrumbs={[
 { label: t("role.super_admin"), href: "/admin/dashboard" },
 { label: t("students.title"), href: "/admin/students" },
 { label: "Siswa" },
 ]}
 >
 <div className="p-8">
 <EmptyState title="Siswa tidak ditemukan" description="Data siswa tidak tersedia." />
 </div>
 </AppShell>
 );
 }

 const infoRows = [
 { icon: Hash, label: "NIS", value: student.nis },
 { icon: BadgeCheck, label: "NISN", value: student.nisn },
 {
 icon: GraduationCap,
 label: t("students.fieldClass"),
 value: student.className || className || "-",
 },
 { icon: BadgeCheck, label: t("students.fieldGender"), value: student.gender ?? "-" },
 { icon: Phone, label: t("students.fieldPhone"), value: student.phone || "-" },
 { icon: Mail, label: "Gmail", value: student.email || "-" },
 ];

 return (
 <AppShell
 role="super_admin"
 breadcrumbs={[
 { label: t("role.super_admin"), href: "/admin/dashboard" },
 { label: t("students.title"), href: "/admin/students" },
 { label: student.name },
 ]}
 >
 <div className="space-y-6">
 <PageHeader
 title={student.name}
 subtitle={`NISN: ${student.nisn} • NIS: ${student.nis}`}
 accent="violet"
 icon={<GraduationCap className="h-5 w-5" />}
 badge={
 <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md bg-neutral-soft text-neutral-ink border-neutral-line">
 {student.archived ? "Diarsipkan" : "Aktif"}
 </span>
 }
 />

 <Card className="border-border/70 shadow-xs">
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-medium">Informasi & Kontak Siswa</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
 {infoRows.map((row) => (
 <div key={row.label} className="flex items-center gap-2.5 text-sm">
 <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/70 border border-border/50 text-muted-foreground">
 <row.icon className="h-4 w-4" />
 </span>
 <div className="min-w-0">
 <p className="text-xs text-muted-foreground">{row.label}</p>
 <p className="font-medium text-foreground truncate">{row.value}</p>
 </div>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>

 <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
 label={t("dashboard.outstanding")}
 value={<AnimatedMoney value={summary.outstanding} />}
 variant="warning"
 />
 <StatSummary
 label={t("dashboard.collectionRate")}
 value={`${summary.paymentRate.toFixed(1)}%`}
 variant="secondary"
 />
 </div>

 <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
 <div className="p-4 sm:p-5 flex items-center justify-between border-b border-border/60">
 <div>
 <h2 className="text-sm font-semibold text-foreground">Tagihan Siswa</h2>
 <p className="text-xs text-muted-foreground mt-0.5">
 Kewajiban kas/iuran yang berlaku untuk siswa ini
 </p>
 </div>
 <span className="text-xs font-semibold text-muted-foreground bg-muted/60 border border-border/50 px-2.5 py-1 rounded-md">
 {bills.length} Tagihan
 </span>
 </div>
 {bills.length === 0 ? (
 <div className="p-8">
 <EmptyState
 title="Belum ada tagihan"
 description="Tidak ada tagihan aktif untuk siswa ini."
 />
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground">
 <th scope="col" className="text-left px-5 py-2.5 text-xs font-semibold">
 Tagihan
 </th>
 <th scope="col" className="text-left px-4 py-2.5 text-xs font-semibold">
 Periode
 </th>
 <th scope="col" className="text-right px-4 py-2.5 text-xs font-semibold">
 Nominal
 </th>
 <th scope="col" className="text-left px-4 py-2.5 text-xs font-semibold">
 Status
 </th>
 <th scope="col" className="text-right px-5 py-2.5 text-xs font-semibold">
 Jatuh Tempo
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/40">
 {bills.map((bill) => {
 const status = getStudentBillStatus(bill, transactions);
 return (
 <tr key={bill.id} className="hover:bg-muted/30 transition-colors">
 <td className="px-5 py-3">
 <p className="font-medium text-foreground">{bill.name}</p>
 <p className="text-xs text-muted-foreground">{bill.category}</p>
 </td>
 <td className="px-4 py-3 text-muted-foreground">{bill.period}</td>
 <td className="px-4 py-3 text-right font-bold tabular-nums text-foreground">
 <AnimatedMoney value={bill.amount} />
 </td>
 <td className="px-4 py-3">
 <span
 className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${BILL_STATUS_STYLES[status]}`}
 >
 {STATUS_LABELS[status]}
 </span>
 </td>
 <td className="px-5 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
 {formatDateTime(bill.dueDate)}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>

 <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
 <div className="p-4 sm:p-5 flex items-center justify-between border-b border-border/60">
 <div>
 <h2 className="text-sm font-semibold text-foreground">Riwayat Transaksi</h2>
 <p className="text-xs text-muted-foreground mt-0.5">
 Catatan aktivitas pembayaran siswa ini
 </p>
 </div>
 <span className="text-xs font-semibold text-muted-foreground bg-muted/60 border border-border/50 px-2.5 py-1 rounded-md">
 {transactions.length} Transaksi
 </span>
 </div>
 {transactions.length === 0 ? (
 <div className="p-8">
 <EmptyState
 title="Belum ada transaksi"
 description="Riwayat pembayaran siswa akan tercatat di sini."
 />
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground">
 <th scope="col" className="text-left px-5 py-2.5 text-xs font-semibold">
 Tagihan
 </th>
 <th scope="col" className="text-right px-4 py-2.5 text-xs font-semibold">
 Nominal
 </th>
 <th scope="col" className="text-left px-4 py-2.5 text-xs font-semibold">
 Metode
 </th>
 <th scope="col" className="text-left px-4 py-2.5 text-xs font-semibold">
 Status
 </th>
 <th scope="col" className="text-right px-5 py-2.5 text-xs font-semibold">
 Waktu
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/40">
 {transactions.map((tx) => (
 <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
 <td className="px-5 py-3 font-medium text-foreground">{tx.billName}</td>
 <td className="px-4 py-3 text-right font-bold tabular-nums text-foreground">
 <AnimatedMoney value={tx.amount} />
 </td>
 <td className="px-4 py-3">
 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted/60 text-muted-foreground border border-border/40 capitalize">
 {tx.paymentMethod.replace("_", "")}
 </span>
 </td>
 <td className="px-4 py-3">
 <StatusBadge status={tx.status} />
 </td>
 <td className="px-5 py-3 text-right text-xs text-muted-foreground whitespace-nowrap tabular-nums">
 {formatDateTime(tx.paidAt || tx.createdAt)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 </AppShell>
 );
}
