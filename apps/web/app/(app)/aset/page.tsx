import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Banknote,
  Bitcoin,
  Building2,
  Coins,
  CreditCard,
  HeartPulse,
  Landmark,
  Package,
  Plus,
  ScanLine,
  Shield,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRegistry, isFresh } from "@/services/assets";
import { Eyebrow, H1, Estimate, FreshnessChip, SealedChip } from "@warisly/ui";
import type { Asset } from "@warisly/db";

const categoryIcons: Record<string, React.ReactNode> = {
  saham: <TrendingUp size={20} />,
  reksa_dana: <TrendingUp size={20} />,
  bank: <Landmark size={20} />,
  e_wallet: <Wallet size={20} />,
  emas: <Coins size={20} />,
  crypto: <Bitcoin size={20} />,
  asuransi: <Shield size={20} />,
  bpjs: <HeartPulse size={20} />,
  properti: <Building2 size={20} />,
  fisik: <Package size={20} />,
  utang: <CreditCard size={20} />,
  lainnya: <Banknote size={20} />,
};

function AssetRow({
  a,
  t,
}: {
  a: Asset;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <Link
      href={`/aset/${a.id}`}
      className="flex items-center gap-4 border-b border-paper-edge px-5 py-4 transition last:border-0 hover:bg-kertas/60 active:bg-kertas"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-paper-edge bg-kertas text-daun">
        {categoryIcons[a.category] ?? <Banknote size={20} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-[18px] text-tinta">{a.provider ?? t(`assets.categories.${a.category}`)}</p>
          <SealedChip label={t("assets.sealed")} />
        </div>
        <p className="mt-0.5 font-sans text-[13px] text-paper-muted">
          {a.label ?? t(`assets.categories.${a.category}`)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <Estimate value={a.valueEstimate} lastReviewedAt={a.lastReviewedAt} estimateLabel={t("assets.estimate")} reviewedLabel={t("assets.lastReviewed")} />
        <div className="mt-1 flex justify-end">
          <FreshnessChip fresh={isFresh(a)} freshLabel={t("assets.fresh")} staleLabel={t("assets.stale")} />
        </div>
      </div>
    </Link>
  );
}

export default async function AsetPage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const reg = await getRegistry(supabase);
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>{t("common.brand")}</Eyebrow>
          <H1>{t("nav.assets")}</H1>
          <p className="mt-2 font-serif text-[18px] leading-relaxed text-paper-muted">{t("common.reassure")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/aset/pindai"
            className="inline-flex items-center gap-2 rounded-xl border border-paper-edge bg-panel px-4 py-3 font-sans text-sm font-medium text-tinta transition hover:border-emas"
          >
            <ScanLine size={16} />
            {t("scan.cta")}
          </Link>
          <Link
            href="/aset/baru"
            className="inline-flex items-center gap-2 rounded-xl bg-tinta px-5 py-3 font-sans text-sm font-semibold text-ink-text transition hover:bg-tinta-hover"
          >
            <Plus size={16} />
            {t("common.add")}
          </Link>
        </div>
      </div>

      <div className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="font-display text-[22px] text-tinta">{t("assets.sectionAssets")}</h2>
      </div>
      {reg.assets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-paper-edge bg-panel/50 px-5 py-8 text-center font-sans text-sm text-paper-muted">
          {t("assets.empty")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-paper-edge bg-panel">
          {reg.assets.map((a) => <AssetRow key={a.id} a={a} t={t} />)}
        </div>
      )}

      <div className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="font-display text-[22px] text-tinta">{t("assets.sectionLiabilities")}</h2>
      </div>
      {reg.liabilities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-paper-edge bg-panel/50 px-5 py-8 text-center font-sans text-sm text-paper-muted">
          {t("assets.empty")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-paper-edge bg-panel">
          {reg.liabilities.map((a) => <AssetRow key={a.id} a={a} t={t} />)}
        </div>
      )}
    </div>
  );
}
