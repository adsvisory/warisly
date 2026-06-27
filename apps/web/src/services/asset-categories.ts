import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAssetCategoryCatalog, type AssetCategoryInfo } from "@warisly/db";

/** The canonical inheritance-category catalog (config from wrs_settings, RLS-readable). */
export async function listAssetCategories(supabase: SupabaseClient): Promise<AssetCategoryInfo[]> {
  return getAssetCategoryCatalog(supabase);
}
