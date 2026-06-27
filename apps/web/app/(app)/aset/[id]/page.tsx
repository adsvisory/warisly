import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Pencil, Archive, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAsset } from "@warisly/db";
import { Eyebrow, H1, Estimate } from "@warisly/ui";
import { archiveAssetAction } from "@/app/actions/assets";

export default async function AssetDetail({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations();
  const { id } = await params;
  const supabase = await createClient();
  const asset = await getAsset(supabase, id);
  if (!asset) notFound();
  const instructions = (asset.detail as { instructions?: string }).instructions ?? "";

  return (
    <div>
      <Eyebrow>{t(`assets.categories.${asset.category}`)}</Eyebrow>
      <H1>{asset.provider ?? t(`assets.categories.${asset.category}`)}</H1>

      <div className="mt-6 overflow-hidden rounded-2xl border border-paper-edge bg-panel">
        <div className="border-b border-paper-edge px-5 py-4">
          <Estimate value={asset.valueEstimate} lastReviewedAt={asset.lastReviewedAt} estimateLabel={t("assets.estimate")} reviewedLabel={t("assets.lastReviewed")} />
        </div>
        {asset.identifier && (
          <div className="border-b border-paper-edge px-5 py-4 last:border-0">
            <p className="font-sans text-[13px] text-paper-muted">{t("assets.identifierShown")}</p>
            <p className="mt-0.5 font-display text-[18px] text-tinta">{asset.identifier}</p>
          </div>
        )}
        {instructions && (
          <div className="px-5 py-4">
            <p className="font-serif text-[16px] leading-relaxed text-paper-text">{instructions}</p>
          </div>
        )}
      </div>

      <div className="mt-4">
        <Link
          href={`/aset/${asset.id}/edit`}
          className="inline-flex items-center gap-2 rounded-xl border border-paper-edge bg-panel px-4 py-2.5 font-sans text-sm font-medium text-tinta hover:border-emas"
        >
          <Pencil size={15} />
          {t("assets.edit")}
        </Link>
      </div>

      <details className="group mt-8 border-t border-paper-edge pt-5">
        <summary className="inline-flex cursor-pointer list-none items-center gap-2 font-sans text-[13px] font-medium text-paper-muted transition hover:text-bata [&::-webkit-details-marker]:hidden">
          <Archive size={14} />
          {t("assets.archive")}
          <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-4 max-w-md rounded-2xl border border-bata-edge bg-bata-tint p-5">
          <p className="font-display text-[17px] text-tinta">{t("assets.archiveConfirmTitle")}</p>
          <p className="mt-2 font-serif text-[14.5px] leading-relaxed text-paper-text">{t("assets.archiveConfirmBody")}</p>
          <form action={archiveAssetAction} className="mt-5">
            <input type="hidden" name="id" value={asset.id} />
            <button className="inline-flex items-center gap-2 rounded-xl bg-bata px-4 py-2.5 font-sans text-sm font-semibold text-white transition hover:bg-bata-hover">
              <Archive size={15} />
              {t("assets.archiveConfirm")}
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}
