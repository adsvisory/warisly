"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { beginEkyc } from "@/services/ekyc";

export async function startEkycAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const baseUrl = `${proto}://${h.get("host")}`;
  const url = await beginEkyc(user.id, baseUrl);
  redirect(url); // hand off to the vendor's verification page
}
