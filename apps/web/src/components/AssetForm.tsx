"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Lock, ChevronDown, Check, Info } from "lucide-react";
import { createAssetAction, updateAssetAction } from "@/app/actions/assets";
import { fetchAssetCategories } from "@/app/actions/asset-categories";
import { SubmitButton } from "./SubmitButton";
import { assetCategories, groupCategories, findCategory } from "@/lib/categories";
import type { Asset, AssetCategoryInfo } from "@warisly/db";

const field =
  "w-full rounded-xl border-[1.5px] border-paper-edge bg-panel px-4 py-3 font-sans text-[15px] text-paper-text outline-none transition focus:border-emas focus:ring-4 focus:ring-emas/15";
const labelCls = "font-sans text-sm font-medium text-paper-text";
const hintCls = "font-sans text-xs leading-relaxed text-paper-muted";
const eyebrowCls = "font-sans text-[11px] font-semibold uppercase tracking-eyebrow text-emas";

function SelectField({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={`${field} appearance-none pr-10`}>
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-paper-muted" />
    </div>
  );
}

export function AssetForm({ initial, action: actionProp, hidden, submitLabel }: {
  initial?: Partial<Asset>;
  action?: (fd: FormData) => void | Promise<void>;
  hidden?: Record<string, string>;
  submitLabel?: string;
}) {
  const t = useTranslations();
  const editing = !!initial?.id;
  const action = actionProp ?? (editing ? updateAssetAction : createAssetAction);
  const instructions = (initial?.detail as { instructions?: string } | undefined)?.instructions ?? "";
  const benefDefault = initial?.providerBeneficiarySet == null ? "" : initial.providerBeneficiarySet ? "ya" : "tidak";

  // The category catalog is config in wrs_settings, read via a server action. While it
  // loads (or if it fails) the dropdown falls back to the legacy enum list so the form
  // never blocks. estatePath drives the awareness note + the beneficiary field below.
  const [categories, setCategories] = useState<AssetCategoryInfo[]>([]);
  const [categoryCode, setCategoryCode] = useState<string>(initial?.category ?? "");

  useEffect(() => {
    fetchAssetCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const grouped = groupCategories(categories);
  const selected = findCategory(categories, categoryCode);
  const showBeneficiary = selected?.surfacesBeneficiaryField ?? false;

  return (
    <form action={action} className="mt-6 rounded-2xl border border-paper-edge bg-panel p-6 md:p-7">
      {editing && initial?.id && <input type="hidden" name="id" value={initial.id} />}
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}

      {/* About */}
      <section className="space-y-4">
        <span className={eyebrowCls}>{t("assets.form.sectionAbout")}</span>
        <div className="asset-grid grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{t("assets.form.type")}</label>
            <SelectField
              name="category"
              required
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value)}
            >
              <option value="" disabled>{t("assets.form.categoryPlaceholder")}</option>
              {grouped.length > 0
                ? grouped.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.items.map((c) => <option key={c.code} value={c.code}>{c.labelId}</option>)}
                    </optgroup>
                  ))
                : assetCategories.map((cat) => (
                    <option key={cat} value={cat}>{t(`assets.categories.${cat}`)}</option>
                  ))}
            </SelectField>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{t("assets.form.provider")}</label>
            <input name="provider" defaultValue={initial?.provider ?? ""} className={field} />
          </div>
        </div>
        {selected && (
          <p className={`${hintCls} flex items-start gap-2`}>
            <Info size={14} className="mt-0.5 shrink-0 text-emas" />
            <span>{selected.noteId}</span>
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>{t("assets.form.label")}</label>
          <input name="label" defaultValue={initial?.label ?? ""} className={field} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>{t.rich("assets.form.identifier", { b: (chunks) => <strong>{chunks}</strong> })}</label>
          <input name="identifier" defaultValue={initial?.identifier ?? ""} className={field} />
        </div>
      </section>

      {/* Value & notes */}
      <section className="mt-7 space-y-4">
        <span className={eyebrowCls}>{t("assets.form.sectionValue")}</span>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>{t("assets.form.value")}</label>
          <input name="valueEstimate" inputMode="numeric" defaultValue={initial?.valueEstimate?.toString() ?? ""} className={field} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>{t("assets.form.notes")}</label>
          <textarea name="instructions" defaultValue={instructions} rows={3} className={`${field} min-h-[84px] resize-y leading-relaxed`} />
        </div>
      </section>

      {/* Provider beneficiary — only for bypass-estate categories (asuransi/BPJS/pensiun) */}
      {showBeneficiary ? (
        <section className="mt-7 space-y-4">
          <span className={eyebrowCls}>{t("assets.form.sectionBeneficiary")}</span>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{t("assets.form.beneficiaryQ")}</label>
            <SelectField name="providerBeneficiarySet" defaultValue={benefDefault}>
              <option value="">{t("assets.form.unknown")}</option>
              <option value="ya">{t("assets.form.yes")}</option>
              <option value="tidak">{t("assets.form.no")}</option>
            </SelectField>
            <span className={hintCls}>{t("assets.form.beneficiaryHelp")}</span>
          </div>
        </section>
      ) : (
        // Editing a non-bypass asset: keep any existing beneficiary value so a routine
        // edit doesn't silently clear it (the field is just hidden, not reset).
        initial?.providerBeneficiarySet != null && (
          <input
            type="hidden"
            name="providerBeneficiarySet"
            value={initial.providerBeneficiarySet ? "ya" : "tidak"}
          />
        )
      )}

      {/* No-password reassurance */}
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-dashed border-emas bg-kertas px-4 py-3">
        <Lock size={18} className="shrink-0 text-emas" />
        <p className="font-sans text-[13px] leading-relaxed text-daun">{t("common.reassure")}</p>
      </div>

      {/* Actions */}
      <div className="mt-7 flex items-center gap-3 border-t border-paper-edge pt-5">
        <SubmitButton
          icon={<Check size={17} />}
          className="inline-flex items-center gap-2 rounded-xl bg-tinta px-5 py-3 font-sans text-sm font-semibold text-ink-text transition hover:bg-tinta-hover"
        >
          {submitLabel ?? t("common.save")}
        </SubmitButton>
        <Link
          href="/aset"
          className="rounded-xl border border-paper-edge bg-panel px-4 py-3 font-sans text-sm font-medium text-tinta transition hover:border-emas"
        >
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}
