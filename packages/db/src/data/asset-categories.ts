import type { SupabaseClient } from "@supabase/supabase-js";

// The canonical inheritance-category catalog lives in wrs_settings under this key
// (config, not a table). estate_path is awareness-only metadata — who claims and how,
// never a share/division calculation.
const CATALOG_KEY = "asset_category_catalog";

export type EstatePath = "general" | "bypass" | "liability";
export type ClaimRoute = "R1" | "R2" | "R3" | "R4";

export interface AssetCategoryInfo {
  code: string; // matches the wrs_asset_category enum value
  group: string; // dropdown group label (Bahasa)
  labelId: string; // Bahasa label (primary)
  labelEn: string; // English label (secondary)
  estatePath: EstatePath; // informational metadata only
  claimRoutes: ClaimRoute[];
  surfacesBeneficiaryField: boolean; // true => surface the provider-beneficiary field
  noteId: string; // Bahasa informational note (awareness only)
  noteEn: string;
}

interface CatalogRow {
  code: string;
  group: string;
  label_id: string;
  label_en: string;
  estate_path: EstatePath;
  claim_routes: ClaimRoute[];
  surfaces_beneficiary_field: boolean;
  note_id: string;
  note_en: string;
}

function toInfo(r: CatalogRow): AssetCategoryInfo {
  return {
    code: r.code,
    group: r.group,
    labelId: r.label_id,
    labelEn: r.label_en,
    estatePath: r.estate_path,
    claimRoutes: r.claim_routes ?? [],
    surfacesBeneficiaryField: !!r.surfaces_beneficiary_field,
    noteId: r.note_id,
    noteEn: r.note_en,
  };
}

/** Read the catalog from wrs_settings. Returns [] if unset/malformed (graceful degrade). */
export async function getAssetCategoryCatalog(supabase: SupabaseClient): Promise<AssetCategoryInfo[]> {
  const { data, error } = await supabase
    .from("wrs_settings")
    .select("value")
    .eq("key", CATALOG_KEY)
    .maybeSingle();

  if (error || !data?.value || !Array.isArray(data.value)) return [];
  return (data.value as CatalogRow[]).map(toInfo);
}
