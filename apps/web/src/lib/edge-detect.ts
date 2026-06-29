// Client-side document edge detection for the live scanner (#11b-ii, live capture).
// Pure functions over pixel data — no network, no deps. The frame never leaves the
// device; this only decides WHEN to grab a still and where the document sits in the
// frame (Cardinal 1: pixels are read locally, nothing is uploaded until the user's
// confirmed extraction). Tuned to stay cheap on low-end Android by running on a tiny
// downscaled frame.

export type FrameSignals = {
  focus: number; // 0..1 edge energy — content present and in focus (not blurry/empty)
  fill: number; // 0..1 how fully strong-edge content spans the frame both ways
  motion: number; // 0..1 frame-to-frame change — 0 means the hand is perfectly steady
  box: { x0: number; y0: number; x1: number; y1: number } | null; // detected content, normalized
};

// Analysis runs on a downscaled frame this wide. Small = cheap; big enough to see edges.
export const ANALYSIS_WIDTH = 192;

// Algorithm constants (structural, not product tunables): Sobel magnitude that counts as
// a real edge, and the reference means that map a raw signal onto the 0..1 range.
const EDGE_THRESHOLD = 60; // L1 Sobel magnitude treated as a genuine edge
const FOCUS_REF = 28; // mean gradient that maps to focus = 1
const MOTION_REF = 26; // mean luma delta that maps to motion = 1

// Rec. 601 luma, integer-approximated. Writes one byte per pixel into `out`.
export function toGrayscale(rgba: Uint8ClampedArray, out: Uint8ClampedArray): void {
  for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
    out[p] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
  }
}

// Sobel edge map → focus / fill / motion / content bbox. `prev` is the previous analyzed
// grayscale frame (or null on the first tick) and drives the motion (steadiness) signal.
export function analyzeFrame(
  gray: Uint8ClampedArray,
  w: number,
  h: number,
  prev: Uint8ClampedArray | null,
): FrameSignals {
  const colCnt = new Uint16Array(w);
  const rowCnt = new Uint16Array(h);
  let edgeSum = 0;
  let edgeCount = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const tl = gray[i - w - 1], tc = gray[i - w], tr = gray[i - w + 1];
      const ml = gray[i - 1], mr = gray[i + 1];
      const bl = gray[i + w - 1], bc = gray[i + w], br = gray[i + w + 1];
      const gx = tr + 2 * mr + br - (tl + 2 * ml + bl);
      const gy = bl + 2 * bc + br - (tl + 2 * tc + tr);
      const mag = Math.abs(gx) + Math.abs(gy); // cheap L1 magnitude
      edgeSum += mag;
      edgeCount++;
      if (mag > EDGE_THRESHOLD) {
        colCnt[x]++;
        rowCnt[y]++;
      }
    }
  }

  const focus = Math.min(1, edgeSum / Math.max(1, edgeCount) / FOCUS_REF);

  // A column/row "carries" the document only if several of its pixels are edges — one
  // speckle of sensor noise shouldn't count. This keeps the bbox from ballooning to the
  // whole frame on a grainy, near-empty view.
  const colMin = Math.max(2, Math.round(h * 0.05));
  const rowMin = Math.max(2, Math.round(w * 0.05));
  let x0 = -1, x1 = -1, y0 = -1, y1 = -1, cols = 0, rows = 0;
  for (let x = 0; x < w; x++) {
    if (colCnt[x] >= colMin) { if (x0 < 0) x0 = x; x1 = x; cols++; }
  }
  for (let y = 0; y < h; y++) {
    if (rowCnt[y] >= rowMin) { if (y0 < 0) y0 = y; y1 = y; rows++; }
  }
  // Reward content that spans the frame in BOTH directions — a document filling the guide
  // lights up nearly every row and column; a small object centred in an empty view doesn't.
  const fill = Math.min(cols / w, rows / h);
  const box = x0 >= 0 && y0 >= 0
    ? { x0: x0 / w, y0: y0 / h, x1: x1 / w, y1: y1 / h }
    : null;

  let motion = 1;
  if (prev && prev.length === gray.length) {
    let diff = 0;
    for (let p = 0; p < gray.length; p++) diff += Math.abs(gray[p] - prev[p]);
    motion = Math.min(1, diff / gray.length / MOTION_REF);
  }

  return { focus, fill, motion, box };
}

// Thresholds that mark a frame ready to auto-capture: sharp content filling the frame,
// hand held steady. Biased so a borderline frame keeps searching rather than mis-firing.
const FOCUS_MIN = 0.34;
const FILL_MIN = 0.6;
const MOTION_MAX = 0.05;

// A looser "something is there" test, used to light the guide gold before full lock.
const DETECT_FOCUS_MIN = 0.24;
const DETECT_FILL_MIN = 0.4;

export function isLocked(s: FrameSignals): boolean {
  return s.focus >= FOCUS_MIN && s.fill >= FILL_MIN && s.motion <= MOTION_MAX;
}

export function isDetected(s: FrameSignals): boolean {
  return s.focus >= DETECT_FOCUS_MIN && s.fill >= DETECT_FILL_MIN && s.box != null;
}
