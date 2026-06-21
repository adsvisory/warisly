import { copy } from "@warisly/lib";

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export function Estimate({ value, lastReviewedAt }: { value: number | null; lastReviewedAt?: string | null }) {
  return (
    <span className="inline-flex flex-col">
      <span className="font-sans tabular-nums text-paper-text">
        {value == null ? "—" : `± ${rupiah(value)}`}
        <span className="ml-1 font-sans text-xs text-paper-muted">({copy.estimate})</span>
      </span>
      {lastReviewedAt && (
        <span className="font-sans text-xs text-paper-muted">
          {copy.freshness.lastReviewed}: {new Date(lastReviewedAt).toLocaleDateString("id-ID")}
        </span>
      )}
    </span>
  );
}
