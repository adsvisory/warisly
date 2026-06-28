"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleAction } from "@/app/actions/locale";

/**
 * Compact language switcher for the public / heir surfaces (landing, masuk, klaim, wali).
 * Heirs never sign in, so the in-Profile LanguageToggle is out of reach here — this floats
 * in the corner and writes the same locale cookie via setLocaleAction.
 */
export function PublicLangToggle() {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: "id" | "en") {
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  const base = "rounded-full px-2.5 py-1 font-sans text-[11px] font-medium transition-colors disabled:opacity-50";
  const on = "bg-tinta text-ink-text";
  const off = "text-paper-muted hover:text-tinta";

  return (
    <div className="fixed right-4 top-4 z-50 inline-flex items-center gap-0.5 rounded-full border border-paper-edge bg-kertas/95 p-1 shadow-sm backdrop-blur print:hidden">
      <button type="button" disabled={pending} aria-label="Bahasa Indonesia" aria-pressed={locale === "id"} onClick={() => choose("id")} className={`${base} ${locale === "id" ? on : off}`}>
        ID
      </button>
      <button type="button" disabled={pending} aria-label="English" aria-pressed={locale === "en"} onClick={() => choose("en")} className={`${base} ${locale === "en" ? on : off}`}>
        EN
      </button>
    </div>
  );
}
