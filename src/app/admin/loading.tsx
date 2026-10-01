import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function Loading() {
 return (
 <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
 <PageSkeleton />
 </div>
 );
}
