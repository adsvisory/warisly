import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logApiCall, recordEvent, attachDocumentImage } from "@warisly/db";
import { adminClient } from "@/lib/supabase/admin";
import { extractScannedAsset } from "@/lib/llm";
import { addAsset } from "@/services/assets";
import type { ExtractedAssetDraft } from "@/lib/prompts/asset-extraction";

const MAX_BYTES = 6_000_000; // client downscales first; this is a safety cap
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

// Cardinal 1: anything that looks like a secret is never kept, even after manual edits.
const SECRET_RE = /pass(word)?|\bpin\b|cvv|otp|kata\s*sandi|sandi/i;

// ── Extraction (#11b-i): returns a DRAFT only — never writes an asset ───────────
export async function buildScanDraft(params: {
  ownerId: string; base64: string; mimeType: string;
}): Promise<ExtractedAssetDraft> {
  const { ownerId, base64, mimeType } = params;
  if (!ALLOWED_MIME.includes(mimeType)) throw new Error("Unsupported image type");
  const approxBytes = Math.floor((base64.length * 3) / 4);
  if (approxBytes > MAX_BYTES) throw new Error("Image too large");

  const admin = adminClient();
  const t0 = Date.now();
  try {
    const draft = await extractScannedAsset(base64, mimeType);
    await logApiCall(admin, { ownerId, provider: "llm", operation: "scan_extract", status: "ok", latencyMs: Date.now() - t0 });
    return sanitizeDraft(draft);
  } catch (e) {
    // Log only the error class, never String(e) — LLM error bodies can echo the user's
    // intake content (PII) into wrs_api_log.
    await logApiCall(admin, { ownerId, provider: "llm", operation: "scan_extract", status: "error", latencyMs: Date.now() - t0, meta: { error: e instanceof Error ? e.name : "unknown" } });
    throw e;
  }
}

// Cardinal 1: defensively null any identifier that looks like a secret.
export function sanitizeDraft(d: ExtractedAssetDraft): ExtractedAssetDraft {
  const id = d.identifier?.trim() ?? null;
  const looksSecret = id ? SECRET_RE.test(id) : false;
  return { ...d, identifier: looksSecret ? null : id, currency: d.currency || "IDR" };
}

// ── Commit (#11b-iii): persists a confirmed draft; enforces the retention rule ──
export type CommitScanInput = {
  category: string;
  provider: string | null;
  identifier: string | null;
  valueEstimate: number | null;
  valueNote: string | null;
  currency: string;
  notes: string | null;
  rawValueSeen: string | null;
  imageKind: "financial_screenshot" | "offline_document" | "unknown";
  documentBase64?: string | null; // present ONLY for offline_document
  documentMime?: string | null;
  model: string;
};

export async function commitScannedAsset(
  supabase: SupabaseClient,
  ownerId: string,
  input: CommitScanInput,
): Promise<{ id: string }> {
  // Cardinal 1: re-sanitize the identifier server-side even after manual edits.
  const id = input.identifier?.trim() ?? null;
  const identifier = id && SECRET_RE.test(id) ? null : id;

  const detail: Record<string, unknown> = {
    intake: {
      source: "scan",
      model: input.model,
      image_kind: input.imageKind,
      value_note: input.valueNote,
      raw_value_seen: input.rawValueSeen,
      captured_at: new Date().toISOString(),
    },
  };
  if (input.notes) detail.instructions = input.notes;

  // RLS-bound insert as the authenticated owner (never service-role). addAsset validates
  // category against the canonical enum and stamps last_reviewed_at.
  const asset = await addAsset(supabase, ownerId, {
    category: input.category,
    isLiability: input.category === "utang",
    provider: input.provider,
    label: null,
    identifier,
    valueEstimate: input.valueEstimate,
    currency: input.currency || "IDR",
    detail,
    providerBeneficiarySet: null,
  });

  // Cardinal 1: persist the image ONLY for offline documents. Screenshots are dropped.
  if (input.imageKind === "offline_document" && input.documentBase64 && input.documentMime) {
    const ext = input.documentMime === "image/png" ? "png" : input.documentMime === "image/webp" ? "webp" : "jpg";
    // Path convention: {owner_id}/{asset_id}/{doc_id}.{ext}; owner_id == auth.uid().
    const path = `${ownerId}/${asset.id}/${crypto.randomUUID()}.${ext}`;
    const bytes = Buffer.from(input.documentBase64, "base64");
    await attachDocumentImage(supabase, { assetId: asset.id, path, bytes, mimeType: input.documentMime });
  }

  // Audit (wrs_events has no authenticated insert policy → service-role writer).
  const admin = adminClient();
  await recordEvent(admin, {
    ownerId, actor: "owner", eventType: "asset.created", subjectType: "asset", subjectId: asset.id,
    meta: { source: "scan", imageKind: input.imageKind },
  });

  return { id: asset.id };
}
