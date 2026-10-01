"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { tableSurface } from "@/components/layout/data-table";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { getAllTransactions } from "@/services/dashboard.service";
import { formatDate } from "@/lib/formatters";
import { AnimatedMoney } from "@/components/dashboard/animated-money";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Pagination, PAGE_SIZE } from "@/components/layout/pagination";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, ArrowLeftRight, Printer } from "lucide-react";
import { confirmTransaction } from "@/services/transaction.service";
import { useI18n } from "@/hooks/use-i18n";
import { useDataVersion } from "@/hooks/use-data-version";
import type { TransactionWithDetails } from "@/types";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
} from "@/components/ui/dialog";

export default function TreasurerTransactionsPage() {
 const { t } = useI18n();
 useDataVersion();
 const transactions = getAllTransactions();
 const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
 const [pendingId, setPendingId] = useState<string | null>(null);
 const [cancelTarget, setCancelTarget] = useState<TransactionWithDetails | null>(null);
 const [page, setPage] = useState(1);

 const pageCount = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
 const safePage = Math.min(page, pageCount);
 const paged = useMemo(
 () => transactions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
 [transactions, safePage],
 );

 async function handleConfirm(id: string) {
 setPendingId(id);
 setFeedback(null);
 const result = await confirmTransaction(id, "PAID");
 setPendingId(null);
 setFeedback(
 result.ok
 ? { type: "success", text: t("tx.feedbackConfirmed") }
 : { type: "error", text: result.error || t("students.errorUnknown") },
 );
 }

 async function handleCancel(id: string) {
 setPendingId(id);
 setFeedback(null);
 const result = await confirmTransaction(id, "CANCELLED");
 setPendingId(null);
 setCancelTarget(null);
 setFeedback(
 result.ok
 ? { type: "success", text: t("tx.feedbackCancelled") }
 : { type: "error", text: result.error || t("students.errorUnknown") },
 );
 }

 return (
 <AppShell
 role="treasurer"
 breadcrumbs={[
 { label: t("role.treasurer"), href: "/treasurer/dashboard" },
 { label: t("nav.transactions") },
 ]}
 >
 <div className="space-y-4">
 <PageHeader
 title={t("nav.transactions")}
 subtitle={t("tx.subtitle")}
 accent="slate"
 icon={<ArrowLeftRight className="h-5 w-5" />}
 badge={
 <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md bg-neutral-soft text-neutral-ink border-neutral-line">
 {transactions.length} Transaksi
 </span>
 }
 />

 {feedback && (
 <Alert
 className={feedback.type === "success" ? "border-success/30" : ""}
 variant={feedback.type === "error" ? "destructive" : "default"}
 >
 <AlertDescription className={feedback.type === "success" ? "text-success" : ""}>
 {feedback.text}
 </AlertDescription>
 </Alert>
 )}

 <div className={cn(tableSurface, "hidden md:block")}>
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b bg-muted/50">
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("th.id")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("th.student")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("th.class")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("th.bill")}
 </th>
 <th scope="col" className="text-right px-4 py-2 text-xs font-medium">
 {t("th.amount")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("th.method")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("th.status")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("th.date")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("tx.columnAction")}
 </th>
 </tr>
 </thead>
 <tbody>
 {paged.map((tx) => (
 <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/30">
 <td className="px-4 py-2.5 font-mono text-xs">{tx.id}</td>
 <td className="px-4 py-2.5 font-medium">{tx.studentName}</td>
 <td className="px-4 py-2.5">{tx.className}</td>
 <td className="px-4 py-2.5">{tx.billName}</td>
 <td className="px-4 py-2.5 text-right font-medium tabular-nums">
 <AnimatedMoney value={tx.amount} />
 </td>
 <td className="px-4 py-2.5 capitalize">{tx.paymentMethod.replace("_", "")}</td>
 <td className="px-4 py-2.5">
 <StatusBadge status={tx.status} />
 </td>
 <td className="px-4 py-2.5 text-muted-foreground">
 {formatDate(tx.paidAt || tx.createdAt)}
 </td>
 <td className="px-4 py-2.5">
 {tx.status === "PENDING" && (
 <div className="flex gap-1.5">
 <Button
 size="sm"
 variant="outline"
 className="h-7 px-2 text-xs border-success/40 text-success hover:bg-success/10"
 disabled={pendingId === tx.id}
 onClick={() => void handleConfirm(tx.id)}
 >
 <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
 {t("tx.confirm")}
 </Button>
 <Button
 size="sm"
 variant="outline"
 className="h-7 px-2 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
 disabled={pendingId === tx.id}
 onClick={() => setCancelTarget(tx)}
 >
 <XCircle className="h-3.5 w-3.5 mr-1" />
 {t("tx.cancel")}
 </Button>
 </div>
 )}
 {tx.status === "PAID" && (
 <a href={`/kwitansi/${tx.id}`} target="_blank">
 <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
 <Printer className="h-3.5 w-3.5 mr-1" />
 Kwitansi
 </Button>
 </a>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Mobile: 9 kolom tidak muat di 375px, jadi daftar kartu. */}
 <ul className="space-y-2 md:hidden">
 {paged.map((tx) => (
 <li key={tx.id} className="rounded-lg border border-border bg-card p-3 text-sm">
 <div className="flex items-start justify-between gap-2">
 <div className="min-w-0">
 <p className="font-medium truncate">{tx.studentName}</p>
 <p className="text-xs text-muted-foreground truncate">{tx.billName}</p>
 </div>
 <StatusBadge status={tx.status} />
 </div>
 <div className="mt-2 flex items-center justify-between gap-2">
 <span className="font-semibold tabular-nums">
 <AnimatedMoney value={tx.amount} />
 </span>
 <span className="text-xs text-muted-foreground">
 {formatDate(tx.paidAt || tx.createdAt)}
 </span>
 </div>
 <div className="mt-2 flex flex-wrap gap-1.5">
 {tx.status === "PENDING" && (
 <>
 <Button
 size="sm"
 variant="outline"
 className="h-10 text-xs"
 disabled={pendingId === tx.id}
 onClick={() => void handleConfirm(tx.id)}
 >
 <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
 {t("tx.confirm")}
 </Button>
 <Button
 size="sm"
 variant="outline"
 className="h-10 text-xs"
 disabled={pendingId === tx.id}
 onClick={() => setCancelTarget(tx)}
 >
 <XCircle className="mr-1 h-3.5 w-3.5" />
 {t("tx.cancel")}
 </Button>
 </>
 )}
 {tx.status === "PAID" && (
 <Button
 size="sm"
 variant="outline"
 className="h-10 text-xs"
 nativeButton={false}
 render={<Link href={`/kwitansi/${tx.id}`} target="_blank" />}
 >
 <Printer className="mr-1 h-3.5 w-3.5" />
 Kwitansi
 </Button>
 )}
 </div>
 </li>
 ))}
 </ul>

 <Pagination
 page={safePage}
 pageCount={pageCount}
 total={transactions.length}
 onPageChange={setPage}
 label="transaksi"
 />
 </div>

 <Dialog
 open={cancelTarget !== null}
 onOpenChange={(open) => {
 if (!open) setCancelTarget(null);
 }}
 >
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle>{t("tx.cancelConfirmTitle")}</DialogTitle>
 <DialogDescription className="mt-1 text-xs">
 {cancelTarget &&
 t("tx.cancelConfirmDesc", {
 bill: cancelTarget.billName,
 student: cancelTarget.studentName,
 })}
 </DialogDescription>
 </DialogHeader>
 <div className="flex justify-end gap-2 pt-2">
 <Button
 variant="outline"
 size="sm"
 disabled={pendingId === cancelTarget?.id}
 onClick={() => setCancelTarget(null)}
 >
 {t("common.cancel")}
 </Button>
 <Button
 variant="destructive"
 size="sm"
 disabled={pendingId === cancelTarget?.id}
 onClick={() => cancelTarget && void handleCancel(cancelTarget.id)}
 >
 {pendingId === cancelTarget?.id ? "Membatalkan..." : t("tx.cancel")}
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 </AppShell>
 );
}
