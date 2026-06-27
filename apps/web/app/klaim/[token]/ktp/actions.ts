"use server";

import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";
import { resolveOpenClaimByToken, saveHeirCandidateNik } from "@warisly/db";
import { readKtp } from "@/services/ktp-ocr";

// Token-gated, NO session (#12b-iii). The heir has no Supabase account — access is authorized
// solely by the claim token (Cardinal 4: heir recovery works from a plain web link). Each call
// re-validates the token via a service-role client and is scoped strictly to that one claim.

const Img = z.object({ base64: z.string().min(1), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]) });

export async function ocrHeirKtpAction(token: string, raw: unknown) {
  const claim = await resolveOpenClaimByToken(adminClient(), token);
  if (!claim) throw new Error("invalid_claim");
  const p = Img.safeParse(raw);
  if (!p.success) throw new Error("bad_request");
  // Log against the estate owner_id (FK-valid), never the claim id.
  return readKtp({ logOwnerId: claim.ownerId, base64: p.data.base64, mimeType: p.data.mimeType });
}

const Confirm = z.object({ nik: z.string().regex(/^\d{16}$/), name: z.string().min(1), dob: z.string().min(1) });

export async function commitHeirKtpAction(token: string, raw: unknown) {
  const claim = await resolveOpenClaimByToken(adminClient(), token);
  if (!claim) return { ok: false as const };
  const p = Confirm.safeParse(raw);
  if (!p.success) return { ok: false as const };
  try {
    // Writes ONLY detail.candidate (unverified) — never flips release status (Cardinal 5).
    await saveHeirCandidateNik(adminClient(), claim.id, p.data);
    return { ok: true as const };
  } catch {
    return { ok: false as const };
  }
}
