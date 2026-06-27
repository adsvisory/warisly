import type { SupabaseClient } from "@supabase/supabase-js";

export type StaffRole = "reviewer" | "admin";
export interface StaffRow { email: string; role: StaffRole; active: boolean; }

// Allowlist + RBAC lookup for the back-office. Works with either the RLS-bound
// anon client (self-read only) or the service-role admin client. Data access
// only — membership/role decisions live in the service/util layer above.
export async function getStaffByEmail(supabase: SupabaseClient, email: string): Promise<StaffRow | null> {
  const normalized = email.toLowerCase().trim();
  if (!normalized) return null;
  const { data, error } = await supabase.from("wrs_staff")
    .select("email, role, active").eq("email", normalized).maybeSingle();
  if (error) throw new Error(`getStaffByEmail failed: ${error.message}`);
  return data ? { email: data.email, role: data.role as StaffRole, active: data.active } : null;
}
