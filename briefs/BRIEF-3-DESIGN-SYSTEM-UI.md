# IMPLEMENTATION BRIEF: Design System Primitives — @warisly/ui
## Surface: ui (`packages/ui`)
## Brief: #3  (reissue — supersedes BRIEF-3-DESIGN-SYSTEM-OWNER)
## Phase: 1 (MVP)
## Depends on: #0a
## Blocks: #4c, #5c, #6c, #7c, #10a
## Parallel with: #2

### CONTEXT
The shared brand primitives both apps build from: the Seal, a Nyala-disciplined Button, Card, status Chips, an `<Estimate>` that always marks values as estimates, and headings. Pure presentational components — no `next`, no DB — so they stay reusable across web + admin.

### NON-NEGOTIABLE CHECK
UI only. `<Estimate>` renders every value with the "estimasi" marker + review date (Discovery-first, Cardinal #6). Copy comes from `@warisly/lib` (Bahasa-first, centralised) — no inline English. Nyala (`variant="primary"`) is reserved for the single primary action per screen.

### PRE-FLIGHT CHECKS
- [ ] `@warisly/ui` package exists with `lucide-react` + `@warisly/lib` deps and the Tailwind preset (Brief #0a).
- [ ] Consuming apps already scan `../../packages/ui/src/**` in their Tailwind `content` (Briefs #0b/#0c).

### FILES TO CREATE/MODIFY

#### 1. `packages/ui/src/Seal.tsx`
**Action:** CREATE **Layer:** Component
```typescript
export function Seal({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Warisly" className={className}>
      <circle cx="50" cy="50" r="47" fill="none" stroke="#B5863C" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#B5863C" strokeWidth="3" />
      <circle cx="50" cy="50" r="31" fill="none" stroke="#B5863C" strokeWidth="1" />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
        fontFamily="var(--font-fraunces), Georgia, serif" fontWeight="600" fontSize="34" fill="#B5863C">W</text>
    </svg>
  );
}
```

#### 2. `packages/ui/src/Button.tsx`
**Action:** CREATE **Layer:** Component
```typescript
import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";
const styles: Record<Variant, string> = {
  primary: "bg-nyala text-white active:bg-nyala-pressed",
  secondary: "bg-tinta text-ink-text active:opacity-90",
  ghost: "bg-transparent text-nyala underline underline-offset-2",
};

export function Button({ variant = "secondary", className = "", ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button className={`rounded-lg px-4 py-3 font-sans font-medium transition disabled:opacity-60 ${styles[variant]} ${className}`} {...props} />
  );
}
```

#### 3. `packages/ui/src/Card.tsx`
**Action:** CREATE **Layer:** Component
```typescript
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-paper-edge bg-white/70 p-4 ${className}`}>{children}</div>;
}
```

#### 4. `packages/ui/src/Chip.tsx`
**Action:** CREATE **Layer:** Component
```typescript
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
```

#### 5. `packages/ui/src/Estimate.tsx`
**Action:** CREATE **Layer:** Component **Purpose:** Values ALWAYS marked as estimates with review date.
```typescript
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
```

#### 6. `packages/ui/src/Heading.tsx`
**Action:** CREATE **Layer:** Component
```typescript
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-sans text-xs uppercase tracking-eyebrow text-emas">{children}</p>;
}
export function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="font-display text-3xl text-tinta">{children}</h1>;
}
export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-2xl text-tinta">{children}</h2>;
}
```

#### 7. `packages/ui/src/index.ts`
**Action:** MODIFY **Layer:** Util **Purpose:** Replace the placeholder barrel with real exports.
```typescript
export * from "./Seal";
export * from "./Button";
export * from "./Card";
export * from "./Chip";
export * from "./Estimate";
export * from "./Heading";
```

### VERIFICATION
- [ ] In `apps/web`, import `{ Seal, Button, SealedChip, Estimate, H1 }` from `@warisly/ui` and render on a scratch page: Seal shows brass rings + W; `variant="primary"` button is Nyala; `<Estimate value={80000000} lastReviewedAt="2026-06-01" />` shows "± Rp 80.000.000 (estimasi)" + review date.
- [ ] `@warisly/ui` has no `next` import (grep confirms).
- [ ] No user-facing English outside `@warisly/lib` comments.
