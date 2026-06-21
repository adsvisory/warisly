import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAsset } from "@warisly/db";
import { Eyebrow, H1 } from "@warisly/ui";
import { AssetForm } from "@/components/AssetForm";
import { assetCategoryLabel } from "@/lib/categories";

export default async function EditAsset({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const asset = await getAsset(supabase, id);
  if (!asset) notFound();
  return (
    <div>
      <Eyebrow>Ubah aset</Eyebrow>
      <H1>{asset.provider ?? assetCategoryLabel[asset.category]}</H1>
      <AssetForm initial={asset} />
    </div>
  );
}
