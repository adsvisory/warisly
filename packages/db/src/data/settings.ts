import type { SupabaseClient } from "@supabase/supabase-js";

export async function getSetting<T = unknown>(supabase: SupabaseClient, key: string): Promise<T | null> {
  const { data, error } = await supabase.from("wrs_settings").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(`getSetting failed: ${error.message}`);
  return (data?.value ?? null) as T | null;
}
