import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRegistry, isFresh } from "@/services/assets";
import { Eyebrow, H1, H2, Card, Estimate, FreshnessChip } from "@warisly/ui";
import { copy } from "@warisly/lib";
import { assetCategoryLabel } from "@/lib/categories";
import type { Asset } from "@warisly/db";

function AssetRow({ a }: { a: Asset }) {
  return (
    <Link href={`/aset/${a.id}`}>
      <Card className="mt-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg text-tinta">{a.provider ?? assetCategoryLabel[a.category]}</p>
            <p className="font-sans text-xs text-paper-muted">{a.label ?? assetCategoryLabel[a.category]}</p>
          </div>
          <FreshnessChip fresh={isFresh(a)} />
        </div>
        <div className="mt-2"><Estimate value={a.valueEstimate} lastReviewedAt={a.lastReviewedAt} /></div>
      </Card>
    </Link>
  );
}

export default async function AsetPage() {
  const supabase = await createClient();
  const reg = await getRegistry(supabase);
  return (
    <div>
      <Eyebrow>{copy.brand}</Eyebrow>
      <H1>{copy.nav.assets}</H1>
      <Link href="/aset/baru" className="mt-4 inline-block rounded-lg bg-nyala px-4 py-3 font-sans font-medium text-white">
        {copy.actions.addAsset}
      </Link>

      <div className="mt-8">
        <H2>Aset</H2>
        {reg.assets.length === 0
          ? <p className="mt-2 text-sm text-paper-muted">Belum ada.</p>
          : reg.assets.map((a) => <AssetRow key={a.id} a={a} />)}
      </div>

      <div className="mt-8">
        <H2>Utang</H2>
        {reg.liabilities.length === 0
          ? <p className="mt-2 text-sm text-paper-muted">Belum ada.</p>
          : reg.liabilities.map((a) => <AssetRow key={a.id} a={a} />)}
      </div>
    </div>
  );
}
