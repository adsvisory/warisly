# IMPLEMENTATION BRIEF: Assets Data Layer + Registry Service
## Surface: db (`packages/db`) + web service (`apps/web/src/services`)
## Brief: #4b
## Phase: 1 (MVP)
## Depends on: #4a
## Blocks: #4c, #5b
## Parallel with: None

### CONTEXT
RLS-aware CRUD for assets in `@warisly/db` (snake_case DB ↔ camelCase TS), plus the registry service that splits assets vs liabilities, computes freshness, and validates input before writes.

### NON-NEGOTIABLE CHECK
Data functions take the caller's cookie-bound Supabase client → all queries run under RLS as the authenticated owner (no service-role on this path). No credential fields. `value_estimate` stays an estimate. Owner self-actions are not written to `wrs_events` here (owner has no insert policy on it by design); audit of access/admin actions comes via the transparency log (#10a).

### PRE-FLIGHT CHECKS
- [ ] `wrs_assets` + RLS exist (#4a).
- [ ] `@warisly/db` exports already include owners/admin/types (#0a, #2).

### FILES TO CREATE/MODIFY

#### 1. `packages/db/src/data/assets.ts`
**Action:** CREATE **Layer:** Data
```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

export type AssetCategory =
  | "saham" | "reksa_dana" | "bank" | "e_wallet" | "emas" | "crypto"
  | "asuransi" | "bpjs" | "properti" | "fisik" | "utang" | "lainnya";

export interface Asset {
  id: string;
  ownerId: string;
  category: AssetCategory;
  isLiability: boolean;
  provider: string | null;
  label: string | null;
  identifier: string | null;
  valueEstimate: number | null;
  currency: string;
  detail: Record<string, unknown>;
  providerBeneficiarySet: boolean | null;
  lastReviewedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetInput {
  category: AssetCategory;
  isLiability: boolean;
  provider: string | null;
  label: string | null;
  identifier: string | null;
  valueEstimate: number | null;
  currency: string;
  detail: Record<string, unknown>;
  providerBeneficiarySet: boolean | null;
  lastReviewedAt: string | null;
}

interface Row {
  id: string; owner_id: string; category: AssetCategory; is_liability: boolean;
  provider: string | null; label: string | null; identifier: string | null;
  value_estimate: number | null; currency: string; detail: Record<string, unknown>;
  provider_beneficiary_set: boolean | null; last_reviewed_at: string | null;
  archived_at: string | null; created_at: string; updated_at: string;
}

const COLS =
  "id, owner_id, category, is_liability, provider, label, identifier, value_estimate, currency, detail, provider_beneficiary_set, last_reviewed_at, archived_at, created_at, updated_at";

function toAsset(r: Row): Asset {
  return {
    id: r.id, ownerId: r.owner_id, category: r.category, isLiability: r.is_liability,
    provider: r.provider, label: r.label, identifier: r.identifier,
    valueEstimate: r.value_estimate, currency: r.currency, detail: r.detail,
    providerBeneficiarySet: r.provider_beneficiary_set, lastReviewedAt: r.last_reviewed_at,
    archivedAt: r.archived_at, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function toRow(ownerId: string, i: AssetInput) {
  return {
    owner_id: ownerId, category: i.category, is_liability: i.isLiability,
    provider: i.provider, label: i.label, identifier: i.identifier,
    value_estimate: i.valueEstimate, currency: i.currency, detail: i.detail,
    provider_beneficiary_set: i.providerBeneficiarySet, last_reviewed_at: i.lastReviewedAt,
  };
}

export async function listAssets(
  supabase: SupabaseClient,
  opts: { includeArchived?: boolean } = {},
): Promise<Asset[]> {
  let q = supabase.from("wrs_assets").select(COLS).order("created_at", { ascending: false });
  if (!opts.includeArchived) q = q.is("archived_at", null);
  const { data, error } = await q;
  if (error) throw new Error(`listAssets failed: ${error.message}`);
  return (data as Row[]).map(toAsset);
}

export async function getAsset(supabase: SupabaseClient, id: string): Promise<Asset | null> {
  const { data, error } = await supabase.from("wrs_assets").select(COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(`getAsset failed: ${error.message}`);
  return data ? toAsset(data as Row) : null;
}

export async function createAsset(supabase: SupabaseClient, ownerId: string, input: AssetInput): Promise<Asset> {
  const { data, error } = await supabase.from("wrs_assets").insert(toRow(ownerId, input)).select(COLS).single();
  if (error) throw new Error(`createAsset failed: ${error.message}`);
  return toAsset(data as Row);
}

export async function updateAsset(supabase: SupabaseClient, id: string, patch: Partial<AssetInput>): Promise<Asset> {
  const row: Record<string, unknown> = {};
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.isLiability !== undefined) row.is_liability = patch.isLiability;
  if (patch.provider !== undefined) row.provider = patch.provider;
  if (patch.label !== undefined) row.label = patch.label;
  if (patch.identifier !== undefined) row.identifier = patch.identifier;
  if (patch.valueEstimate !== undefined) row.value_estimate = patch.valueEstimate;
  if (patch.currency !== undefined) row.currency = patch.currency;
  if (patch.detail !== undefined) row.detail = patch.detail;
  if (patch.providerBeneficiarySet !== undefined) row.provider_beneficiary_set = patch.providerBeneficiarySet;
  if (patch.lastReviewedAt !== undefined) row.last_reviewed_at = patch.lastReviewedAt;
  const { data, error } = await supabase.from("wrs_assets").update(row).eq("id", id).select(COLS).single();
  if (error) throw new Error(`updateAsset failed: ${error.message}`);
  return toAsset(data as Row);
}

export async function archiveAsset(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("wrs_assets").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(`archiveAsset failed: ${error.message}`);
}
```

#### 2. `packages/db/src/index.ts`
**Action:** MODIFY **Layer:** Data
```typescript
// ... existing exports ...
export * from "./data/assets"; // ← add
```

#### 3. `apps/web/src/services/assets.ts`
**Action:** CREATE **Layer:** Service **Purpose:** Business logic — freshness, registry split, validated writes.
```typescript
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  listAssets, createAsset, updateAsset, archiveAsset,
  type Asset, type AssetInput,
} from "@warisly/db";

const STALE_MONTHS = 6;

export function isFresh(a: Asset): boolean {
  if (!a.lastReviewedAt) return false;
  const months = (Date.now() - new Date(a.lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
  return months <= STALE_MONTHS;
}

export interface Registry {
  assets: Asset[];
  liabilities: Asset[];
  total: number;
  freshCount: number;
  staleCount: number;
}

export async function getRegistry(supabase: SupabaseClient): Promise<Registry> {
  const all = await listAssets(supabase, { includeArchived: false });
  const assets = all.filter((a) => !a.isLiability);
  const liabilities = all.filter((a) => a.isLiability);
  const freshCount = all.filter(isFresh).length;
  return { assets, liabilities, total: all.length, freshCount, staleCount: all.length - freshCount };
}

export const assetInputSchema = z.object({
  category: z.enum(["saham","reksa_dana","bank","e_wallet","emas","crypto","asuransi","bpjs","properti","fisik","utang","lainnya"]),
  isLiability: z.boolean().default(false),
  provider: z.string().trim().max(120).nullable(),
  label: z.string().trim().max(120).nullable(),
  identifier: z.string().trim().max(200).nullable(),
  valueEstimate: z.number().int().nonnegative().nullable(),
  currency: z.string().default("IDR"),
  detail: z.record(z.unknown()).default({}),
  providerBeneficiarySet: z.boolean().nullable().default(null),
});

export type AssetFormValues = z.infer<typeof assetInputSchema>;

export async function addAsset(supabase: SupabaseClient, ownerId: string, values: unknown): Promise<Asset> {
  const v = assetInputSchema.parse(values);
  const input: AssetInput = { ...v, lastReviewedAt: new Date().toISOString() };
  return createAsset(supabase, ownerId, input);
}

export async function editAsset(supabase: SupabaseClient, id: string, values: unknown): Promise<Asset> {
  const v = assetInputSchema.partial().parse(values);
  return updateAsset(supabase, id, { ...v, lastReviewedAt: new Date().toISOString() });
}

export async function removeAsset(supabase: SupabaseClient, id: string): Promise<void> {
  return archiveAsset(supabase, id);
}
```

### VERIFICATION
- [ ] From a server context as an authed user: `getRegistry(supabase)` returns only that user's active assets, split into assets vs liabilities, with fresh/stale counts.
- [ ] `addAsset` with a bad category throws a Zod error; with valid input, returns the created `Asset` and stamps `lastReviewedAt`.
- [ ] `removeAsset` sets `archived_at` (soft archive) — the row still exists, excluded from `getRegistry`.
- [ ] No service-role client is imported anywhere in this brief.
