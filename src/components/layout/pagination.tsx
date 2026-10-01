"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const PAGE_SIZE = 20;

interface PaginationProps {
 page: number;
 pageCount: number;
 total: number;
 onPageChange: (page: number) => void;
 className?: string;
 label?: string;
}

// Paginasi sisi klien untuk daftar yang sudah termuat di store. Sengaja tanpa
// state sendiri: pemanggil yang pegang `page` supaya bisa mereset ke halaman 1
// saat filter berubah.
export function Pagination({
 page,
 pageCount,
 total,
 onPageChange,
 className,
 label = "baris",
}: PaginationProps) {
 if (pageCount <= 1) {
 return total > 0 ? (
 <p className={cn("px-1 pt-3 text-xs text-muted-foreground tabular-nums", className)}>
 {total} {label}
 </p>
 ) : null;
 }

 const from = (page - 1) * PAGE_SIZE + 1;
 const to = Math.min(page * PAGE_SIZE, total);

 return (
 <div className={cn("flex flex-wrap items-center justify-between gap-2 pt-3", className)}>
 <p className="text-xs text-muted-foreground tabular-nums">
 {from}-{to} dari {total} {label}
 </p>
 <div className="flex items-center gap-1">
 <Button
 size="icon-sm"
 variant="outline"
 disabled={page <= 1}
 onClick={() => onPageChange(page - 1)}
 aria-label="Halaman sebelumnya"
 title="Halaman sebelumnya"
 >
 <ChevronLeft className="h-4 w-4" />
 </Button>
 <span className="px-2 text-xs tabular-nums text-muted-foreground">
 {page} / {pageCount}
 </span>
 <Button
 size="icon-sm"
 variant="outline"
 disabled={page >= pageCount}
 onClick={() => onPageChange(page + 1)}
 aria-label="Halaman berikutnya"
 title="Halaman berikutnya"
 >
 <ChevronRight className="h-4 w-4" />
 </Button>
 </div>
 </div>
 );
}
