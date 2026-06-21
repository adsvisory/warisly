import type { SupabaseClient } from "@supabase/supabase-js";

export interface ReleaseRule { waitingDays: number; channels: string[]; }

export async function getReleaseRule(supabase: SupabaseClient): Promise<{ rule: ReleaseRule | null; eligible: boolean }> {
  const { data, error } = await supabase.from("wrs_owners")
    .select("release_rule, release_eligible").maybeSingle();
  if (error) throw new Error(`getReleaseRule failed: ${error.message}`);
  return { rule: (data?.release_rule as ReleaseRule) ?? null, eligible: data?.release_eligible ?? false };
}

export async function setReleaseRule(supabase: SupabaseClient, ownerId: string, rule: ReleaseRule): Promise<void> {
  const { error } = await supabase.from("wrs_owners").update({ release_rule: rule }).eq("id", ownerId);
  if (error) throw new Error(`setReleaseRule failed: ${error.message}`);
}
