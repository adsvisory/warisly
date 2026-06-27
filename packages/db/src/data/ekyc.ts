import type { SupabaseClient } from "@supabase/supabase-js";

export type EkycStatus = "created" | "passed" | "failed" | "expired";

export interface OwnerKyc { kycStatus: string; releaseEligible: boolean; kycVerifiedAt: string | null; }

export async function createEkycSession(supabase: SupabaseClient, ownerId: string, vendorRef: string): Promise<string> {
  const { data, error } = await supabase.from("wrs_ekyc_sessions")
    .insert({ owner_id: ownerId, vendor_ref: vendorRef, status: "created" })
    .select("id").single();
  if (error) throw new Error(`createEkycSession failed: ${error.message}`);
  return data.id as string;
}

// Single-transition / replay-safe: a session may only move OUT of "created" once.
// The `.eq("status", "created")` guard means a replayed webhook (or a stale
// failed→passed reorder) updates zero rows and returns null, so the caller never
// re-applies a verification result. Returns null when no fresh transition occurred.
export async function markEkycResult(supabase: SupabaseClient, vendorRef: string, status: EkycStatus, meta: Record<string, unknown>): Promise<{ ownerId: string } | null> {
  const { data, error } = await supabase.from("wrs_ekyc_sessions")
    .update({ status, result_meta: meta }).eq("vendor_ref", vendorRef).eq("status", "created")
    .select("owner_id").maybeSingle();
  if (error) throw new Error(`markEkycResult failed: ${error.message}`);
  return data ? { ownerId: data.owner_id as string } : null;
}

export async function setOwnerVerified(supabase: SupabaseClient, ownerId: string, input: { verifiedNik: string | null; ekycRef: string }): Promise<void> {
  const { error } = await supabase.from("wrs_owners").update({
    kyc_status: "verified",
    verified_nik: input.verifiedNik,
    ekyc_ref: input.ekycRef,
    kyc_verified_at: new Date().toISOString(),
    release_eligible: true,
  }).eq("id", ownerId);
  if (error) throw new Error(`setOwnerVerified failed: ${error.message}`);
}

export async function getOwnerKyc(supabase: SupabaseClient): Promise<OwnerKyc | null> {
  const { data, error } = await supabase.from("wrs_owners")
    .select("kyc_status, release_eligible, kyc_verified_at").maybeSingle();
  if (error) throw new Error(`getOwnerKyc failed: ${error.message}`);
  if (!data) return null;
  return { kycStatus: data.kyc_status, releaseEligible: data.release_eligible, kycVerifiedAt: data.kyc_verified_at };
}
