import { Skeleton } from "@/components/ui/skeleton";

// Skeleton route-level untuk `loading.tsx`. Satu bentuk untuk semua halaman
// supaya transisi navigasi terasa konsisten (tidak ada kedipan kosong).
export function PageSkeleton() {
 return (
 <div className="space-y-6" aria-busy="true" aria-live="polite">
 <span className="sr-only">Memuat halaman…</span>
 <div className="space-y-2">
 <Skeleton className="h-7 w-56" />
 <Skeleton className="h-4 w-80" />
 </div>
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
 {Array.from({ length: 4 }).map((_, i) => (
 <Skeleton key={i} className="h-28 w-full rounded-xl" />
 ))}
 </div>
 <Skeleton className="h-72 w-full rounded-xl" />
 </div>
 );
}
