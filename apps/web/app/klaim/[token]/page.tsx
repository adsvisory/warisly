import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { getRequestByToken } from "@warisly/db";
import { Seal } from "@warisly/ui";
import { ClaimDocsForm } from "@/components/ClaimDocsForm";

export const dynamic = "force-dynamic";

export default async function KlaimToken({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const req = await getRequestByToken(adminClient(), token);
  if (!req) notFound();

  return (
    <main className="mx-auto max-w-sm px-6 py-12">
      <Seal size={48} />
      <p className="mt-4 font-sans text-xs uppercase tracking-eyebrow text-emas">Warisly</p>
      <h1 className="mt-2 font-display text-2xl text-tinta">Proses warisan</h1>

      {req.status === "initiated" && (
        <>
          <p className="mt-3 text-paper-text">Langkah 1 dari 2 — unggah dokumen resmi.</p>
          <ClaimDocsForm token={token} />
        </>
      )}

      {req.status === "documents_submitted" && (
        <p className="mt-3 text-paper-text">Dokumen diterima. Langkah berikutnya adalah verifikasi identitas Anda.</p>
      )}

      {req.status === "under_review" && (
        <p className="mt-3 text-paper-text">Terima kasih. Permohonan sedang ditinjau tim kami, dan keluarga akan dihubungi melalui kanal terdaftar. Mohon menunggu.</p>
      )}

      {(req.status === "approved" || req.status === "waiting_period") && (
        <p className="mt-3 text-paper-text">Permohonan disetujui dan dalam masa tunggu keamanan. Setelah masa tunggu selesai, panduan akan tersedia di halaman ini.</p>
      )}

      {req.status === "released" && (
        <a href={`/klaim/${token}/dosier`} className="mt-5 inline-block rounded-lg bg-nyala px-4 py-3 font-sans font-medium text-white active:bg-nyala-pressed">
          Lihat panduan pemulihan
        </a>
      )}

      {(req.status === "rejected" || req.status === "cancelled") && (
        <p className="mt-3 text-paper-text">Permohonan ini tidak dapat dilanjutkan. Silakan hubungi dukungan Warisly.</p>
      )}
    </main>
  );
}
