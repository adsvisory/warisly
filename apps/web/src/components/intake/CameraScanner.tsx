"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Zap, ZapOff, Loader2 } from "lucide-react";
import { frameToDownscaledBase64 } from "@/lib/image";
import {
  ANALYSIS_WIDTH,
  analyzeFrame,
  isDetected,
  isLocked,
  toGrayscale,
} from "@/lib/edge-detect";
import type { CapturedImage } from "./ScanCapture";

const ANALYZE_MS = 90; // ~11 analysed frames/sec — enough to feel live, light on CPU
const LOCK_FRAMES = 6; // ~0.5s of steady, well-framed content before auto-capture fires

type Status = "starting" | "searching" | "detected" | "locked" | "captured" | "error";

// Full-screen live scanner (#11b-ii, live capture). Opens the rear camera, runs Sobel
// edge detection on each frame in the browser, draws a guide that snaps to the detected
// document, and auto-captures once the frame is sharp, filled, and held steady. A manual
// shutter is always available. The still is downscaled on-device and handed to the same
// extract → review → confirm flow — nothing is uploaded until the owner confirms.
export function CameraScanner({
  onCapture,
  onClose,
}: {
  onCapture: (img: CapturedImage) => void;
  onClose: () => void;
}) {
  const t = useTranslations("scan");

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const analysisRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const lastTickRef = useRef(0);
  const prevGrayRef = useRef<Uint8ClampedArray | null>(null);
  const lockRef = useRef(0);
  const doneRef = useRef(false);
  const statusRef = useRef<Status>("starting");

  const [status, setStatusState] = useState<Status>("starting");
  // Only re-render when the status actually changes — the analysis loop runs ~11×/sec.
  const setStatus = useCallback((s: Status) => {
    if (statusRef.current === s) return;
    statusRef.current = s;
    setStatusState(s);
  }, []);
  const [errKind, setErrKind] = useState<"denied" | "generic">("generic");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // Tear down the camera + animation loop. Safe to call more than once.
  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  // Grab the current video frame, downscale on-device, hand it off, and shut down. We
  // capture only the portrait slice the owner actually saw (the object-cover crop), not
  // the wider raw sensor frame — so the saved still matches what was framed.
  const capture = useCallback(() => {
    if (doneRef.current) return;
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    doneRef.current = true;
    setStatus("captured");
    const { sx, sy, sw, sh } = coverCrop(video);
    const img = frameToDownscaledBase64(
      video,
      video.videoWidth,
      video.videoHeight,
      1600,
      0.82,
      { sx, sy, sw, sh },
    );
    stop();
    onCapture(img);
  }, [onCapture, stop]);

  const close = useCallback(() => {
    stop();
    onClose();
  }, [stop, onClose]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      // `torch` is a non-standard but widely supported video constraint on Android, so it
      // isn't in the DOM typings — cast through unknown.
      await track.applyConstraints({ advanced: [{ torch: next }] } as unknown as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      /* torch not actually controllable — leave the toggle off */
    }
  }, [torchOn]);

  // One analysis pass: throttle, analyse a downscaled copy, update the guide, and
  // auto-capture once the frame stays locked for LOCK_FRAMES in a row. Held in a ref and
  // reassigned each render (the "latest ref" pattern) so the rAF loop below can stay
  // stable — restarting the camera on every parent re-render would be jarring.
  const analyzeRef = useRef<(ts: number) => void>(() => {});
  analyzeRef.current = (ts: number) => {
    if (doneRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return;
    if (ts - lastTickRef.current < ANALYZE_MS) return;
    lastTickRef.current = ts;

    // Analyse the same portrait slice that's shown on screen (the object-cover crop), so
    // the guide, the fill/steadiness signals, and the capture all agree.
    const { sx, sy, sw, sh, cw, ch } = coverCrop(video);
    const aw = ANALYSIS_WIDTH;
    const ah = Math.max(1, Math.round((aw * ch) / cw));

    let acan = analysisRef.current;
    if (!acan) {
      acan = document.createElement("canvas");
      analysisRef.current = acan;
    }
    if (acan.width !== aw || acan.height !== ah) {
      acan.width = aw;
      acan.height = ah;
    }
    const actx = acan.getContext("2d", { willReadFrequently: true });
    if (!actx) return;
    actx.drawImage(video, sx, sy, sw, sh, 0, 0, aw, ah);
    const { data } = actx.getImageData(0, 0, aw, ah);

    const gray = new Uint8ClampedArray(aw * ah);
    toGrayscale(data, gray);
    const signals = analyzeFrame(gray, aw, ah, prevGrayRef.current);
    prevGrayRef.current = gray;

    const locked = isLocked(signals);
    lockRef.current = locked ? lockRef.current + 1 : 0;

    drawOverlay(signals.box, locked, lockRef.current / LOCK_FRAMES);
    setStatus(locked ? "locked" : isDetected(signals) ? "detected" : "searching");

    if (lockRef.current >= LOCK_FRAMES) capture();
  };

  // Stable self-scheduling rAF loop — created once, drives analyzeRef forever.
  const loop = useCallback((ts: number) => {
    rafRef.current = requestAnimationFrame(loop);
    analyzeRef.current(ts);
  }, []);

  // Start the camera once on mount; clean up on unmount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // Rear lens, and ask for a high-res frame so the portrait crop stays sharp.
          // Hint portrait via aspectRatio; browsers that ignore it just give their native
          // orientation, which the object-cover crop handles either way.
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            aspectRatio: { ideal: 9 / 16 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        const caps = stream.getVideoTracks()[0]?.getCapabilities?.() as
          | { torch?: boolean }
          | undefined;
        setTorchSupported(!!caps?.torch);
        setStatus("searching");
        rafRef.current = requestAnimationFrame(loop);
      } catch (e) {
        if (cancelled) return;
        const denied = e instanceof DOMException &&
          (e.name === "NotAllowedError" || e.name === "SecurityError");
        setErrKind(denied ? "denied" : "generic");
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [loop, stop, setStatus]);

  // Paint the guide + detected document box onto the overlay. The box is already in the
  // visible (object-cover) crop's normalized coords, which fills the element edge-to-edge,
  // so it maps straight to the overlay with no letterbox offset.
  function drawOverlay(
    box: { x0: number; y0: number; x1: number; y1: number } | null,
    locked: boolean,
    progress: number,
  ) {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    // The detected document, or a gentle default guide while still searching.
    const b = box ?? { x0: 0.12, y0: 0.16, x1: 0.88, y1: 0.84 };
    const x = b.x0 * cw;
    const y = b.y0 * ch;
    const w = (b.x1 - b.x0) * cw;
    const h = (b.y1 - b.y0) * ch;

    const gold = "#C9A45E";
    const idle = "rgba(244,238,224,0.55)";
    ctx.strokeStyle = box ? gold : idle;
    ctx.lineWidth = locked ? 3 : 2;
    drawRoundedRect(ctx, x, y, w, h, 14);
    ctx.stroke();

    // Corner ticks for a "scanner" feel.
    const c = Math.min(26, w / 4, h / 4);
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = box ? gold : idle;
    const corners: [number, number, number, number][] = [
      [x, y + c, x, y], [x, y, x + c, y],
      [x + w - c, y, x + w, y], [x + w, y, x + w, y + c],
      [x, y + h - c, x, y + h], [x, y + h, x + c, y + h],
      [x + w - c, y + h, x + w, y + h], [x + w, y + h, x + w, y + h - c],
    ];
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of corners) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    // Lock progress: a gold sweep along the top edge as the steady countdown fills.
    if (progress > 0) {
      ctx.strokeStyle = gold;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w * Math.min(1, progress), y);
      ctx.stroke();
    }
  }

  const hint =
    status === "starting" ? t("camStarting")
    : status === "locked" ? t("camHold")
    : status === "detected" ? t("camHold")
    : t("camAim");

  if (status === "error") {
    return (
      <Shell onClose={close}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <p className="font-sans text-[15px] text-ink-text">
            {errKind === "denied" ? t("camDenied") : t("camError")}
          </p>
          <button
            type="button"
            onClick={close}
            className="rounded-xl bg-nyala px-6 py-3 font-sans text-[15px] font-semibold text-white transition hover:bg-nyala-pressed active:scale-[0.98]"
          >
            {t("camClose")}
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onClose={close} torch={torchSupported ? { on: torchOn, toggle: toggleTorch, label: t("camTorch") } : undefined}>
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
        />
        <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />

        {status === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-emas-glow" aria-hidden />
          </div>
        )}

        {/* Status pill */}
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
          <span className="rounded-full bg-ink/80 px-4 py-2 font-sans text-[13px] font-medium text-ink-text backdrop-blur-sm">
            {hint}
          </span>
        </div>

        {/* No-access reassurance stays visible while the lens is open. */}
        <p className="pointer-events-none absolute inset-x-0 bottom-28 px-8 text-center font-sans text-[12px] leading-relaxed text-ink-text/85">
          {t("captureReassure")}
        </p>
      </div>

      {/* Manual shutter — always available, even before the frame locks. */}
      <div className="flex items-center justify-center py-6">
        <button
          type="button"
          onClick={capture}
          aria-label={t("camManual")}
          className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-4 border-ink-text/90 transition active:scale-95"
        >
          <span className="h-[52px] w-[52px] rounded-full bg-ink-text" />
        </button>
      </div>
    </Shell>
  );
}

// Chrome for the full-screen scanner: dark backdrop, close button, optional torch.
function Shell({
  children,
  onClose,
  torch,
}: {
  children: React.ReactNode;
  onClose: () => void;
  torch?: { on: boolean; toggle: () => void; label: string };
}) {
  // Lock body scroll while the overlay is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink">
      <div className="flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-text/10 text-ink-text transition active:scale-95"
        >
          <X size={20} />
        </button>
        {torch && (
          <button
            type="button"
            onClick={torch.toggle}
            aria-label={torch.label}
            aria-pressed={torch.on}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-text/10 text-ink-text transition active:scale-95"
          >
            {torch.on ? <Zap size={20} className="text-emas-glow" /> : <ZapOff size={20} />}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// The slice of the camera frame actually shown by `object-cover`, in source pixels, plus
// the element's display size. Capture and analysis both crop to this so preview, the
// edge-detection guide, and the saved still all line up — and the view is full-bleed
// portrait on a phone even when the camera hands back a landscape frame.
function coverCrop(video: HTMLVideoElement) {
  const cw = video.clientWidth || 1;
  const ch = video.clientHeight || 1;
  const vw = video.videoWidth || cw;
  const vh = video.videoHeight || ch;
  const scale = Math.max(cw / vw, ch / vh);
  const sw = Math.min(vw, cw / scale);
  const sh = Math.min(vh, ch / scale);
  return { sx: (vw - sw) / 2, sy: (vh - sh) / 2, sw, sh, cw, ch };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
