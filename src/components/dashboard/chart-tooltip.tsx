import { cn } from "@/lib/utils";

interface TooltipRow {
 label: string;
 value: string;
}

export interface ChartTooltipProps {
 title: string;
 rows: TooltipRow[];
 className?: string;
}

/**
 * Tooltip chart yang mengikuti tema.
 *
 * Dipakai sebagai isi prop `content` recharts. Tanpa ini recharts memakai
 * tooltip bawaan: kotak putih polos dengan teks hitam, yang di dark mode
 * menjadi satu-satunya permukaan terang di layar dan menutupi token yang
 * sudah painstaking diurus.
 */
export function ChartTooltip({ title, rows, className }: ChartTooltipProps) {
 return (
 <div
 className={cn(
  "rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md",
  className,
 )}
 >
 <p className="font-medium text-foreground">{title}</p>
 <dl className="mt-1.5 space-y-0.5">
  {rows.map((row) => (
   <div key={row.label} className="flex items-center gap-2">
    <dt className="text-muted-foreground">{row.label}</dt>
    <dd className="font-semibold tabular-nums text-foreground">{row.value}</dd>
   </div>
  ))}
 </dl>
 </div>
 );
}

interface LegendItem {
 label: string;
 color: string;
}

/**
 * Legenda yang bisa diklik untuk menyembunyikan/munculkan seri. recharts sudah
 * mendukung toggle lewat `onClick`, tapi tanpa `cursor-pointer` dan tanpa
 * `aria-pressed` aksi tersebut tidak terbaca sebagai interaksi.
 */
export function ChartLegend({
 items,
 hidden,
 onToggle,
 className,
}: {
 items: LegendItem[];
 hidden: Set<string>;
 onToggle: (label: string) => void;
 className?: string;
}) {
 return (
 <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", className)}>
  {items.map((item) => {
   const isHidden = hidden.has(item.label);
   return (
    <li key={item.label}>
     <button
      type="button"
      onClick={() => onToggle(item.label)}
      aria-pressed={!isHidden}
      className={cn(
       "flex cursor-pointer items-center gap-1.5 text-xs transition-opacity",
       "hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
       isHidden && "opacity-40 line-through",
      )}
     >
      <span
       aria-hidden="true"
       className="h-2.5 w-2.5 shrink-0 rounded-sm"
       style={{ backgroundColor: item.color }}
      />
      {item.label}
     </button>
    </li>
   );
  })}
 </ul>
 );
}
