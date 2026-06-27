"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { saveOwnerCandidateNik } from "@warisly/db";
import { readKtp } from "@/services/ktp-ocr";

// Session-gated (#12b-ii): the owner has a Supabase session; the candidate write is RLS-bound
// to their own profile row. OCR and commit both re-check auth.

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  return { supabase, ownerId: user.id };
}

const Img = z.object({ base64: z.string().min(1), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]) });

export async function ocrOwnerKtpAction(raw: unknown) {
  const { ownerId } = await requireOwner();
  const p = Img.safeParse(raw);
  if (!p.success) throw new Error("bad_request");
  return readKtp({ logOwnerId: ownerId, base64: p.data.base64, mimeType: p.data.mimeType });
}

const Confirm = z.object({ nik: z.string().regex(/^\d{16}$/), name: z.string().min(1), dob: z.string().min(1) });

export async function commitOwnerKtpAction(raw: unknown) {
  const { supabase, ownerId } = await requireOwner();
  const p = Confirm.safeParse(raw);
  if (!p.success) return { ok: false as const };
  try {
    await saveOwnerCandidateNik(supabase, ownerId, p.data);
    revalidatePath("/profil");
    return { ok: true as const };
  } catch {
    return { ok: false as const };
  }
}
