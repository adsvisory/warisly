"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addRecipient, removeRecipient, addWish, removeWish } from "@/services/amanah";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");
  return { supabase, user };
}

export async function addRecipientAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const nikRaw = String(formData.get("nik") ?? "").replace(/\D/g, "");
  await addRecipient(supabase, user.id, {
    name: String(formData.get("name") ?? ""),
    nik: nikRaw ? nikRaw : null,
    relationship: String(formData.get("relationship") ?? "lainnya"),
    visibility: String(formData.get("visibility") ?? "after_death"),
    note: String(formData.get("note") ?? "").trim() || null,
  });
  revalidatePath("/amanah");
}

export async function deleteRecipientAction(formData: FormData) {
  const { supabase } = await requireUser();
  await removeRecipient(supabase, String(formData.get("id") ?? ""));
  revalidatePath("/amanah");
}

export async function addWishAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  await addWish(supabase, user.id, String(formData.get("text") ?? ""));
  revalidatePath("/amanah");
}

export async function deleteWishAction(formData: FormData) {
  const { supabase } = await requireUser();
  await removeWish(supabase, String(formData.get("id") ?? ""));
  revalidatePath("/amanah");
}
