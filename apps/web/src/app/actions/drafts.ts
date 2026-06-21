"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addAsset } from "@/services/assets";
import { updateDraftStatus } from "@warisly/db";
import { parseAssetForm } from "@/lib/asset-form";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");
  return { supabase, user };
}

export async function confirmDraftAction(formData: FormData) {
  const draftId = String(formData.get("draftId") ?? "");
  const { supabase, user } = await requireUser();
  await addAsset(supabase, user.id, parseAssetForm(formData)); // create the asset first
  await updateDraftStatus(supabase, draftId, "confirmed");      // then retire the draft
  revalidatePath("/aset");
  revalidatePath("/aset/draf");
  redirect("/aset");
}

export async function discardDraftAction(formData: FormData) {
  const draftId = String(formData.get("draftId") ?? "");
  const { supabase } = await requireUser();
  await updateDraftStatus(supabase, draftId, "discarded");
  revalidatePath("/aset/draf");
  redirect("/aset/draf");
}
