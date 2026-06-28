import "server-only";
import { serverEnv } from "@/lib/env.server";
import {
  ASSET_EXTRACTION_PROMPT,
  CATEGORY_CODES,
  type ExtractedAssetDraft,
} from "@/lib/prompts/asset-extraction";
import { KTP_OCR_PROMPT, type KtpOcrResult } from "@/lib/prompts/ktp-ocr";

// Model used for both WhatsApp structuring and in-app scan extraction.
const VISION_MODEL = "gpt-4o-2024-08-06";

const CATEGORIES = ["saham","reksa_dana","bank","e_wallet","emas","crypto","asuransi","bpjs","properti","fisik","utang","lainnya"] as const;

const SYSTEM = `Anda mengubah pesan kasual berbahasa Indonesia tentang aset/utang keuangan menjadi data terstruktur.
ATURAN PENTING: JANGAN pernah meminta, menebak, atau menyimpan password. "identifier" hanya email atau nomor akun.
"valueEstimate" = perkiraan nilai dalam Rupiah sebagai bilangan bulat. Ekspansi: "rb"=ribu (x1.000), "jt"=juta (x1.000.000), "M"/"miliar"=x1.000.000.000. Null jika tidak disebut.
Pilih "category" dari daftar; jika ragu gunakan "lainnya". Berikan "confidence" 0..1 per field.`;

const schema = {
  name: "asset_draft",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["category", "provider", "label", "identifier", "valueEstimate", "confidence"],
    properties: {
      category: { type: "string", enum: [...CATEGORIES] },
      provider: { type: ["string", "null"] },
      label: { type: ["string", "null"] },
      identifier: { type: ["string", "null"] },
      valueEstimate: { type: ["integer", "null"] },
      confidence: {
        type: "object", additionalProperties: false,
        required: ["category", "provider", "valueEstimate"],
        properties: { category: { type: "number" }, provider: { type: "number" }, valueEstimate: { type: "number" } },
      },
    },
  },
} as const;

export interface DraftFields {
  category: (typeof CATEGORIES)[number];
  provider: string | null; label: string | null; identifier: string | null; valueEstimate: number | null;
  confidence: { category: number; provider: number; valueEstimate: number };
}

async function chat(messages: unknown[]): Promise<DraftFields> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${serverEnv.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: "gpt-4o-2024-08-06", messages, response_format: { type: "json_schema", json_schema: schema } }),
  });
  // Status only — the error body can echo back the request (KTP image / financial
  // screenshot / intake text), which must never reach logs. See no-access guarantee.
  if (!res.ok) throw new Error(`LLM ${res.status}`);
  const json = await res.json();
  return JSON.parse(json.choices[0].message.content) as DraftFields;
}

export function structureFromText(text: string) {
  return chat([{ role: "system", content: SYSTEM }, { role: "user", content: text }]);
}

export function structureFromImage(base64: string, mime: string) {
  return chat([
    { role: "system", content: SYSTEM },
    { role: "user", content: [
      { type: "text", text: "Ekstrak satu aset dari tangkapan layar ini. Jangan baca atau salin password." },
      { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
    ] },
  ]);
}

// ── Scanned-asset extraction (#11b-i) ──────────────────────────────────────
// Richer than structureFromImage: classifies the image (screenshot vs document),
// returns the raw value string the model read (for owner verification) and the
// fields that need a double-check. DRAFT only — never persisted here.
const extractSchema = {
  name: "scanned_asset",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "imageKind", "category", "provider", "identifier", "valueEstimate",
      "rawValueSeen", "valueNote", "currency", "documentNumber",
      "confidence", "fieldsNeedingReview",
    ],
    properties: {
      imageKind: { type: "string", enum: ["financial_screenshot", "offline_document", "unknown"] },
      category: { type: ["string", "null"], enum: [...CATEGORY_CODES, null] },
      provider: { type: ["string", "null"] },
      identifier: { type: ["string", "null"] },
      valueEstimate: { type: ["integer", "null"] },
      rawValueSeen: { type: ["string", "null"] },
      valueNote: { type: ["string", "null"] },
      currency: { type: "string" },
      documentNumber: { type: ["string", "null"] },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      fieldsNeedingReview: { type: "array", items: { type: "string" } },
    },
  },
} as const;

export async function extractScannedAsset(base64: string, mime: string): Promise<ExtractedAssetDraft> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${serverEnv.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: VISION_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: ASSET_EXTRACTION_PROMPT },
        { role: "user", content: [
          { type: "text", text: "Ekstrak satu aset atau dokumen dari gambar ini. Jangan baca atau salin password." },
          { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
        ] },
      ],
      response_format: { type: "json_schema", json_schema: extractSchema },
    }),
  });
  // Status only — the error body can echo back the request (KTP image / financial
  // screenshot / intake text), which must never reach logs. See no-access guarantee.
  if (!res.ok) throw new Error(`LLM ${res.status}`);
  const json = await res.json();
  return JSON.parse(json.choices[0].message.content) as ExtractedAssetDraft;
}

// ── KTP OCR (#12b-i) ────────────────────────────────────────────────────────
// KYC pre-fill: read ONLY NIK / name / DOB from a KTP photo. Auth-agnostic vision call —
// callers (owner/heir) gate access. Returns text only; the image is never persisted here.
// Reuses the same gpt-4o vision model as scanned-asset extraction (no separate provider).
const ktpSchema = {
  name: "ktp_ocr",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["nik", "name", "dob", "fieldsNeedingReview"],
    properties: {
      nik: { type: ["string", "null"] },
      name: { type: ["string", "null"] },
      dob: { type: ["string", "null"] },
      fieldsNeedingReview: { type: "array", items: { type: "string" } },
    },
  },
} as const;

export async function recognizeKtp(base64: string, mime: string): Promise<KtpOcrResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${serverEnv.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: VISION_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: KTP_OCR_PROMPT },
        { role: "user", content: [
          { type: "text", text: "Baca SATU foto KTP. Kembalikan hanya NIK, nama, dan tanggal lahir." },
          { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
        ] },
      ],
      response_format: { type: "json_schema", json_schema: ktpSchema },
    }),
  });
  // Status only — the error body can echo back the request (KTP image / financial
  // screenshot / intake text), which must never reach logs. See no-access guarantee.
  if (!res.ok) throw new Error(`LLM ${res.status}`);
  const json = await res.json();
  return JSON.parse(json.choices[0].message.content) as KtpOcrResult;
}

export async function transcribeAudio(base64: string, mime: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(Buffer.from(base64, "base64"))], { type: mime }), "audio");
  form.append("model", "whisper-1");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST", headers: { Authorization: `Bearer ${serverEnv.OPENAI_API_KEY}` }, body: form,
  });
  // Status only — never fold the response body (may echo the audio/transcript) into the error.
  if (!res.ok) throw new Error(`STT ${res.status}`);
  const json = await res.json();
  return String(json.text ?? "");
}
