import React from "react";
import { cn } from "@/lib/utils";

export type PageAccent =
 | "teal"
 | "gold"
 | "coral"
 | "sky"
 | "blue"
 | "indigo"
 | "violet"
 | "emerald"
 | "rose"
 | "cyan"
 | "slate";

const accentStyles: Record<PageAccent, { iconWrapper: string; badge: string }> = {
 teal: {
 iconWrapper: "bg-teal-soft border-teal-line text-teal-ink",
 badge: "bg-teal-soft border-teal-line text-teal-ink",
 },
 gold: {
 iconWrapper: "bg-warning-soft border-warning-line text-warning-ink",
 badge: "bg-warning-soft border-warning-line text-warning-ink",
 },
 coral: {
 iconWrapper: "bg-danger-soft border-danger-line text-danger-ink",
 badge: "bg-danger-soft border-danger-line text-danger-ink",
 },
 sky: {
 iconWrapper: "bg-info-soft border-info-line text-info-ink",
 badge: "bg-info-soft border-info-line text-info-ink",
 },
 blue: {
 iconWrapper: "bg-teal-soft border-teal-line text-teal-ink",
 badge: "bg-teal-soft border-teal-line text-teal-ink",
 },
 indigo: {
 iconWrapper: "bg-teal-soft border-teal-line text-teal-ink",
 badge: "bg-teal-soft border-teal-line text-teal-ink",
 },
 violet: {
 iconWrapper: "bg-warning-soft border-warning-line text-warning-ink",
 badge: "bg-warning-soft border-warning-line text-warning-ink",
 },
 emerald: {
 iconWrapper: "bg-success-soft border-success-line text-success-ink",
 badge: "bg-success-soft border-success-line text-success-ink",
 },
 rose: {
 iconWrapper: "bg-danger-soft border-danger-line text-danger-ink",
 badge: "bg-danger-soft border-danger-line text-danger-ink",
 },
 cyan: {
 iconWrapper: "bg-info-soft border-info-line text-info-ink",
 badge: "bg-info-soft border-info-line text-info-ink",
 },
 slate: {
 iconWrapper: "bg-neutral-soft border-neutral-line text-neutral-ink",
 badge: "bg-neutral-soft border-neutral-line text-neutral-ink",
 },
};

interface PageHeaderProps {
 title: string;
 subtitle?: string;
 icon?: React.ReactNode;
 badge?: React.ReactNode;
 accent?: PageAccent;
 action?: React.ReactNode;
 children?: React.ReactNode;
 className?: string;
}

export function PageHeader({
 title,
 subtitle,
 icon,
 badge,
 accent = "blue",
 action,
 children,
 className,
}: PageHeaderProps) {
 const currentAccent = accentStyles[accent] || accentStyles.blue;

 return (
 <div
 className={cn(
 "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/70",
 className,
 )}
 >
 <div className="flex items-start gap-3 min-w-0">
 {icon && (
 <span
 className={cn(
 "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-2xs mt-0.5",
 currentAccent.iconWrapper,
 )}
 >
 {icon}
 </span>
 )}
 <div className="min-w-0">
 <div className="flex items-center gap-2.5 flex-wrap">
 <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
 {badge && (
 <span
 className={cn(
 "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
 currentAccent.badge,
 )}
 >
 {badge}
 </span>
 )}
 </div>
 {subtitle && (
 <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
 )}
 </div>
 </div>

 {(action || children) && (
 <div className="flex items-center gap-2.5 shrink-0 flex-wrap pt-1 sm:pt-0">
 {action}
 {children}
 </div>
 )}
 </div>
 );
}
