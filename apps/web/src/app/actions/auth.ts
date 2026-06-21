"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { upsertOwnerProfile } from "@warisly/db";

export async function sendOtp(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  if (!phone) return { error: "Nomor telepon wajib diisi." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) return { error: "Gagal mengirim kode. Coba lagi." };
  return { ok: true, phone };
}

export async function verifyOtp(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (error || !data.user) return { error: "Kode salah atau kedaluwarsa." };
  await upsertOwnerProfile(supabase, { id: data.user.id, phone });
  redirect("/beranda");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/masuk");
}

// Dev-only email+password sign-in (the production app is phone-OTP only).
// Guarded so it cannot be used in production.
export async function signInPassword(formData: FormData): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) redirect("/masuk?error=invalid");
  await upsertOwnerProfile(supabase, { id: data.user.id, phone: data.user.phone || null });
  redirect("/beranda");
}
