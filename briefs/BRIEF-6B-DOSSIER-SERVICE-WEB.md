# IMPLEMENTATION BRIEF: Dossier Assembly Service
## Surface: db (`packages/db`) + web service (`apps/web/src/services`)
## Brief: #6b
## Phase: 1 (MVP)
## Depends on: #6a, #4b
## Blocks: #6c
## Parallel with: None

### CONTEXT
The data layer for playbooks + settings, and the service that assembles a dossier: match each asset to its recovery playbook (provider, then category fallback) and consolidate the document checklist.

### NON-NEGOTIABLE CHECK
Assembled on demand under the caller's RLS (owner sees only their own assets; playbooks are shared reference). No credential data. Values flow through unchanged as estimates. Pure read path — no writes, no service-role.

### PRE-FLIGHT CHECKS
- [ ] `wrs_playbooks` + `dossier.base_documents` exist (#6a).
- [ ] `listAssets` + `Asset` type exist (#4b).

### FILES TO CREATE/MODIFY

#### 1. `packages/db/src/data/playbooks.ts`
**Action:** CREATE **Layer:** Data
```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssetCategory } from "./assets";

export interface PlaybookStep { order: number; text: string; }
export interface DossierDoc { key: string; label: string; }
export interface Playbook {
  id: string; providerKey: string | null; category: AssetCategory | null;
  title: string; version: number; steps: PlaybookStep[]; documents: DossierDoc[]; notes: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toPlaybook(r: any): Playbook {
  return {
    id: r.id, providerKey: r.provider_key, category: r.category, title: r.title,
    version: r.version, steps: r.steps ?? [], documents: r.documents ?? [], notes: r.notes,
  };
}

export async function listActivePlaybooks(supabase: SupabaseClient): Promise<Playbook[]> {
  const { data, error } = await supabase
    .from("wrs_playbooks")
    .select("id, provider_key, category, title, version, steps, documents, notes")
    .eq("is_active", true);
  if (error) throw new Error(`listActivePlaybooks failed: ${error.message}`);
  return (data as any[]).map(toPlaybook);
}
```

#### 2. `packages/db/src/data/settings.ts`
**Action:** CREATE **Layer:** Data
```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getSetting<T = unknown>(supabase: SupabaseClient, key: string): Promise<T | null> {
  const { data, error } = await supabase.from("wrs_settings").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(`getSetting failed: ${error.message}`);
  return (data?.value ?? null) as T | null;
}
```

#### 3. `packages/db/src/index.ts`
**Action:** MODIFY **Layer:** Data
```typescript
// ... existing exports ...
export * from "./data/playbooks"; // ← add
export * from "./data/settings";  // ← add
```

#### 4. `apps/web/src/services/dossier.ts`
**Action:** CREATE **Layer:** Service
```typescript
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listAssets, listActivePlaybooks, getSetting,
  type Asset, type Playbook, type DossierDoc,
} from "@warisly/db";

function normalizeProvider(s: string | null): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchPlaybook(asset: Asset, playbooks: Playbook[]): Playbook | null {
  const norm = normalizeProvider(asset.provider);
  if (norm) {
    const byProvider = playbooks.find((p) => p.providerKey && norm.includes(p.providerKey));
    if (byProvider) return byProvider;
  }
  return playbooks.find((p) => !p.providerKey && p.category === asset.category) ?? null;
}

export interface DossierEntry { asset: Asset; playbook: Playbook | null; }
export interface Dossier {
  assets: DossierEntry[];
  liabilities: Asset[];
  documents: DossierDoc[]; // consolidated + deduped
  generatedAt: string;
}

export async function assembleDossier(supabase: SupabaseClient): Promise<Dossier> {
  const [all, playbooks, baseDocs] = await Promise.all([
    listAssets(supabase, { includeArchived: false }),
    listActivePlaybooks(supabase),
    getSetting<DossierDoc[]>(supabase, "dossier.base_documents"),
  ]);

  const entries: DossierEntry[] = all
    .filter((a) => !a.isLiability)
    .map((asset) => ({ asset, playbook: matchPlaybook(asset, playbooks) }));

  const docMap = new Map<string, DossierDoc>();
  for (const d of baseDocs ?? []) docMap.set(d.key, d);
  for (const e of entries) for (const d of e.playbook?.documents ?? []) docMap.set(d.key, d);

  return {
    assets: entries,
    liabilities: all.filter((a) => a.isLiability),
    documents: [...docMap.values()],
    generatedAt: new Date().toISOString(),
  };
}
```

### VERIFICATION
- [ ] An owner with an "Ajaib" saham asset gets that asset matched to the Ajaib playbook; a "Bank Mandiri" asset with no specific playbook falls back to the generic `bank` playbook.
- [ ] `documents` merges the 4 base docs with any playbook docs (e.g. "Info bank RDN terkait"), deduped by key.
- [ ] An asset with an unknown provider and a category lacking a fallback returns `playbook: null` (handled in UI as "no specific guide").
- [ ] Liabilities are returned separately, never matched to claim playbooks.
