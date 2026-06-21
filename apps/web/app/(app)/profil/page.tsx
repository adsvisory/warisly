import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOwnerKyc } from "@warisly/db";
import { Eyebrow, H1, Card } from "@warisly/ui";
import { startEkycAction } from "@/app/actions/ekyc";
import { signOut } from "@/app/actions/auth";

export default async function ProfilPage() {
  const supabase = await createClient();
  const kyc = await getOwnerKyc(supabase);
  const verified = kyc?.kycStatus === "verified";

  return (
    <div className="pb-8">
      <Eyebrow>Profil</Eyebrow>
      <H1>Identitas & keamanan</H1>

      <Card className="mt-6">
        <p className="font-sans text-sm text-paper-muted">Verifikasi identitas</p>
        <p className="mt-1 font-display text-xl text-tinta">{verified ? "Terverifikasi" : "Belum terverifikasi"}</p>
        <p className="mt-2 font-sans text-xs text-paper-muted">
          Verifikasi diperlukan agar warisan dapat dirilis ke keluarga dengan aman. Warisly tidak menyimpan data biometrik Anda — verifikasi diproses penyedia berlisensi Dukcapil.
        </p>
        {!verified && (
          <form action={startEkycAction} className="mt-4">
            <button className="rounded-lg bg-nyala px-4 py-3 font-sans font-medium text-white active:bg-nyala-pressed">
              Verifikasi identitas
            </button>
          </form>
        )}
      </Card>

      {verified && (
        <Link href="/rilis" className="mt-4 block">
          <Card>
            <p className="font-sans text-sm text-paper-muted">Aturan rilis</p>
            <p className="mt-1 font-display text-lg text-tinta">Atur masa tunggu & konfirmasi →</p>
          </Card>
        </Link>
      )}

      <form action={signOut} className="mt-8">
        <button className="font-sans text-sm text-nyala underline">Keluar</button>
      </form>
    </div>
  );
}
