import { Skeleton } from '@/components/ui/skeleton';
export function PageLoading() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-4 p-6">
      <span className="sr-only">Loading page…</span>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
