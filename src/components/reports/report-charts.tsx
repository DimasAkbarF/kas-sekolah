"use client";

import { useMemo } from "react";
import {
 Area,
 AreaChart,
 Bar,
 BarChart,
 CartesianGrid,
 Pie,
 PieChart,
 ResponsiveContainer,
 Tooltip,
 XAxis,
 YAxis,
 Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatCompactCurrency } from "@/lib/formatters";
import { CHART_SUCCESS, CHART_DANGER, CHART_PRIMARY } from "@/lib/chart-utils";
import { useI18n } from "@/hooks/use-i18n";
import type { ReportData } from "@/services/reports.service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TooltipValue = any;

function currencyLabel(value: TooltipValue, name: TooltipValue): [string, string] {
 return [formatCurrency(Number(value)), String(name)];
}

function EmptyChart({ title, text }: { title: string; text: string }) {
 return (
 <div className="flex h-[220px] items-center justify-center rounded-md bg-muted/30">
 <div className="text-center">
 <p className="text-sm font-medium text-foreground">{title}</p>
 <p className="mt-1 text-xs text-muted-foreground">{text}</p>
 </div>
 </div>
 );
}

export function ReportCharts({ data }: { data: ReportData }) {
 const { t } = useI18n();
 const statusTotal = useMemo(
 () => data.billStatus.reduce((sum, s) => sum + s.value, 0),
 [data.billStatus],
 );
 const hasCashflow = data.cashflow.length > 0;
 const hasBars = data.cashflowBars.some((b) => b.value !== 0);

 return (
 <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
 <Card className="border-border/70 shadow-xs lg:col-span-2">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium">{t("reports.cashflowTrend")}</CardTitle>
 </CardHeader>
 <CardContent className="pt-0">
 {hasCashflow ? (
 <div className="h-[260px]">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={data.cashflow} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
 <defs>
 <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor={CHART_SUCCESS} stopOpacity={0.25} />
 <stop offset="95%" stopColor={CHART_SUCCESS} stopOpacity={0} />
 </linearGradient>
 <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor={CHART_DANGER} stopOpacity={0.25} />
 <stop offset="95%" stopColor={CHART_DANGER} stopOpacity={0} />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
 <XAxis dataKey="label" className="text-xs" tickLine={false} axisLine={false} />
 <YAxis
 className="text-xs"
 tickLine={false}
 axisLine={false}
 tickFormatter={(v: number) => formatCompactCurrency(v)}
 width={72}
 />
 <Tooltip formatter={currencyLabel} />
 <Area
 type="monotone"
 dataKey="income"
 name={t("income.title")}
 stroke={CHART_SUCCESS}
 fill="url(#incomeFill)"
 strokeWidth={2}
 />
 <Area
 type="monotone"
 dataKey="expense"
 name={t("expenses.title")}
 stroke={CHART_DANGER}
 fill="url(#expenseFill)"
 strokeWidth={2}
 />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 ) : (
 <EmptyChart title={t("reports.chartNoData")} text={t("reports.chartNoCashflow")} />
 )}
 </CardContent>
 </Card>

 <Card className="border-border/70 shadow-xs">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium">{t("reports.csvBillStatus")}</CardTitle>
 </CardHeader>
 <CardContent className="pt-0">
 {statusTotal > 0 ? (
 <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
 <div className="relative h-[180px] w-full max-w-[180px]">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={data.billStatus}
 dataKey="value"
 nameKey="name"
 innerRadius={52}
 outerRadius={80}
 paddingAngle={2}
 strokeWidth={0}
 >
 <Cell fill={CHART_SUCCESS} />
 <Cell fill={CHART_DANGER} />
 </Pie>
 <Tooltip formatter={currencyLabel} />
 </PieChart>
 </ResponsiveContainer>
 <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
 <p className="text-xl font-semibold tabular-nums">{statusTotal}</p>
 <p className="text-xs text-muted-foreground">{t("students.title")}</p>
 </div>
 </div>
 <ul className="w-full space-y-2 text-sm">
 {data.billStatus.map((slice) => {
 const percent = statusTotal > 0 ? Math.round((slice.value / statusTotal) * 100) : 0;
 const color = slice.name === "Sudah Dibayar" ? CHART_SUCCESS : CHART_DANGER;
 return (
 <li key={slice.name} className="flex items-center justify-between gap-3">
 <span className="flex items-center gap-2">
 <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
 {slice.name === "Sudah Dibayar"
 ? t("dashboard.paidStudents")
 : t("dashboard.unpaidStudents")}
 </span>
 <span className="tabular-nums text-muted-foreground">
 {slice.value} · {percent}%
 </span>
 </li>
 );
 })}
 </ul>
 </div>
 ) : (
 <EmptyChart title={t("reports.chartNoData")} text={t("reports.chartNoBills")} />
 )}
 </CardContent>
 </Card>

 <Card className="border-border/70 shadow-xs">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium">{t("reports.cashflowSummary")}</CardTitle>
 </CardHeader>
 <CardContent className="pt-0">
 {hasBars ? (
 <div className="h-[220px]">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={data.cashflowBars} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
 <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
 <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
 <YAxis
 className="text-xs"
 tickLine={false}
 axisLine={false}
 tickFormatter={(v: number) => formatCompactCurrency(v)}
 width={72}
 />
 <Tooltip formatter={currencyLabel} cursor={{ fill: "transparent" }} />
 <Bar dataKey="value" name={t("th.amount")} radius={[4, 4, 0, 0]} maxBarSize={56}>
 {data.cashflowBars.map((bar) => (
 <Cell
 key={bar.name}
 fill={
 bar.name === "Pemasukan"
 ? CHART_SUCCESS
 : bar.name === "Pengeluaran"
 ? CHART_DANGER
 : CHART_PRIMARY
 }
 />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 ) : (
 <EmptyChart title={t("reports.chartNoData")} text={t("reports.chartNoCashflow")} />
 )}
 </CardContent>
 </Card>
 </div>
 );
}

export default ReportCharts;
