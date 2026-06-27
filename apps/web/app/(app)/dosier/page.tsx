import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { assembleDossier } from "@/services/dossier";
import { Eyebrow, H1, H2, Estimate, Seal } from "@warisly/ui";
import { PrintButton } from "@/components/PrintButton";

export default async function DosierPage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const dossier = await assembleDossier(supabase);

  return (
    <div className="pb-12">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <Eyebrow>{t("common.viewRecovery")}</Eyebrow>
          <H1>{t("dosier.title")}</H1>
          <p className="mt-2 font-serif text-[18px] leading-relaxed text-paper-muted">
            {t("dosier.intro")}
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Print header (only on paper) */}
      <div className="mt-2 hidden items-center gap-3 print:flex">
        <Seal size={36} />
        <span className="font-display text-xl text-tinta">{t("dosier.printHeader")}</span>
      </div>

      <div className="mt-6 rounded-2xl border border-paper-edge bg-panel p-5">
        <H2>{t("dosier.docsTitle")}</H2>
        <ul className="mt-3 list-disc pl-5 font-serif text-[15px] leading-relaxed text-paper-text">
          {dossier.documents.map((d) => <li key={d.key}>{d.label}</li>)}
        </ul>
      </div>

      <div className="mt-8 flex flex-col gap-8">
        {dossier.assets.map(({ asset, playbook }) => (
          <div key={asset.id}>
            <div className="flex items-center gap-4 rounded-2xl bg-tinta p-5 text-ink-text print:bg-white print:text-paper-text print:border print:border-paper-edge">
              <Seal size={44} />
              <div className="min-w-0 flex-1">
                <span className="font-sans text-[11px] font-semibold uppercase tracking-eyebrow text-emas">
                  {t(`assets.categories.${asset.category}`)}{asset.label ? ` · ${asset.label}` : ""}
                </span>
                <h2 className="mt-1 font-display text-[22px]">{asset.provider ?? t(`assets.categories.${asset.category}`)}</h2>
                {asset.identifier && (
                  <p className="mt-1 font-sans text-[12.5px] text-ink-muted print:text-paper-muted">{t("assets.identifierShown")}: {asset.identifier}</p>
                )}
              </div>
              <Estimate value={asset.valueEstimate} lastReviewedAt={asset.lastReviewedAt} />
            </div>

            {playbook ? (
              <>
                <p className="mt-3 font-sans text-[11px] font-semibold uppercase tracking-eyebrow text-emas">{t("dosier.claimSteps")}</p>
                <div className="mt-2 rounded-2xl border border-paper-edge bg-panel p-5">
                  {[...playbook.steps].sort((a, b) => a.order - b.order).map((s, i) => (
                    <div key={s.order} className="flex gap-4 border-b border-paper-edge py-4 last:border-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-emas font-sans text-[13px] font-semibold text-emas">{i + 1}</div>
                      <div>
                        <p className="font-serif text-[15px] text-paper-text">{s.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {playbook.documents.length > 0 && (
                  <div className="mt-3 rounded-xl border border-paper-edge bg-[#efe7d5] px-3.5 py-3 font-sans text-[12.5px] leading-relaxed text-paper-muted print:bg-white">
                    {t("dosier.additionalDocs", { docs: playbook.documents.map((d) => d.label).join(", ") })}
                  </div>
                )}
              </>
            ) : (
              <div className="mt-3 rounded-xl border border-paper-edge bg-[#efe7d5] px-3.5 py-3 font-sans text-[12.5px] leading-relaxed text-paper-muted print:bg-white">
                {t("dosier.noPlaybook")}
              </div>
            )}
          </div>
        ))}
      </div>

      {dossier.liabilities.length > 0 && (
        <div className="mt-10">
          <H2>{t("dosier.liabilities")}</H2>
          <div className="mt-3 flex flex-col gap-3">
            {dossier.liabilities.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-4 rounded-2xl border border-paper-edge bg-panel p-5">
                <p className="font-display text-[18px] text-tinta">{l.provider ?? t(`assets.categories.${l.category}`)}</p>
                <Estimate value={l.valueEstimate} lastReviewedAt={l.lastReviewedAt} />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-10 font-sans text-[12.5px] leading-relaxed text-paper-muted">
        {t("dosier.generated", { date: new Date(dossier.generatedAt).toLocaleDateString("id-ID") })} {t("common.reassure")}
      </p>
    </div>
  );
}
