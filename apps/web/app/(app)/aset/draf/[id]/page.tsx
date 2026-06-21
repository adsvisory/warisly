import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDraft } from "@warisly/db";
import { Eyebrow, H1, Card } from "@warisly/ui";
import { AssetForm } from "@/components/AssetForm";
import { confirmDraftAction, discardDraftAction } from "@/app/actions/drafts";
import { copy } from "@warisly/lib";

const fieldLabel: Record<string, string> = { category: "kategori", provider: "penyedia", valueEstimate: "nilai" };

export default async function DraftReview({ params }: { params: Promise<{ id: string }> }) {
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
      <Eyebrow>Dari WhatsApp</Eyebrow>
      <H1>Tinjau entri</H1>
      {flags.length > 0 && (
        <Card className="mt-4 border-amber-300 bg-amber-50">
          <p className="font-sans text-sm text-amber-800">
            Belum yakin: {flags.map((f) => fieldLabel[f] ?? f).join(", ")}. Mohon periksa sebelum menyimpan.
          </p>
        </Card>
      )}
      <AssetForm initial={initial} action={confirmDraftAction} hidden={{ draftId: d.id }} submitLabel={copy.actions.save} />
      <form action={discardDraftAction} className="mt-3">
        <input type="hidden" name="draftId" value={d.id} />
        <button className="font-sans text-sm text-paper-muted underline">Buang entri ini</button>
      </form>
    </div>
  );
}
