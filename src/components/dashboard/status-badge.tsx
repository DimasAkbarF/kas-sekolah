"use client";

import { cn } from "@/lib/utils";
import type { TransactionStatus, BillStatus } from "@/types";
import { useI18n } from "@/hooks/use-i18n";
import type { TKey } from "@/lib/i18n";

interface StatusBadgeProps {
 status: TransactionStatus | BillStatus;
 className?: string;
}

const TRANSACTION_STATUSES: TransactionStatus[] = [
 "PENDING",
 "PAID",
 "FAILED",
 "EXPIRED",
 "CANCELLED",
];

const billStatusLabelKey: Record<BillStatus, TKey> = {
 active: "status.active",
 inactive: "status.inactive",
 expired: "status.expired",
};

const transactionStatusLabelKey: Record<TransactionStatus, TKey> = {
 PENDING: "status.pending",
 PAID: "status.paid",
 FAILED: "status.failed",
 EXPIRED: "status.expired",
 CANCELLED: "status.cancelled",
};

// Flip7 tactile pill styles with clear WCAG AA contrast
const statusStyles: Record<string, { badge: string; dot: string }> = {
 PAID: {
 badge: "bg-teal-soft border-teal-line",
 dot: "bg-teal",
 },
 active: {
 badge: "bg-teal-soft border-teal-line",
 dot: "bg-teal",
 },
 PENDING: {
 badge: "bg-danger-soft border-danger-line",
 dot: "bg-destructive",
 },
 FAILED: {
 badge: "bg-danger-strong-soft border-danger-strong-line",
 dot: "bg-danger-ink",
 },
 EXPIRED: {
 badge: "bg-neutral-soft border-neutral-line",
 dot: "bg-neutral-ink",
 },
 CANCELLED: {
 badge: "bg-neutral-soft border-neutral-line",
 dot: "bg-neutral-ink",
 },
 inactive: {
 badge: "bg-neutral-soft border-neutral-line",
 dot: "bg-neutral-ink",
 },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
 const { t } = useI18n();
 const isTransaction = TRANSACTION_STATUSES.includes(status as TransactionStatus);
 const labelKey = isTransaction
 ? transactionStatusLabelKey[status as TransactionStatus]
 : billStatusLabelKey[status as BillStatus];

  const currentStyle = statusStyles[status] || {
    badge: "bg-neutral-soft text-neutral-ink border-neutral-line",
    dot: "bg-neutral-ink",
  };

 return (
 <span
 className={cn(
 "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
 currentStyle.badge,
 className,
 )}
 >
 <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", currentStyle.dot)} />
 {t(labelKey)}
 </span>
 );
}
