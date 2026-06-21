"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addAsset, editAsset, removeAsset } from "@/services/assets";
import { parseAssetForm } from "@/lib/asset-form";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");
  return { supabase, user };
}

export async function createAssetAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  await addAsset(supabase, user.id, parseAssetForm(formData));
  revalidatePath("/aset");
  redirect("/aset");
}

export async function updateAssetAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase } = await requireUser();
  await editAsset(supabase, id, parseAssetForm(formData));
  revalidatePath("/aset");
  redirect(`/aset/${id}`);
}

export async function archiveAssetAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase } = await requireUser();
  await removeAsset(supabase, id);
  revalidatePath("/aset");
  redirect("/aset");
}
