"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { sendOtp, verifyOtp, signInPassword, signInBypass } from "@/app/actions/auth";
import { PublicLangToggle } from "@/components/PublicLangToggle";

const DEV_LOGIN = process.env.NEXT_PUBLIC_DEV_LOGIN === "1";

export default function MasukPage() {
  const t = useTranslations("masuk");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [phoneDraft, setPhoneDraft] = useState(DEV_LOGIN ? process.env.NEXT_PUBLIC_DEV_LOGIN_PHONE ?? "" : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

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
  const field = "rounded-lg border border-paper-edge bg-panel px-4 py-3 font-sans text-paper-text outline-none focus:border-emas";
  const primary = "mt-2 rounded-lg bg-tinta px-4 py-3 font-sans font-medium text-ink-text active:opacity-90 disabled:opacity-60";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <PublicLangToggle />
      <p className="font-sans text-xs uppercase tracking-eyebrow text-emas">Warisly</p>
      <h1 className="mt-3 font-display text-3xl text-tinta">{t("title")}</h1>
      <p className="mt-2 font-sans text-sm text-paper-muted">{t("subtitle")}</p>

      {step === "phone" ? (
        <>
          <form action={onSend} className="mt-8 flex flex-col gap-3">
            <label className="font-sans text-sm text-paper-text" htmlFor="phone">{t("phoneLabel")}</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+62…"
              required
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              className={field}
            />
            <button type="submit" disabled={pending} className={primary}>
              {pending ? t("sending") : t("sendCode")}
            </button>
          </form>
          {DEV_LOGIN && (
            <form action={signInBypass} className="mt-2">
              <input type="hidden" name="phone" value={phoneDraft} />
              <button type="submit" className="font-sans text-sm text-emas underline">
                {t("bypassButton")}
              </button>
            </form>
          )}
        </>
      ) : (
        <form action={onVerify} className="mt-8 flex flex-col gap-3">
          <label className="font-sans text-sm text-paper-text" htmlFor="token">
            {t("otpLabel", { phone })}
          </label>
          <input id="token" name="token" inputMode="numeric" autoComplete="one-time-code" required className={`${field} tracking-widest`} />
          <button type="submit" disabled={pending} className={primary}>
            {pending ? t("verifying") : t("verify")}
          </button>
          <button type="button" onClick={() => setStep("phone")} className="font-sans text-sm text-emas underline">
            {t("changeNumber")}
          </button>
        </form>
      )}
      {error && <p className="mt-4 font-sans text-sm text-red-700">{t(error)}</p>}

      {DEV_LOGIN && (
        <button
          type="button"
          onClick={() => setEmailOpen(true)}
          className="mt-10 self-start font-sans text-xs text-paper-muted underline"
        >
          {t("devEmailLink")}
        </button>
      )}

      {DEV_LOGIN && emailOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/30 px-6"
          onClick={() => setEmailOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl border border-paper-edge bg-panel p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-sans text-xs uppercase tracking-eyebrow text-paper-muted">{t("devEyebrow")}</p>
            <form action={signInPassword} className="mt-4 flex flex-col gap-3">
              <input name="email" type="email" autoComplete="email" placeholder={t("emailPlaceholder")} required className={field} />
              <input name="password" type="password" autoComplete="current-password" placeholder={t("passwordPlaceholder")} required className={field} />
              <button type="submit" className={primary}>{t("signInEmail")}</button>
              <button type="button" onClick={() => setEmailOpen(false)} className="font-sans text-sm text-emas underline">
                {t("close")}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
