import { copy } from "@warisly/lib";

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export function Estimate({
  value,
  lastReviewedAt,
  estimateLabel,
  reviewedLabel,
}: {
  value: number | null;
  lastReviewedAt?: string | null;
  estimateLabel?: string;
  reviewedLabel?: string;
}) {
  const est = estimateLabel ?? copy.estimate;
  const reviewed = reviewedLabel ?? copy.freshness.lastReviewed;
  return (
    <span className="inline-flex flex-col">
      <span className="font-display tabular-nums text-tinta">
        {value == null ? "—" : `± ${rupiah(value)}`}
        <span className="ml-1 font-sans text-xs font-normal text-paper-muted">({est})</span>
      </span>
      {lastReviewedAt && (
        <span className="font-sans text-xs text-paper-muted">
          {reviewed}: {new Date(lastReviewedAt).toLocaleDateString("id-ID")}
        </span>
      )}
    </span>
  );
}
