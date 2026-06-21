import type { SupabaseClient } from "@supabase/supabase-js";

export async function upsertOwnerProfile(
  supabase: SupabaseClient,
  input: { id: string; phone: string | null },
) {
  const { error } = await supabase
    .from("wrs_owners")
    .upsert({ id: input.id, phone: input.phone }, { onConflict: "id" });
  if (error) throw new Error(`upsertOwnerProfile failed: ${error.message}`);
}
