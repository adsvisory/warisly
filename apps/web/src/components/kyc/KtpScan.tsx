"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, ImageUp, ShieldCheck, Loader2 } from "lucide-react";
import { fileToDownscaledBase64 } from "@/lib/image";
import type { KtpDraft } from "@/lib/prompts/ktp-ocr";

export type KtpConfirmValue = { nik: string; name: string; dob: string };

// Shared capture → OCR → review step (#12b-ii), reused by the owner profile and the heir
// claim flow (#12b-iii). The KTP image is downscaled in the browser, sent for OCR, then
// dropped — only the confirmed NIK/name/DOB text is ever saved (Cardinal 3). The owner/heir
// always reviews before anything is written (never auto-save).
export function KtpScan({
  onOcr,
  onConfirm,
}: {
  onOcr: (img: { base64: string; mimeType: string }) => Promise<KtpDraft>;
  onConfirm: (v: KtpConfirmValue) => Promise<{ ok: boolean }>;
}) {
  const t = useTranslations("ktp");
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"capture" | "reading" | "review" | "saving">("capture");
  const [draft, setDraft] = useState<KtpDraft | null>(null);
  const [v, setV] = useState<KtpConfirmValue>({ nik: "", name: "", dob: "" });
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file?: File) {
    if (!file) return;
    setErr(null);
    setPhase("reading");
    try {
      const img = await fileToDownscaledBase64(file);
      const d = await onOcr(img); // image is discarded once this resolves
      setDraft(d);
      setV({ nik: d.nik ?? "", name: d.name ?? "", dob: d.dob ?? "" });
      setPhase("review");
    } catch {
      setErr(t("errorRead"));
      setPhase("capture");
    }
  }

  async function save() {
    setPhase("saving");
    setErr(null);
    const res = await onConfirm(v);
    if (!res.ok) {
      setErr(t("errorSave"));
      setPhase("review");
    }
  }

  const nikOk = /^\d{16}$/.test(v.nik);
  const flagged = new Set(draft?.fieldsNeedingReview ?? []);
  const tile =
    "flex items-start gap-3 rounded-xl border border-paper-edge bg-panel px-5 py-4 text-left font-sans text-[15px] font-medium text-tinta transition hover:border-emas disabled:opacity-60";

  if (phase === "capture" || phase === "reading") {
    return (
      <div className="flex flex-col gap-3">
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden
          onChange={(e) => handleFile(e.target.files?.[0])} />
        <input ref={galRef} type="file" accept="image/*" hidden
          onChange={(e) => handleFile(e.target.files?.[0])} />

        <button type="button" disabled={phase === "reading"} onClick={() => camRef.current?.click()} className={tile}>
          <Camera size={20} className="mt-0.5 shrink-0 text-emas" />
          <span>
            {t("takePhoto")}
            <span className="mt-1 block text-[13px] font-normal text-paper-muted">{t("takePhotoHint")}</span>
          </span>
        </button>

        <button type="button" disabled={phase === "reading"} onClick={() => galRef.current?.click()} className={tile}>
          <ImageUp size={20} className="mt-0.5 shrink-0 text-emas" />
          <span>{t("fromGallery")}</span>
        </button>

        {phase === "reading" && (
          <p className="flex items-center gap-2 font-sans text-[13px] text-paper-muted">
            <Loader2 size={14} className="animate-spin text-emas" aria-hidden /> {t("reading")}
          </p>
        )}
        {err && <p className="font-sans text-[13px] text-bata">{err}</p>}

        <p className="mt-1 font-sans text-[12.5px] leading-relaxed text-paper-muted">{t("captureReassure")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-paper-edge bg-kertas px-4 py-3">
        <p className="font-sans text-[12.5px] text-paper-muted">{t("reviewNote")}</p>
      </div>

      <Field label={t("fieldNik")} flagged={flagged.has("nik") || !nikOk} checkLabel={t("checkField")}>
        <input
          inputMode="numeric"
          value={v.nik}
          onChange={(e) => setV({ ...v, nik: e.target.value.replace(/\D/g, "").slice(0, 16) })}
          className={inp}
        />
      </Field>

      <Field label={t("fieldName")} flagged={flagged.has("name")} checkLabel={t("checkField")}>
        <input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={inp} />
      </Field>

      <Field label={t("fieldDob")} flagged={flagged.has("dob")} checkLabel={t("checkField")}>
        <input value={v.dob} onChange={(e) => setV({ ...v, dob: e.target.value })} placeholder={t("dobPlaceholder")} className={inp} />
      </Field>

      <div className="flex items-center gap-3 rounded-xl border border-dashed border-emas bg-kertas px-4 py-3">
        <ShieldCheck size={18} className="shrink-0 text-emas" />
        <p className="font-sans text-[12.5px] leading-relaxed text-daun">{t("captureReassure")}</p>
      </div>

      {err && <p className="font-sans text-[13px] text-bata">{err}</p>}

      {/* Nyala is the single primary CTA on this screen. */}
      <button
        type="button"
        disabled={phase === "saving" || !nikOk || !v.name}
        onClick={save}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-nyala px-6 py-3 font-sans text-[15px] font-semibold text-white transition hover:bg-nyala-pressed active:scale-[0.98] disabled:bg-paper-edge disabled:text-paper-muted disabled:active:scale-100"
      >
        {phase === "saving" && <Loader2 size={16} className="animate-spin" aria-hidden />}
        {phase === "saving" ? t("saving") : t("save")}
      </button>
    </div>
  );
}

const inp =
  "w-full rounded-xl border-[1.5px] border-paper-edge bg-panel px-4 py-3 font-sans text-[15px] text-paper-text outline-none transition focus:border-emas focus:ring-4 focus:ring-emas/15";

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
