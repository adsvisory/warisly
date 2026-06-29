import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getOwnerKyc } from "@warisly/db";
import { Eyebrow, H1, Card } from "@warisly/ui";
import { Check, Lock, Shield, ChevronRight, Languages, Users } from "lucide-react";
import { startEkycAction } from "@/app/actions/ekyc";
import { signOut } from "@/app/actions/auth";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SubmitButton } from "@/components/SubmitButton";

export default async function ProfilPage() {
  const t = await getTranslations("profil");
  const supabase = await createClient();
  const kyc = await getOwnerKyc(supabase);
  const verified = kyc?.kycStatus === "verified";

  return (
    <div className="pb-8">
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <H1>{t("title")}</H1>

      <Link href="/amanah" className="mt-6 block">
        <Card className="transition-colors hover:border-emas/40">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emas/10 text-emas">
              <Users size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-sans text-[11px] font-semibold uppercase tracking-eyebrow text-emas">{t("amanahCard")}</span>
              <p className="mt-1 font-display text-lg text-tinta">{t("amanahCta")}</p>
            </div>
            <ChevronRight size={20} className="shrink-0 text-paper-muted" />
          </div>
        </Card>
      </Link>

      <Card className="mt-4">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-eyebrow text-emas">{t("kycLabel")}</span>
        <div className="mt-3 flex items-center gap-3">
          {verified ? (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-daun/10 text-daun">
              <Check size={22} />
            </div>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emas/10 text-emas">
              <Shield size={22} />
            </div>
          )}
          <div>
            <p className="font-display text-xl text-tinta">{verified ? t("verified") : t("notVerified")}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-emas bg-kertas px-4 py-3">
          <Lock size={18} className="shrink-0 text-emas" />
          <p className="font-sans text-[13px] leading-relaxed text-daun">{t("kycHelp")}</p>
        </div>
        {!verified && (
          <>
            <form action={startEkycAction} className="mt-4">
              <SubmitButton className="inline-flex items-center gap-2 rounded-xl bg-tinta px-5 py-3 font-sans text-sm font-semibold text-ink-text transition hover:bg-tinta-hover">
                {t("verifyBtn")}
              </SubmitButton>
            </form>
            <Link href="/profil/ktp" className="mt-3 inline-flex items-center gap-1 font-sans text-[13px] font-medium text-emas hover:text-emas-ink">
              {t("ktpPrefill")} <ChevronRight size={15} />
            </Link>
          </>
        )}
      </Card>

      {verified && (
        <Link href="/rilis" className="mt-4 block">
          <Card className="transition-colors hover:border-emas/40">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-sans text-[11px] font-semibold uppercase tracking-eyebrow text-emas">{t("releaseRuleCard")}</span>
                <p className="mt-1 font-display text-lg text-tinta">{t("releaseRuleCta")}</p>
              </div>
              <ChevronRight size={20} className="shrink-0 text-paper-muted" />
            </div>
          </Card>
        </Link>
      )}

      <Card className="mt-4">
        <div className="flex items-center gap-2">
          <Languages size={16} className="text-emas" />
          <span className="font-sans text-[11px] font-semibold uppercase tracking-eyebrow text-emas">{t("language")}</span>
        </div>
        <div className="mt-3">
          <LanguageToggle />
        </div>
      </Card>

      <form action={signOut} className="mt-8">
        <SubmitButton className="inline-flex items-center gap-2 font-sans text-sm font-medium text-emas transition hover:text-emas-ink">
          {t("signOut")}
        </SubmitButton>
      </form>
    </div>
  );
}
