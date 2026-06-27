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

export async function setOwnerLocale(supabase: SupabaseClient, id: string, locale: "id" | "en") {
  const { error } = await supabase.from("wrs_owners").update({ locale }).eq("id", id);
  if (error) throw new Error(`setOwnerLocale failed: ${error.message}`);
}

// Candidate (UNVERIFIED) identity from KTP OCR (#12b-ii). Stored under detail.candidate so it
// can never be mistaken for the verified identity (kyc_status / verified_nik). NEVER touches
// release_state or any verified flag — only eKYC may set verified state.
// Pass an RLS-bound client: the "owners_update_self" policy scopes the write to id = auth.uid().
export async function saveOwnerCandidateNik(
  supabase: SupabaseClient,
  ownerId: string,
  input: { nik: string; name: string; dob: string },
): Promise<void> {
  const { data: row, error: readErr } = await supabase
    .from("wrs_owners").select("detail").eq("id", ownerId).single();
  if (readErr) throw new Error(`saveOwnerCandidateNik read failed: ${readErr.message}`);

  const detail = {
    ...((row?.detail as Record<string, unknown>) ?? {}),
    candidate: {
      nik: input.nik, name: input.name, dob: input.dob,
      source: "ktp_ocr", status: "unverified", captured_at: new Date().toISOString(),
    },
  };
  const { error } = await supabase.from("wrs_owners").update({ detail }).eq("id", ownerId);
  if (error) throw new Error(`saveOwnerCandidateNik failed: ${error.message}`);
}
