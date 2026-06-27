import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getDraft } from "@warisly/db";
import { Eyebrow, H1, Card } from "@warisly/ui";
import { AssetForm } from "@/components/AssetForm";
import { confirmDraftAction, discardDraftAction } from "@/app/actions/drafts";

const fieldLabelKey: Record<string, string> = {
  category: "drafts.fieldCategory",
  provider: "drafts.fieldProvider",
  valueEstimate: "drafts.fieldValue",
};

export default async function DraftReview({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations();
  const { id } = await params;
  const supabase = await createClient();
  const d = await getDraft(supabase, id);
  if (!d || d.status !== "pending") notFound();

  const flags = (d.confidence?.lowConfidence as string[] | undefined) ?? [];
  const initial = {
    category: d.category ?? undefined, provider: d.provider, label: d.label,
    identifier: d.identifier, valueEstimate: d.valueEstimate, detail: d.detail,
  };

  return (
    <div>
      <Eyebrow>{t("drafts.fromWhatsapp")}</Eyebrow>
      <H1>{t("drafts.reviewTitle")}</H1>
      {flags.length > 0 && (
        <Card className="mt-4 border-amber-300 bg-amber-50">
          <p className="font-sans text-sm text-amber-800">
            {t("drafts.lowConfidence", { fields: flags.map((f) => (fieldLabelKey[f] ? t(fieldLabelKey[f]) : f)).join(", ") })}
          </p>
        </Card>
      )}
      <AssetForm initial={initial} action={confirmDraftAction} hidden={{ draftId: d.id }} submitLabel={t("common.save")} />
      <form action={discardDraftAction} className="mt-3">
        <input type="hidden" name="draftId" value={d.id} />
        <button className="font-sans text-sm text-paper-muted underline">{t("drafts.discard")}</button>
      </form>
    </div>
  );
}
