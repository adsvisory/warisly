import "server-only";
import { logApiCall } from "@warisly/db";
import { adminClient } from "@/lib/supabase/admin";
import { recognizeKtp } from "@/lib/llm";
import type { KtpDraft } from "@/lib/prompts/ktp-ocr";

const MAX_BYTES = 6_000_000; // client downscales first; this is a safety cap
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

// Auth-agnostic OCR (#12b-i). The owner action (#12b-ii) and heir action (#12b-iii) gate
// access first; this service only reads NIK/name/DOB and returns a DRAFT.
//
// OCR ≠ verification: this sets no verified flag, matches no recipient, and arms no release.
// Cardinal 3: the image is processed in memory and is NEVER returned or stored — only text.
//
// `logOwnerId` is for observability only and MUST be a valid wrs_owners.id (or null), because
// wrs_api_log.owner_id has an FK to wrs_owners. The heir caller passes the claim's owner_id
// (the estate), NOT the claim id — a claim id would violate that FK.
export async function readKtp(params: {
  logOwnerId: string | null;
  base64: string;
  mimeType: string;
}): Promise<KtpDraft> {
  const { logOwnerId, base64, mimeType } = params;
  if (!ALLOWED_MIME.includes(mimeType)) throw new Error("Unsupported image type");
  if (Math.floor((base64.length * 3) / 4) > MAX_BYTES) throw new Error("Image too large");

  const admin = adminClient();
  const t0 = Date.now();
  try {
    const result = await recognizeKtp(base64, mimeType);
    await logApiCall(admin, { ownerId: logOwnerId, provider: "llm", operation: "ktp_ocr", status: "ok", latencyMs: Date.now() - t0 });

    const nik = (result.nik ?? "").replace(/\D/g, "");
    const nikValid = /^\d{16}$/.test(nik);
    const flags = new Set(result.fieldsNeedingReview ?? []);
    if (!nikValid) flags.add("nik");

    // Cardinal 3: the image is NOT returned — only these text fields.
    return {
      nik: nik || null,
      name: result.name ?? null,
      dob: result.dob ?? null,
      fieldsNeedingReview: [...flags],
      nikValid,
    };
  } catch (e) {
    // Log only the error class, never String(e) — an upstream error body could echo image
    // bytes or model output (potential PII) into wrs_api_log.
    await logApiCall(admin, { ownerId: logOwnerId, provider: "llm", operation: "ktp_ocr", status: "error", latencyMs: Date.now() - t0, meta: { error: e instanceof Error ? e.name : "unknown" } });
    throw e;
  }
}
