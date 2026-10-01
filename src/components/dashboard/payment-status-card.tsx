"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "./empty-state";
import { AnimatedMoney } from "./animated-money";
import { PieChart as PieIcon, CheckCircle2, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface PaymentStatusCardProps {
 title?: string;
 subtitle?: string;
 totalPaid: number;
 outstanding: number;
 paidStudents: number;
 unpaidStudents: number;
 totalStudents: number;
 collectionRate: number;
 className?: string;
}

interface DonutTooltipPayloadItem {
 name?: string;
 value?: number;
 payload?: { fill?: string };
}

interface CustomDonutTooltipProps {
 active?: boolean;
 payload?: DonutTooltipPayloadItem[];
}

function CustomDonutTooltip({ active, payload }: CustomDonutTooltipProps) {
 if (!active || !payload || payload.length === 0) return null;
 const item = payload[0];
 return (
 <div className="rounded-lg border border-border bg-popover px-3 py-1.5 text-xs shadow-md text-popover-foreground">
 <div className="flex items-center gap-1.5 font-medium">
 <span
 className="h-2 w-2 rounded-full"
 style={{ backgroundColor: item.payload?.fill || "var(--chart-1)" }}
 />
 <span>{item.name}:</span>
 <span className="font-bold tabular-nums">{formatCurrency(Number(item.value || 0))}</span>
 </div>
 </div>
 );
}

export function PaymentStatusCard({
 title = "Status Pembayaran",
 subtitle = "Rasio kelunasan kewajiban kas siswa",
 totalPaid,
 outstanding,
 paidStudents,
 unpaidStudents,
 totalStudents,
 collectionRate,
 className,
}: PaymentStatusCardProps) {
 const totalAmount = totalPaid + outstanding;
 const hasData = totalAmount > 0 || totalStudents > 0;

 const chartData = useMemo(() => {
 if (!hasData) return [];
 return [
 { name: "Lunas", value: totalPaid, fill: "var(--chart-1)" },
 { name: "Belum Dibayar", value: outstanding, fill: "var(--chart-3)" },
 ];
 }, [hasData, totalPaid, outstanding]);

 return (
 <Card
 className={cn(
 "rounded-xl border border-border bg-card shadow-card flex flex-col overflow-hidden",
 className,
 )}
 >
 <CardContent className="p-5 sm:p-6 flex-1 flex flex-col">
 <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/50">
 <div>
 <div className="flex items-center gap-2">
 <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-soft text-teal-ink border border-teal-line">
 <PieIcon className="h-4 w-4" />
 </span>
 <h2 className="text-sm font-bold tracking-tight text-foreground">{title}</h2>
 </div>
 {subtitle && <p className="text-xs text-muted-foreground mt-1 ml-9">{subtitle}</p>}
 </div>
 </div>

 {!hasData ? (
 <div className="my-auto py-8">
 <EmptyState
 title="Belum ada data pembayaran"
 description="Statistik status pembayaran akan muncul setelah tagihan aktif tercatat."
 />
 </div>
 ) : (
 <div className="mt-4 flex-1 flex flex-col justify-between">
 {/* Donut Chart with Center Percentage */}
 <div className="flex items-center justify-center py-2">
 <div className="relative h-[120px] w-[120px] shrink-0">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={chartData}
 cx="50%"
 cy="50%"
 innerRadius={38}
 outerRadius={56}
 paddingAngle={3}
 dataKey="value"
 strokeWidth={0}
 >
 {chartData.map((entry, index) => (
 <Cell key={`slice-${index}`} fill={entry.fill} />
 ))}
 </Pie>
 <Tooltip content={<CustomDonutTooltip />} />
 </PieChart>
 </ResponsiveContainer>
 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
 <span className="text-xl font-extrabold tracking-tight text-foreground tabular-nums leading-none">
 {collectionRate.toFixed(0)}%
 </span>
 <span className="text-xs font-bold text-muted-foreground r mt-1">Lunas</span>
 </div>
 </div>
 </div>

 {/* Visual Progress Bar */}
 <div className="mt-2 mb-4 space-y-1">
 <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
 <span>Kelunasan: {collectionRate.toFixed(1)}%</span>
 <span>{totalStudents} Siswa Aktif</span>
 </div>
 <div className="h-2 w-full rounded-full bg-destructive/20 dark:bg-border overflow-hidden flex">
 <div
 className="h-full bg-teal transition-all duration-500 rounded-full dark:bg-primary"
 style={{ width: `${Math.min(100, Math.max(0, collectionRate))}%` }}
 />
 </div>
 </div>

 {/* Breakdown Rows */}
 <div className="space-y-2 mt-auto">
 <div className="p-3 rounded-lg border border-success-line bg-success-soft flex items-center justify-between gap-3 shadow-2xs">
 <div className="flex items-center gap-2.5 min-w-0">
 <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-soft border-success-line text-success-ink">
 <CheckCircle2 className="h-3.5 w-3.5" />
 </span>
 <div className="min-w-0">
 <p className="text-xs font-semibold text-success-ink">Siswa Lunas</p>
 <p className="text-[10.5px] text-success-ink/80">
 {paidStudents} dari {totalStudents} siswa
 </p>
 </div>
 </div>
 <div className="text-right shrink-0">
 <p className="text-xs font-bold tabular-nums text-foreground">
 <AnimatedMoney value={totalPaid} />
 </p>
 </div>
 </div>

 <div className="p-3 rounded-lg border border-danger-line bg-danger-soft flex items-center justify-between gap-3 shadow-2xs">
 <div className="flex items-center gap-2.5 min-w-0">
 <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-danger-soft border-danger-line text-danger-ink">
 <Clock className="h-3.5 w-3.5" />
 </span>
 <div className="min-w-0">
 <p className="text-xs font-semibold text-danger-strong-ink">Belum Dibayar</p>
 <p className="text-[10.5px] text-danger-ink/85">{unpaidStudents} siswa tertunggak</p>
 </div>
 </div>
 <div className="text-right shrink-0">
 <p className="text-xs font-bold tabular-nums text-foreground">
 <AnimatedMoney value={outstanding} />
 </p>
 </div>
 </div>
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 );
}
