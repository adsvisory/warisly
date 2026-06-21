import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAmanah } from "@/services/amanah";
import { Eyebrow, H1, Card } from "@warisly/ui";
import { addTrusteeAction, deleteTrusteeAction } from "@/app/actions/amanah-trustees";
import { InviteLink } from "@/components/InviteLink";

const contactLabel: Record<string, string> = { whatsapp: "WhatsApp", phone: "Telepon", email: "Email" };
const statusLabel: Record<string, string> = { invited: "Menunggu", confirmed: "Terkonfirmasi", declined: "Menolak" };
const roleLabel: Record<string, string> = { primary: "Utama", backup: "Cadangan" };

export default async function WaliPage() {
  const supabase = await createClient();
  const a = await getAmanah(supabase);
  const field = "rounded-lg border border-paper-edge bg-white px-3 py-2.5 font-sans text-sm text-paper-text outline-none focus:border-nyala";
  const addBtn = "rounded-lg bg-tinta px-4 py-2.5 font-sans text-sm font-medium text-ink-text";

  return (
    <div className="pb-8">
      <Link href="/amanah" className="font-sans text-sm text-nyala underline">← Amanah</Link>
      <Eyebrow>Wali Amanah</Eyebrow>
      <H1>Yang mengurus</H1>
      <p className="mt-2 font-sans text-sm text-paper-muted">
        {a.confirmedTrustees}/{a.quorum.required} terkonfirmasi. Kuorum {a.quorum.required}-dari-{a.quorum.of} diperlukan agar proses dapat dimulai. Sertakan cadangan agar rencana tetap jalan.
      </p>

      {a.trustees.map((t) => (
        <Card key={t.id} className="mt-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg text-tinta">{t.name}</p>
              <p className="font-sans text-xs text-paper-muted">{roleLabel[t.role]} · {contactLabel[t.contactType]}: {t.contactValue}</p>
              <p className={`font-sans text-xs ${t.status === "confirmed" ? "text-daun" : "text-amber-700"}`}>{statusLabel[t.status]}</p>
            </div>
            <form action={deleteTrusteeAction}>
              <input type="hidden" name="id" value={t.id} />
              <button className="font-sans text-xs text-paper-muted underline">Hapus</button>
            </form>
          </div>
          {t.status === "invited" && <InviteLink token={t.confirmToken} />}
        </Card>
      ))}

      <Card className="mt-4">
        <form action={addTrusteeAction} className="flex flex-col gap-2">
          <input name="name" placeholder="Nama wali" required className={field} />
          <select name="contactType" className={field}>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Telepon</option>
            <option value="email">Email</option>
          </select>
          <input name="contactValue" placeholder="Nomor / email" required className={field} />
          <select name="role" className={field}>
            <option value="primary">Utama</option>
            <option value="backup">Cadangan</option>
          </select>
          <button className={addBtn}>Tambah wali</button>
        </form>
      </Card>
    </div>
  );
}
