# IMPLEMENTATION BRIEF: Registry UI — Write Views (apps/web)
## Surface: web (`apps/web`)
## Brief: #4c-ii
## Phase: 1 (MVP)
## Depends on: #4c-i
## Blocks: #5c
## Parallel with: None

### CONTEXT
The owner's write surface: one `AssetForm` used for both create and edit, an asset detail page with edit/archive, and the server actions that validate-and-write through the service layer.

### NON-NEGOTIABLE CHECK
The `identifier` field copy explicitly says "bukan password" (not a password) — no credential is ever requested (Cardinal #1). Writes run server-side under the user's RLS via the service (`addAsset`/`editAsset`/`removeAsset`); the form never touches the DB. Archive is a soft delete (recoverable). Bahasa-first, with the no-password reassurance on the form.

### PRE-FLIGHT CHECKS
- [ ] Service `addAsset`/`editAsset`/`removeAsset` exist (#4b).
- [ ] `assetCategoryLabel` exists (#4c-i).

### FILES TO CREATE/MODIFY

#### 1. `apps/web/src/app/actions/assets.ts`
**Action:** CREATE **Layer:** Server Action
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addAsset, editAsset, removeAsset } from "@/services/assets";

function parseForm(formData: FormData) {
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

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");
  return { supabase, user };
}

export async function createAssetAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  await addAsset(supabase, user.id, parseForm(formData));
  revalidatePath("/aset");
  redirect("/aset");
}

export async function updateAssetAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase } = await requireUser();
  await editAsset(supabase, id, parseForm(formData));
  revalidatePath("/aset");
  redirect(`/aset/${id}`);
}

export async function archiveAssetAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase } = await requireUser();
  await removeAsset(supabase, id);
  revalidatePath("/aset");
  redirect("/aset");
}
```

#### 2. `apps/web/src/components/AssetForm.tsx`
**Action:** CREATE **Layer:** Component
```typescript
"use client";

import { createAssetAction, updateAssetAction } from "@/app/actions/assets";
import { assetCategoryLabel } from "@/lib/categories";
import { copy } from "@warisly/lib";
import type { Asset } from "@warisly/db";

export function AssetForm({ initial }: { initial?: Asset }) {
  const editing = !!initial;
  const action = editing ? updateAssetAction : createAssetAction;
  const field = "rounded-lg border border-paper-edge bg-white px-4 py-3 font-sans text-paper-text outline-none focus:border-nyala";
  const instructions = (initial?.detail as { instructions?: string } | undefined)?.instructions ?? "";
  const benefDefault = initial?.providerBeneficiarySet == null ? "" : initial.providerBeneficiarySet ? "ya" : "tidak";

  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      {editing && <input type="hidden" name="id" value={initial!.id} />}

      <label className="font-sans text-sm text-paper-text">Jenis aset</label>
      <select name="category" defaultValue={initial?.category ?? "saham"} className={field}>
        {Object.entries(assetCategoryLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>

      <label className="font-sans text-sm text-paper-text">Penyedia (mis. Ajaib, BCA, GoPay)</label>
      <input name="provider" defaultValue={initial?.provider ?? ""} className={field} />

      <label className="font-sans text-sm text-paper-text">Nama / label</label>
      <input name="label" defaultValue={initial?.label ?? ""} className={field} />

      <label className="font-sans text-sm text-paper-text">Pengenal akun — email/nomor, <strong>bukan password</strong></label>
      <input name="identifier" defaultValue={initial?.identifier ?? ""} className={field} />

      <label className="font-sans text-sm text-paper-text">Perkiraan nilai (Rp, estimasi)</label>
      <input name="valueEstimate" inputMode="numeric" defaultValue={initial?.valueEstimate?.toString() ?? ""} className={field} />

      <label className="font-sans text-sm text-paper-text">Sudah ada ahli waris terdaftar di penyedia?</label>
      <select name="providerBeneficiarySet" defaultValue={benefDefault} className={field}>
        <option value="">Belum tahu</option>
        <option value="ya">Ya</option>
        <option value="tidak">Tidak</option>
      </select>

      <label className="font-sans text-sm text-paper-text">Catatan untuk keluarga</label>
      <textarea name="instructions" defaultValue={instructions} rows={3} className={field} />

      <p className="font-sans text-xs text-paper-muted">{copy.reassurePassword}</p>
      <button type="submit" className="mt-2 rounded-lg bg-nyala px-4 py-3 font-sans font-medium text-white active:bg-nyala-pressed">
        {copy.actions.save}
      </button>
    </form>
  );
}
```

#### 3. `apps/web/app/(app)/aset/baru/page.tsx`
**Action:** CREATE **Layer:** Page
```typescript
import { Eyebrow, H1 } from "@warisly/ui";
import { copy } from "@warisly/lib";
import { AssetForm } from "@/components/AssetForm";

export default function BaruPage() {
  return (
    <div>
      <Eyebrow>{copy.brand}</Eyebrow>
      <H1>{copy.actions.addAsset}</H1>
      <AssetForm />
    </div>
  );
}
```

#### 4. `apps/web/app/(app)/aset/[id]/page.tsx`
**Action:** CREATE **Layer:** Page **Purpose:** Asset detail + edit link + archive.
```typescript
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAsset } from "@warisly/db";
import { Eyebrow, H1, Card, Estimate } from "@warisly/ui";
import { assetCategoryLabel } from "@/lib/categories";
import { archiveAssetAction } from "@/app/actions/assets";

export default async function AssetDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const asset = await getAsset(supabase, id);
  if (!asset) notFound();
  const instructions = (asset.detail as { instructions?: string }).instructions ?? "";

  return (
    <div>
      <Eyebrow>{assetCategoryLabel[asset.category]}</Eyebrow>
      <H1>{asset.provider ?? assetCategoryLabel[asset.category]}</H1>
      <Card className="mt-6">
        <Estimate value={asset.valueEstimate} lastReviewedAt={asset.lastReviewedAt} />
        {asset.identifier && <p className="mt-3 font-sans text-sm text-paper-muted">Pengenal: {asset.identifier}</p>}
        {instructions && <p className="mt-3 text-paper-text">{instructions}</p>}
      </Card>
      <div className="mt-4 flex items-center gap-5">
        <Link href={`/aset/${asset.id}/edit`} className="font-sans text-sm text-nyala underline">Ubah</Link>
        <form action={archiveAssetAction}>
          <input type="hidden" name="id" value={asset.id} />
          <button className="font-sans text-sm text-paper-muted underline">Arsipkan</button>
        </form>
      </div>
    </div>
  );
}
```

#### 5. `apps/web/app/(app)/aset/[id]/edit/page.tsx`
**Action:** CREATE **Layer:** Page
```typescript
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAsset } from "@warisly/db";
import { Eyebrow, H1 } from "@warisly/ui";
import { AssetForm } from "@/components/AssetForm";
import { assetCategoryLabel } from "@/lib/categories";

export default async function EditAsset({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const asset = await getAsset(supabase, id);
  if (!asset) notFound();
  return (
    <div>
      <Eyebrow>Ubah aset</Eyebrow>
      <H1>{asset.provider ?? assetCategoryLabel[asset.category]}</H1>
      <AssetForm initial={asset} />
    </div>
  );
}
```

### VERIFICATION
- [ ] `/aset/baru` → fill the form → save → redirects to `/aset` with the new asset listed; `last_reviewed_at` is set.
- [ ] Choosing category "Utang" files the item under the **Utang** section (is_liability = true).
- [ ] `/aset/[id]` shows the asset; "Ubah" pre-fills the form; saving updates it; "Arsipkan" removes it from the list (soft archive).
- [ ] Creating an asset for one user is invisible to another (RLS end-to-end).
- [ ] The form never asks for a password; the identifier label says "bukan password".
