"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { upsertOwnerProfile } from "@warisly/db";

export async function sendOtp(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  if (!phone) return { error: "phoneRequired" };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) return { error: "sendFailed" };
  return { ok: true, phone };
}

export async function verifyOtp(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (error || !data.user) return { error: "wrongCode" };
  await upsertOwnerProfile(supabase, { id: data.user.id, phone });
  redirect("/beranda");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/masuk");
}

// ── Dev-only sign-in (POC bypass) ────────────────────────────────────────────
// The production app is phone-OTP only. These paths let the team into the owner
// app without an SMS round-trip. They are gated so they can NEVER run on a Vercel
// production deployment, and they sign in with the RLS-bound anon client
// (signInWithPassword) — the service-role key never touches this request path.
// The dev user is created offline by packages/db/scripts/seed-dev-user.mjs.
function devLoginAllowed(): boolean {
  // Hard block on a Vercel *production* deployment, regardless of any flag.
  if (process.env.VERCEL_ENV === "production") return false;
  // Must be explicitly opted in. This env var is simply never set in prod.
  return process.env.DEV_LOGIN_BYPASS === "1";
}

// Deterministic dev email for a given phone. MUST stay in sync with the same
// derivation in packages/db/scripts/seed-dev-user.mjs.
function devEmailForPhone(phone: string): string {
  return `dev+${phone.replace(/\D/g, "")}@warisly.test`;
}

// "Bypass number" sign-in: the user types only a phone number; the shared dev
// password is supplied server-side. Signs in via the seeded email credential so
// it works even before the SMS/Phone provider is configured.
export async function signInBypass(formData: FormData): Promise<void> {
  if (!devLoginAllowed()) redirect("/masuk?error=disabled");
  const password = process.env.DEV_LOGIN_PASSWORD;
  const phone = String(formData.get("phone") ?? "").trim();
  if (!password || !phone) redirect("/masuk?error=invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: devEmailForPhone(phone),
    password,
  });
  if (error || !data.user) redirect("/masuk?error=invalid");
  await upsertOwnerProfile(supabase, { id: data.user.id, phone });
  redirect("/beranda");
}

// Dev-only email+password sign-in (manually-created users).
export async function signInPassword(formData: FormData): Promise<void> {
  if (!devLoginAllowed()) redirect("/masuk?error=disabled");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) redirect("/masuk?error=invalid");
  await upsertOwnerProfile(supabase, { id: data.user.id, phone: data.user.phone || null });
  redirect("/beranda");
}
