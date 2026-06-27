import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getReleaseConfig } from "@/services/release-rule";
import { Eyebrow, H1, Card } from "@warisly/ui";
import { ChevronLeft, Clock } from "lucide-react";
import { saveReleaseRuleAction } from "@/app/actions/release-rule";

export default async function RilisPage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const cfg = await getReleaseConfig(supabase);

  if (!cfg.eligible) {
    return (
      <div className="pb-8">
        <Eyebrow>{t("rilis.eyebrow")}</Eyebrow>
        <H1>{t("rilis.verifyFirstTitle")}</H1>
        <Card className="mt-6">
          <p className="font-serif text-[15px] leading-relaxed text-paper-text">{t("rilis.verifyFirstBody")}</p>
          <Link href="/profil" className="mt-4 inline-flex items-center gap-1.5 font-sans text-sm font-semibold text-emas hover:text-emas-ink">
            {t("rilis.toVerify")}
          </Link>
        </Card>
      </div>
    );
  }

  const field = "w-full rounded-xl border-[1.5px] border-paper-edge bg-panel px-4 py-3 font-sans text-[15px] text-paper-text outline-none focus:border-emas focus:ring-4 focus:ring-emas/15";

  return (
    <div className="pb-8">
      <Link href="/profil" className="inline-flex items-center gap-1.5 font-sans text-sm font-medium text-emas hover:text-emas-ink">
        <ChevronLeft size={16} />
        {t("rilis.back")}
      </Link>
      <div className="mt-4">
        <Eyebrow>{t("rilis.eyebrow")}</Eyebrow>
        <H1>{t("rilis.title")}</H1>
        <p className="mt-2 font-serif text-[18px] leading-relaxed text-paper-muted">
          {t("rilis.intro")}
        </p>
      </div>

      <form action={saveReleaseRuleAction} className="mt-6 flex flex-col gap-4">
        <Card>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emas/10 text-emas">
              <Clock size={20} />
            </div>
            <div className="flex-1">
              <span className="font-sans text-[11px] font-semibold uppercase tracking-eyebrow text-emas">{t("rilis.waitingDays")}</span>
              <label className="mt-3 block">
                <input name="waitingDays" type="number" min={cfg.bounds.min} max={cfg.bounds.max} defaultValue={cfg.rule.waitingDays} required className={field} />
                <p className="mt-2 font-sans text-xs leading-relaxed text-paper-muted">{t("rilis.bounds", { min: cfg.bounds.min, max: cfg.bounds.max })}</p>
              </label>
            </div>
          </div>
        </Card>

        <Card>
          <fieldset>
            <span className="font-sans text-[11px] font-semibold uppercase tracking-eyebrow text-emas">{t("rilis.channels")}</span>
            <div className="mt-2 flex flex-col">
              {cfg.allowedChannels.map((c) => (
                <label key={c} className="flex items-center justify-between border-b border-paper-edge py-3 last:border-0">
                  <span className="font-sans text-[14.5px] text-paper-text">{t(`rilis.ch.${c}`)}</span>
                  <input type="checkbox" name="channels" value={c} defaultChecked={cfg.rule.channels.includes(c)} className="peer sr-only" />
                  <span className="relative h-[25px] w-[42px] shrink-0 rounded-full bg-[#cdc6b5] transition-colors peer-checked:bg-daun after:absolute after:left-[3px] after:top-[3px] after:h-[19px] after:w-[19px] after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-[17px]" aria-hidden="true"></span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-3 rounded-xl border border-paper-edge bg-[#efe7d5] px-3.5 py-3 font-sans text-[12.5px] leading-relaxed text-paper-muted">
            {t("rilis.quorumNote", { required: cfg.quorum.required, of: cfg.quorum.of })}
          </div>
        </Card>

        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-tinta px-5 py-3 font-sans text-sm font-semibold text-ink-text hover:bg-tinta-hover">
          {t("rilis.saveBtn")}
        </button>
      </form>
    </div>
  );
}
