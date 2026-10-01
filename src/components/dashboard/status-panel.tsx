"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

export interface StatusSlice {
 name: string;
 value: number;
 color: string;
}

export interface StatusLegendRow {
 label: string;
 value: React.ReactNode;
 footnote?: string;
 tone?: "success" | "warning";
}

interface StatusPanelProps {
 title: string;
 subtitle?: string;
 data: StatusSlice[];
 centerValue: React.ReactNode;
 centerLabel: string;
 legend: StatusLegendRow[];
 footerLeft?: string;
 footerRight?: string;
 className?: string;
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 tooltipFormatter?: (value: any, name: any, ...rest: any[]) => [string, string];
}

export function StatusPanel({
 title,
 subtitle,
 data,
 centerValue,
 centerLabel,
 legend,
 footerLeft,
 footerRight,
 className,
 tooltipFormatter,
}: StatusPanelProps) {
 return (
 <section
 className={cn(
 "rounded-xl border border-border bg-card shadow-card flex flex-col overflow-hidden",
 className,
 )}
 >
 <div className="p-5 sm:p-6">
 <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/50">
 <div className="space-y-0.5 min-w-0">
 <h2 className="text-[11px] font-bold text-muted-foreground">{title}</h2>
 {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
 </div>
 </div>

 <div className="mt-4 flex flex-col items-center gap-4">
 <div className="h-[100px] w-[100px] shrink-0 relative">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={data}
 cx="50%"
 cy="50%"
 innerRadius={32}
 outerRadius={46}
 paddingAngle={3}
 dataKey="value"
 strokeWidth={0}
 >
 {data.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Pie>
 {tooltipFormatter && <Tooltip formatter={tooltipFormatter} />}
 </PieChart>
 </ResponsiveContainer>
 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
 <span className="text-lg font-extrabold tracking-tight text-foreground tabular-nums">
 {centerValue}
 </span>
 <span className="text-xs font-semibold text-muted-foreground r">{centerLabel}</span>
 </div>
 </div>

 <div className="w-full space-y-2">
 {legend.map((row) => {
 const isSuccess = row.tone !== "warning";
 return (
 <div
 key={row.label}
 className={cn(
 "p-2.5 rounded-lg border flex items-center justify-between gap-3 shadow-xs",
 isSuccess ? "border-success-line bg-success-soft" : "border-danger-line bg-danger-soft",
 )}
 >
 <div className="min-w-0">
 <p className={cn("text-xs font-medium", isSuccess ? "text-success-ink" : "text-danger-strong-ink")}>
 {row.label}
 </p>
 {row.footnote && <p className="text-xs text-muted-foreground mt-0.5">{row.footnote}</p>}
 </div>
 <span className="text-sm font-bold tabular-nums text-foreground shrink-0">
 {row.value}
 </span>
 </div>
 );
 })}
 </div>
 </div>
 </div>

 {(footerLeft || footerRight) && (
 <div className="mt-auto px-5 sm:px-6 py-3 border-t border-border/50 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
 <span>{footerLeft}</span>
 {footerRight && <span className="font-medium text-foreground">{footerRight}</span>}
 </div>
 )}
 </section>
 );
}
