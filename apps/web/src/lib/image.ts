// Browser-only (#11b-ii). Downscales to a max edge and re-encodes as JPEG, which
// strips EXIF/GPS and shrinks a 4MB phone photo to ~300KB before it ever leaves the
// device (Cardinal 1 / data minimization). The raw full-res image is never sent.
export async function fileToDownscaledBase64(
  file: File,
  maxEdge = 1600,
  quality = 0.82,
): Promise<{ base64: string; mimeType: "image/jpeg" }> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung");
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, w, h);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = dataUrl.split(",")[1];
  return { base64, mimeType: "image/jpeg" };
}

// Same downscale/JPEG path as above, but for a live source already on screen (a <video>
// frame or <canvas>) — used by the live scanner. Synchronous: the source is decoded.
// Canvas output carries no EXIF/GPS, so nothing extra has to be stripped. An optional
// `crop` (source pixels) captures only a region — the scanner passes the portrait slice
// actually shown on screen, so the saved still matches what the owner framed.
export function frameToDownscaledBase64(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  maxEdge = 1600,
  quality = 0.82,
  crop?: { sx: number; sy: number; sw: number; sh: number },
): { base64: string; mimeType: "image/jpeg" } {
  const sw = crop ? crop.sw : srcW;
  const sh = crop ? crop.sh : srcH;
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung");
  if (crop) ctx.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
  else ctx.drawImage(source, 0, 0, w, h);

  const base64 = canvas.toDataURL("image/jpeg", quality).split(",")[1];
  return { base64, mimeType: "image/jpeg" };
}

// createImageBitmap with an <img> fallback for older Safari.
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to the <img> path */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Gagal membaca gambar"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
