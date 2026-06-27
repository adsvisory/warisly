import { getStaffByEmail, type StaffRole } from "@warisly/db";
import { createClient } from "@/lib/supabase/server";

export interface Staff { id: string; email: string; role: StaffRole; }

// Resolve the signed-in staff member (allowlist + role) via the RLS-bound anon
// client — wrs_staff self-read returns ONLY the caller's own row.
export async function getStaff(): Promise<Staff | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const row = await getStaffByEmail(supabase, user.email);
  if (!row || !row.active) return null;
  return { id: user.id, email: row.email, role: row.role };
}

export async function hasAAL2(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel === "aal2";
}
