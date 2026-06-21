"use client";

import { useState } from "react";
import { sendOtp, verifyOtp, signInPassword } from "@/app/actions/auth";
import { copy } from "@warisly/lib";

export default function MasukPage() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSend(formData: FormData) {
    setPending(true); setError(null);
    const res = await sendOtp(formData);
    setPending(false);
    if (res?.error) return setError(res.error);
    if (res?.phone) { setPhone(res.phone); setStep("otp"); }
  }
  async function onVerify(formData: FormData) {
    setPending(true); setError(null);
    formData.set("phone", phone);
    const res = await verifyOtp(formData);
    setPending(false);
    if (res?.error) setError(res.error);
  }

  const field = "rounded-lg border border-paper-edge bg-white px-4 py-3 font-sans text-paper-text outline-none focus:border-nyala";
  const primary = "mt-2 rounded-lg bg-nyala px-4 py-3 font-sans font-medium text-white active:bg-nyala-pressed disabled:opacity-60";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="font-sans text-xs uppercase tracking-eyebrow text-emas">{copy.brand}</p>
      <h1 className="mt-3 font-display text-3xl text-tinta">Masuk</h1>
      <p className="mt-2 font-sans text-sm text-paper-muted">
        {copy.reassurePassword} — cukup nomor telepon.
      </p>

      {step === "phone" ? (
        <form action={onSend} className="mt-8 flex flex-col gap-3">
          <label className="font-sans text-sm text-paper-text" htmlFor="phone">Nomor telepon</label>
          <input id="phone" name="phone" type="tel" placeholder="+62…" required className={field} />
          <button type="submit" disabled={pending} className={primary}>
            {pending ? "Mengirim…" : "Kirim kode"}
          </button>
        </form>
      ) : (
        <form action={onVerify} className="mt-8 flex flex-col gap-3">
          <label className="font-sans text-sm text-paper-text" htmlFor="token">
            Masukkan kode dari SMS ke {phone}
          </label>
          <input id="token" name="token" inputMode="numeric" autoComplete="one-time-code" required className={`${field} tracking-widest`} />
          <button type="submit" disabled={pending} className={primary}>
            {pending ? "Memverifikasi…" : "Masuk"}
          </button>
          <button type="button" onClick={() => setStep("phone")} className="font-sans text-sm text-nyala underline">
            Ganti nomor
          </button>
        </form>
      )}
      {error && <p className="mt-4 font-sans text-sm text-red-700">{error}</p>}

      {process.env.NODE_ENV !== "production" && (
        <form action={signInPassword} className="mt-8 flex flex-col gap-3 border-t border-paper-edge pt-6">
          <p className="font-sans text-xs uppercase tracking-eyebrow text-paper-muted">Uji (dev) — masuk dengan email</p>
          <input name="email" type="email" autoComplete="email" placeholder="email" required className={field} />
          <input name="password" type="password" autoComplete="current-password" placeholder="password" required className={field} />
          <button type="submit" className={primary}>Masuk (email)</button>
        </form>
      )}
    </main>
  );
}
