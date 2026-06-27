"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { startClaimAction } from "@/app/actions/claim";
import { Seal } from "@warisly/ui";

export default function KlaimPage() {
  const t = useTranslations("klaim");
  const [state, action, pending] = useActionState(startClaimAction, null);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <Seal size={56} />
      <p className="mt-4 font-sans text-xs uppercase tracking-eyebrow text-emas">Warisly</p>
      <h1 className="mt-2 font-display text-2xl text-tinta">{t("title")}</h1>
      <p className="mt-3 text-paper-text">{t("intro")}</p>
      <form action={action} className="mt-6 flex flex-col gap-3">
        <input name="phone" type="tel" placeholder="+62…" required className="rounded-lg border border-paper-edge bg-panel px-4 py-3 font-sans text-paper-text outline-none focus:border-emas" />
        <button disabled={pending} className="rounded-lg bg-tinta px-4 py-3 font-sans font-medium text-ink-text active:opacity-90 disabled:opacity-60">
          {pending ? t("checking") : t("start")}
        </button>
      </form>
      {state?.error && <p className="mt-4 font-sans text-sm text-paper-muted">{t(state.error)}</p>}
    </main>
  );
}
