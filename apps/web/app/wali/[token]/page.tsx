import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { getTrusteeByToken } from "@warisly/db";
import { Seal } from "@warisly/ui";
import { confirmTrusteeAction } from "@/app/actions/amanah-trustees";
import { copy } from "@warisly/lib";

export const dynamic = "force-dynamic";

export default async function WaliConfirm({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const trustee = await getTrusteeByToken(adminClient(), token);
  if (!trustee) notFound();
  const confirmed = trustee.status === "confirmed";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <Seal size={56} />
      <p className="mt-4 font-sans text-xs uppercase tracking-eyebrow text-emas">{copy.brand}</p>
      <h1 className="mt-2 font-display text-2xl text-tinta">Undangan Wali Amanah</h1>
      <p className="mt-3 text-paper-text">
        Halo {trustee.name}, Anda diminta menjadi wali amanah — orang tepercaya yang mengurus warisan digital bila pemilik berhalangan.
      </p>
      <p className="mt-2 font-sans text-sm text-paper-muted">{copy.reassurePassword}</p>

      {confirmed ? (
        <p className="mt-6 font-sans text-sm text-daun">Konfirmasi tersimpan. Terima kasih.</p>
      ) : (
        <form action={confirmTrusteeAction} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <button className="w-full rounded-lg bg-nyala px-4 py-3 font-sans font-medium text-white active:bg-nyala-pressed">
            Saya bersedia
          </button>
        </form>
      )}
    </main>
  );
}
