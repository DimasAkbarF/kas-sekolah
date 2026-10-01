"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { tableSurface } from "@/components/layout/data-table";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Pagination, PAGE_SIZE } from "@/components/layout/pagination";
import { apiFetch } from "@/lib/api-client";
import { getAllTransactions } from "@/services/dashboard.service";
import type { TransactionWithDetails } from "@/types";
import { formatDate } from "@/lib/formatters";
import { AnimatedMoney } from "@/components/dashboard/animated-money";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
 CheckCircle2,
 XCircle,
 Search,
 ImageUp,
 ArrowLeftRight,
 Trash2,
 Printer,
 Loader2,
} from "lucide-react";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import {
 confirmTransaction,
 deleteTransaction,
 deleteTransactions,
} from "@/services/transaction.service";
import { useI18n } from "@/hooks/use-i18n";
import { useDataVersion } from "@/hooks/use-data-version";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
} from "@/components/ui/dialog";

export default function TransactionsPage() {
 const { t } = useI18n();
 useDataVersion();
 const [search, setSearch] = useState("");
 const [statusFilter, setStatusFilter] = useState("all");
 const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
 const [pendingId, setPendingId] = useState<string | null>(null);
 const [proofTx, setProofTx] = useState<TransactionWithDetails | null>(null);
 const [proofImage, setProofImage] = useState<string | null>(null);
 const [proofLoading, setProofLoading] = useState(false);
 const [page, setPage] = useState(1);
 const [selected, setSelected] = useState<Set<string>>(new Set());

 // Baris yang dicentang harus selalu terlihat: begitu filter/pagination berubah
 // (bukan lewat efek, agar tidak ada render berantai), seleksi dibuang. Tanpa
 // ini admin bisa mencentang 5 baris di halaman 3 lalu mengetik pencarian —
 // tabel menampilkan hasil lain, tapi"hapus terpilih"tetap menghapus 5 ID
 // yang tidak terlihat.
 const changeFilter = (next: Partial<{ search: string; status: string; page: number }>) => {
 if (next.search !== undefined) setSearch(next.search);
 if (next.status !== undefined) setStatusFilter(next.status);
 if (next.page !== undefined) setPage(next.page);
 setSelected(new Set());
 };
 const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
 const [cancelTarget, setCancelTarget] = useState<TransactionWithDetails | null>(null);
 const [deleting, setDeleting] = useState(false);
 const transactions = getAllTransactions();

 // Bukti transfer diambil terpisah: daftar sengaja tidak membawa gambar
 // (bisa 1 MB per baris).
 async function openProof(tx: TransactionWithDetails) {
 setProofTx(tx);
 setProofImage(null);
 setProofLoading(true);
 try {
 const res = await apiFetch<{ transaction: { proofImage?: string } }>(
 `/api/transactions/${encodeURIComponent(tx.id)}`,
 );
 setProofImage(res.transaction.proofImage ?? null);
 } catch {
 setProofImage(null);
 } finally {
 setProofLoading(false);
 }
 }

 const filtered = transactions.filter((tx) => {
 const matchSearch =
 tx.studentName.toLowerCase().includes(search.toLowerCase()) ||
 tx.id.toLowerCase().includes(search.toLowerCase());
 const matchStatus = statusFilter === "all" || tx.status === statusFilter;
 return matchSearch && matchStatus;
 });

 const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
 const safePage = Math.min(page, pageCount);
 const paged = useMemo(
 () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
 [filtered, safePage],
 );

 const allFilteredSelected = filtered.length > 0 && filtered.every((tx) => selected.has(tx.id));

 function toggleSelect(id: string) {
 setSelected((prev) => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 return next;
 });
 }

 function toggleSelectAll() {
 setSelected((prev) => {
 const next = new Set(prev);
 const all = filtered.every((tx) => prev.has(tx.id));
 filtered.forEach((tx) => (all ? next.delete(tx.id) : next.add(tx.id)));
 return next;
 });
 }

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

 async function handleDelete() {
 if (!confirmIds || confirmIds.length === 0) return;
 setDeleting(true);
 setFeedback(null);
 const result =
 confirmIds.length === 1
 ? await deleteTransaction(confirmIds[0])
 : await deleteTransactions(confirmIds);
 setDeleting(false);
 setConfirmIds(null);
 setSelected(new Set());
 setFeedback(
 result.ok
 ? { type: "success", text: t("tx.feedbackDeleted") }
 : { type: "error", text: result.error || t("students.errorUnknown") },
 );
 }

 return (
 <AppShell
 role="super_admin"
 breadcrumbs={[
 { label: t("role.super_admin"), href: "/admin/dashboard" },
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

 <div className="flex flex-col sm:flex-row gap-3">
 <div className="relative flex-1 max-w-sm">
 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={t("tx.search")}
 aria-label={t("tx.search")}
 className="pl-8"
 value={search}
 onChange={(e) => changeFilter({ search: e.target.value })}
 />
 </div>
 <Select value={statusFilter} onValueChange={(v) => changeFilter({ status: v ?? "all" })}>
 <SelectTrigger className="w-full sm:w-[150px]">
 <SelectValue placeholder={t("common.status")} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t("bills.allStatus")}</SelectItem>
 <SelectItem value="PAID">{t("status.paid")}</SelectItem>
 <SelectItem value="PENDING">{t("status.pending")}</SelectItem>
 <SelectItem value="FAILED">{t("status.failed")}</SelectItem>
 <SelectItem value="EXPIRED">{t("status.expired")}</SelectItem>
 <SelectItem value="CANCELLED">{t("status.cancelled")}</SelectItem>
 </SelectContent>
 </Select>
 </div>

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

 {selected.size > 0 && (
 <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-info-line bg-info-soft px-3 py-2">
 <p className="text-xs font-medium text-info-ink">
 {selected.size} transaksi dipilih
 </p>
 <div className="flex gap-2">
 <Button
 size="sm"
 variant="outline"
 className="h-8 text-xs"
 onClick={() => setSelected(new Set())}
 >
 {t("tx.cancel")}
 </Button>
 <Button
 size="sm"
 variant="destructive"
 className="h-8 text-xs"
 onClick={() => setConfirmIds([...selected])}
 >
 <Trash2 className="h-3.5 w-3.5 mr-1" />
 {t("tx.deleteSelected", { count: selected.size })}
 </Button>
 </div>
 </div>
 )}

 {filtered.length === 0 ? (
 <EmptyState title={t("tx.emptyTitle")} description={t("tx.emptyDesc")} />
 ) : (
 <div className={cn(tableSurface, "hidden md:block")}>
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b bg-muted/40">
 <th scope="col" className="w-10 px-3 py-2.5 text-left">
 <input
 type="checkbox"
 aria-label="Pilih semua transaksi"
 checked={allFilteredSelected}
 onChange={toggleSelectAll}
 className="h-4 w-4 rounded border-border accent-primary"
 />
 </th>
 <th
 scope="col"
 className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground"
 >
 {t("th.id")}
 </th>
 <th
 scope="col"
 className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground"
 >
 {t("th.student")}
 </th>
 <th
 scope="col"
 className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground"
 >
 {t("th.class")}
 </th>
 <th
 scope="col"
 className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground"
 >
 {t("th.bill")}
 </th>
 <th
 scope="col"
 className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground"
 >
 {t("th.amount")}
 </th>
 <th
 scope="col"
 className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground"
 >
 {t("th.method")}
 </th>
 <th
 scope="col"
 className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground"
 >
 {t("th.status")}
 </th>
 <th
 scope="col"
 className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground"
 >
 {t("th.date")}
 </th>
 <th
 scope="col"
 className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground"
 >
 {t("tx.columnAction")}
 </th>
 </tr>
 </thead>
 <tbody>
 {filtered.map((tx) => (
 <tr key={tx.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
 <td className="px-3 py-3">
 <input
 type="checkbox"
 aria-label={`Pilih transaksi ${tx.id}`}
 checked={selected.has(tx.id)}
 onChange={() => toggleSelect(tx.id)}
 className="h-4 w-4 rounded border-border accent-primary"
 />
 </td>
 <td className="px-4 py-3 font-mono text-xs">{tx.id}</td>
 <td className="px-4 py-3 font-medium">{tx.studentName}</td>
 <td className="px-4 py-3">{tx.className}</td>
 <td className="px-4 py-3">{tx.billName}</td>
 <td className="px-4 py-3 text-right font-medium tabular-nums">
 <AnimatedMoney value={tx.amount} />
 </td>
 <td className="px-4 py-3 capitalize">
 {tx.methodName ?? tx.paymentMethod.replace("_", "")}
 </td>
 <td className="px-4 py-3">
 <StatusBadge status={tx.status} />
 </td>
 <td className="px-4 py-3 text-muted-foreground">
 {formatDate(tx.paidAt || tx.createdAt)}
 </td>
 <td className="px-4 py-3">
 {tx.status === "PENDING" && (
 <div className="flex gap-1.5">
 {tx.hasProof && (
 <Button
 size="sm"
 variant="outline"
 className="h-10 sm:h-7 px-2 text-xs"
 onClick={() => void openProof(tx)}
 >
 <ImageUp className="h-3.5 w-3.5 mr-1" />
 Bukti
 </Button>
 )}
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
 // `Button` merender <button>; membungkusnya dengan <a> menghasilkan elemen
 // interaktif bersarang (dua tab stop, Enter/Space kabur). `nativeButton={false}`
 // + `render` membuat Button itu sendiri yang jadi <a>.
 <Button
 size="sm"
 variant="outline"
 className="h-7 px-2 text-xs"
 nativeButton={false}
 render={<a href={`/kwitansi/${tx.id}`} target="_blank" rel="noopener noreferrer" />}
 >
 <Printer className="h-3.5 w-3.5 mr-1" />
 Kwitansi
 </Button>
 )}
 <Button
 size="icon"
 variant="ghost"
 className="h-10 w-10 sm:h-7 sm:w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
 title="Hapus riwayat"
 aria-label={`Hapus riwayat transaksi ${tx.id}`}
 onClick={() => setConfirmIds([tx.id])}
 >
 <Trash2 className="h-3.5 w-3.5" />
 </Button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {filtered.length > 0 && (
 <>
 {/* Mobile: tabel 10 kolom tidak muat, jadi jadi daftar kartu.
 Pola yang sama dipakai recent-transactions-section. */}
 <ul className="md:hidden space-y-2">
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
 {tx.hasProof && (
 <Button
 size="sm"
 variant="outline"
 className="h-10 text-xs"
 onClick={() => void openProof(tx)}
 >
 <ImageUp className="mr-1 h-3.5 w-3.5" />
 Bukti
 </Button>
 )}
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
 total={filtered.length}
 onPageChange={(p) => changeFilter({ page: p })}
 label="transaksi"
 />
 </>
 )}
 </div>

 <Dialog
 open={!!proofTx}
 onOpenChange={(open) => {
 if (!open) setProofTx(null);
 }}
 >
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle>Bukti Pembayaran {proofTx ? `: ${proofTx.studentName}` : ""}</DialogTitle>
 {proofTx?.methodName && <DialogDescription>{proofTx.methodName}</DialogDescription>}
 </DialogHeader>
 {proofLoading ? (
 <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
 <Loader2 className="h-4 w-4 animate-spin" />
 Memuat bukti...
 </div>
 ) : proofImage ? (
 <div className="rounded-lg border bg-muted/40 p-2">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src={proofImage}
 alt={`Bukti pembayaran ${proofTx?.studentName ?? ""}`}
 className="w-full rounded-md object-contain"
 />
 </div>
 ) : (
 <p className="py-6 text-center text-sm text-muted-foreground">
 Bukti pembayaran tidak tersedia.
 </p>
 )}
 </DialogContent>
 </Dialog>

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
 {t("tx.cancel")}
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

 <Dialog
 open={confirmIds !== null}
 onOpenChange={(open) => {
 if (!open && !deleting) setConfirmIds(null);
 }}
 >
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <div className="flex items-center gap-3">
 <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
 <Trash2 className="h-5 w-5" />
 </span>
 <div>
 <DialogTitle>{t("tx.deleteConfirmTitle")}</DialogTitle>
 <DialogDescription className="mt-1 text-xs">
 {t("tx.deleteConfirmDesc", { count: confirmIds?.length ?? 0 })}
 </DialogDescription>
 </div>
 </div>
 </DialogHeader>
 <div className="flex justify-end gap-2 pt-2">
 <Button variant="outline" size="sm" disabled={deleting} onClick={() => setConfirmIds(null)}>
 {t("tx.cancel")}
 </Button>
 <Button
 variant="destructive"
 size="sm"
 disabled={deleting}
 onClick={() => void handleDelete()}
 >
 {deleting ? "Menghapus..." : t("common.delete")}
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 </AppShell>
 );
}
