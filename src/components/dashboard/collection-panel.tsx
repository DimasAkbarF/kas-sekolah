import { cn } from "@/lib/utils";

export interface CollectionRow {
 label: string;
 value: React.ReactNode;
 footnote?: string;
 tone?: "success" | "warning";
}

export interface CountChip {
 label: string;
 value: React.ReactNode;
 tone?: "neutral" | "success" | "warning";
}

interface CollectionPanelProps {
 title: string;
 subtitle?: string;
 rate: number;
 value: React.ReactNode;
 valueLabel: string;
 targetLabel: string;
 target?: React.ReactNode;
 rows: CollectionRow[];
 chips?: CountChip[];
 className?: string;
}

const chipStyles: Record<NonNullable<CountChip["tone"]>, { box: string; label: string }> = {
 neutral: {
 box: "rounded-lg bg-card border border-border shadow-xs",
 label: "text-muted-foreground",
 },
 success: {
 box: "rounded-lg border border-success-line bg-success-soft shadow-xs",
 label: "text-success-ink",
 },
 warning: {
 box: "rounded-lg border border-danger-line bg-danger-soft shadow-xs",
 label: "text-danger-strong-ink",
 },
};

export function CollectionPanel({
 title,
 subtitle,
 rate,
 value,
 valueLabel,
 targetLabel,
 target,
 rows,
 chips,
 className,
}: CollectionPanelProps) {
 return (
 <section
 className={cn(
 "rounded-xl border border-teal-line bg-teal-soft shadow-card flex flex-col overflow-hidden dark:border-border dark:bg-card",
 className,
 )}
 >
 <div className="p-5 sm:p-6">
 <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/60">
 <div className="space-y-0.5 min-w-0">
 <h2 className="text-[11px] font-bold text-foreground">{title}</h2>
 {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
 </div>
 <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-warning-soft border border-warning-line shadow-xs shrink-0">
 {rate.toFixed(1)}%
 </span>
 </div>

 <div className="mt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
 <div>
 <p className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-foreground">
 {value}
 </p>
 <p className="text-xs text-muted-foreground mt-0.5">{valueLabel}</p>
 </div>
 {target && (
 <p className="text-xs text-muted-foreground tabular-nums">
 {targetLabel}:{""}
 <span className="font-semibold text-foreground">{target}</span>
 </p>
 )}
 </div>

 <div className="mt-4 h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
 <div
 className="h-full bg-teal transition-all duration-500 rounded-full dark:bg-primary"
 style={{ width: `${Math.min(Math.max(rate, 0), 100)}%` }}
 />
 </div>
 </div>

 <div className="px-5 sm:px-6 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
 {rows.map((row) => {
 const isSuccess = row.tone !== "warning";
 return (
 <div
 key={row.label}
 className={cn(
 "rounded-lg border p-3 flex items-center justify-between gap-3 shadow-xs",
 isSuccess ? "border-success-line bg-success-soft" : "border-danger-line bg-danger-soft",
 )}
 >
 <div className="min-w-0">
 <p className={cn("text-xs font-medium", isSuccess ? "text-success-ink" : "text-danger-strong-ink")}>
 {row.label}
 </p>
 {row.footnote && <p className="text-xs text-muted-foreground mt-0.5">{row.footnote}</p>}
 </div>
 <span className="text-sm font-bold tabular-nums text-foreground shrink-0">{row.value}</span>
 </div>
 );
 })}
 </div>

 {chips && chips.length > 0 && (
 <div className="mt-auto px-5 sm:px-6 pb-5 sm:pb-6 grid grid-cols-3 gap-2.5">
 {chips.map((chip) => {
 const style = chipStyles[chip.tone ?? "neutral"];
 return (
 <div key={chip.label} className={cn("p-2.5", style.box)}>
 <span className={cn("text-xs font-semibold block", style.label)}>{chip.label}</span>
 <span className="text-base font-bold tabular-nums text-foreground mt-0.5 block">
 {chip.value}
 </span>
 </div>
 );
 })}
 </div>
 )}
 </section>
 );
}
