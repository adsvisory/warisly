"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Lock, Loader2 } from "lucide-react";
import { fetchAssetCategories } from "@/app/actions/asset-categories";
import { assetCategories, groupCategories } from "@/lib/categories";
import type { AssetCategoryInfo } from "@warisly/db";
import type { ExtractedAssetDraft } from "@/lib/prompts/asset-extraction";

export type ReviewValue = {
  category: string;
  provider: string;
  identifier: string;
  valueEstimate: number | null;
  valueNote: string;
  notes: string;
};

const inp =
  "w-full rounded-xl border-[1.5px] border-paper-edge bg-panel px-4 py-3 font-sans text-[15px] text-paper-text outline-none transition focus:border-emas focus:ring-4 focus:ring-emas/15";

// Review & commit step (#11b-iii). Shows the extracted fields next to a "what we read"
// line so the owner verifies before anything is saved (Cardinal 6: never auto-save).
export function ScanReview({
  draft, saving, onConfirm,
}: {
  draft: ExtractedAssetDraft;
  saving: boolean;
  onConfirm: (v: ReviewValue) => void;
}) {
  const t = useTranslations("scan");
  const tCommon = useTranslations("common");

  const [categories, setCategories] = useState<AssetCategoryInfo[]>([]);
  useEffect(() => {
    fetchAssetCategories().then(setCategories).catch(() => setCategories([]));
  }, []);
  const grouped = groupCategories(categories);

  const [v, setV] = useState<ReviewValue>({
    category: draft.category ?? "",
    provider: draft.provider ?? "",
    identifier: draft.identifier ?? "",
    valueEstimate: draft.valueEstimate,
    valueNote: draft.valueNote ?? "",
    notes: "",
  });
  const flagged = new Set(draft.fieldsNeedingReview ?? []);

  const setField = (k: keyof ReviewValue) => (e: { target: { value: string } }) =>
    setV((prev) => ({
      ...prev,
      [k]: k === "valueEstimate"
        ? (e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null)
        : e.target.value,
    }));

  const imageNote =
    draft.imageKind === "financial_screenshot" ? t("screenshotNote")
    : draft.imageKind === "offline_document" ? t("documentNote")
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-paper-edge bg-kertas px-4 py-3">
        <p className="font-sans text-[12.5px] text-paper-muted">
          {t("whatWeRead")}{imageNote ? ` — ${imageNote}` : "."}
        </p>
        {draft.rawValueSeen && (
          <p className="mt-1 font-sans text-[13px] text-paper-text">
            {t("valueRead")}: <strong>{draft.rawValueSeen}</strong> →{" "}
            {v.valueEstimate != null ? `Rp ${v.valueEstimate.toLocaleString("id-ID")}` : "—"}
            <span className="text-paper-muted"> ({t("estimateHint")})</span>
          </p>
        )}
      </div>

      <Field label={t("fieldCategory")} flagged={flagged.has("category")} checkLabel={t("checkField")}>
        <select value={v.category} onChange={setField("category")} className={`${inp} appearance-none`}>
          <option value="">{t("categoryPlaceholder")}</option>
          {grouped.length > 0
            ? grouped.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map((c) => <option key={c.code} value={c.code}>{c.labelId}</option>)}
                </optgroup>
              ))
            : assetCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>

      <Field label={t("fieldProvider")} flagged={flagged.has("provider")} checkLabel={t("checkField")}>
        <input value={v.provider} onChange={setField("provider")} placeholder={t("fieldProviderPlaceholder")} className={inp} />
      </Field>

      <Field label={t("fieldIdentifier")} flagged={flagged.has("identifier")} checkLabel={t("checkField")}>
        <input value={v.identifier} onChange={setField("identifier")} placeholder={t("fieldIdentifierPlaceholder")} className={inp} />
      </Field>

      <Field label={t("fieldValue")} flagged={flagged.has("valueEstimate")} checkLabel={t("checkField")}>
        <input inputMode="numeric" value={v.valueEstimate ?? ""} onChange={setField("valueEstimate")} placeholder="80.000.000" className={inp} />
      </Field>

      {draft.valueNote && (
        <Field label={t("fieldValueNote")}>
          <input value={v.valueNote} onChange={setField("valueNote")} className={inp} />
        </Field>
      )}

      <Field label={t("fieldNotes")}>
        <textarea value={v.notes} onChange={setField("notes")} rows={2} className={`${inp} min-h-[72px] resize-y leading-relaxed`} />
      </Field>

      <div className="flex items-center gap-3 rounded-xl border border-dashed border-emas bg-kertas px-4 py-3">
        <Lock size={18} className="shrink-0 text-emas" />
        <p className="font-sans text-[12.5px] leading-relaxed text-daun">{t("noAccessReassure")}</p>
      </div>

      {/* Nyala is the single primary CTA on this screen. */}
      <button
        type="button"
        disabled={saving || !v.category}
        onClick={() => onConfirm(v)}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-nyala px-6 py-3 font-sans text-[15px] font-semibold text-white transition hover:bg-nyala-pressed active:scale-[0.98] disabled:bg-paper-edge disabled:text-paper-muted disabled:active:scale-100"
      >
        {saving && <Loader2 size={16} className="animate-spin" aria-hidden />}
        {saving ? t("saving") : t("save")}
      </button>
      <p className="text-center font-sans text-[11px] text-paper-muted">{tCommon("reassure")}</p>
    </div>
  );
}

function Field({
  label, flagged, checkLabel, children,
}: {
  label: string; flagged?: boolean; checkLabel?: string; children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-sans text-[14px] font-medium text-paper-text">
        {label}
        {flagged && <span className="ml-2 text-[12px] font-normal text-emas-ink">· {checkLabel}</span>}
      </span>
      {children}
    </label>
  );
}
