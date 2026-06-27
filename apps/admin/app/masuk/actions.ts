"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getStaffByEmail } from "@warisly/db";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  // Only send to allowlisted staff (avoid leaking who is/isn't staff by always redirecting "sent").
  const staff = await getStaffByEmail(adminClient(), email);
  if (staff?.active) {
    const h = await headers();
    const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
    const supabase = await createClient();
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/callback` } });
  }
  redirect("/masuk?sent=1");
}
