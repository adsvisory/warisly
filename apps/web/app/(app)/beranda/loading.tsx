import { Skeleton } from "@warisly/ui";

// Shown while the registry + drafts load. Mirrors the real Beranda layout so the
// page settles in without shifting (no CLS).
export default function Loading() {
  return (
    <div className="pb-8" aria-busy>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-9 w-3/4" />
      <Skeleton className="mt-3 h-5 w-full max-w-[52ch]" />
      <Skeleton className="mt-2 h-5 w-2/3" />

      <div className="frame-stack mt-6 grid gap-4 sm:grid-cols-[1.3fr_1fr]">
        <Skeleton className="h-[124px] rounded-2xl" />
        <Skeleton className="h-[124px] rounded-2xl" />
      </div>

      <Skeleton className="mt-8 h-6 w-44" />
      <div className="mt-3 overflow-hidden rounded-2xl border border-paper-edge bg-panel">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b border-paper-line px-5 py-4 last:border-0">
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
