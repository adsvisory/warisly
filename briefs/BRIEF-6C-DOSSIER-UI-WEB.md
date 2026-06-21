# IMPLEMENTATION BRIEF: Dossier UI + Owner Preview
## Surface: web (`apps/web`)
## Brief: #6c
## Phase: 1 (MVP)
## Depends on: #6b, #3
## Blocks: None
## Parallel with: None

### CONTEXT
The recovery-guide screen: a print-friendly dossier (consolidated documents + per-asset claim steps) that also serves as the owner's preview of what the heir will receive. The dashboard's primary action now points here.

### NON-NEGOTIABLE CHECK
Read-only. Every value renders via `<Estimate>` (Discovery-first). Nyala is the single primary action ("Cetak / Simpan PDF" on this screen; "Lihat panduan pemulihan" on the dashboard). The screen is printable to PDF in-browser (no server PDF dependency) so the family can keep a copy independent of the app — the heir-link guardrail's offline fallback. Bahasa-first.

### PRE-FLIGHT CHECKS
- [ ] `assembleDossier` exists (#6b); `@warisly/ui` primitives + `assetCategoryLabel` exist (#3, #4c-i).

### FILES TO CREATE/MODIFY

#### 1. `apps/web/src/components/PrintButton.tsx`
**Action:** CREATE **Layer:** Component
```typescript
"use client";

import { Button } from "@warisly/ui";

export function PrintButton() {
  return (
    <Button variant="primary" onClick={() => window.print()}>
      Cetak / Simpan PDF
    </Button>
  );
}
```

#### 2. `apps/web/app/(app)/dosier/page.tsx`
**Action:** CREATE **Layer:** Page
```typescript
import { createClient } from "@/lib/supabase/server";
import { assembleDossier } from "@/services/dossier";
import { Eyebrow, H1, H2, Card, Estimate, Seal } from "@warisly/ui";
import { assetCategoryLabel } from "@/lib/categories";
import { PrintButton } from "@/components/PrintButton";
import { copy } from "@warisly/lib";

export default async function DosierPage() {
  const supabase = await createClient();
  const dossier = await assembleDossier(supabase);

  return (
    <div className="pb-12">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <Eyebrow>{copy.actions.viewRecovery}</Eyebrow>
          <H1>Panduan Pemulihan</H1>
        </div>
        <PrintButton />
      </div>

      {/* Print header (only on paper) */}
      <div className="mt-2 hidden items-center gap-3 print:flex">
        <Seal size={36} />
        <span className="font-display text-xl text-tinta">Warisly — Panduan Pemulihan</span>
      </div>

      <p className="mt-4 font-sans text-sm text-paper-muted">
        Daftar aset dan langkah agar keluarga dapat mengklaim setiap item. Nilai bersifat estimasi.
      </p>

      <Card className="mt-6">
        <H2>Dokumen yang perlu disiapkan</H2>
        <ul className="mt-2 list-disc pl-5 font-sans text-sm text-paper-text">
          {dossier.documents.map((d) => <li key={d.key}>{d.label}</li>)}
        </ul>
      </Card>

      <div className="mt-8 flex flex-col gap-4">
        {dossier.assets.map(({ asset, playbook }) => (
          <Card key={asset.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg text-tinta">{asset.provider ?? assetCategoryLabel[asset.category]}</p>
                <p className="font-sans text-xs text-paper-muted">
                  {assetCategoryLabel[asset.category]}{asset.label ? ` · ${asset.label}` : ""}
                </p>
              </div>
              <Estimate value={asset.valueEstimate} lastReviewedAt={asset.lastReviewedAt} />
            </div>
            {asset.identifier && <p className="mt-2 font-sans text-sm text-paper-muted">Pengenal: {asset.identifier}</p>}

            {playbook ? (
              <div className="mt-3">
                <p className="font-sans text-xs uppercase tracking-eyebrow text-emas">Langkah klaim</p>
                <ol className="mt-1 list-decimal pl-5 font-sans text-sm text-paper-text">
                  {[...playbook.steps].sort((a, b) => a.order - b.order).map((s) => <li key={s.order}>{s.text}</li>)}
                </ol>
                {playbook.documents.length > 0 && (
                  <p className="mt-2 font-sans text-xs text-paper-muted">
                    Dokumen tambahan: {playbook.documents.map((d) => d.label).join(", ")}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 font-sans text-sm text-paper-muted">
                Belum ada panduan khusus. Hubungi penyedia dengan dokumen ahli waris di atas.
              </p>
            )}
          </Card>
        ))}
      </div>

      {dossier.liabilities.length > 0 && (
        <div className="mt-8">
          <H2>Utang</H2>
          {dossier.liabilities.map((l) => (
            <Card key={l.id} className="mt-3">
              <p className="font-display text-lg text-tinta">{l.provider ?? assetCategoryLabel[l.category]}</p>
              <Estimate value={l.valueEstimate} lastReviewedAt={l.lastReviewedAt} />
            </Card>
          ))}
        </div>
      )}

      <p className="mt-8 font-sans text-xs text-paper-muted">
        Dibuat {new Date(dossier.generatedAt).toLocaleDateString("id-ID")}. {copy.reassurePassword}
      </p>
    </div>
  );
}
```

#### 3. `apps/web/src/components/layout/AppShell.tsx`
**Action:** MODIFY **Layer:** Component **Purpose:** Hide the bottom nav when printing the dossier.
```typescript
// add `print:hidden` to the nav element:
      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-xl border-t border-paper-edge bg-kertas/95 backdrop-blur print:hidden">
```

#### 4. `apps/web/app/(app)/beranda/page.tsx`
**Action:** MODIFY **Layer:** Page **Purpose:** Make "Lihat panduan pemulihan" the single primary action when assets exist; demote "Tambah aset" to a text link.
```typescript
// In the NON-empty branch, replace the add-asset button line:
//   <Link href="/aset/baru" className={`mt-4 ${addBtn}`}>{copy.actions.addAsset}</Link>
// with:
          <Link href="/dosier" className={`mt-4 ${addBtn}`}>{copy.actions.viewRecovery}</Link>
          <Link href="/aset/baru" className="mt-3 inline-block font-sans text-sm text-nyala underline">
            {copy.actions.addAsset}
          </Link>
// (cold-start branch keeps "Tambah aset" as its primary action — unchanged.)
```

### VERIFICATION
- [ ] `/dosier` shows the consolidated document checklist, then each asset with its claim steps (Ajaib asset → Ajaib steps; unknown provider → generic/none message).
- [ ] "Cetak / Simpan PDF" opens the print dialog; the printed output hides the bottom nav and the on-screen header, showing the Seal'd print header instead.
- [ ] Dashboard primary action (Nyala) is "Lihat panduan pemulihan" → `/dosier`; "Tambah aset" is a secondary link (only one Nyala element on screen).
- [ ] Values show "(estimasi)" + review date; liabilities listed separately.
