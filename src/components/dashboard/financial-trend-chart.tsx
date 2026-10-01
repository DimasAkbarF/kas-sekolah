"use client";

import { useMemo } from "react";
import {
 Bar,
 BarChart,
 CartesianGrid,
 Legend,
 ResponsiveContainer,
 Tooltip,
 XAxis,
 YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "./empty-state";
import { formatCurrency } from "@/lib/formatters";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MonthlyCashFlowPoint {
 month: string;
 income: number;
 expense: number;
 balance?: number;
}

interface FinancialTrendChartProps {
 title?: string;
 subtitle?: string;
 data: MonthlyCashFlowPoint[];
 height?: number;
 className?: string;
}

function currencyShort(v: number): string {
 if (v === 0) return "Rp 0";
 if (Math.abs(v) >= 1_000_000_000) {
 return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
 }
 if (Math.abs(v) >= 1_000_000) {
 return `Rp ${(v / 1_000_000).toFixed(1)}jt`;
 }
 if (Math.abs(v) >= 1_000) {
 return `Rp ${(v / 1_000).toFixed(0)}rb`;
 }
 return `Rp ${v}`;
}

interface TooltipPayloadItem {
 dataKey?: string | number;
 value?: number;
}

interface CustomTooltipProps {
 active?: boolean;
 payload?: TooltipPayloadItem[];
 label?: string;
}

function CustomCashFlowTooltip({ active, payload, label }: CustomTooltipProps) {
 if (!active || !payload || payload.length === 0) return null;
 const incomeVal = Number(payload.find((p) => p.dataKey === "income")?.value ?? 0);
 const expenseVal = Number(payload.find((p) => p.dataKey === "expense")?.value ?? 0);
 const net = incomeVal - expenseVal;

 return (
 <div className="rounded-xl border border-border bg-popover p-3 text-xs shadow-lg text-popover-foreground min-w-[190px]">
 <div className="font-semibold text-foreground pb-1.5 border-b border-border/60">
 Periode: {label}
 </div>
 <div className="mt-2 space-y-1.5">
 <div className="flex items-center justify-between gap-3">
 <span className="flex items-center gap-1.5 text-foreground font-medium">
 <span className="h-2 w-2 rounded-full bg-teal" />
 Pemasukan
 </span>
 <span className="font-bold tabular-nums text-foreground">{formatCurrency(incomeVal)}</span>
 </div>
 <div className="flex items-center justify-between gap-3">
 <span className="flex items-center gap-1.5 text-foreground font-medium">
 <span className="h-2 w-2 rounded-full bg-destructive" />
 Pengeluaran
 </span>
 <span className="font-bold tabular-nums text-foreground">{formatCurrency(expenseVal)}</span>
 </div>
 <div className="pt-1.5 mt-1 border-t border-border/50 flex items-center justify-between gap-3 text-[11px]">
 <span className="text-muted-foreground font-medium">Surplus Bersih</span>
 <span className={cn("font-bold tabular-nums", net >= 0 ? "text-success" : "text-danger")}>
 {formatCurrency(net)}
 </span>
 </div>
 </div>
 </div>
 );
}

export function FinancialTrendChart({
 title = "Perkembangan Arus Kas",
 subtitle = "Perbandingan pemasukan dan pengeluaran kas per periode",
 data,
 height = 250,
 className,
}: FinancialTrendChartProps) {
 // Verifikasi ketersediaan data aktual (tidak membuat chart palsu jika Rp 0)
 const hasData = useMemo(() => {
 if (!data || data.length === 0) return false;
 return data.some((d) => (d.income || 0) > 0 || (d.expense || 0) > 0);
 }, [data]);

 const totalIncome = useMemo(
 () => (data || []).reduce((acc, d) => acc + (d.income || 0), 0),
 [data],
 );

 const totalExpense = useMemo(
 () => (data || []).reduce((acc, d) => acc + (d.expense || 0), 0),
 [data],
 );

 return (
 <Card
 className={cn("rounded-xl border border-border bg-card shadow-card overflow-hidden", className)}
 >
 <CardContent className="p-5 sm:p-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-border/50">
 <div>
 <div className="flex items-center gap-2">
 <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-primary border border-border">
 <BarChart3 className="h-4 w-4" />
 </span>
 <h2 className="text-sm font-bold tracking-tight text-foreground">{title}</h2>
 </div>
 {subtitle && <p className="text-xs text-muted-foreground mt-1 ml-9">{subtitle}</p>}
 </div>

 {hasData && (
 <div className="flex items-center gap-2 self-start sm:self-center ml-9 sm:ml-0">
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-secondary/60 text-primary border border-border">
 <span className="h-1.5 w-1.5 rounded-full bg-primary" />
 {data.length} Periode Tercatat
 </span>
 </div>
 )}
 </div>

 {!hasData ? (
 <div className="py-10">
 <EmptyState
 title="Belum ada data transaksi"
 description="Grafik arus kas akan muncul setelah transaksi pemasukan atau pengeluaran tercatat."
 />
 </div>
 ) : (
 <div className="mt-4">
 <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs">
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-1.5">
 <span className="h-2.5 w-2.5 rounded-sm bg-teal" />
 <span className="text-muted-foreground font-medium">Pemasukan:</span>
 <span className="font-bold tabular-nums text-foreground">
 {formatCurrency(totalIncome)}
 </span>
 </div>
 <div className="flex items-center gap-1.5">
 <span className="h-2.5 w-2.5 rounded-sm bg-destructive" />
 <span className="text-muted-foreground font-medium">Pengeluaran:</span>
 <span className="font-bold tabular-nums text-foreground">
 {formatCurrency(totalExpense)}
 </span>
 </div>
 </div>
 </div>

 <ResponsiveContainer width="100%" height={height}>
 <BarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }} barGap={4}>
 <CartesianGrid
 strokeDasharray="3 3"
 stroke="var(--chart-grid)"
 vertical={false}
 />
 <XAxis
 dataKey="month"
 tickLine={false}
 axisLine={false}
 tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
 />
 <YAxis
 tickLine={false}
 axisLine={false}
 tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
 tickFormatter={currencyShort}
 width={72}
 />
 <Tooltip content={<CustomCashFlowTooltip />} />
 <Legend
 verticalAlign="top"
 align="right"
 iconType="square"
 iconSize={8}
 wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
 />
 <Bar
 dataKey="income"
 name="Pemasukan"
 fill="var(--chart-1)"
 radius={[4, 4, 0, 0]}
 maxBarSize={36}
 />
 <Bar
 dataKey="expense"
 name="Pengeluaran"
 fill="var(--chart-3)"
 radius={[4, 4, 0, 0]}
 maxBarSize={36}
 />
 </BarChart>
 </ResponsiveContainer>
 </div>
 )}
 </CardContent>
 </Card>
 );
}
