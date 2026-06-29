import { Skeleton } from "@warisly/ui";

// Shown while the asset registry loads. Mirrors the Aset list layout.
function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-paper-edge px-5 py-4 last:border-0">
      <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="mt-2 h-3 w-28" />
      </div>
      <div className="shrink-0 text-right">
        <Skeleton className="ml-auto h-4 w-20" />
        <Skeleton className="ml-auto mt-2 h-3 w-14" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div aria-busy>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-9 w-1/2" />
      <Skeleton className="mt-3 h-5 w-2/3" />

      <Skeleton className="mt-8 h-6 w-32" />
      <div className="mt-3 overflow-hidden rounded-2xl border border-paper-edge bg-panel">
        {[0, 1, 2, 3].map((i) => <RowSkeleton key={i} />)}
      </div>

      <Skeleton className="mt-8 h-6 w-36" />
      <div className="mt-3 overflow-hidden rounded-2xl border border-paper-edge bg-panel">
        {[0, 1].map((i) => <RowSkeleton key={i} />)}
      </div>
    </div>
  );
}
