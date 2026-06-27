"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, ImageUp } from "lucide-react";
import { fileToDownscaledBase64 } from "@/lib/image";

export type CapturedImage = { base64: string; mimeType: string };

// Capture step (#11b-ii). Plain <input capture> — no getUserMedia permission dance, so it
// works on low-end Android. Downscaling strips EXIF/GPS before the image leaves the device.
export function ScanCapture({ onCaptured }: { onCaptured: (img: CapturedImage) => void }) {
  const t = useTranslations("scan");
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-3">
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => handle(e.target.files?.[0])} />
      <input ref={galRef} type="file" accept="image/*" hidden
        onChange={(e) => handle(e.target.files?.[0])} />

      <button type="button" disabled={busy} onClick={() => camRef.current?.click()} className={tile}>
        <Camera size={20} className="mt-0.5 shrink-0 text-emas" />
        <span>
          {t("takePhoto")}
          <span className="mt-1 block text-[13px] font-normal text-paper-muted">{t("takePhotoHint")}</span>
        </span>
      </button>

      <button type="button" disabled={busy} onClick={() => galRef.current?.click()} className={tile}>
        <ImageUp size={20} className="mt-0.5 shrink-0 text-emas" />
        <span>{t("fromGallery")}</span>
      </button>

      {busy && <p className="font-sans text-[13px] text-paper-muted">{t("processing")}</p>}
      {err && <p className="font-sans text-[13px] text-bata">{err}</p>}

      <p className="mt-1 font-sans text-[12.5px] leading-relaxed text-paper-muted">{t("captureReassure")}</p>
    </div>
  );
}
