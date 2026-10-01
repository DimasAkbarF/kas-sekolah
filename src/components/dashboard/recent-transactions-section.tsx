"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { AnimatedMoney } from "@/components/dashboard/animated-money";
import { EmptyState } from "@/components/dashboard/empty-state";
import { formatDateTime } from "@/lib/formatters";
import type { TransactionWithDetails } from "@/types";
import { ArrowRight, Receipt, Calendar, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecentTransactionsSectionProps {
 title?: string;
 subtitle?: string;
 transactions: TransactionWithDetails[];
 viewAllHref: string;
 className?: string;
}

function getInitials(name: string): string {
 if (!name) return "S";
 const parts = name.trim().split(/\s+/);
 if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
 return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatMethod(method: string): string {
 if (!method) return "-";
 return method.replace(/_/g, "").toUpperCase();
}

export function RecentTransactionsSection({
 title = "Transaksi Terbaru",
 subtitle = "Catatan penerimaan kas dan pembayaran siswa terkini",
 transactions,
 viewAllHref,
 className,
}: RecentTransactionsSectionProps) {
 return (
 <section
 className={cn("rounded-xl border border-border bg-card shadow-card overflow-hidden", className)}
 >
 {/* ── Section Header ── */}
 <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border">
 <div>
 <div className="flex items-center gap-2">
 <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-primary border border-border">
 <Receipt className="h-4 w-4" />
 </span>
 <h2 className="text-sm font-bold tracking-tight text-foreground">{title}</h2>
 </div>
 <p className="text-xs text-muted-foreground mt-1 ml-9">{subtitle}</p>
 </div>

 <div className="flex items-center gap-2 self-start sm:self-center ml-9 sm:ml-0">
 <span className="text-xs font-semibold text-foreground/80 bg-secondary/60 border border-border px-2.5 py-1 rounded-md">
 {transactions.length} Transaksi
 </span>
 <Button
 variant="ghost"
 size="sm"
 nativeButton={false}
 className="h-8 text-xs font-semibold text-primary hover:text-primary hover:bg-secondary/40 gap-1.5 active:scale-[0.98]"
 render={<Link href={viewAllHref} />}
 >
 Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
 </Button>
 </div>
 </div>

 {/* ── Content ── */}
 {transactions.length === 0 ? (
 <div className="p-8">
 <EmptyState
 title="Belum ada data transaksi"
 description="Riwayat transaksi pembayaran kas siswa akan tercatat di sini setelah transaksi selesai diproses."
 />
 </div>
 ) : (
 <div>
 {/* Desktop Table (hidden on mobile, visible on md+) */}
 <div className="hidden md:block overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-border bg-secondary/30 text-foreground/75">
 <th scope="col" className="text-left px-5 py-3 text-xs font-semibold">
 Tanggal
 </th>
 <th scope="col" className="text-left px-4 py-3 text-xs font-semibold">
 Siswa & Kelas
 </th>
 <th scope="col" className="text-left px-4 py-3 text-xs font-semibold">
 Deskripsi Tagihan
 </th>
 <th scope="col" className="text-left px-4 py-3 text-xs font-semibold">
 Tipe / Metode
 </th>
 <th scope="col" className="text-left px-4 py-3 text-xs font-semibold">
 Status
 </th>
 <th scope="col" className="text-right px-5 py-3 text-xs font-semibold">
 Nominal
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/50">
 {transactions.map((tx) => (
 <tr key={tx.id} className="hover:bg-secondary/15 transition-colors">
 <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
 {formatDateTime(tx.paidAt || tx.createdAt)}
 </td>
 <td className="px-4 py-3.5">
 <div className="flex items-center gap-2.5">
 <span className="h-7 w-7 rounded-full bg-secondary border border-border text-primary font-bold text-[11px] flex items-center justify-center shrink-0">
 {getInitials(tx.studentName)}
 </span>
 <div className="min-w-0">
 <p className="font-semibold text-foreground text-sm truncate">{tx.studentName}</p>
 <p className="text-xs text-muted-foreground truncate">{tx.className}</p>
 </div>
 </div>
 </td>
 <td className="px-4 py-3.5 text-foreground font-medium text-sm">{tx.billName}</td>
 <td className="px-4 py-3.5">
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-secondary/60 text-foreground/80 border border-border">
 <CreditCard className="h-3.5 w-3.5 text-primary" />
 {formatMethod(tx.paymentMethod)}
 </span>
 </td>
 <td className="px-4 py-3.5">
 <StatusBadge status={tx.status} />
 </td>
 <td className="px-5 py-3.5 text-right font-bold tabular-nums text-foreground text-sm">
 <AnimatedMoney value={tx.amount} />
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Mobile Card List (visible on mobile, hidden on md+) */}
 <div className="md:hidden divide-y divide-border/60">
 {transactions.map((tx) => (
 <div key={tx.id} className="p-4 space-y-2.5 hover:bg-secondary/15 transition-colors">
 <div className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-2 min-w-0">
 <span className="h-7 w-7 rounded-full bg-secondary border border-border text-primary font-bold text-[11px] flex items-center justify-center shrink-0">
 {getInitials(tx.studentName)}
 </span>
 <div className="min-w-0">
 <p className="font-semibold text-foreground text-sm truncate leading-tight">
 {tx.studentName}
 </p>
 <p className="text-[11px] text-muted-foreground truncate">{tx.className}</p>
 </div>
 </div>
 <StatusBadge status={tx.status} />
 </div>

 <div className="text-xs text-foreground font-medium bg-muted/30 p-2 rounded-lg border border-border/50">
 <p className="truncate">{tx.billName}</p>
 </div>

 <div className="flex items-center justify-between gap-2 pt-0.5 text-xs">
 <div className="flex items-center gap-2 text-muted-foreground">
 <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
 <Calendar className="h-3.5 w-3.5" />
 {formatDateTime(tx.paidAt || tx.createdAt)}
 </span>
 <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-secondary/80 text-primary border border-border">
 {formatMethod(tx.paymentMethod)}
 </span>
 </div>
 <span className="font-bold tabular-nums text-foreground text-sm">
 <AnimatedMoney value={tx.amount} />
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </section>
 );
}
