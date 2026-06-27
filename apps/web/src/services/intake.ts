import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import {
  getIntakeMessage, markIntakeStatus, setIntakeTranscript, createDraft, logApiCall,
} from "@warisly/db";
import { downloadWhatsAppMedia } from "@/lib/whatsapp-media";
import { structureFromText, structureFromImage, transcribeAudio, type DraftFields } from "@/lib/llm";

const CONFIDENCE_THRESHOLD = 0.7; // mirrors wrs_settings 'intake.ai_confidence_threshold'

function lowConfidenceFlags(c: DraftFields["confidence"]): string[] {
  const flags: string[] = [];
  if (c.category < CONFIDENCE_THRESHOLD) flags.push("category");
  if (c.provider < CONFIDENCE_THRESHOLD) flags.push("provider");
  if (c.valueEstimate < CONFIDENCE_THRESHOLD) flags.push("valueEstimate");
  return flags;
}

export async function structureIntakeMessage(intakeId: string): Promise<void> {
  const admin = adminClient();
  const msg = await getIntakeMessage(admin, intakeId);
  if (!msg || !msg.ownerId) return;

  const t0 = Date.now();
  try {
    let fields: DraftFields;

    if (msg.type === "text" && msg.textBody) {
      fields = await structureFromText(msg.textBody);
    } else if (msg.type === "audio" && msg.mediaId) {
      const media = await downloadWhatsAppMedia(msg.mediaId);
      const transcript = await transcribeAudio(media.base64, media.mime);
      await setIntakeTranscript(admin, intakeId, transcript);
      fields = await structureFromText(transcript);
    } else if (msg.type === "image" && msg.mediaId) {
      const media = await downloadWhatsAppMedia(msg.mediaId);
      fields = await structureFromImage(media.base64, media.mime);
    } else {
      await markIntakeStatus(admin, intakeId, "ignored");
      return;
    }

    await createDraft(admin, {
      ownerId: msg.ownerId, intakeMessageId: intakeId, source: "whatsapp",
      category: fields.category, provider: fields.provider, label: fields.label,
      identifier: fields.identifier, valueEstimate: fields.valueEstimate,
      detail: {}, confidence: { ...fields.confidence, lowConfidence: lowConfidenceFlags(fields.confidence) },
    });
    await markIntakeStatus(admin, intakeId, "structured");
    await logApiCall(admin, { ownerId: msg.ownerId, provider: "llm", operation: `structure_${msg.type}`, status: "ok", latencyMs: Date.now() - t0 });
  } catch (e) {
    await markIntakeStatus(admin, intakeId, "failed");
    // Log only the error class, never String(e) — upstream LLM/STT error bodies can
    // echo back the user's intake content (PII) into wrs_api_log.
    await logApiCall(admin, { ownerId: msg.ownerId, provider: "llm", operation: `structure_${msg.type}`, status: "error", latencyMs: Date.now() - t0, meta: { error: e instanceof Error ? e.name : "unknown" } });
    throw e;
  }
}
