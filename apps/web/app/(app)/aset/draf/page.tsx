import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listDrafts } from "@warisly/db";
import { Eyebrow, H1, Card } from "@warisly/ui";
import { assetCategoryLabel } from "@/lib/categories";

export default async function DrafPage() {
  const supabase = await createClient();
  const drafts = await listDrafts(supabase, "pending");
  return (
    <div>
      <Eyebrow>Dari WhatsApp</Eyebrow>
      <H1>Menunggu konfirmasi</H1>
      {drafts.length === 0 ? (
        <p className="mt-4 text-sm text-paper-muted">Tidak ada entri menunggu.</p>
      ) : (
        drafts.map((d) => (
          <Link key={d.id} href={`/aset/draf/${d.id}`}>
            <Card className="mt-3">
              <p className="font-display text-lg text-tinta">{d.provider ?? (d.category ? assetCategoryLabel[d.category] : "Aset")}</p>
              <p className="font-sans text-xs text-paper-muted">{d.label ?? "Ketuk untuk meninjau"}</p>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}
