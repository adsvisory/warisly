import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronDown, Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAmanah } from "@/services/amanah";
import { Eyebrow, H1, Card } from "@warisly/ui";
import { addRecipientAction, deleteRecipientAction, addWishAction, deleteWishAction } from "@/app/actions/amanah-people";
import { maskNik } from "@/lib/mask";

const relationshipKeys = ["pasangan", "anak", "orang_tua", "saudara", "lainnya"] as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function AmanahPage() {
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
      <Eyebrow>{t("nav.amanah")}</Eyebrow>
      <H1>{t("amanah.title")}</H1>

      {/* Wali amanah */}
      <div className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="font-display text-[22px] text-tinta">{t("amanah.trusteeCard")}</h2>
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

      <Link href="/amanah/wali" className="block">
        <div className="flex items-center gap-4 overflow-hidden rounded-2xl border border-paper-edge bg-panel px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tinta font-sans text-[15px] font-semibold text-ink-text">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[17px] text-tinta">
              {t("amanah.confirmedOf", { confirmed: a.confirmedTrustees, required: a.quorum.required })}
            </p>
            <p className="mt-0.5 font-sans text-[12.5px] text-paper-muted">{t("amanah.manage")}</p>
          </div>
        </div>
      </Link>
      <p className="mt-3 rounded-xl border border-paper-edge bg-[#efe7d5] px-3.5 py-3 font-sans text-[12.5px] leading-relaxed text-paper-muted">
        {a.quorumMet
          ? t("amanah.quorumMet")
          : t("amanah.quorumNeed", { required: a.quorum.required, of: a.quorum.of })}
      </p>

      {/* Recipients */}
      <div className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="font-display text-[22px] text-tinta">{t("amanah.recipients")}</h2>
      </div>
      {a.recipients.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-paper-edge bg-panel">
          {a.recipients.map((r) => (
            <div key={r.id} className="flex items-center gap-4 border-b border-paper-edge px-5 py-4 last:border-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tinta font-sans text-[15px] font-semibold text-ink-text">
                {initials(r.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[17px] text-tinta">{r.name}</p>
                <p className="mt-0.5 font-sans text-[12.5px] text-paper-muted">
                  {t(`amanah.rel.${r.relationship}`)} · NIK {maskNik(r.nik)}
                </p>
                <p className="mt-0.5 font-sans text-[12.5px] text-paper-muted">
                  {r.visibility === "now" ? t("amanah.visNow") : t("amanah.visAfter")}
                </p>
              </div>
              <form action={deleteRecipientAction}>
                <input type="hidden" name="id" value={r.id} />
                <button className="font-sans text-[12.5px] text-paper-muted hover:text-emas">{t("common.remove")}</button>
              </form>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 rounded-xl border border-paper-edge bg-[#efe7d5] px-3.5 py-3 font-sans text-[12.5px] leading-relaxed text-paper-muted">
        {t("amanah.faraidNote")}
      </p>

      <details className="mt-4">
        <summary className={summary}>
          <Plus className="h-4 w-4" /> {t("amanah.addRecipient")}
        </summary>
        <Card className="mt-3">
          <form action={addRecipientAction} className="flex flex-col gap-3">
            <input name="name" placeholder={t("amanah.namePlaceholder")} required className={field} />
            <input name="nik" inputMode="numeric" placeholder={t("amanah.nikPlaceholder")} className={field} />
            <div className="relative">
              <select name="relationship" className={selectField}>
                {relationshipKeys.map((k) => (
                  <option key={k} value={k}>
                    {t(`amanah.rel.${k}`)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-muted" />
            </div>
            <div className="relative">
              <select name="visibility" className={selectField}>
                <option value="after_death">{t("amanah.visAfter")}</option>
                <option value="now">{t("amanah.visNow")}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-muted" />
            </div>
            <input name="note" placeholder={t("amanah.notePlaceholder")} className={field} />
            <button className={addBtn}>{t("amanah.addRecipient")}</button>
          </form>
        </Card>
      </details>

      {/* Wishes */}
      <div className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="font-display text-[22px] text-tinta">{t("amanah.wishes")}</h2>
      </div>
      {a.wishes.map((w) => (
        <Card key={w.id} className="mb-3">
          <div className="flex items-start justify-between gap-3">
            <p className="font-serif text-[16px] leading-relaxed text-paper-text">{w.text}</p>
            <form action={deleteWishAction}>
              <input type="hidden" name="id" value={w.id} />
              <button className="shrink-0 font-sans text-[12.5px] text-paper-muted hover:text-emas">{t("common.remove")}</button>
            </form>
          </div>
        </Card>
      ))}
      <p className="mt-3 rounded-xl border border-paper-edge bg-[#efe7d5] px-3.5 py-3 font-sans text-[12.5px] leading-relaxed text-paper-muted">
        {t("amanah.wasiatNote")}
      </p>

      <details className="mt-4">
        <summary className={summary}>
          <Plus className="h-4 w-4" /> {t("amanah.add")}
        </summary>
        <Card className="mt-3">
          <form action={addWishAction} className="flex flex-col gap-3">
            <textarea name="text" rows={3} placeholder={t("amanah.wishPlaceholder")} required className={field} />
            <button className={addBtn}>{t("amanah.add")}</button>
          </form>
        </Card>
      </details>
    </div>
  );
}
