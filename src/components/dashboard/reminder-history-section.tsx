"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { formatDateTime } from "@/lib/formatters";
import { apiFetch } from "@/lib/api-client";
import { Bell, History, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Reminder } from "@/types";

interface ReminderHistorySectionProps {
 refreshKey?: number;
 className?: string;
}

function formatTarget(type: string, count: number): string {
 if (type === "all") return `Semua Siswa (${count})`;
 if (type === "unpaid") return `Siswa Belum Bayar (${count})`;
 return `Siswa Tertentu (${count})`;
}

function formatChannels(channels: string[]): string {
 const hasWeb = channels.includes("web");
 const hasEmail = channels.includes("email");
 if (hasWeb && hasEmail) return "Web + Email";
 if (hasWeb) return "Notifikasi Web";
 if (hasEmail) return "Email";
 return "-";
}

function StatusBadge({ status }: { status: string }) {
 if (status === "sent") {
 return (
 <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-success-soft border border-success-line">
 <span className="h-1.5 w-1.5 rounded-full bg-success" />
 Terkirim
 </span>
 );
 }
 if (status === "partial_failed") {
 return (
 <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-warning-soft border border-warning-line text-warning-ink">
 <span className="h-1.5 w-1.5 rounded-full bg-warning-ink" />
 Sebagian Gagal
 </span>
 );
 }
 return (
 <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-danger-soft border border-danger-line">
 <span className="h-1.5 w-1.5 rounded-full bg-danger-ink" />
 Gagal
 </span>
 );
}

export function ReminderHistorySection({ refreshKey = 0, className }: ReminderHistorySectionProps) {
 const [reminders, setReminders] = useState<Reminder[]>([]);
 const [loading, setLoading] = useState(true);

 const fetchReminders = useCallback(async () => {
 setLoading(true);
 try {
 const res = await apiFetch<{ reminders: Reminder[] }>("/api/admin/reminders");
 setReminders(res.reminders || []);
 } catch {
 setReminders([]);
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => {
 let mounted = true;
 void apiFetch<{ reminders: Reminder[] }>("/api/admin/reminders")
 .then((res) => {
 if (mounted) {
 setReminders(res.reminders || []);
 setLoading(false);
 }
 })
 .catch(() => {
 if (mounted) {
 setReminders([]);
 setLoading(false);
 }
 });
 return () => {
 mounted = false;
 };
 }, [refreshKey]);

 return (
 <Card
 className={cn("rounded-xl border border-border bg-card shadow-card overflow-hidden", className)}
 >
 <CardContent className="p-0">
 {/* ── Header Riwayat ── */}
 <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70">
 <div>
 <div className="flex items-center gap-2">
 <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-primary border border-border">
 <History className="h-4 w-4" />
 </span>
 <h2 className="text-sm font-bold tracking-tight text-foreground">Riwayat Pengingat</h2>
 </div>
 <p className="text-xs text-muted-foreground mt-1 ml-9">
 Catatan notifikasi dan pengingat tagihan yang telah dikirimkan kepada siswa
 </p>
 </div>

 <div className="flex items-center gap-2 self-start sm:self-center ml-9 sm:ml-0">
 <span className="text-xs font-semibold text-foreground/80 bg-secondary/60 border border-border px-2.5 py-1 rounded-md">
 {reminders.length} Pengingat
 </span>
 <Button
 variant="ghost"
 size="sm"
 onClick={fetchReminders}
 disabled={loading}
 className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5"
 >
 <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
 Refresh
 </Button>
 </div>
 </div>

 {/* ── Content Riwayat ── */}
 {loading && reminders.length === 0 ? (
 <div className="py-12 text-center text-muted-foreground">
 <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
 <p className="text-xs font-medium">Memuat riwayat pengingat...</p>
 </div>
 ) : reminders.length === 0 ? (
 <div className="p-8">
 <EmptyState
 title="Belum ada riwayat pengingat"
 description="Daftar pengingat manual yang dikirimkan oleh administrator akan tercatat di sini."
 />
 </div>
 ) : (
 <div>
 {/* Desktop Table View (md+) */}
 <div className="hidden md:block overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-border bg-secondary/30 text-foreground/75">
 <th scope="col" className="text-left px-5 py-3 text-xs font-semibold">
 Judul
 </th>
 <th scope="col" className="text-left px-4 py-3 text-xs font-semibold">
 Target
 </th>
 <th scope="col" className="text-left px-4 py-3 text-xs font-semibold">
 Channel
 </th>
 <th scope="col" className="text-left px-4 py-3 text-xs font-semibold">
 Waktu
 </th>
 <th scope="col" className="text-right px-5 py-3 text-xs font-semibold">
 Status
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/50">
 {reminders.map((r) => (
 <tr key={r.id} className="hover:bg-secondary/15 transition-colors">
 <td className="px-5 py-3.5">
 <div className="flex items-center gap-2">
 <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-primary border border-border">
 <Bell className="h-3.5 w-3.5" />
 </span>
 <div className="min-w-0">
 <p className="font-semibold text-foreground text-xs truncate max-w-xs sm:max-w-sm">
 {r.title}
 </p>
 <p className="text-[11px] text-muted-foreground truncate max-w-xs sm:max-w-sm">
 {r.message}
 </p>
 </div>
 </div>
 </td>
 <td className="px-4 py-3.5 text-xs text-foreground font-medium whitespace-nowrap">
 {formatTarget(r.targetType, r.targetCount)}
 </td>
 <td className="px-4 py-3.5">
 <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-secondary/80 text-foreground border border-border">
 {formatChannels(r.channels)}
 </span>
 </td>
 <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
 {formatDateTime(r.createdAt)}
 </td>
 <td className="px-5 py-3.5 text-right whitespace-nowrap">
 <StatusBadge status={r.status} />
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Mobile Card List View (< md) */}
 <div className="md:hidden divide-y divide-border/60">
 {reminders.map((r) => (
 <div key={r.id} className="p-4 space-y-2 hover:bg-secondary/15 transition-colors">
 <div className="flex items-start justify-between gap-2">
 <div className="min-w-0 flex-1">
 <p className="font-bold text-foreground text-xs">{r.title}</p>
 <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{r.message}</p>
 </div>
 <StatusBadge status={r.status} />
 </div>

 <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs border-t border-border/40">
 <span className="font-medium text-foreground text-[11px]">
 {formatTarget(r.targetType, r.targetCount)}
 </span>
 <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-secondary/80 text-foreground border border-border">
 {formatChannels(r.channels)}
 </span>
 </div>

 <div className="text-[10.5px] text-muted-foreground tabular-nums">
 {formatDateTime(r.createdAt)}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 );
}
