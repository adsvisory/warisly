import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRegistry } from "@/services/assets";
import { listDrafts } from "@warisly/db";
import { Eyebrow, H1, Card } from "@warisly/ui";
import { copy } from "@warisly/lib";

export default async function Beranda() {
  const supabase = await createClient();
  const reg = await getRegistry(supabase);
  const drafts = await listDrafts(supabase, "pending");
  const addBtn = "inline-block rounded-lg bg-nyala px-4 py-3 font-sans font-medium text-white";

  return (
    <div>
      <Eyebrow>{copy.brand}</Eyebrow>
      <H1>{copy.nav.home}</H1>

      {drafts.length > 0 && (
        <Link href="/aset/draf">
          <Card className="mt-4 border-nyala/40">
            <p className="font-sans text-sm text-tinta">
              {drafts.length} entri dari WhatsApp menunggu konfirmasi →
            </p>
          </Card>
        </Link>
      )}

      {reg.total === 0 ? (
        <Card className="mt-6">
          <p className="text-paper-text">Belum ada aset tercatat. Mulai dengan satu — cukup beberapa detik.</p>
          <Link href="/aset/baru" className={`mt-4 ${addBtn}`}>{copy.actions.addAsset}</Link>
        </Card>
      ) : (
        <>
          <Card className="mt-6">
            <p className="font-sans text-sm text-paper-muted">Kelengkapan</p>
            <p className="mt-1 font-display text-3xl text-tinta">{reg.total} aset tercatat</p>
            <p className="mt-1 font-sans text-sm text-paper-muted">
              {reg.freshCount} terkini · {reg.staleCount} perlu ditinjau
            </p>
          </Card>
          <Link href="/dosier" className={`mt-4 ${addBtn}`}>{copy.actions.viewRecovery}</Link>
          <Link href="/aset/baru" className="mt-3 inline-block font-sans text-sm text-nyala underline">
            {copy.actions.addAsset}
          </Link>
        </>
      )}

      <p className="mt-8 font-sans text-xs text-paper-muted">{copy.reassurePassword}</p>
    </div>
  );
}
