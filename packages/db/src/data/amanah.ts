import type { SupabaseClient } from "@supabase/supabase-js";

// confirm_token is a uuid column; guard the format so an invalid token returns null/false
// instead of raising a Postgres "invalid input syntax for type uuid" error (→ unhandled 500).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TrusteeRole = "primary" | "backup";
export type TrusteeStatus = "invited" | "confirmed" | "declined";
export type ContactType = "whatsapp" | "phone" | "email";
export type Visibility = "now" | "after_death";
export type Relationship = "pasangan" | "anak" | "orang_tua" | "saudara" | "lainnya";

export interface Trustee {
  id: string; ownerId: string; name: string; contactType: ContactType; contactValue: string;
  role: TrusteeRole; status: TrusteeStatus; confirmToken: string; confirmedAt: string | null;
}
export interface Recipient {
  id: string; ownerId: string; name: string; nik: string | null;
  relationship: Relationship; visibility: Visibility; note: string | null;
}
export interface Wish { id: string; ownerId: string; text: string; }

/* eslint-disable @typescript-eslint/no-explicit-any */
const toTrustee = (r: any): Trustee => ({ id: r.id, ownerId: r.owner_id, name: r.name, contactType: r.contact_type, contactValue: r.contact_value, role: r.role, status: r.status, confirmToken: r.confirm_token, confirmedAt: r.confirmed_at });
const toRecipient = (r: any): Recipient => ({ id: r.id, ownerId: r.owner_id, name: r.name, nik: r.nik, relationship: r.relationship, visibility: r.visibility, note: r.note });
const toWish = (r: any): Wish => ({ id: r.id, ownerId: r.owner_id, text: r.text });

// ── Trustees ────────────────────────────────────────────────────────────────
export async function listTrustees(supabase: SupabaseClient): Promise<Trustee[]> {
  const { data, error } = await supabase.from("wrs_trustees").select("id, owner_id, name, contact_type, contact_value, role, status, confirm_token, confirmed_at").order("created_at");
  if (error) throw new Error(`listTrustees failed: ${error.message}`);
  return (data as any[]).map(toTrustee);
}
export async function createTrustee(supabase: SupabaseClient, ownerId: string, input: { name: string; contactType: ContactType; contactValue: string; role: TrusteeRole }): Promise<Trustee> {
  const { data, error } = await supabase.from("wrs_trustees").insert({ owner_id: ownerId, name: input.name, contact_type: input.contactType, contact_value: input.contactValue, role: input.role }).select("id, owner_id, name, contact_type, contact_value, role, status, confirm_token, confirmed_at").single();
  if (error) throw new Error(`createTrustee failed: ${error.message}`);
  return toTrustee(data);
}
export async function deleteTrustee(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("wrs_trustees").delete().eq("id", id);
  if (error) throw new Error(`deleteTrustee failed: ${error.message}`);
}
export async function getTrusteeByToken(supabase: SupabaseClient, token: string): Promise<Trustee | null> {
  if (!UUID_RE.test(token)) return null;
  const { data, error } = await supabase.from("wrs_trustees").select("id, owner_id, name, contact_type, contact_value, role, status, confirm_token, confirmed_at").eq("confirm_token", token).maybeSingle();
  if (error) throw new Error(`getTrusteeByToken failed: ${error.message}`);
  return data ? toTrustee(data) : null;
}
export async function confirmTrusteeByToken(supabase: SupabaseClient, token: string): Promise<boolean> {
  if (!UUID_RE.test(token)) return false;
  const { data, error } = await supabase.from("wrs_trustees").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("confirm_token", token).eq("status", "invited").select("id");
  if (error) throw new Error(`confirmTrusteeByToken failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

// ── Recipients ──────────────────────────────────────────────────────────────
export async function listRecipients(supabase: SupabaseClient): Promise<Recipient[]> {
  const { data, error } = await supabase.from("wrs_recipients").select("id, owner_id, name, nik, relationship, visibility, note").order("created_at");
  if (error) throw new Error(`listRecipients failed: ${error.message}`);
  return (data as any[]).map(toRecipient);
}
export async function createRecipient(supabase: SupabaseClient, ownerId: string, input: { name: string; nik: string | null; relationship: Relationship; visibility: Visibility; note: string | null }): Promise<Recipient> {
  const { data, error } = await supabase.from("wrs_recipients").insert({ owner_id: ownerId, name: input.name, nik: input.nik, relationship: input.relationship, visibility: input.visibility, note: input.note }).select("id, owner_id, name, nik, relationship, visibility, note").single();
  if (error) throw new Error(`createRecipient failed: ${error.message}`);
  return toRecipient(data);
}
export async function deleteRecipient(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("wrs_recipients").delete().eq("id", id);
  if (error) throw new Error(`deleteRecipient failed: ${error.message}`);
}

// ── Wishes ──────────────────────────────────────────────────────────────────
export async function listWishes(supabase: SupabaseClient): Promise<Wish[]> {
  const { data, error } = await supabase.from("wrs_wishes").select("id, owner_id, text").order("created_at");
  if (error) throw new Error(`listWishes failed: ${error.message}`);
  return (data as any[]).map(toWish);
}
export async function createWish(supabase: SupabaseClient, ownerId: string, text: string): Promise<Wish> {
  const { data, error } = await supabase.from("wrs_wishes").insert({ owner_id: ownerId, text }).select("id, owner_id, text").single();
  if (error) throw new Error(`createWish failed: ${error.message}`);
  return toWish(data);
}
export async function deleteWish(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("wrs_wishes").delete().eq("id", id);
  if (error) throw new Error(`deleteWish failed: ${error.message}`);
}
