import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getReleaseConfig } from "@/services/release-rule";
import { Eyebrow, H1, Card } from "@warisly/ui";
import { saveReleaseRuleAction } from "@/app/actions/release-rule";

const channelLabel: Record<string, string> = { whatsapp: "WhatsApp", email: "Email", sms: "SMS" };

export default async function RilisPage() {
  const supabase = await createClient();
  const cfg = await getReleaseConfig(supabase);

  if (!cfg.eligible) {
    return (
      <div className="pb-8">
        <Eyebrow>Aturan Rilis</Eyebrow>
        <H1>Verifikasi dulu</H1>
        <Card className="mt-6">
          <p className="text-paper-text">Aturan rilis dapat diatur setelah identitas Anda terverifikasi.</p>
          <Link href="/profil" className="mt-3 inline-block font-sans text-sm text-nyala underline">Ke verifikasi identitas →</Link>
        </Card>
      </div>
    );
  }

  const field = "mt-1 w-full rounded-lg border border-paper-edge bg-white px-3 py-2.5 font-sans text-sm text-paper-text outline-none focus:border-nyala";

  return (
    <div className="pb-8">
      <Link href="/profil" className="font-sans text-sm text-nyala underline">← Profil</Link>
      <Eyebrow>Aturan Rilis</Eyebrow>
      <H1>Masa tunggu & konfirmasi</H1>
      <p className="mt-2 font-sans text-sm text-paper-muted">
        Sebelum apa pun dirilis, Warisly menunggu selama masa tunggu dan mengirim konfirmasi lewat kanal yang Anda pilih. Ini mencegah rilis karena kesalahan.
      </p>

      <Card className="mt-6">
        <form action={saveReleaseRuleAction} className="flex flex-col gap-4">
          <label className="block">
            <span className="font-sans text-sm text-paper-muted">Masa tunggu (hari)</span>
            <input name="waitingDays" type="number" min={cfg.bounds.min} max={cfg.bounds.max} defaultValue={cfg.rule.waitingDays} required className={field} />
            <span className="mt-1 block font-sans text-xs text-paper-muted">Antara {cfg.bounds.min} dan {cfg.bounds.max} hari.</span>
          </label>

          <fieldset>
            <span className="font-sans text-sm text-paper-muted">Kanal konfirmasi</span>
            <div className="mt-2 flex flex-col gap-2">
              {cfg.allowedChannels.map((c) => (
                <label key={c} className="flex items-center gap-2 font-sans text-sm text-paper-text">
                  <input type="checkbox" name="channels" value={c} defaultChecked={cfg.rule.channels.includes(c)} />
                  {channelLabel[c] ?? c}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="rounded-lg bg-kertas/60 p-3 font-sans text-xs text-paper-muted">
            Kuorum wali: butuh {cfg.quorum.required} dari {cfg.quorum.of} wali untuk memulai proses rilis. Atur wali di Amanah.
          </div>

          <button className="rounded-lg bg-nyala px-4 py-3 font-sans font-medium text-white active:bg-nyala-pressed">
            Simpan aturan
          </button>
        </form>
      </Card>
    </div>
  );
}
