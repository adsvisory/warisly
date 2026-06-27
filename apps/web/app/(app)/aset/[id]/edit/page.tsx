import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getAsset } from "@warisly/db";
import { Eyebrow, H1 } from "@warisly/ui";
import { AssetForm } from "@/components/AssetForm";

export default async function EditAsset({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();
  const supabase = await createClient();
  const asset = await getAsset(supabase, id);
  if (!asset) notFound();
  return (
    <div>
      <Eyebrow>{t("assets.editTitle")}</Eyebrow>
      <H1>{asset.provider ?? t(`assets.categories.${asset.category}`)}</H1>
      <AssetForm initial={asset} />
    </div>
  );
}
