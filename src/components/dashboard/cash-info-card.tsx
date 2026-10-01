import { cn } from "@/lib/utils";

export interface CashInfoItem {
 label: string;
 value: React.ReactNode;
 icon?: React.ReactNode;
 footnote?: string;
 tone?: "neutral" | "primary" | "success" | "warning" | "destructive" | "gold" | "sky";
}

interface CashInfoCardProps {
 title: string;
 items: CashInfoItem[];
 className?: string;
}

const toneIconStyles: Record<NonNullable<CashInfoItem["tone"]>, string> = {
  neutral: "bg-neutral-soft border-neutral-line text-neutral-ink",
  primary: "bg-teal-soft border-teal-line text-teal-ink",
  success: "bg-success-soft border-success-line text-success-ink",
  warning: "bg-danger-soft border-danger-line text-destructive dark:text-danger-ink",
  destructive: "bg-danger-soft border-danger-line text-destructive dark:text-danger-ink",
  gold: "bg-warning-soft border-warning-line text-warning-ink",
  sky: "bg-info-soft border-info-line text-info-ink",
};

export function CashInfoCard({ title, items, className }: CashInfoCardProps) {
 return (
 <section
 className={cn(
 "rounded-xl border border-border bg-card shadow-card flex flex-col overflow-hidden",
 className,
 )}
 >
 <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-2">
 <h2 className="text-[11px] font-bold text-muted-foreground">{title}</h2>
 </div>
      {/* Baris di dalam kartu: tanpa border dan tanpa latar sendiri. Sebelumnya
          tiap baris punya `border` + `bg-card`, jadi di light mode (induk dan
          anak sama-sama #FFFFFF) hasilnya kotak berborder di dalam kotak
          berborder. Sekarang pemisah tugasnya `divide-y`, satu garis tipis. */}
      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-1 divide-y divide-border">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 py-3 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {item.icon && (
                <span
                  className={cn(
                    "h-7 w-7 shrink-0 rounded-md border flex items-center justify-center",
                    toneIconStyles[item.tone ?? "neutral"],
                  )}
                >
                  {item.icon}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-muted-foreground">{item.label}</p>
                {item.footnote && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.footnote}</p>
                )}
              </div>
            </div>
            <span className="text-base font-bold tabular-nums text-foreground shrink-0">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
