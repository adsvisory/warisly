import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Plus, ArrowRight, Clock, TrendingUp, Landmark, Wallet, Coins, Bitcoin,
  Shield, Home, Package, Scale, CircleDollarSign, ScrollText, HandCoins,
  Globe, PiggyBank, Store, Network, Copyright, Star, Gamepad2, type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRegistry } from "@/services/assets";
import { listDrafts, type AssetCategory } from "@warisly/db";
import { Eyebrow, H1, Seal, SealedChip } from "@warisly/ui";

const CATEGORY_ICON: Record<AssetCategory, LucideIcon> = {
  saham: TrendingUp, reksa_dana: TrendingUp, bank: Landmark, e_wallet: Wallet,
  emas: Coins, crypto: Bitcoin, asuransi: Shield, bpjs: Shield,
  properti: Home, fisik: Package, utang: Scale, lainnya: CircleDollarSign,
  obligasi: ScrollText, p2p: HandCoins, luar_negeri: Globe, pensiun: PiggyBank,
  bisnis: Store, domain: Network, ip: Copyright, poin: Star, game: Gamepad2,
};

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default async function Beranda() {
  const t = await getTranslations();
  const supabase = await createClient();
  const reg = await getRegistry(supabase);
  const drafts = await listDrafts(supabase, "pending");
  const totalValue = reg.assets.reduce((s, a) => s + (a.valueEstimate ?? 0), 0);
  const recent = reg.assets.slice(0, 3);

  const primaryBtn = "inline-flex items-center gap-2 rounded-xl bg-tinta px-5 py-3 font-sans text-sm font-semibold text-ink-text transition hover:bg-tinta-hover";
  const secondaryBtn = "inline-flex items-center gap-2 rounded-xl border border-paper-edge bg-panel px-4 py-3 font-sans text-sm font-medium text-tinta transition hover:border-emas";

  return (
    <div className="pb-8">
      <Eyebrow>{t("beranda.welcome")}</Eyebrow>
      <H1>{t("beranda.headline")}</H1>
      <p className="mt-2 max-w-[54ch] font-serif text-[18px] leading-relaxed text-paper-muted">{t("beranda.mapLede")}</p>

      {drafts.length > 0 && (
        <Link href="/aset/draf" className="mt-5 block">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emas/40 bg-panel px-4 py-3.5 transition hover:border-emas">
            <p className="font-sans text-sm text-tinta">{t("beranda.draftsBanner", { count: drafts.length })}</p>
          </div>
        </Link>
      )}

      {reg.total === 0 ? (
        <div className="mt-6 rounded-2xl border border-paper-edge bg-panel p-6">
          <p className="text-paper-text">{t("beranda.coldStart")}</p>
          <Link href="/aset/baru" className={`mt-4 ${primaryBtn}`}><Plus size={17} /> {t("common.add")}</Link>
        </div>
      ) : (
        <>
          <div className="frame-stack mt-6 grid gap-4 sm:grid-cols-[1.3fr_1fr]">
            <div className="rounded-2xl border border-paper-edge bg-panel p-5">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-paper-muted">{t("beranda.totalValue")}</p>
              <p className="mt-2 font-display text-[33px] tabular-nums text-tinta">{rupiah(totalValue)}</p>
              <p className="mt-1 font-sans text-xs text-paper-muted">{t("beranda.totalValueSub", { count: reg.assets.length })}</p>
            </div>
            <div className="flex flex-col items-center justify-center gap-2.5 rounded-2xl bg-tinta p-5 text-center">
              <Seal size={52} />
              <p className="font-display text-[16px] text-ink-text">{t("beranda.sealedTitle")}</p>
              <p className="max-w-[24ch] font-sans text-xs leading-relaxed text-ink-muted">{t("beranda.sealedSub")}</p>
            </div>
          </div>

          {reg.staleCount > 0 && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emas/30 bg-emas/[0.08] px-4 py-3.5">
              <Clock size={18} className="mt-0.5 shrink-0 text-emas" />
              <p className="font-serif text-[15px] leading-snug text-paper-text">
                {t("beranda.freshStale", { fresh: reg.freshCount, stale: reg.staleCount })}
              </p>
            </div>
          )}

          <div className="mt-8 mb-3 flex items-center justify-between">
            <h2 className="font-display text-[22px] text-tinta">{t("beranda.recentAssets")}</h2>
            <Link href="/aset" className="rounded-xl border border-paper-edge bg-panel px-4 py-2 font-sans text-sm font-medium text-tinta transition hover:border-emas">
              {t("beranda.viewAll")}
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-paper-edge bg-panel">
            {recent.map((a) => {
              const Icon = CATEGORY_ICON[a.category];
              return (
                <Link key={a.id} href={`/aset/${a.id}`} className="flex items-center gap-4 border-b border-paper-line px-5 py-4 transition last:border-0 hover:bg-kertas/70">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-paper-edge bg-kertas text-daun">
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-display text-[18px] text-tinta">{a.provider ?? t(`assets.categories.${a.category}`)}</p>
                      <SealedChip label={t("assets.sealed")} />
                    </div>
                    <p className="mt-0.5 truncate font-sans text-[13px] text-paper-muted">
                      {a.label ?? t(`assets.categories.${a.category}`)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-[17px] tabular-nums text-tinta">
                      {a.valueEstimate == null ? "—" : rupiah(a.valueEstimate)}
                    </p>
                    <p className="mt-0.5 font-sans text-[11px] text-paper-muted">{t("assets.estimate")}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href="/dosier" className={primaryBtn}>{t("common.viewRecovery")} <ArrowRight size={16} /></Link>
            <Link href="/aset/baru" className={secondaryBtn}>
              <Plus size={16} /> {t("common.add")}
            </Link>
          </div>
        </>
      )}

      <div className="mt-8 flex items-center gap-2.5 rounded-xl border border-dashed border-emas bg-kertas px-4 py-3">
        <Shield size={16} className="shrink-0 text-emas" />
        <p className="font-sans text-[13px] text-daun">{t("common.reassure")}</p>
      </div>
    </div>
  );
}
