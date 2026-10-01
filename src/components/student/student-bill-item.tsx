"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/formatters";
import { AnimatedMoney } from "@/components/dashboard/animated-money";
import type { Bill, Transaction } from "@/types";
import { useI18n } from "@/hooks/use-i18n";
import type { TKey } from "@/lib/i18n";
import { Calendar } from "lucide-react";

export type StudentBillStatus = "unpaid" | "pending" | "paid" | "failed" | "expired";

export function getStudentBillStatus(bill: Bill, transactions: Transaction[]): StudentBillStatus {
 const related = transactions.filter((t) => t.billId === bill.id);
 if (related.length === 0) return "unpaid";
 if (related.some((t) => t.status === "PAID")) return "paid";
 if (related.some((t) => t.status === "PENDING")) return "pending";
 if (related.some((t) => t.status === "FAILED")) return "failed";
 if (related.some((t) => t.status === "EXPIRED")) return "expired";
 return "unpaid";
}

const statusLabelKey: Record<StudentBillStatus, TKey> = {
 unpaid: "student.statusUnpaid",
 pending: "student.statusPending",
 paid: "student.statusPaid",
 failed: "student.statusFailed",
 expired: "student.statusExpired",
};

const statusStyles: Record<StudentBillStatus, { badge: string; dot: string }> = {
 unpaid: {
 badge: "bg-danger-soft border-danger-line",
 dot: "bg-destructive",
 },
 pending: {
 badge: "bg-warning-soft border-warning-line text-warning-ink",
 dot: "bg-gold",
 },
 paid: {
 badge: "bg-teal-soft border-teal-line",
 dot: "bg-teal",
 },
 failed: {
 badge: "bg-danger-strong-soft border-danger-strong-line",
 dot: "bg-danger-ink",
 },
 expired: {
 badge: "bg-neutral-soft border-neutral-line",
 dot: "bg-neutral-ink",
 },
};

const accentBarMap: Record<StudentBillStatus, "coral" | "gold" | "teal" | undefined> = {
 unpaid: "coral",
 pending: "gold",
 paid: "teal",
 failed: "coral",
 expired: undefined,
};

export interface StudentBillItemProps {
 bill: Bill;
 transactions: Transaction[];
}

export function StudentBillItem({ bill, transactions }: StudentBillItemProps) {
 const { t } = useI18n();
 const status = getStudentBillStatus(bill, transactions);
 const currentStyle = statusStyles[status];

 return (
 <Card
 accentBar={accentBarMap[status]}
 className="rounded-xl border border-border bg-card shadow-card transition-all hover:border-teal-line"
 >
 <CardContent className="p-4 sm:p-5">
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
 <div className="min-w-0 flex-1">
 <div className="flex flex-wrap items-center gap-2">
 <h3 className="font-semibold text-foreground text-sm sm:text-base">{bill.name}</h3>
 <span
 className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${currentStyle.badge}`}
 >
 <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${currentStyle.dot}`} />
 {t(statusLabelKey[status])}
 </span>
 </div>
 <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
 <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40 font-medium">
 {bill.category}
 </span>
 <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40 font-medium">
 {bill.period}
 </span>
 <span className="flex items-center gap-1">
 <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
 {t("student.dueDate", { date: formatDate(bill.dueDate) })}
 </span>
 </div>
 </div>

 <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
 <p className="text-lg font-bold tabular-nums tracking-tight text-foreground">
 <AnimatedMoney value={bill.amount} />
 </p>
 <div>
 {(status === "paid" || status === "expired") && (
 <Button
 size="sm"
 variant="outline"
 nativeButton={false}
 className="h-8 text-xs font-medium"
 render={<Link href={`/student/bills/${bill.id}`} />}
 >
 {t("student.viewDetail")}
 </Button>
 )}
 {(status === "unpaid" || status === "failed") && (
 <Button
 size="sm"
 variant="gold"
 nativeButton={false}
 className="h-8 text-xs font-bold shadow-xs"
 render={<Link href={`/student/payment?bill=${bill.id}`} />}
 >
 {status === "failed" ? t("student.payAgain") : t("student.payNow")}
 </Button>
 )}
 {status === "pending" && (
 <Button
 size="sm"
 variant="outline"
 nativeButton={false}
 className="h-8 text-xs font-medium"
 render={<Link href={`/student/payment?bill=${bill.id}`} />}
 >
 {t("student.viewPayment")}
 </Button>
 )}
 </div>
 </div>
 </div>
 </CardContent>
 </Card>
 );
}
