import { cn } from "@/lib/utils";

export interface OverviewMetric {
 label: string;
 value: React.ReactNode;
 description?: string;
 tone?: "success" | "warning" | "info";
}

interface FinancialOverviewProps {
 label: string;
 period?: string;
 value: React.ReactNode;
 description?: string;
 metrics: OverviewMetric[];
 footerLeft?: string;
 footerRight?: React.ReactNode;
 variant?: "primary" | "default";
 className?: string;
}

/* Light: panel teal penuh, sesuai DESIGN.md. Dark: kartu netral dengan aksen
   teal (angka utama + rail), supaya tetap jadi focal point tanpa membuat satu
   lagi panel besar berwarna. Label sub-metric memakai tinta semantik, bukan
   warna terang di atas teal. */
export function FinancialOverview({
  label,
  period,
  value,
  description,
  metrics,
  footerLeft,
  footerRight,
  variant = "primary",
  className,
}: FinancialOverviewProps) {
  const isPrimary = variant === "primary";

  return (
    <section
      className={cn(
        "rounded-xl overflow-hidden shadow-card transition-colors",
        isPrimary
          ? "border-teal-dark bg-teal text-white shadow-teal-sm dark:bg-card dark:border-teal-line dark:text-foreground"
          : "border border-border bg-card text-foreground",
        className,
      )}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-[11px] font-bold",
              isPrimary ? "text-primary-foreground/90 dark:text-teal-ink" : "text-primary",
            )}
          >
            {label}
          </span>
          {period && (
            <span
              className={cn(
                "text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs",
                isPrimary
                  ? "bg-gold text-gold-ink border border-gold-line dark:bg-warning-soft dark:text-warning-ink dark:border-warning-line"
                  : "text-muted-foreground bg-muted/60 border border-border/50",
              )}
            >
              {period}
            </span>
          )}
        </div>
        <p
          className={cn(
            "mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums",
            isPrimary ? "text-white dark:text-foreground" : "text-foreground",
          )}
        >
          {value}
        </p>
        {description && (
          <p
            className={cn(
              "text-xs mt-1.5",
              isPrimary ? "text-primary-foreground/80 dark:text-muted-foreground" : "text-muted-foreground",
            )}
          >
            {description}
          </p>
        )}
      </div>

      {/* ── Sub-metrics Section (Unified Divider Layout, No Nested Card Clutter) ── */}
      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-2 border-t border-white/15 dark:border-border">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-white/15 dark:divide-border">
          {metrics.map((metric, idx) => {
            const tone = metric.tone ?? "info";
            const labelColor = isPrimary
              ? tone === "success"
                ? "text-teal-light dark:text-teal-ink"
                : tone === "warning"
                  ? "text-danger-strong-ink dark:text-danger-ink"
                  : "text-gold-light dark:text-gold-light"
              : tone === "success"
                ? "text-success-ink"
                : tone === "warning"
                  ? "text-destructive dark:text-danger-ink"
                  : "text-primary dark:text-teal-ink";

            return (
              <div key={metric.label} className={cn("pt-3 sm:pt-0", idx > 0 && "sm:pl-6")}>
                <span className={cn("text-[10.5px] font-bold block", labelColor)}>{metric.label}</span>
                <p
                  className={cn(
                    "mt-1 text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums",
                    isPrimary ? "text-white dark:text-foreground" : "text-foreground",
                  )}
                >
                  {metric.value}
                </p>
                {metric.description && (
                  <p
                    className={cn(
                      "text-[11px] mt-0.5",
                      isPrimary ? "text-white/70 dark:text-muted-foreground" : "text-muted-foreground",
                    )}
                  >
                    {metric.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {(footerLeft || footerRight) && (
        <div
          className={cn(
            "px-5 sm:px-6 py-2.5 border-t flex items-center justify-between gap-2 text-[11px]",
            isPrimary
              ? "border-primary/30 bg-primary/15 text-primary-foreground dark:border-border dark:bg-muted/40 dark:text-muted-foreground"
              : "border-border/50 text-muted-foreground bg-muted/30",
          )}
        >
          <span>{footerLeft}</span>
          {footerRight && (
            <span className={cn("font-semibold", isPrimary ? "text-white dark:text-foreground" : "text-foreground")}>
              {footerRight}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
