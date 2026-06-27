"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { commitScannedAsset } from "@/services/asset-scan";

const Input = z.object({
  category: z.string().min(1),
  provider: z.string().nullable(),
  identifier: z.string().nullable(),
  valueEstimate: z.number().int().nonnegative().nullable(),
  valueNote: z.string().nullable(),
  currency: z.string().default("IDR"),
  notes: z.string().nullable(),
  rawValueSeen: z.string().nullable(),
  imageKind: z.enum(["financial_screenshot", "offline_document", "unknown"]),
  documentBase64: z.string().nullable().optional(),
  documentMime: z.enum(["image/jpeg", "image/png", "image/webp"]).nullable().optional(),
  model: z.string().default("gpt-4o-2024-08-06"),
});

export async function commitScannedAssetAction(raw: unknown) {
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "bad_request" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "unauthorized" };

  // Cardinal 1: drop any document image unless this is genuinely an offline document.
  const data = parsed.data.imageKind === "offline_document"
    ? parsed.data
    : { ...parsed.data, documentBase64: null, documentMime: null };

  try {
    const { id } = await commitScannedAsset(supabase, user.id, data);
    revalidatePath("/aset");
    return { ok: true as const, id };
  } catch {
    return { ok: false as const, error: "save_failed" };
  }
}
