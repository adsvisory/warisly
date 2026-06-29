import { Skeleton } from "@warisly/ui";

// Shown while the dossier is assembled (assets + playbooks). Mirrors its layout.
export default function Loading() {
  return (
    <div className="pb-12" aria-busy>
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-3 h-9 w-2/3" />
      <Skeleton className="mt-3 h-5 w-full max-w-[52ch]" />

      <div className="mt-6 rounded-2xl border border-paper-edge bg-panel p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-4 h-4 w-3/4" />
        <Skeleton className="mt-2.5 h-4 w-2/3" />
        <Skeleton className="mt-2.5 h-4 w-1/2" />
      </div>

      <div className="mt-8 flex flex-col gap-8">
        {[0, 1].map((i) => (
          <div key={i}>
            <div className="flex items-center gap-4 rounded-2xl bg-tinta/90 p-5">
              <Skeleton className="h-11 w-11 shrink-0 rounded-xl bg-white/15" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3 w-28 bg-white/15" />
                <Skeleton className="mt-2 h-5 w-48 bg-white/15" />
              </div>
            </div>
            <div className="mt-3 rounded-2xl border border-paper-edge bg-panel p-5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-3 h-4 w-5/6" />
              <Skeleton className="mt-3 h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
