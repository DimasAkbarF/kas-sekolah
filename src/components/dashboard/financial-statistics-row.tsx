"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AnimatedMoney } from "@/components/dashboard/animated-money";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { Wallet, TrendingUp, TrendingDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialStatisticsRowProps {
 saldo: number;
 pemasukan: number;
 pengeluaran: number;
 totalStudents: number;
 paidStudents?: number;
 unpaidStudents?: number;
 className?: string;
}

export function FinancialStatisticsRow({
 saldo,
 pemasukan,
 pengeluaran,
 totalStudents,
 paidStudents = 0,
 unpaidStudents = 0,
 className,
}: FinancialStatisticsRowProps) {
 const items = [
 {
 label: "Saldo Kas",
 value: <AnimatedMoney value={saldo} />,
 footnote: "Kas tersedia saat ini",
 icon: <Wallet className="h-4 w-4" />,
 tone: "teal",
 },
 {
 label: "Total Pemasukan",
 value: <AnimatedMoney value={pemasukan} />,
 footnote: "Akumulasi dana terkumpul",
 icon: <TrendingUp className="h-4 w-4" />,
 tone: "emerald",
 },
 {
 label: "Total Pengeluaran",
 value: <AnimatedMoney value={pengeluaran} />,
 footnote: "Pengeluaran kas tercatat",
 icon: <TrendingDown className="h-4 w-4" />,
 tone: "coral",
 },
 {
 label: "Total Siswa",
 value: (
 <>
 <AnimatedNumber value={totalStudents} locales="id-ID" />
 {""}
 <span className="text-sm font-semibold text-muted-foreground">Siswa</span>
 </>
 ),
 footnote: `${paidStudents} lunas • ${unpaidStudents} belum`,
 icon: <Users className="h-4 w-4" />,
 tone: "sky",
 },
 ];

  // Warna hanya pada icon box. Kartu tetap netral supaya empat statistik ini
  // tidak berubah jadi empat warna berbeda.
  const toneStyles = {
    teal: {
      icon: "bg-teal-soft text-teal-ink border-teal-line",
      borderHover: "hover:border-primary/40",
    },
    emerald: {
      icon: "bg-success-soft text-success-ink border-success-line",
      borderHover: "hover:border-success/40",
    },
    coral: {
      icon: "bg-danger-soft text-danger-ink border-danger-line",
      borderHover: "hover:border-destructive/40",
    },
    sky: {
      icon: "bg-info-soft text-info-ink border-info-line",
      borderHover: "hover:border-info/40",
    },
  };

 return (
 <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4", className)}>
 {items.map((item) => {
 const style = toneStyles[item.tone as keyof typeof toneStyles];
 return (
 <Card
 key={item.label}
 className={cn(
 "rounded-xl border border-border bg-card shadow-card transition-all duration-150 p-4 sm:p-5",
 style.borderHover,
 )}
 >
 <CardContent className="p-0">
 <div className="flex items-center justify-between gap-2">
 <span className="text-[11px] font-bold text-muted-foreground truncate">{item.label}</span>
 <span
 className={cn(
 "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
 style.icon,
 )}
 >
 {item.icon}
 </span>
 </div>
 <p className="mt-3 text-lg sm:text-2xl font-extrabold tracking-tight tabular-nums text-foreground">
 {item.value}
 </p>
 <p className="mt-1 text-xs text-muted-foreground truncate">{item.footnote}</p>
 </CardContent>
 </Card>
 );
 })}
 </div>
 );
}
