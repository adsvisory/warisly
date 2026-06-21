# IMPLEMENTATION BRIEF: Amanah Data Layer + Service
## Surface: db (`packages/db`) + web service (`apps/web/src/services`)
## Brief: #7b
## Phase: 1 (MVP)
## Depends on: #7a
## Blocks: #7c-i, #7c-ii
## Parallel with: None

### CONTEXT
CRUD for the three Amanah roles in `@warisly/db` (owner-path under RLS; token confirmation via service-role) and the service that assembles the Amanah view with quorum status and validates writes.

### NON-NEGOTIABLE CHECK
Owner CRUD runs under RLS. `confirmTrusteeByToken` is the only service-role path (trustees have no account) and matches strictly on the unguessable token. Quorum comes from `wrs_settings` (`trustees.quorum`), never hardcoded. No credentials.

### PRE-FLIGHT CHECKS
- [ ] Amanah tables + ENUMs exist (#7a); `getSetting` exists (#6b).

### FILES TO CREATE/MODIFY

#### 1. `packages/db/src/data/amanah.ts`
**Action:** CREATE **Layer:** Data
```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

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
  const { data, error } = await supabase.from("wrs_trustees").select("id, owner_id, name, contact_type, contact_value, role, status, confirm_token, confirmed_at").eq("confirm_token", token).maybeSingle();
  if (error) throw new Error(`getTrusteeByToken failed: ${error.message}`);
  return data ? toTrustee(data) : null;
}
export async function confirmTrusteeByToken(supabase: SupabaseClient, token: string): Promise<boolean> {
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
```

#### 2. `packages/db/src/index.ts`
**Action:** MODIFY **Layer:** Data
```typescript
// ... existing exports ...
export * from "./data/amanah"; // ← add
```

#### 3. `apps/web/src/services/amanah.ts`
**Action:** CREATE **Layer:** Service
```typescript
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  listTrustees, createTrustee, deleteTrustee,
  listRecipients, createRecipient, deleteRecipient,
  listWishes, createWish, deleteWish, getSetting,
  type Trustee, type Recipient, type Wish,
} from "@warisly/db";

export interface Quorum { required: number; of: number; }

export interface AmanahView {
  trustees: Trustee[]; recipients: Recipient[]; wishes: Wish[];
  quorum: Quorum; confirmedTrustees: number; quorumMet: boolean;
}

export async function getAmanah(supabase: SupabaseClient): Promise<AmanahView> {
  const [trustees, recipients, wishes, quorum] = await Promise.all([
    listTrustees(supabase), listRecipients(supabase), listWishes(supabase),
    getSetting<Quorum>(supabase, "trustees.quorum"),
  ]);
  const q = quorum ?? { required: 2, of: 3 };
  const confirmedTrustees = trustees.filter((t) => t.status === "confirmed").length;
  return { trustees, recipients, wishes, quorum: q, confirmedTrustees, quorumMet: confirmedTrustees >= q.required };
}

const trusteeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  contactType: z.enum(["whatsapp", "phone", "email"]),
  contactValue: z.string().trim().min(1).max(200),
  role: z.enum(["primary", "backup"]).default("primary"),
});
const recipientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  nik: z.string().trim().regex(/^\d{16}$/, "NIK harus 16 digit").nullable(),
  relationship: z.enum(["pasangan", "anak", "orang_tua", "saudara", "lainnya"]).default("lainnya"),
  visibility: z.enum(["now", "after_death"]).default("after_death"),
  note: z.string().trim().max(500).nullable(),
});

export async function addTrustee(supabase: SupabaseClient, ownerId: string, values: unknown): Promise<Trustee> {
  return createTrustee(supabase, ownerId, trusteeSchema.parse(values));
}
export async function removeTrustee(supabase: SupabaseClient, id: string) { return deleteTrustee(supabase, id); }

export async function addRecipient(supabase: SupabaseClient, ownerId: string, values: unknown): Promise<Recipient> {
  return createRecipient(supabase, ownerId, recipientSchema.parse(values));
}
export async function removeRecipient(supabase: SupabaseClient, id: string) { return deleteRecipient(supabase, id); }

export async function addWish(supabase: SupabaseClient, ownerId: string, text: string): Promise<Wish> {
  const t = z.string().trim().min(1).max(1000).parse(text);
  return createWish(supabase, ownerId, t);
}
export async function removeWish(supabase: SupabaseClient, id: string) { return deleteWish(supabase, id); }
```

### VERIFICATION
- [ ] `getAmanah` returns the three lists plus `quorum` from settings and a correct `quorumMet` (e.g. 2 confirmed of required 2 → true).
- [ ] `addRecipient` with a 15-digit NIK throws ("NIK harus 16 digit"); a valid one succeeds.
- [ ] `confirmTrusteeByToken` flips an `invited` trustee to `confirmed` and returns true; a second call returns false (already confirmed).
- [ ] No service-role usage on owner CRUD paths; only token confirmation is service-role.
