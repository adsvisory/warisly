"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveReleaseRule } from "@/services/release-rule";

export async function saveReleaseRuleAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");
  const channels = formData.getAll("channels").map(String);
  await saveReleaseRule(supabase, user.id, { waitingDays: formData.get("waitingDays"), channels });
  revalidatePath("/rilis");
}
