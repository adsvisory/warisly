import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Check, Lock } from "lucide-react";
import { adminClient } from "@/lib/supabase/admin";
import { getTrusteeByToken } from "@warisly/db";
import { Seal } from "@warisly/ui";
import { confirmTrusteeAction } from "@/app/actions/amanah-trustees";

export const dynamic = "force-dynamic";

export default async function WaliConfirm({ params }: { params: Promise<{ token: string }> }) {
  const t = await getTranslations();
  const { token } = await params;
  const trustee = await getTrusteeByToken(adminClient(), token);
  if (!trustee) notFound();
  const confirmed = trustee.status === "confirmed";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="flex flex-col items-center text-center">
        <Seal size={56} />
        <p className="mt-4 font-sans text-xs uppercase tracking-eyebrow text-emas">{t("common.brand")}</p>
        <h1 className="mt-2 font-display text-2xl text-tinta">{t("waliConfirm.title")}</h1>
      </div>

      <div className="mt-6 rounded-2xl border border-paper-edge bg-panel p-6">
        <p className="font-serif text-[17px] leading-relaxed text-paper-text">{t("waliConfirm.greeting", { name: trustee.name })}</p>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-emas bg-kertas px-4 py-3">
          <Lock size={18} className="shrink-0 text-emas" />
          <p className="font-sans text-[13px] leading-relaxed text-daun">{t("common.reassure")}</p>
        </div>

        {confirmed ? (
          <p className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-daun/10 px-4 py-3 font-sans text-sm font-medium text-daun">
            <Check size={18} /> {t("waliConfirm.confirmed")}
          </p>
        ) : (
          <form action={confirmTrusteeAction} className="mt-5">
            <input type="hidden" name="token" value={token} />
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-tinta px-4 py-3 font-sans text-sm font-semibold text-ink-text transition hover:bg-tinta-hover">
              <Check size={17} /> {t("waliConfirm.accept")}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
