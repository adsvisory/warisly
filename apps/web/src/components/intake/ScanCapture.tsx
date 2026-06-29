"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Camera, ImageUp, Loader2, PenLine, ScanLine } from "lucide-react";
import { fileToDownscaledBase64 } from "@/lib/image";
import { CameraScanner } from "./CameraScanner";

export type CapturedImage = { base64: string; mimeType: string };

// Capture step (#11b-ii). Preferred path is the live scanner — a real camera preview with
// in-browser edge detection that auto-captures once a document/screen fills the frame
// (CameraScanner). Where getUserMedia isn't available (older/locked-down devices) we fall
// back to a plain <input capture>. Either way the image is downscaled on-device — which
// strips EXIF/GPS — before it ever leaves the phone, and nothing is saved until the owner
// confirms the extraction.
export function ScanCapture({
  onCaptured,
  manualHref,
}: {
  onCaptured: (img: CapturedImage) => void;
  // When set, a third "Isi manual" tile is shown so this screen is the single entry
  // point for adding an asset (scan / upload / manual) — no separate picker step.
  manualHref?: string;
}) {
  const t = useTranslations("scan");
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [supportsLive, setSupportsLive] = useState(false);

  // Feature-detect after mount to avoid an SSR/client hydration mismatch.
  useEffect(() => {
    setSupportsLive(typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  async function handle(file?: File) {
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      onCaptured(await fileToDownscaledBase64(file));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  const tile =
    "flex items-start gap-3 rounded-xl border border-paper-edge bg-panel px-5 py-4 text-left font-sans text-[15px] font-medium text-tinta transition hover:border-emas disabled:opacity-60";

  if (live) {
    return (
      <CameraScanner
        onCapture={(img) => {
          setLive(false);
          onCaptured(img);
        }}
        onClose={() => setLive(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => handle(e.target.files?.[0])} />
      <input ref={galRef} type="file" accept="image/*" hidden
        onChange={(e) => handle(e.target.files?.[0])} />

      {supportsLive ? (
        <button type="button" disabled={busy} onClick={() => setLive(true)} className={tile}>
          <ScanLine size={20} className="mt-0.5 shrink-0 text-emas" />
          <span>
            <span className="flex flex-wrap items-center gap-2">
              {t("liveScan")}
              <span className="rounded-full border border-emas/40 bg-emas/[0.08] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-eyebrow text-emas-ink">
                {t("recommended")}
              </span>
            </span>
            <span className="mt-1 block text-[13px] font-normal text-paper-muted">{t("liveScanHint")}</span>
          </span>
        </button>
      ) : (
        <button type="button" disabled={busy} onClick={() => camRef.current?.click()} className={tile}>
          <Camera size={20} className="mt-0.5 shrink-0 text-emas" />
          <span>
            {t("takePhoto")}
            <span className="mt-1 block text-[13px] font-normal text-paper-muted">{t("takePhotoHint")}</span>
          </span>
        </button>
      )}

      <button type="button" disabled={busy} onClick={() => galRef.current?.click()} className={tile}>
        <ImageUp size={20} className="mt-0.5 shrink-0 text-emas" />
        <span>{t("fromGallery")}</span>
      </button>

      {manualHref && (
        <Link href={manualHref} className={tile}>
          <PenLine size={20} className="mt-0.5 shrink-0 text-daun" />
          <span>
            {t("manual")}
            <span className="mt-1 block text-[13px] font-normal text-paper-muted">{t("manualHint")}</span>
          </span>
        </Link>
      )}

      {busy && (
        <p className="flex items-center gap-2 font-sans text-[13px] text-paper-muted">
          <Loader2 size={14} className="animate-spin text-emas" aria-hidden /> {t("processing")}
        </p>
      )}
      {err && <p className="font-sans text-[13px] text-bata">{err}</p>}

      <p className="mt-1 font-sans text-[12.5px] leading-relaxed text-paper-muted">{t("captureReassure")}</p>
    </div>
  );
}
