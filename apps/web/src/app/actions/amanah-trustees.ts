"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { addTrustee, removeTrustee } from "@/services/amanah";
import { confirmTrusteeByToken } from "@warisly/db";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");
  return { supabase, user };
}

export async function addTrusteeAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  await addTrustee(supabase, user.id, {
    name: String(formData.get("name") ?? ""),
    contactType: String(formData.get("contactType") ?? "whatsapp"),
    contactValue: String(formData.get("contactValue") ?? ""),
    role: String(formData.get("role") ?? "primary"),
  });
  revalidatePath("/amanah/wali");
}

export async function deleteTrusteeAction(formData: FormData) {
  const { supabase } = await requireUser();
  await removeTrustee(supabase, String(formData.get("id") ?? ""));
  revalidatePath("/amanah/wali");
}

// PUBLIC — no auth. Token-gated via service-role.
export async function confirmTrusteeAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  await confirmTrusteeByToken(adminClient(), token);
  redirect(`/wali/${token}`);
}
