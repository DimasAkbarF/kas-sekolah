import { Skeleton } from "@/components/ui/skeleton";

export function StatCardsSkeleton() {
 return (
 <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
 {Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="rounded-lg border border-border bg-card shadow-sm p-4">
 <Skeleton className="h-3 w-24" />
 <Skeleton className="mt-2.5 h-7 w-28" />
 </div>
 ))}
 </div>
 );
}

export function MoneyCardsSkeleton() {
 return (
 <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
 {Array.from({ length: 3 }).map((_, i) => (
 <div key={i} className="rounded-lg border border-border bg-card shadow-sm p-4">
 <Skeleton className="h-3 w-28" />
 <Skeleton className="mt-2.5 h-7 w-32" />
 </div>
 ))}
 </div>
 );
}

export function ChartCardSkeleton() {
 return (
 <div className="rounded-lg border border-border bg-card shadow-sm p-4">
 <Skeleton className="h-3 w-40" />
 <Skeleton className="mt-4 h-[220px] w-full rounded-md" />
 </div>
 );
}

export function ChartGridSkeleton() {
 return (
 <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
 <div className="lg:col-span-2">
 <ChartCardSkeleton />
 </div>
 <ChartCardSkeleton />
 <ChartCardSkeleton />
 </div>
 );
}
