"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Receipt } from "lucide-react";
import {
 getCurrentStudent,
 getStudentBillById,
 getStudentTransactions,
} from "@/services/student.service";
import {
 getStudentBillStatus,
 type StudentBillStatus,
} from "@/components/student/student-bill-item";
import { formatDate } from "@/lib/formatters";
import { AnimatedMoney } from "@/components/dashboard/animated-money";
import { useI18n } from "@/hooks/use-i18n";
import { useDataVersion } from "@/hooks/use-data-version";
import type { TKey } from "@/lib/i18n";

const statusLabelKey: Record<StudentBillStatus, TKey> = {
 unpaid: "student.statusUnpaid",
 pending: "student.statusPending",
 paid: "student.statusPaid",
 failed: "student.statusFailed",
 expired: "student.statusExpired",
};

const statusBadgeClass: Record<StudentBillStatus, string> = {
 unpaid: "border-warning/30 text-warning",
 pending: "border-warning/30 text-warning",
 paid: "border-transparent bg-success/10 text-success",
 failed: "border-transparent bg-destructive/10 text-destructive",
 expired: "border-border text-muted-foreground",
};

export default function StudentBillDetailPage() {
 const { t } = useI18n();
 const params = useParams<{ id: string }>();
 useDataVersion();
 const student = getCurrentStudent();

 if (!student) {
 return (
 <AppShell
 role="student"
 breadcrumbs={[
 { label: t("role.student"), href: "/student/dashboard" },
 { label: t("student.myBills"), href: "/student/bills" },
 ]}
 >
 <EmptyState title={t("student.recordMissing")} description={t("student.recordMissingDesc")} />
 </AppShell>
 );
 }
 // Data siswa ada di sisi klien, jadi `notFound()` (hanya boleh di Server
 // Component) akan melempar error dan — tanpa boundary — layar putih.
 // Tampilkan state 404 yang bisa dipulihkan saja.
 const bill = params?.id ? getStudentBillById(params.id, student) : undefined;
 if (!bill) {
 return (
 <AppShell
 role="student"
 breadcrumbs={[
 { label: t("role.student"), href: "/student/dashboard" },
 { label: t("student.myBills"), href: "/student/bills" },
 ]}
 >
 <EmptyState
 title={t("common.notFound")}
 description={t("common.notFoundDesc")}
 action={
 <Button variant="outline" nativeButton={false} render={<Link href="/student/bills" />}>
 {t("student.myBills")}
 </Button>
 }
 />
 </AppShell>
 );
 }

 const transactions = getStudentTransactions(student);
 const status = getStudentBillStatus(bill, transactions);
 const related = transactions.filter((t) => t.billId === bill.id);

 const detailRows: { label: string; value: React.ReactNode }[] = [
 { label: t("th.category"), value: bill.category },
 { label: t("th.period"), value: bill.period },
 { label: t("th.amount"), value: <AnimatedMoney value={bill.amount} /> },
 { label: t("student.billCreated"), value: formatDate(bill.createdAt) },
 { label: t("th.dueDate"), value: formatDate(bill.dueDate) },
 ];

 return (
 <AppShell
 role="student"
 breadcrumbs={[
 { label: t("role.student"), href: "/student/dashboard" },
 { label: t("student.myBills"), href: "/student/bills" },
 { label: bill.name },
 ]}
 >
 <div className="space-y-6 max-w-2xl">
 <PageHeader
 title={bill.name}
 subtitle={t("student.billDetail", { category: bill.category })}
 accent="teal"
 icon={<Receipt className="h-5 w-5" />}
 badge={
 <Badge variant="outline" className={`w-fit text-xs font-medium ${statusBadgeClass[status]}`}>
 {t(statusLabelKey[status])}
 </Badge>
 }
 />

 <Card className="shadow-card border-border">
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-medium">{t("student.billInfo")}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-2.5">
 {detailRows.map((row) => (
 <div key={row.label} className="flex justify-between gap-4 text-sm">
 <span className="text-muted-foreground">{row.label}</span>
 <span className="font-medium text-right">{row.value}</span>
 </div>
 ))}
 </CardContent>
 </Card>

 {related.length > 0 && (
 <Card className="shadow-card border-border">
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-medium">{t("student.paymentInfo")}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-2.5">
 {related.map((tx) => (
 <div key={tx.id} className="flex justify-between gap-4 text-sm">
 <span className="text-muted-foreground font-mono text-xs">{tx.id}</span>
 <span className="font-medium capitalize text-right">
 {tx.paymentMethod.replace("_", "")}
 </span>
 </div>
 ))}
 </CardContent>
 </Card>
 )}

 {(status === "unpaid" || status === "failed") && (
 <Button
 variant="gold"
 size="lg"
 nativeButton={false}
 render={<Link href={`/student/payment?bill=${bill.id}`} />}
 >
 {status === "failed" ? t("student.payAgain") : t("student.payNow")}
 </Button>
 )}
 {status === "pending" && (
 <Button
 variant="outline"
 nativeButton={false}
 render={<Link href={`/student/payment?bill=${bill.id}`} />}
 >
 {t("student.viewPayment")}
 </Button>
 )}

 {status === "paid" && transactions.length === 0 && (
 <EmptyState title={t("student.noHistory")} description={t("student.noHistoryDesc")} />
 )}
 </div>
 </AppShell>
 );
}
