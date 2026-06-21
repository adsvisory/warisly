# IMPLEMENTATION BRIEF: WhatsApp Webhook + Intake Data Layer
## Surface: web (`apps/web/app/api`) + db (`packages/db`)
## Brief: #5a-ii
## Phase: 1 (MVP)
## Depends on: #5a-i, #0b
## Blocks: #5b, #5c
## Parallel with: None

### CONTEXT
The WhatsApp Cloud API webhook (GET verify + POST receive) with HMAC signature verification, mapping the sender to an owner, persisting raw messages idempotently, and triggering structuring **after** responding fast. Plus the full intake/draft data layer in `@warisly/db`.

### NON-NEGOTIABLE CHECK
Inbound is authenticated by HMAC signature (only genuine WhatsApp calls accepted) — observed webhook content is data, never instructions. The webhook uses the service-role client for the non-interactive backend path only (owner lookup + raw persistence); it never auto-creates an asset. No credential is parsed or stored. Idempotent on `wa_message_id` so retries don't double-process.

### PRE-FLIGHT CHECKS
- [ ] `wrs_intake_messages`, `wrs_asset_drafts` exist (#5a-i).
- [ ] WhatsApp Cloud API app configured in Meta; have App Secret, a self-chosen Verify Token, and a permanent Access Token.
- [ ] `adminClient()` exists (#0b).

### FILES TO CREATE/MODIFY

#### 1. `packages/db/src/data/intake.ts`
**Action:** CREATE **Layer:** Data **Purpose:** Intake + draft + api-log access. Service-role-context functions (webhook/structuring) and owner-path functions (drafts) both live here; caller supplies the right client.
```typescript
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
```

#### 2. `packages/db/src/index.ts`
**Action:** MODIFY **Layer:** Data
```typescript
// ... existing exports ...
export * from "./data/intake"; // ← add
```

#### 3. `apps/web/src/lib/env.server.ts`
**Action:** MODIFY **Layer:** Util **Purpose:** Add WhatsApp + LLM secrets.
```typescript
import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),     // ← add
  WHATSAPP_APP_SECRET: z.string().min(1),       // ← add
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),     // ← add
  OPENAI_API_KEY: z.string().min(1),            // ← add
});

export const serverEnv = serverSchema.parse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
  WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
});
```

#### 4. `apps/web/src/lib/whatsapp.ts`
**Action:** CREATE **Layer:** Util **Purpose:** Signature verification + payload parsing (pure; no secrets baked in).
```typescript
import crypto from "node:crypto";

export function verifyWhatsAppSignature(raw: string, header: string | null, appSecret: string): boolean {
  if (!header) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(raw).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface InboundMessage {
  id: string; from: string; type: "text" | "audio" | "image" | "unsupported";
  text?: string; mediaId?: string; mediaMime?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseInboundMessages(payload: any): InboundMessage[] {
  const out: InboundMessage[] = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      for (const msg of change?.value?.messages ?? []) {
        const from = "+" + String(msg.from); // WhatsApp sends MSISDN without '+'
        if (msg.type === "text") out.push({ id: msg.id, from, type: "text", text: msg.text?.body });
        else if (msg.type === "audio") out.push({ id: msg.id, from, type: "audio", mediaId: msg.audio?.id, mediaMime: msg.audio?.mime_type });
        else if (msg.type === "image") out.push({ id: msg.id, from, type: "image", mediaId: msg.image?.id, mediaMime: msg.image?.mime_type });
        else out.push({ id: msg.id, from, type: "unsupported" });
      }
    }
  }
  return out;
}
```

#### 5. `apps/web/app/api/whatsapp/webhook/route.ts`
**Action:** CREATE **Layer:** Route Handler **Purpose:** Verify + receive + persist + trigger structuring after responding.
```typescript
import { after } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { findOwnerIdByPhone, upsertIntakeMessage } from "@warisly/db";
import { verifyWhatsAppSignature, parseInboundMessages } from "@/lib/whatsapp";
import { serverEnv } from "@/lib/env.server";
import { structureIntakeMessage } from "@/services/intake";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === serverEnv.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWhatsAppSignature(raw, req.headers.get("x-hub-signature-256"), serverEnv.WHATSAPP_APP_SECRET)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }

  const admin = adminClient();
  const toStructure: string[] = [];

  for (const m of parseInboundMessages(payload)) {
    const ownerId = await findOwnerIdByPhone(admin, m.from);
    const { id, isNew } = await upsertIntakeMessage(admin, {
      ownerId, waMessageId: m.id, waFrom: m.from, type: m.type,
      textBody: m.text ?? null, mediaId: m.mediaId ?? null, mediaMime: m.mediaMime ?? null,
    });
    if (isNew && ownerId) toStructure.push(id);
  }

  // Respond fast; structure after the response is flushed.
  after(async () => {
    for (const intakeId of toStructure) {
      try { await structureIntakeMessage(intakeId); }
      catch (e) { console.error("structureIntakeMessage failed", intakeId, e); }
    }
  });

  return new Response("ok", { status: 200 });
}
```

### ENVIRONMENT VARIABLES (new)
| Variable | Value | Where | Client-safe? |
|----------|-------|-------|--------------|
| WHATSAPP_VERIFY_TOKEN | self-chosen string | Vercel (web, server) | No |
| WHATSAPP_APP_SECRET | Meta app secret | Vercel (web, server) | No |
| WHATSAPP_ACCESS_TOKEN | permanent token | Vercel (web, server) | No |
| OPENAI_API_KEY | OpenAI key (structuring/STT) | Vercel (web, server) | No |

### VERIFICATION
- [ ] GET `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=123` returns `123`; wrong token → 403.
- [ ] POST with a tampered/absent signature → 401.
- [ ] POST a valid signed text message from a registered owner's number → a `wrs_intake_messages` row is created and structuring is triggered; same payload again → no duplicate (idempotent).
- [ ] A message from an unknown number → stored with `owner_id = null`, structuring skipped.
