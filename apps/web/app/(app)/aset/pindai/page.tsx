"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ScanCapture, type CapturedImage } from "@/components/intake/ScanCapture";
import { ScanReview, type ReviewValue } from "@/components/intake/ScanReview";
import { commitScannedAssetAction } from "@/app/actions/asset-scan";
import type { ExtractedAssetDraft } from "@/lib/prompts/asset-extraction";

type Step = "capture" | "extracting" | "review" | "saving";

export default function ScanPage() {
  const t = useTranslations("scan");
  const router = useRouter();
  const [step, setStep] = useState<Step>("capture");
  const [img, setImg] = useState<CapturedImage | null>(null);
  const [draft, setDraft] = useState<ExtractedAssetDraft | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onCaptured(captured: CapturedImage) {
    setImg(captured);
    setStep("extracting");
    setErr(null);
    try {
      const res = await fetch("/api/intake/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(captured),
      });
      if (!res.ok) throw new Error(t("errorExtract"));
      const data = await res.json();
      setDraft(data.draft as ExtractedAssetDraft);
      setStep("review");
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("errorGeneric"));
      setStep("capture");
    }
  }

  async function onConfirm(v: ReviewValue) {
    if (!draft) return;
    setStep("saving");
    setErr(null);
    const isDoc = draft.imageKind === "offline_document";
    const res = await commitScannedAssetAction({
      category: v.category,
      provider: v.provider || null,
      identifier: v.identifier || null,
      valueEstimate: v.valueEstimate,
      valueNote: v.valueNote || null,
      currency: "IDR",
      notes: v.notes || null,
      rawValueSeen: draft.rawValueSeen ?? null,
      imageKind: draft.imageKind,
      documentBase64: isDoc ? img?.base64 ?? null : null,
      documentMime: isDoc ? (img?.mimeType as "image/jpeg" | "image/png" | "image/webp" | undefined) ?? null : null,
      model: "gpt-4o-2024-08-06",
    });
    if (res.ok) {
      router.push("/aset");
    } else {
      setErr(t("errorSave"));
      setStep("review");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <p className="font-sans text-[11px] font-semibold uppercase tracking-eyebrow text-emas">{t("eyebrow")}</p>
      <h1 className="mt-2 font-display text-3xl text-tinta">{t("title")}</h1>
      <p className="mt-2 font-serif text-[17px] leading-relaxed text-paper-muted">{t("intro")}</p>

      {err && <p className="mt-4 font-sans text-[13px] text-bata">{err}</p>}

      <div className="mt-6">
        {step === "capture" && <ScanCapture onCaptured={onCaptured} />}
        {step === "extracting" && <p className="font-sans text-[14px] text-paper-muted">{t("reading")}</p>}
        {(step === "review" || step === "saving") && draft && (
          <ScanReview draft={draft} saving={step === "saving"} onConfirm={onConfirm} />
        )}
      </div>
    </div>
  );
}
