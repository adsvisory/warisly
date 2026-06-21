# IMPLEMENTATION BRIEF: Registry UI — Read Views (apps/web)
## Surface: web (`apps/web`)
## Brief: #4c-i
## Phase: 1 (MVP)
## Depends on: #4b, #3, #2
## Blocks: #4c-ii
## Parallel with: None

### CONTEXT
The owner's read surface: an AppShell with bottom nav, a completeness-first dashboard (not net-worth), and an asset list that keeps assets and liabilities separated with freshness chips and estimate-marked values.

### NON-NEGOTIABLE CHECK
Read-only (no writes here). Values render through `@warisly/ui`'s `<Estimate>` so they always carry the "estimasi" marker + review date (Discovery-first). Header leads with *completeness*, never an authoritative total. Bahasa-first. Data fetched server-side under the user's RLS.

### PRE-FLIGHT CHECKS
- [ ] `getRegistry` / `isFresh` exist (#4b); `@warisly/ui` primitives exist (#3).
- [ ] `(app)/layout.tsx` exists (#2) — this brief wraps it in AppShell.

### FILES TO CREATE/MODIFY

#### 1. `apps/web/src/lib/categories.ts`
**Action:** CREATE **Layer:** Util **Purpose:** Bahasa labels for asset categories.
```typescript
import type { AssetCategory } from "@warisly/db";

export const assetCategoryLabel: Record<AssetCategory, string> = {
  saham: "Saham", reksa_dana: "Reksa Dana", bank: "Rekening Bank", e_wallet: "E-wallet",
  emas: "Emas", crypto: "Crypto", asuransi: "Asuransi", bpjs: "BPJS",
  properti: "Properti", fisik: "Aset Fisik", utang: "Utang", lainnya: "Lainnya",
};
```

#### 2. `apps/web/src/components/layout/AppShell.tsx`
**Action:** CREATE **Layer:** Component **Purpose:** Mobile shell + bottom nav (app-specific → lives in the app, not the UI package).
```typescript
import Link from "next/link";
import { Home, Wallet, Users, User } from "lucide-react";
import { copy } from "@warisly/lib";

const items = [
  { href: "/beranda", label: copy.nav.home, Icon: Home },
  { href: "/aset", label: copy.nav.assets, Icon: Wallet },
  { href: "/amanah", label: copy.nav.amanah, Icon: Users },
  { href: "/profil", label: copy.nav.profile, Icon: User },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-xl pb-24">
      <div className="px-6 pt-8">{children}</div>
      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-xl border-t border-paper-edge bg-kertas/95 backdrop-blur">
        <ul className="grid grid-cols-4">
          {items.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link href={href} className="flex flex-col items-center gap-1 py-3 font-sans text-xs text-tinta">
                <Icon size={20} /> {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
```

#### 3. `apps/web/app/(app)/layout.tsx`
**Action:** MODIFY **Layer:** Page **Purpose:** Wrap the guarded area in AppShell.
```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell"; // ← add

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");
  return <AppShell>{children}</AppShell>; // ← was: return <>{children}</>;
}
```

#### 4. `apps/web/app/(app)/beranda/page.tsx`
**Action:** MODIFY **Layer:** Page **Purpose:** Replace the placeholder with the completeness-first dashboard.
```typescript
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRegistry } from "@/services/assets";
import { Eyebrow, H1, Card } from "@warisly/ui";
import { copy } from "@warisly/lib";

export default async function Beranda() {
  const supabase = await createClient();
  const reg = await getRegistry(supabase);
  const addBtn = "inline-block rounded-lg bg-nyala px-4 py-3 font-sans font-medium text-white";

  return (
    <div>
      <Eyebrow>{copy.brand}</Eyebrow>
      <H1>{copy.nav.home}</H1>

      {reg.total === 0 ? (
        <Card className="mt-6">
          <p className="text-paper-text">Belum ada aset tercatat. Mulai dengan satu — cukup beberapa detik.</p>
          <Link href="/aset/baru" className={`mt-4 ${addBtn}`}>{copy.actions.addAsset}</Link>
        </Card>
      ) : (
        <>
          <Card className="mt-6">
            <p className="font-sans text-sm text-paper-muted">Kelengkapan</p>
            <p className="mt-1 font-display text-3xl text-tinta">{reg.total} aset tercatat</p>
            <p className="mt-1 font-sans text-sm text-paper-muted">
              {reg.freshCount} terkini · {reg.staleCount} perlu ditinjau
            </p>
          </Card>
          <Link href="/aset/baru" className={`mt-4 ${addBtn}`}>{copy.actions.addAsset}</Link>
        </>
      )}

      <p className="mt-8 font-sans text-xs text-paper-muted">{copy.reassurePassword}</p>
    </div>
  );
}
```

#### 5. `apps/web/app/(app)/aset/page.tsx`
**Action:** CREATE **Layer:** Page **Purpose:** Full list — assets and liabilities kept separate.
```typescript
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRegistry, isFresh } from "@/services/assets";
import { Eyebrow, H1, H2, Card, Estimate, FreshnessChip } from "@warisly/ui";
import { copy } from "@warisly/lib";
import { assetCategoryLabel } from "@/lib/categories";
import type { Asset } from "@warisly/db";

function AssetRow({ a }: { a: Asset }) {
  return (
    <Link href={`/aset/${a.id}`}>
      <Card className="mt-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg text-tinta">{a.provider ?? assetCategoryLabel[a.category]}</p>
            <p className="font-sans text-xs text-paper-muted">{a.label ?? assetCategoryLabel[a.category]}</p>
          </div>
          <FreshnessChip fresh={isFresh(a)} />
        </div>
        <div className="mt-2"><Estimate value={a.valueEstimate} lastReviewedAt={a.lastReviewedAt} /></div>
      </Card>
    </Link>
  );
}

export default async function AsetPage() {
  const supabase = await createClient();
  const reg = await getRegistry(supabase);
  return (
    <div>
      <Eyebrow>{copy.brand}</Eyebrow>
      <H1>{copy.nav.assets}</H1>
      <Link href="/aset/baru" className="mt-4 inline-block rounded-lg bg-nyala px-4 py-3 font-sans font-medium text-white">
        {copy.actions.addAsset}
      </Link>

      <div className="mt-8">
        <H2>Aset</H2>
        {reg.assets.length === 0
          ? <p className="mt-2 text-sm text-paper-muted">Belum ada.</p>
          : reg.assets.map((a) => <AssetRow key={a.id} a={a} />)}
      </div>

      <div className="mt-8">
        <H2>Utang</H2>
        {reg.liabilities.length === 0
          ? <p className="mt-2 text-sm text-paper-muted">Belum ada.</p>
          : reg.liabilities.map((a) => <AssetRow key={a.id} a={a} />)}
      </div>
    </div>
  );
}
```

### VERIFICATION
- [ ] Signed-in user with 0 assets sees the cold-start card + "Tambah aset"; with assets, sees the completeness card ("N aset tercatat · X terkini · Y perlu ditinjau").
- [ ] `/aset` lists assets and liabilities in **separate** sections; each value shows "(estimasi)" + review date; stale items show "Perlu ditinjau".
- [ ] Bottom nav switches Beranda/Aset/Amanah/Profil.
- [ ] No total/net-worth figure is presented as authoritative.
