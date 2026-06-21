import { Lock } from "lucide-react";
import { copy } from "@warisly/lib";

export function FreshnessChip({ fresh }: { fresh: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-sans text-xs ${
      fresh ? "bg-daun/10 text-daun" : "bg-amber-100 text-amber-800"}`}>
      {fresh ? copy.freshness.fresh : copy.freshness.stale}
    </span>
  );
}

export function SealedChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emas/12 px-2.5 py-1 font-sans text-xs text-emas">
      <Lock size={12} /> {copy.sealed}
    </span>
  );
}
