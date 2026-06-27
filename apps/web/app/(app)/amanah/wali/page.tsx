import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronDown, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAmanah } from "@/services/amanah";
import { Eyebrow, H1, Card } from "@warisly/ui";
import { addTrusteeAction, deleteTrusteeAction } from "@/app/actions/amanah-trustees";
import { InviteLink } from "@/components/InviteLink";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function WaliPage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const a = await getAmanah(supabase);
  const field =
    "w-full rounded-xl border-[1.5px] border-paper-edge bg-panel px-4 py-3 font-sans text-[15px] text-paper-text outline-none focus:border-emas focus:ring-4 focus:ring-emas/15";
  const selectField = `${field} appearance-none pr-10`;
  const addBtn =
    "inline-flex items-center gap-2 rounded-xl bg-tinta px-5 py-3 font-sans text-sm font-semibold text-ink-text hover:bg-tinta-hover";
  const summary =
    "inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-paper-edge bg-panel px-4 py-2.5 font-sans text-sm font-medium text-tinta hover:border-emas [&::-webkit-details-marker]:hidden";

  return (
    <div className="pb-8">
      <Link href="/amanah" className="font-sans text-sm font-medium text-emas hover:text-emas-ink">
        {t("wali.back")}
      </Link>
      <div className="mt-2">
        <Eyebrow>{t("wali.eyebrow")}</Eyebrow>
        <H1>{t("wali.title")}</H1>
      </div>
      <p className="mt-2 font-serif text-[18px] leading-relaxed text-paper-muted">
        {t("wali.summary", { confirmed: a.confirmedTrustees, required: a.quorum.required, of: a.quorum.of })}
      </p>

      <div className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="font-display text-[22px] text-tinta">{t("wali.eyebrow")}</h2>
        <span
          className={
            a.quorumMet
              ? "rounded-full bg-daun/10 px-2.5 py-1 font-sans text-[11px] font-semibold text-daun"
              : "rounded-full bg-emas/[0.13] px-2.5 py-1 font-sans text-[11px] font-semibold text-[#9a6a1a]"
          }
        >
          {t("amanah.confirmedOf", { confirmed: a.confirmedTrustees, required: a.quorum.required })}
        </span>
      </div>

      {a.trustees.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-paper-edge bg-panel">
          {a.trustees.map((tr) => (
            <div key={tr.id} className="border-b border-paper-edge px-5 py-4 last:border-0">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tinta font-sans text-[15px] font-semibold text-ink-text">
                  {initials(tr.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[17px] text-tinta">{tr.name}</p>
                  <p className="mt-0.5 font-sans text-[12.5px] text-paper-muted">
                    {t(`wali.role.${tr.role}`)} · {t(`wali.contact.${tr.contactType}`)}: {tr.contactValue}
                  </p>
                </div>
                <span
                  className={
                    tr.status === "confirmed"
                      ? "rounded-full bg-daun/10 px-2.5 py-1 font-sans text-[11px] font-semibold text-daun"
                      : "rounded-full bg-emas/[0.13] px-2.5 py-1 font-sans text-[11px] font-semibold text-[#9a6a1a]"
                  }
                >
                  {t(`wali.status.${tr.status}`)}
                </span>
                <form action={deleteTrusteeAction}>
                  <input type="hidden" name="id" value={tr.id} />
                  <button className="font-sans text-[12.5px] text-paper-muted hover:text-emas">{t("common.remove")}</button>
                </form>
              </div>
              {tr.status === "invited" && <InviteLink token={tr.confirmToken} />}
            </div>
          ))}
        </div>
      )}

      <details className="mt-4">
        <summary className={summary}>
          <Plus className="h-4 w-4" /> {t("wali.addTrustee")}
        </summary>
        <Card className="mt-3">
          <form action={addTrusteeAction} className="flex flex-col gap-3">
            <input name="name" placeholder={t("wali.namePlaceholder")} required className={field} />
            <div className="relative">
              <select name="contactType" className={selectField}>
                <option value="whatsapp">{t("wali.contact.whatsapp")}</option>
                <option value="phone">{t("wali.contact.phone")}</option>
                <option value="email">{t("wali.contact.email")}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-muted" />
            </div>
            <input name="contactValue" placeholder={t("wali.contactPlaceholder")} required className={field} />
            <div className="relative">
              <select name="role" className={selectField}>
                <option value="primary">{t("wali.role.primary")}</option>
                <option value="backup">{t("wali.role.backup")}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-muted" />
            </div>
            <button className={addBtn}>{t("wali.addTrustee")}</button>
          </form>
        </Card>
      </details>
    </div>
  );
}
