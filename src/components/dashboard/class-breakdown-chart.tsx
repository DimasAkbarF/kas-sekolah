"use client";

import { useState } from "react";
import {
 Bar,
 BarChart,
 CartesianGrid,
 Cell,
 ResponsiveContainer,
 Tooltip,
 XAxis,
 YAxis,
} from "recharts";
import { CHART_DANGER, CHART_GRID } from "@/lib/chart-utils";
import { formatCurrency } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartTooltip } from "./chart-tooltip";
import { EmptyState } from "./empty-state";
import type { ClassBreakdown } from "@/lib/calculations";

interface ClassBreakdownChartProps {
 rows: ClassBreakdown[];
 title: string;
 emptyTitle: string;
 emptyDesc: string;
 labels: {
  outstanding: string;
  paid: string;
  students: string;
  rate: string;
 };
 className?: string;
}

/**
 * Tunggakan kas per kelas.
 *
 * Bar horizontal, bukan vertikal: nama kelas lebih mudah dibaca mendatar, dan
 * daftar kelas bisa panjang tanpa memotong label sumbu.
 *
 * Panjang bar = tunggakan (bukan persen), karena kepala sekolah Needs follow-up
 * by nominal: kelas 10% dari 500 ribu lebih Urgent dari kelas 90% dari 50 ribu.
 * Persen lunas tersedia di tooltip, jadi dua metrik tidak berebut sumbu yang
 * sama.
 */
export function ClassBreakdownChart({
 rows,
 title,
 emptyTitle,
 emptyDesc,
 labels,
 className,
}: ClassBreakdownChartProps) {
 // Bar yang sedang disorot lewat hover keyboard/layar sentuh. Tidak menyimpan
 // state lain: recharts sudah menangani animasi bar-nya.
 const [activeId, setActiveId] = useState<string | null>(null);

 if (rows.length === 0) {
  return (
   <Card className={className}>
    <CardHeader className="pb-2">
     <CardTitle className="text-sm font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
     <EmptyState title={emptyTitle} description={emptyDesc} />
    </CardContent>
   </Card>
  );
 }

 // recharts butuh tinggi eksplisit per jumlah bar supaya label tidak saling
 // tumpang tindih. 34px per bar + tinggi minimum yang masih enak dibaca.
 const height = Math.max(rows.length * 34, 160);

 return (
  <Card className={className}>
   <CardHeader className="pb-2">
    <CardTitle className="text-sm font-medium">{title}</CardTitle>
   </CardHeader>
   <CardContent className="pt-0">
    <div style={{ height }}>
     <ResponsiveContainer width="100%" height="100%">
      <BarChart
       data={rows}
       layout="vertical"
       margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
       barCategoryGap={8}
      >
       <CartesianGrid
        strokeDasharray="3 3"
        stroke={CHART_GRID}
        horizontal={false}
       />
       <XAxis
        type="number"
        tickLine={false}
        axisLine={false}
        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        tickFormatter={(v: number) => formatCurrency(Number(v))}
       />
       <YAxis
        type="category"
        dataKey="className"
        tickLine={false}
        axisLine={false}
        width={104}
        tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
       />
       <Tooltip
        cursor={{ fill: "var(--muted)", opacity: 0.4 }}
        content={({ active, payload }) => {
         if (!active || !payload?.length) return null;
         const row = payload[0].payload as ClassBreakdown;
         return (
          <ChartTooltip
           title={row.className}
           rows={[
            { label: labels.outstanding, value: formatCurrency(row.outstanding) },
            { label: labels.paid, value: formatCurrency(row.paid) },
            { label: labels.rate, value: `${row.rate.toFixed(1)}%` },
            { label: labels.students, value: String(row.studentCount) },
           ]}
          />
         );
        }}
       />
       {/* Warna ikut status, bukan dekoratif: kelas dengan tunggakan paling
           besar diberi destructive, sisanya naik ke coral lalu teal. Satu
           sumbu warna, bukan palet acak per bar. */}
       <Bar
        dataKey="outstanding"
        radius={[0, 4, 4, 0]}
        onMouseEnter={(_: unknown, index: number) =>
         setActiveId(rows[index]?.classId ?? null)
        }
        onMouseLeave={() => setActiveId(null)}
       >
        {rows.map((row, i) => (
         <Cell
          key={row.classId}
          fill={tierColor(i, rows.length)}
          fillOpacity={
           activeId === null || activeId === row.classId
            ? 0.55 + 0.45 * (1 - i / Math.max(rows.length, 1))
            : 0.3
          }
         />
        ))}
       </Bar>
      </BarChart>
     </ResponsiveContainer>
    </div>
   </CardContent>
  </Card>
 );
}

/**
 * Tunggangan terbesar = coral, tunggakan terkecil = teal. Penuvesan pakai
 * opasitas, bukan gradasi warna, supaya tetap terbaca di light dan dark.
 */
function tierColor(index: number, total: number): string {
 const ratio = total <= 1 ? 1 : index / (total - 1);
 return ratio > 0.66 ? CHART_DANGER : ratio > 0.33 ? "var(--warning)" : "var(--chart-1)";
}

/** Diekspor supaya bisa diuji tanpa merender recharts. */
export const __tierColor = tierColor;
