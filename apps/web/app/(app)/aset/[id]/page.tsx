import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAsset } from "@warisly/db";
import { Eyebrow, H1, Card, Estimate } from "@warisly/ui";
import { assetCategoryLabel } from "@/lib/categories";
import { archiveAssetAction } from "@/app/actions/assets";

export default async function AssetDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const asset = await getAsset(supabase, id);
  if (!asset) notFound();
  const instructions = (asset.detail as { instructions?: string }).instructions ?? "";

  return (
    <div>
      <Eyebrow>{assetCategoryLabel[asset.category]}</Eyebrow>
      <H1>{asset.provider ?? assetCategoryLabel[asset.category]}</H1>
      <Card className="mt-6">
        <Estimate value={asset.valueEstimate} lastReviewedAt={asset.lastReviewedAt} />
        {asset.identifier && <p className="mt-3 font-sans text-sm text-paper-muted">Pengenal: {asset.identifier}</p>}
        {instructions && <p className="mt-3 text-paper-text">{instructions}</p>}
      </Card>
      <div className="mt-4 flex items-center gap-5">
        <Link href={`/aset/${asset.id}/edit`} className="font-sans text-sm text-nyala underline">Ubah</Link>
        <form action={archiveAssetAction}>
          <input type="hidden" name="id" value={asset.id} />
          <button className="font-sans text-sm text-paper-muted underline">Arsipkan</button>
        </form>
      </div>
    </div>
  );
}
