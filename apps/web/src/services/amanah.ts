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
