"use server";

import { createClient } from "@/lib/supabase/server";
import { listAssetCategories } from "@/services/asset-categories";
import type { AssetCategoryInfo } from "@warisly/db";

/** Expose the inheritance-category catalog to the client AssetForm. */
export async function fetchAssetCategories(): Promise<AssetCategoryInfo[]> {
  const supabase = await createClient();
  return listAssetCategories(supabase);
}
