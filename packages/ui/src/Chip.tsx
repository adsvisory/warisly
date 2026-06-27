import { Lock } from "lucide-react";
import { copy } from "@warisly/lib";

export function FreshnessChip({ fresh, freshLabel, staleLabel }: { fresh: boolean; freshLabel?: string; staleLabel?: string }) {
  const label = fresh ? (freshLabel ?? copy.freshness.fresh) : (staleLabel ?? copy.freshness.stale);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-sans text-xs font-medium ${
      fresh ? "bg-daun/10 text-daun" : "bg-emas/[0.14] text-emas-ink"}`}>
      {label}
    </span>
  );
}

export function SealedChip({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emas/12 px-2.5 py-1 font-sans text-xs text-emas">
      <Lock size={12} /> {label ?? copy.sealed}
    </span>
  );
}
