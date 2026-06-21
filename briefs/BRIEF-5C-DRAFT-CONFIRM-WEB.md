# IMPLEMENTATION BRIEF: Draft Confirm UI (confirm-before-save)
## Surface: web (`apps/web`)
## Brief: #5c
## Phase: 1 (MVP)
## Depends on: #5b, #4c-ii
## Blocks: None
## Parallel with: None

### CONTEXT
The owner's review surface for AI-structured drafts: an inbox of pending entries, a review screen that reuses `AssetForm` with low-confidence fields flagged ("belum yakin"), and confirm/discard actions. A draft becomes an asset only on explicit confirm.

### NON-NEGOTIABLE CHECK
Confirm-before-save is the whole point: a draft never becomes an asset without an explicit owner confirm. Low-confidence fields are surfaced, not hidden. All reads/writes run under the owner's RLS (drafts are owner-scoped). Bahasa-first; the form keeps the "bukan password" identifier label.

### PRE-FLIGHT CHECKS
- [ ] `listDrafts` / `getDraft` / `updateDraftStatus` exist (#5a-ii); `addAsset` exists (#4b); `AssetForm` exists (#4c-ii).

### FILES TO CREATE/MODIFY

#### 1. `apps/web/src/lib/asset-form.ts`
**Action:** CREATE **Layer:** Util **Purpose:** Shared FormData→values parse, used by both asset and draft actions.
```typescript
export function parseAssetForm(formData: FormData) {
  const valueRaw = String(formData.get("valueEstimate") ?? "").replace(/[^\d]/g, "");
  const benef = String(formData.get("providerBeneficiarySet") ?? "");
  const category = String(formData.get("category") ?? "lainnya");
  return {
    category,
    isLiability: category === "utang",
    provider: String(formData.get("provider") ?? "").trim() || null,
    label: String(formData.get("label") ?? "").trim() || null,
    identifier: String(formData.get("identifier") ?? "").trim() || null,
    valueEstimate: valueRaw ? Number(valueRaw) : null,
    currency: "IDR",
    detail: { instructions: String(formData.get("instructions") ?? "").trim() },
    providerBeneficiarySet: benef === "" ? null : benef === "ya",
  };
}
```

#### 2. `apps/web/src/app/actions/assets.ts`
**Action:** MODIFY **Layer:** Server Action **Purpose:** Use the shared parser (remove the local `parseForm`).
```typescript
// ... existing imports ...
import { parseAssetForm } from "@/lib/asset-form"; // ← add

// DELETE the local `function parseForm(formData: FormData) { ... }` block.

// In each action, replace `parseForm(formData)` with `parseAssetForm(formData)`:
//   await addAsset(supabase, user.id, parseAssetForm(formData));
//   await editAsset(supabase, id, parseAssetForm(formData));
// ... existing requireUser + actions unchanged otherwise ...
```

#### 3. `apps/web/src/components/AssetForm.tsx`
**Action:** MODIFY **Layer:** Component **Purpose:** Accept a custom action + hidden fields + partial initial so it can serve draft confirmation too.
```typescript
// Replace the signature + action selection:
export function AssetForm({ initial, action: actionProp, hidden, submitLabel }: {
  initial?: Partial<Asset>;
  action?: (fd: FormData) => void | Promise<void>;
  hidden?: Record<string, string>;
  submitLabel?: string;
}) {
  const editing = !!initial?.id;
  const action = actionProp ?? (editing ? updateAssetAction : createAssetAction);
  // ... existing `field`, `instructions`, `benefDefault` lines unchanged ...

  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      {editing && initial?.id && <input type="hidden" name="id" value={initial.id} />}
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {/* ... all existing fields unchanged ... */}
      {/* change ONLY the submit label: */}
      <button type="submit" className="mt-2 rounded-lg bg-nyala px-4 py-3 font-sans font-medium text-white active:bg-nyala-pressed">
        {submitLabel ?? copy.actions.save}
      </button>
    </form>
  );
}
```

#### 4. `apps/web/src/app/actions/drafts.ts`
**Action:** CREATE **Layer:** Server Action
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addAsset } from "@/services/assets";
import { updateDraftStatus } from "@warisly/db";
import { parseAssetForm } from "@/lib/asset-form";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");
  return { supabase, user };
}

export async function confirmDraftAction(formData: FormData) {
  const draftId = String(formData.get("draftId") ?? "");
  const { supabase, user } = await requireUser();
  await addAsset(supabase, user.id, parseAssetForm(formData)); // create the asset first
  await updateDraftStatus(supabase, draftId, "confirmed");      // then retire the draft
  revalidatePath("/aset");
  revalidatePath("/aset/draf");
  redirect("/aset");
}

export async function discardDraftAction(formData: FormData) {
  const draftId = String(formData.get("draftId") ?? "");
  const { supabase } = await requireUser();
  await updateDraftStatus(supabase, draftId, "discarded");
  revalidatePath("/aset/draf");
  redirect("/aset/draf");
}
```

#### 5. `apps/web/app/(app)/aset/draf/page.tsx`
**Action:** CREATE **Layer:** Page **Purpose:** Pending-drafts inbox.
```typescript
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listDrafts } from "@warisly/db";
import { Eyebrow, H1, Card } from "@warisly/ui";
import { assetCategoryLabel } from "@/lib/categories";

export default async function DrafPage() {
  const supabase = await createClient();
  const drafts = await listDrafts(supabase, "pending");
  return (
    <div>
      <Eyebrow>Dari WhatsApp</Eyebrow>
      <H1>Menunggu konfirmasi</H1>
      {drafts.length === 0 ? (
        <p className="mt-4 text-sm text-paper-muted">Tidak ada entri menunggu.</p>
      ) : (
        drafts.map((d) => (
          <Link key={d.id} href={`/aset/draf/${d.id}`}>
            <Card className="mt-3">
              <p className="font-display text-lg text-tinta">{d.provider ?? (d.category ? assetCategoryLabel[d.category] : "Aset")}</p>
              <p className="font-sans text-xs text-paper-muted">{d.label ?? "Ketuk untuk meninjau"}</p>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}
```

#### 6. `apps/web/app/(app)/aset/draf/[id]/page.tsx`
**Action:** CREATE **Layer:** Page **Purpose:** Review one draft, flag low-confidence fields, confirm or discard.
```typescript
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDraft } from "@warisly/db";
import { Eyebrow, H1, Card } from "@warisly/ui";
import { AssetForm } from "@/components/AssetForm";
import { confirmDraftAction, discardDraftAction } from "@/app/actions/drafts";
import { copy } from "@warisly/lib";

const fieldLabel: Record<string, string> = { category: "kategori", provider: "penyedia", valueEstimate: "nilai" };

export default async function DraftReview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const d = await getDraft(supabase, id);
  if (!d || d.status !== "pending") notFound();

  const flags = (d.confidence?.lowConfidence as string[] | undefined) ?? [];
  const initial = {
    category: d.category ?? undefined, provider: d.provider, label: d.label,
    identifier: d.identifier, valueEstimate: d.valueEstimate, detail: d.detail,
  };

  return (
    <div>
      <Eyebrow>Dari WhatsApp</Eyebrow>
      <H1>Tinjau entri</H1>
      {flags.length > 0 && (
        <Card className="mt-4 border-amber-300 bg-amber-50">
          <p className="font-sans text-sm text-amber-800">
            Belum yakin: {flags.map((f) => fieldLabel[f] ?? f).join(", ")}. Mohon periksa sebelum menyimpan.
          </p>
        </Card>
      )}
      <AssetForm initial={initial} action={confirmDraftAction} hidden={{ draftId: d.id }} submitLabel={copy.actions.save} />
      <form action={discardDraftAction} className="mt-3">
        <input type="hidden" name="draftId" value={d.id} />
        <button className="font-sans text-sm text-paper-muted underline">Buang entri ini</button>
      </form>
    </div>
  );
}
```

#### 7. `apps/web/app/(app)/beranda/page.tsx`
**Action:** MODIFY **Layer:** Page **Purpose:** Surface pending drafts on the dashboard.
```typescript
// add import:
import { listDrafts } from "@warisly/db";

// inside Beranda(), after `const reg = await getRegistry(supabase);`:
  const drafts = await listDrafts(supabase, "pending");

// render a banner directly after the <H1>…</H1> line:
  {drafts.length > 0 && (
    <Link href="/aset/draf">
      <Card className="mt-4 border-nyala/40">
        <p className="font-sans text-sm text-tinta">
          {drafts.length} entri dari WhatsApp menunggu konfirmasi →
        </p>
      </Card>
    </Link>
  )}
```

### VERIFICATION
- [ ] After a WhatsApp message is structured (#5b), `/aset/draf` shows the pending entry and the dashboard shows the banner.
- [ ] Opening the draft pre-fills `AssetForm`; flagged fields show the "Belum yakin" note.
- [ ] Confirm → the asset appears in `/aset`, the draft leaves the inbox; a *different* user never sees it (RLS).
- [ ] Discard → the draft leaves the inbox and no asset is created.
- [ ] No path creates an asset without an explicit confirm.
