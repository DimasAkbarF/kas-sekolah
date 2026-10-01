import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatSummaryVariant =
 | "default"
 | "primary"
 | "secondary"
 | "gold"
 | "coral"
 | "cream"
 | "sky"
 | "info"
 | "success"
 | "warning"
 | "destructive";

interface StatSummaryProps {
 label: string;
 value: React.ReactNode;
 description?: string;
 trend?: "up" | "down" | "neutral";
 icon?: React.ReactNode;
 variant?: StatSummaryVariant;
 className?: string;
}

/* Dark: kartu tetap netral (bg-card + border) dan warna hanya pindah ke ikon,
   label, dan angka. Kartu yang ikut warna ikon membuat seluruh dashboard
   berwarna dan hierarchy-nya hilang. Nilai warna terang tidak pernah jadi
   latar kartu; di dark hanya tinted semantic surface. */
const variantStyles: Record<
  StatSummaryVariant,
  {
    card: string;
    label: string;
    value: string;
    description: string;
    icon: string;
  }
> = {
  primary: {
    card:
      "border-teal-dark bg-teal text-white shadow-teal-sm dark:border-teal-line dark:bg-card",
    label: "text-primary-foreground/90 font-bold text-[11px] dark:text-teal-ink",
    value: "text-white font-extrabold dark:text-foreground",
    description: "text-primary-foreground/75 dark:text-muted-foreground",
    icon: "bg-primary/25 border-primary/40 text-primary-foreground dark:bg-teal-soft dark:border-teal-line dark:text-teal-ink",
  },
  secondary: {
    card: "border-teal-line bg-teal-soft text-foreground shadow-xs dark:border-border dark:bg-card",
    label: "text-teal-ink font-bold text-[11px]",
    value: "text-foreground font-bold",
    description: "text-teal-ink/80 dark:text-muted-foreground",
    icon: "border-teal-line dark:bg-teal-soft dark:border-teal-line dark:text-teal-ink",
  },
  gold: {
    card:
      "border-warning-line bg-warning-soft text-warning-ink shadow-gold-sm dark:border-border dark:bg-card dark:text-foreground",
    label: "text-warning-ink font-bold text-[11px]",
    value: "text-warning-ink font-extrabold dark:text-foreground",
    description: "text-warning-ink/80 dark:text-muted-foreground",
    icon: "bg-warning-soft border-warning-line text-warning-ink",
  },
  coral: {
    card:
      "border-danger-line bg-danger-soft text-danger-strong-ink shadow-coral-sm dark:border-border dark:bg-card dark:text-foreground",
    label: "text-danger-ink font-bold text-[11px]",
    value: "text-danger-strong-ink font-extrabold dark:text-foreground",
    description: "text-danger-ink/85 dark:text-muted-foreground",
    icon: "bg-danger-soft border-danger-line text-danger-ink",
  },
  warning: {
    card:
      "border-danger-line bg-danger-soft text-danger-strong-ink shadow-coral-sm dark:border-border dark:bg-card dark:text-foreground",
    label: "text-danger-ink font-bold text-[11px]",
    value: "text-danger-strong-ink font-extrabold dark:text-foreground",
    description: "text-danger-ink/85 dark:text-muted-foreground",
    icon: "bg-danger-soft border-danger-line text-danger-ink",
  },
  destructive: {
    card:
      "border-danger-line bg-danger-soft text-danger-strong-ink shadow-coral-sm dark:border-border dark:bg-card dark:text-foreground",
    label: "text-danger-ink font-bold text-[11px]",
    value: "text-danger-strong-ink font-extrabold dark:text-foreground",
    description: "text-danger-ink/85 dark:text-muted-foreground",
    icon: "bg-danger-soft border-danger-line text-danger-ink",
  },
  success: {
    card:
      "border-success-line bg-success-soft text-success-ink shadow-xs dark:border-border dark:bg-card dark:text-foreground",
    label: "text-success-ink font-bold text-[11px]",
    value: "text-success-ink font-bold dark:text-foreground",
    description: "text-success-ink/80 dark:text-muted-foreground",
    icon: "bg-success-soft border-success-line text-success-ink",
  },
  sky: {
    card:
      "border-info-line bg-info-soft text-info-ink shadow-xs dark:border-border dark:bg-card dark:text-foreground",
    label: "text-info-ink font-bold text-[11px]",
    value: "text-info-ink font-bold dark:text-foreground",
    description: "text-info-ink/80 dark:text-muted-foreground",
    icon: "bg-info-soft border-info-line text-info-ink",
  },
  info: {
    card:
      "border-info-line bg-info-soft text-info-ink shadow-xs dark:border-border dark:bg-card dark:text-foreground",
    label: "text-info-ink font-bold text-[11px]",
    value: "text-info-ink font-bold dark:text-foreground",
    description: "text-info-ink/80 dark:text-muted-foreground",
    icon: "bg-info-soft border-info-line text-info-ink",
  },
  cream: {
    card: "border-cream-line bg-cream text-cream-ink shadow-xs dark:border-border dark:bg-card dark:text-foreground",
    label: "text-cream-ink font-bold text-[11px] dark:text-gold-light",
    value: "text-cream-ink font-bold dark:text-foreground",
    description: "text-cream-ink/80 dark:text-muted-foreground",
    icon: "bg-cream border-cream-line text-cream-ink dark:bg-warning-soft dark:border-warning-line dark:text-gold-light",
  },
  default: {
    card: "border-border bg-card text-foreground shadow-card hover:border-teal-line",
    label: "text-muted-foreground font-semibold text-[11px]",
    value: "text-foreground font-bold",
    description: "text-muted-foreground",
    icon: "bg-neutral-soft border-neutral-line",
  },
};

export function StatSummary({
 label,
 value,
 description,
 trend,
 icon,
 variant = "default",
 className,
}: StatSummaryProps) {
 const styles = variantStyles[variant];

 return (
 <Card className={cn("rounded-xl border transition-all", styles.card, className)}>
 <CardContent className="p-5">
 <div className="flex items-center justify-between gap-3">
 <p className={cn("", styles.label)}>{label}</p>
 {icon && (
 <span
 className={cn(
 "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
 styles.icon,
 )}
 >
 {icon}
 </span>
 )}
 </div>
 <p className={cn("mt-3 text-2xl tabular-nums tracking-tight", styles.value)}>{value}</p>
 {(description || trend) && (
 <div className={cn("mt-1.5 flex items-center gap-1.5 text-xs", styles.description)}>
 {description && <span>{description}</span>}
 </div>
 )}
 </CardContent>
 </Card>
 );
}
