import { Skeleton } from "@warisly/ui";

// Shown while owner KYC status loads. Mirrors the Profil card layout.
export default function Loading() {
  return (
    <div className="pb-8" aria-busy>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-9 w-1/2" />

      <div className="mt-6 rounded-2xl border border-paper-edge bg-panel p-6">
        <Skeleton className="h-3 w-28" />
        <div className="mt-3 flex items-center gap-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="mt-4 h-12 w-full rounded-xl" />
      </div>

      <div className="mt-4 rounded-2xl border border-paper-edge bg-panel p-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}
