import { createClient } from "@/lib/supabase/server";
import { assembleDossier } from "@/services/dossier";
import { Eyebrow, H1, H2, Card, Estimate, Seal } from "@warisly/ui";
import { assetCategoryLabel } from "@/lib/categories";
import { PrintButton } from "@/components/PrintButton";
import { copy } from "@warisly/lib";

export default async function DosierPage() {
  const supabase = await createClient();
  const dossier = await assembleDossier(supabase);

  return (
    <div className="pb-12">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <Eyebrow>{copy.actions.viewRecovery}</Eyebrow>
          <H1>Panduan Pemulihan</H1>
        </div>
        <PrintButton />
      </div>

      {/* Print header (only on paper) */}
      <div className="mt-2 hidden items-center gap-3 print:flex">
        <Seal size={36} />
        <span className="font-display text-xl text-tinta">Warisly — Panduan Pemulihan</span>
      </div>

      <p className="mt-4 font-sans text-sm text-paper-muted">
        Daftar aset dan langkah agar keluarga dapat mengklaim setiap item. Nilai bersifat estimasi.
      </p>

      <Card className="mt-6">
        <H2>Dokumen yang perlu disiapkan</H2>
        <ul className="mt-2 list-disc pl-5 font-sans text-sm text-paper-text">
          {dossier.documents.map((d) => <li key={d.key}>{d.label}</li>)}
        </ul>
      </Card>

      <div className="mt-8 flex flex-col gap-4">
        {dossier.assets.map(({ asset, playbook }) => (
          <Card key={asset.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg text-tinta">{asset.provider ?? assetCategoryLabel[asset.category]}</p>
                <p className="font-sans text-xs text-paper-muted">
                  {assetCategoryLabel[asset.category]}{asset.label ? ` · ${asset.label}` : ""}
                </p>
              </div>
              <Estimate value={asset.valueEstimate} lastReviewedAt={asset.lastReviewedAt} />
            </div>
            {asset.identifier && <p className="mt-2 font-sans text-sm text-paper-muted">Pengenal: {asset.identifier}</p>}

            {playbook ? (
              <div className="mt-3">
                <p className="font-sans text-xs uppercase tracking-eyebrow text-emas">Langkah klaim</p>
                <ol className="mt-1 list-decimal pl-5 font-sans text-sm text-paper-text">
                  {[...playbook.steps].sort((a, b) => a.order - b.order).map((s) => <li key={s.order}>{s.text}</li>)}
                </ol>
                {playbook.documents.length > 0 && (
                  <p className="mt-2 font-sans text-xs text-paper-muted">
                    Dokumen tambahan: {playbook.documents.map((d) => d.label).join(", ")}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 font-sans text-sm text-paper-muted">
                Belum ada panduan khusus. Hubungi penyedia dengan dokumen ahli waris di atas.
              </p>
            )}
          </Card>
        ))}
      </div>

      {dossier.liabilities.length > 0 && (
        <div className="mt-8">
          <H2>Utang</H2>
          {dossier.liabilities.map((l) => (
            <Card key={l.id} className="mt-3">
              <p className="font-display text-lg text-tinta">{l.provider ?? assetCategoryLabel[l.category]}</p>
              <Estimate value={l.valueEstimate} lastReviewedAt={l.lastReviewedAt} />
            </Card>
          ))}
        </div>
      )}

      <p className="mt-8 font-sans text-xs text-paper-muted">
        Dibuat {new Date(dossier.generatedAt).toLocaleDateString("id-ID")}. {copy.reassurePassword}
      </p>
    </div>
  );
}
