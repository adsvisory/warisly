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
