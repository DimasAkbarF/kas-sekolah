"use client";

import { useId, useMemo } from "react";
import {
 ResponsiveContainer,
 AreaChart,
 Area,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
} from "recharts";
import { AnimatedMoney } from "./animated-money";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

export type ChartVariant = "teal" | "blue" | "emerald" | "gold" | "rose" | "slate";

interface FinanceChartProps {
 title: string;
 data: { time: number; value: number }[];
 color?: string;
 height?: number;
 subtitle?: string;
 variant?: ChartVariant;
 className?: string;
}

const variantColors: Record<ChartVariant, string> = {
 teal: "var(--chart-1)",
 blue: "var(--chart-1)",
 emerald: "var(--chart-2)",
 gold: "var(--chart-3)",
 rose: "var(--destructive)",
 slate: "var(--chart-4)",
};

function currencyFmt(value: number, locale: string): string {
 return new Intl.NumberFormat(locale, {
 style: "currency",
 currency: "IDR",
 maximumFractionDigits: 0,
 }).format(value);
}

function dateFmt(ms: number, locale: string): string {
 return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(ms));
}

function ChartTooltip({
 active,
 payload,
 localeTag,
 name,
}: {
 active?: boolean;
 payload?: { payload: { time: number; value: number } }[];
 localeTag: string;
 name: string;
}) {
 if (!active || !payload || payload.length === 0) return null;
 const row = payload[0].payload;
 return (
 <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
 <div className="font-medium text-foreground">{dateFmt(row.time, localeTag)}</div>
 <div className="mt-1 text-muted-foreground">
 {name}:{""}
 <span className="font-semibold tabular-nums text-foreground">
 {currencyFmt(row.value, localeTag)}
 </span>
 </div>
 </div>
 );
}

export function FinanceChart({
 title,
 data,
 color,
 height = 220,
 subtitle,
 variant = "blue",
 className,
}: FinanceChartProps) {
 const { t, locale } = useI18n();
 const gradientId = useId();
 const localeTag = locale === "en" ? "en-US" : "id-ID";
 const chartColor = color || variantColors[variant] || variantColors.blue;

 const chartData = useMemo(
 () => data.map((d) => ({ time: d.time * 1000, value: d.value })),
 [data],
 );

 const currentValue = useMemo(() => {
 if (data.length === 0) return 0;
 return data[data.length - 1].value;
 }, [data]);

 return (
 <Card
 className={cn(
 "rounded-xl border border-border bg-card shadow-card transition-colors overflow-hidden",
 className,
 )}
 >
 <CardContent className="p-5 sm:p-6">
 <div className="flex items-start justify-between gap-3">
 <div className="space-y-0.5 min-w-0">
 <p className="text-[11px] font-bold text-muted-foreground">{title}</p>
 {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
 </div>
 <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/70 text-muted-foreground border border-border/60 shrink-0">
 <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: chartColor }} />
 {chartData.length} {t("dashboard.periodsRecorded")}
 </span>
 </div>

 <div className="mt-3">
 <AnimatedMoney
 value={currentValue}
 className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-foreground"
 />
 </div>

 <div className="mt-2">
 {chartData.length === 0 ? (
 <div
 className="flex items-center justify-center text-xs text-muted-foreground"
 style={{ height }}
 >
 {t("chart.emptyText")}
 </div>
 ) : (
 <ResponsiveContainer width="100%" height={height}>
 <AreaChart data={chartData} margin={{ top: 12, right: 4, left: 0, bottom: 0 }}>
 <defs>
 <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor={chartColor} stopOpacity={0.14} />
 <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
 </linearGradient>
 </defs>
 <CartesianGrid
 strokeDasharray="3 3"
 stroke="var(--chart-grid)"
 vertical={false}
 />
 <XAxis
 type="number"
 domain={["dataMin", "dataMax"]}
 dataKey="time"
 tickLine={false}
 axisLine={false}
 tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
 tickFormatter={(ms: number) => dateFmt(ms, localeTag)}
 interval="preserveStartEnd"
 />
 <YAxis
 tickLine={false}
 axisLine={false}
 tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
 tickFormatter={(v: number) => currencyFmt(v, localeTag)}
 width={86}
 />
 <Tooltip
 content={<ChartTooltip localeTag={localeTag} name={title} />}
 cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3", strokeOpacity: 0.4 }}
 />
 <Area
 type="monotone"
 dataKey="value"
 name={title}
 stroke={chartColor}
 strokeWidth={2.2}
 fill={`url(#${gradientId})`}
 dot={data.length <= 3}
 activeDot={{ r: 4, stroke: chartColor, strokeWidth: 2, fill: "var(--background)" }}
 />
 </AreaChart>
 </ResponsiveContainer>
 )}
 </div>
 </CardContent>
 </Card>
 );
}
