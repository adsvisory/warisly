import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAmanah } from "@/services/amanah";
import { Eyebrow, H1, H2, Card } from "@warisly/ui";
import { addRecipientAction, deleteRecipientAction, addWishAction, deleteWishAction } from "@/app/actions/amanah-people";
import { maskNik } from "@/lib/mask";

const relationshipLabel: Record<string, string> = { pasangan: "Pasangan", anak: "Anak", orang_tua: "Orang Tua", saudara: "Saudara", lainnya: "Lainnya" };

export default async function AmanahPage() {
  const supabase = await createClient();
  const a = await getAmanah(supabase);
  const field = "rounded-lg border border-paper-edge bg-white px-3 py-2.5 font-sans text-sm text-paper-text outline-none focus:border-nyala";
  const addBtn = "rounded-lg bg-tinta px-4 py-2.5 font-sans text-sm font-medium text-ink-text";

  return (
    <div className="pb-8">
      <Eyebrow>Amanah</Eyebrow>
      <H1>Wali, Penerima & Niat</H1>

      <Link href="/amanah/wali">
        <Card className="mt-6">
          <p className="font-sans text-sm text-paper-muted">Wali amanah (yang mengurus)</p>
          <p className="mt-1 font-display text-2xl text-tinta">{a.confirmedTrustees}/{a.quorum.required} terkonfirmasi</p>
          <p className="mt-1 font-sans text-xs text-paper-muted">
            {a.quorumMet ? "Kuorum terpenuhi." : `Butuh ${a.quorum.required} dari ${a.quorum.of} wali untuk memulai proses.`} Kelola →
          </p>
        </Card>
      </Link>

      {/* Recipients */}
      <div className="mt-8">
        <H2>Penerima</H2>
        <p className="mt-1 font-sans text-xs text-paper-muted">
          Hukum waris (faraid/perdata) menentukan siapa yang berhak mewarisi dan bagiannya. Daftar ini menentukan siapa yang menerima informasi — bukan keputusan hukum.
        </p>
        {a.recipients.map((r) => (
          <Card key={r.id} className="mt-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg text-tinta">{r.name}</p>
                <p className="font-sans text-xs text-paper-muted">{relationshipLabel[r.relationship]} · NIK {maskNik(r.nik)}</p>
                <p className="font-sans text-xs text-paper-muted">{r.visibility === "now" ? "Boleh lihat sekarang" : "Terlihat setelah meninggal"}</p>
              </div>
              <form action={deleteRecipientAction}>
                <input type="hidden" name="id" value={r.id} />
                <button className="font-sans text-xs text-paper-muted underline">Hapus</button>
              </form>
            </div>
          </Card>
        ))}
        <Card className="mt-3">
          <form action={addRecipientAction} className="flex flex-col gap-2">
            <input name="name" placeholder="Nama penerima" required className={field} />
            <input name="nik" inputMode="numeric" placeholder="NIK (16 digit, opsional)" className={field} />
            <select name="relationship" className={field}>
              {Object.entries(relationshipLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select name="visibility" className={field}>
              <option value="after_death">Terlihat setelah meninggal</option>
              <option value="now">Boleh lihat sekarang</option>
            </select>
            <input name="note" placeholder="Catatan (opsional)" className={field} />
            <button className={addBtn}>Tambah penerima</button>
          </form>
        </Card>
      </div>

      {/* Wishes */}
      <div className="mt-8">
        <H2>Niat / Wasiat</H2>
        <p className="mt-1 font-sans text-xs text-paper-muted">
          Wasiat untuk pihak non-ahli-waris dibatasi maksimal ⅓ dari harta. Ini pengingat informasional, bukan nasihat hukum.
        </p>
        {a.wishes.map((w) => (
          <Card key={w.id} className="mt-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-paper-text">{w.text}</p>
              <form action={deleteWishAction}>
                <input type="hidden" name="id" value={w.id} />
                <button className="font-sans text-xs text-paper-muted underline">Hapus</button>
              </form>
            </div>
          </Card>
        ))}
        <Card className="mt-3">
          <form action={addWishAction} className="flex flex-col gap-2">
            <textarea name="text" rows={2} placeholder="Tulis niat / wasiat…" required className={field} />
            <button className={addBtn}>Tambah</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
