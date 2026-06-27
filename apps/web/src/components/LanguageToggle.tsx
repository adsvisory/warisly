"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleAction } from "@/app/actions/locale";

export function LanguageToggle() {
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

  const base = "rounded-full px-3 py-1.5 font-sans text-xs transition-colors disabled:opacity-50";
  const on = "bg-tinta text-ink-text";
  const off = "text-paper-muted hover:text-tinta";

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-paper-edge p-1">
      <button type="button" disabled={pending} aria-pressed={locale === "id"} onClick={() => choose("id")} className={`${base} ${locale === "id" ? on : off}`}>
        Indonesia
      </button>
      <button type="button" disabled={pending} aria-pressed={locale === "en"} onClick={() => choose("en")} className={`${base} ${locale === "en" ? on : off}`}>
        English
      </button>
    </div>
  );
}
