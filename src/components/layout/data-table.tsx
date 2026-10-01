import React from "react";
import { cn } from "@/lib/utils";

/**
 * Permukaan tabel. Tiga halaman punya isi header yang tidak cocok dengan
 * `DataTable` (kolom checkbox, jumlah terpilih) jadi mereka tidak bisa memakai
 * komponennya, tapi WAJIB memakai permukaan yang sama: ini kartu, jadi
 * `rounded-xl` + `border-border`, bukan `rounded-lg` seperti input.
 */
export const tableSurface =
  "overflow-x-auto rounded-xl border border-border bg-card shadow-card";

interface DataTableProps {
  headers: { label: string; align?: "left" | "right" }[];
  children: React.ReactNode;
  className?: string;
}

export function DataTable({ headers, children, className }: DataTableProps) {
  return (
    <div className={cn(tableSurface, className)}>
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-border bg-secondary/30">
 {headers.map((h) => (
 <th
 scope="col"
 key={h.label}
 className={cn(
 "px-4 py-3 text-xs font-semibold text-foreground/80 whitespace-nowrap",
 h.align === "right" ? "text-right" : "text-left",
 )}
 >
 {h.label}
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-border/50">{children}</tbody>
 </table>
 </div>
 );
}
