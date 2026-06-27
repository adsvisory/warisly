"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setOwnerLocale } from "@warisly/db";

export async function setLocaleAction(locale: "id" | "en") {
  const loc: "id" | "en" = locale === "en" ? "en" : "id";
  const store = await cookies();
  store.set("locale", loc, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  // Persist to the owner profile if signed in (RLS: own row only).
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await setOwnerLocale(supabase, user.id, loc);
  } catch {
    // not signed in (public/heir surface) — cookie is enough
  }

  revalidatePath("/", "layout");
}
