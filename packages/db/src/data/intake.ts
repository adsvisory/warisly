import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssetCategory } from "./assets";

// ── Owner lookup (service-role context) ────────────────────────────────────
export async function findOwnerIdByPhone(supabase: SupabaseClient, phone: string): Promise<string | null> {
  const { data, error } = await supabase.from("wrs_owners").select("id").eq("phone", phone).maybeSingle();
  if (error) throw new Error(`findOwnerIdByPhone failed: ${error.message}`);
  return data?.id ?? null;
}

// ── Intake messages (service-role context) ─────────────────────────────────
export interface IntakeInput {
  ownerId: string | null; waMessageId: string; waFrom: string; type: string;
  textBody: string | null; mediaId: string | null; mediaMime: string | null;
}

export async function upsertIntakeMessage(supabase: SupabaseClient, i: IntakeInput): Promise<{ id: string; isNew: boolean }> {
  const { data, error } = await supabase
    .from("wrs_intake_messages")
    .upsert(
      { owner_id: i.ownerId, wa_message_id: i.waMessageId, wa_from: i.waFrom, type: i.type, text_body: i.textBody, media_id: i.mediaId, media_mime: i.mediaMime },
      { onConflict: "wa_message_id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw new Error(`upsertIntakeMessage failed: ${error.message}`);
  if (data && data.length > 0) return { id: data[0].id, isNew: true };
  const { data: existing, error: e2 } = await supabase.from("wrs_intake_messages").select("id").eq("wa_message_id", i.waMessageId).single();
  if (e2) throw new Error(`upsertIntakeMessage lookup failed: ${e2.message}`);
  return { id: existing.id, isNew: false };
}

export interface IntakeMessage {
  id: string; ownerId: string | null; type: string;
  textBody: string | null; mediaId: string | null; mediaMime: string | null; transcript: string | null;
}

export async function getIntakeMessage(supabase: SupabaseClient, id: string): Promise<IntakeMessage | null> {
  const { data, error } = await supabase
    .from("wrs_intake_messages")
    .select("id, owner_id, type, text_body, media_id, media_mime, transcript")
    .eq("id", id).maybeSingle();
  if (error) throw new Error(`getIntakeMessage failed: ${error.message}`);
  if (!data) return null;
  return { id: data.id, ownerId: data.owner_id, type: data.type, textBody: data.text_body, mediaId: data.media_id, mediaMime: data.media_mime, transcript: data.transcript };
}

export async function setIntakeTranscript(supabase: SupabaseClient, id: string, transcript: string): Promise<void> {
  const { error } = await supabase.from("wrs_intake_messages").update({ transcript }).eq("id", id);
  if (error) throw new Error(`setIntakeTranscript failed: ${error.message}`);
}

export async function markIntakeStatus(supabase: SupabaseClient, id: string, status: "received" | "structured" | "failed" | "ignored"): Promise<void> {
  const { error } = await supabase.from("wrs_intake_messages").update({ status }).eq("id", id);
  if (error) throw new Error(`markIntakeStatus failed: ${error.message}`);
}

// ── Drafts (createDraft = service-role; reads/updates = owner RLS) ──────────
export interface DraftInput {
  ownerId: string; intakeMessageId: string | null; source?: string;
  category: AssetCategory | null; provider: string | null; label: string | null;
  identifier: string | null; valueEstimate: number | null;
  detail: Record<string, unknown>; confidence: Record<string, unknown>;
}

export async function createDraft(supabase: SupabaseClient, d: DraftInput): Promise<string> {
  const { data, error } = await supabase.from("wrs_asset_drafts").insert({
    owner_id: d.ownerId, intake_message_id: d.intakeMessageId, source: d.source ?? "whatsapp",
    category: d.category, provider: d.provider, label: d.label, identifier: d.identifier,
    value_estimate: d.valueEstimate, detail: d.detail, confidence: d.confidence,
  }).select("id").single();
  if (error) throw new Error(`createDraft failed: ${error.message}`);
  return data.id as string;
}

export interface AssetDraft {
  id: string; ownerId: string; category: AssetCategory | null; provider: string | null;
  label: string | null; identifier: string | null; valueEstimate: number | null;
  detail: Record<string, unknown>; confidence: Record<string, unknown>; status: string; createdAt: string;
}

function toDraft(r: any): AssetDraft {
  return { id: r.id, ownerId: r.owner_id, category: r.category, provider: r.provider, label: r.label, identifier: r.identifier, valueEstimate: r.value_estimate, detail: r.detail, confidence: r.confidence, status: r.status, createdAt: r.created_at };
}

const DRAFT_COLS = "id, owner_id, category, provider, label, identifier, value_estimate, detail, confidence, status, created_at";

export async function listDrafts(supabase: SupabaseClient, status: "pending" | "confirmed" | "discarded" = "pending"): Promise<AssetDraft[]> {
  const { data, error } = await supabase.from("wrs_asset_drafts").select(DRAFT_COLS).eq("status", status).order("created_at", { ascending: false });
  if (error) throw new Error(`listDrafts failed: ${error.message}`);
  return (data as any[]).map(toDraft);
}

export async function getDraft(supabase: SupabaseClient, id: string): Promise<AssetDraft | null> {
  const { data, error } = await supabase.from("wrs_asset_drafts").select(DRAFT_COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(`getDraft failed: ${error.message}`);
  return data ? toDraft(data) : null;
}

export async function updateDraftStatus(supabase: SupabaseClient, id: string, status: "confirmed" | "discarded"): Promise<void> {
  const { error } = await supabase.from("wrs_asset_drafts").update({ status }).eq("id", id);
  if (error) throw new Error(`updateDraftStatus failed: ${error.message}`);
}

// ── Observability (service-role context) ───────────────────────────────────
export async function logApiCall(supabase: SupabaseClient, e: {
  ownerId: string | null; provider: string; operation: string; status: string; latencyMs: number; meta?: Record<string, unknown>;
}): Promise<void> {
  await supabase.from("wrs_api_log").insert({
    owner_id: e.ownerId, provider: e.provider, operation: e.operation, status: e.status, latency_ms: e.latencyMs, meta: e.meta ?? {},
  });
}
