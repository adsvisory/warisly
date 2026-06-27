import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Seal } from "@warisly/ui";

export const dynamic = "force-dynamic";

export default async function KlaimTerkirim() {
  const t = await getTranslations("klaim");
  // Present only for a genuine match (set server-side after a successful submission).
  // The confirmation copy itself is identical regardless, so the page does not reveal
  // whether the submitted number matched a registered owner.
  const token = (await cookies()).get("wrs_claim_token")?.value;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center">
      <div className="flex flex-col items-center">
        <Seal size={56} />
        <p className="mt-4 font-sans text-xs uppercase tracking-eyebrow text-emas">Warisly</p>
        <h1 className="mt-2 font-display text-2xl text-tinta">{t("sentTitle")}</h1>
        <p className="mt-3 text-paper-text">{t("sentBody")}</p>
        {token && (
          <a
            href={`/klaim/${token}`}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-tinta px-4 py-3 font-sans text-sm font-semibold text-ink-text transition hover:bg-tinta-hover"
          >
            {t("viewStatus")} <ArrowRight size={16} />
          </a>
        )}
      </div>
    </main>
  );
}
