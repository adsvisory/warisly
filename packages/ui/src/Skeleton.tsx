import { type HTMLAttributes } from "react";

// Calm shimmer placeholder in the warm-paper palette: a parchment base with a
// slow, soft sweep passing over it. Reserve the real layout's dimensions via
// `className` so content lands without shifting (no CLS). Decorative only —
// hidden from the accessibility tree.
export function Skeleton({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden rounded-lg bg-parchment ${className}`}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    </div>
  );
}
