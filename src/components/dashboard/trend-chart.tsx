"use client";

import { useState } from "react";
import {
 Bar,
 BarChart,
 CartesianGrid,
 ResponsiveContainer,
 Tooltip,
 XAxis,
 YAxis,
} from "recharts";
import {
 CHART_SUCCESS,
 CHART_WARNING,
 CHART_GRID,
} from "@/lib/chart-utils";
import { formatCurrency } from "@/lib/formatters";
import { ChartLegend, ChartTooltip } from "./chart-tooltip";

interface TrendChartProps {
 data: { period: string; paid: number; unpaid: number }[];
 paidName: string;
 unpaidName: string;
 height?: number | "100%";
 compact?: boolean;
}

/**
 * Tren pembayaran: lunas vs belum lunas per periode.
 *
 * Interaksi yang ada di sini sengaja punya tujuan: klik legenda untuk
 * menyembunyikan satu seri supaya perbandingannya tidak tertutup, dan hover
 * untuk angka pastinya. recharts sudah memberi toggle lewat klik legenda;
 * yang belum ada adalah penanda bahwa legendanya bisa diklik, tooltip yang
 * mengikuti tema, dan `aria-pressed` untuk pembaca layar.
 */
export function TrendChart({
 data,
 paidName,
 unpaidName,
 height = 240,
 compact = false,
}: TrendChartProps) {
 const [hidden, setHidden] = useState<Set<string>>(() => new Set());

 function toggle(series: string) {
  setHidden((prev) => {
   const next = new Set(prev);
   if (next.has(series)) next.delete(series);
   else next.add(series);
   return next;
  });
 }

 const series = [
  { key: "paid", label: paidName, color: CHART_SUCCESS },
  { key: "unpaid", label: unpaidName, color: CHART_WARNING },
 ];

 return (
 <div className="flex h-full flex-col">
  <div style={{ height, minHeight: compact ? 160 : undefined }}>
   <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={compact ? undefined : { top: 10, right: 4, bottom: 0, left: 0 }}>
     {compact ? (
      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
     ) : (
      <CartesianGrid
       strokeDasharray="3 3"
       stroke={CHART_GRID}
       vertical={false}
      />
     )}
     <XAxis
      dataKey="period"
      className={compact ? "text-xs" : undefined}
      tickLine={false}
      axisLine={false}
      tick={compact ? undefined : { fontSize: 11, fill: "var(--muted-foreground)" }}
     />
     <YAxis
      tickLine={false}
      axisLine={false}
      className={compact ? "text-xs" : undefined}
      width={compact ? undefined : 86}
      tick={compact ? undefined : { fontSize: 11, fill: "var(--muted-foreground)" }}
     />
     <Tooltip
      cursor={{ fill: "var(--muted)", opacity: 0.4 }}
      content={({ active, payload, label }) => {
       if (!active || !payload?.length) return null;
       const row = payload[0].payload as { paid: number; unpaid: number };
       return (
        <ChartTooltip
         title={String(label)}
         rows={[
          { label: paidName, value: formatCurrency(row.paid) },
          { label: unpaidName, value: formatCurrency(row.unpaid) },
         ]}
        />
       );
      }}
     />
     {series.map((s) => (
      <Bar
       key={s.key}
       dataKey={s.key}
       name={s.label}
       fill={s.color}
       radius={[4, 4, 0, 0]}
       hide={hidden.has(s.key)}
      />
     ))}
    </BarChart>
   </ResponsiveContainer>
  </div>

  <ChartLegend
   className="mt-3"
   items={series}
   hidden={hidden}
   onToggle={(label) => {
    const match = series.find((s) => s.label === label);
    if (match) toggle(match.key);
   }}
  />
 </div>
 );
}
