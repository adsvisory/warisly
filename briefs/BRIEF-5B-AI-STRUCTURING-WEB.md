# IMPLEMENTATION BRIEF: AI Structuring Service
## Surface: web (`apps/web` service + lib)
## Brief: #5b
## Phase: 1 (MVP)
## Depends on: #5a-ii, #4b
## Blocks: #5c
## Parallel with: None

### CONTEXT
Turn a raw intake message into a structured, confidence-flagged **draft**: text → LLM structured output; voice → STT then structure; image → vision structure. Writes a draft (never an asset) and records the call to `wrs_api_log`.

### NON-NEGOTIABLE CHECK
The pipeline only ever calls `createDraft` — it NEVER writes to `wrs_assets`; confirm-before-save holds. The LLM prompt explicitly forbids inferring or requesting passwords; `identifier` is an account email/number only. Low-confidence fields are flagged for owner review (not silently accepted). Every LLM/STT/media call is logged to `wrs_api_log`. The LLM provider is swappable behind `lib/llm.ts`.

### PRE-FLIGHT CHECKS
- [ ] Intake data layer + secrets exist (#5a-ii).
- [ ] `wrs_settings` has `intake.ai_confidence_threshold` (#1) — mirrored here as the flag cutoff.

### FILES TO CREATE/MODIFY

#### 1. `apps/web/src/lib/whatsapp-media.ts`
**Action:** CREATE **Layer:** Util **Purpose:** Two-step WhatsApp media download (id → URL → bytes).
```typescript
import "server-only";
import { serverEnv } from "@/lib/env.server";

const GRAPH = "https://graph.facebook.com/v21.0";

export async function downloadWhatsAppMedia(mediaId: string): Promise<{ base64: string; mime: string }> {
  const auth = { Authorization: `Bearer ${serverEnv.WHATSAPP_ACCESS_TOKEN}` };
  const metaRes = await fetch(`${GRAPH}/${mediaId}`, { headers: auth });
  if (!metaRes.ok) throw new Error(`media meta ${metaRes.status}`);
  const meta = await metaRes.json();
  const binRes = await fetch(meta.url, { headers: auth });
  if (!binRes.ok) throw new Error(`media download ${binRes.status}`);
  const buf = Buffer.from(await binRes.arrayBuffer());
  return { base64: buf.toString("base64"), mime: meta.mime_type ?? "application/octet-stream" };
}
```

#### 2. `apps/web/src/lib/llm.ts`
**Action:** CREATE **Layer:** Util **Purpose:** Structured extraction + STT + vision (OpenAI default; swap here to change provider).
```typescript
import "server-only";
import { serverEnv } from "@/lib/env.server";

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
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
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

export async function transcribeAudio(base64: string, mime: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([Buffer.from(base64, "base64")], { type: mime }), "audio");
  form.append("model", "whisper-1");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST", headers: { Authorization: `Bearer ${serverEnv.OPENAI_API_KEY}` }, body: form,
  });
  if (!res.ok) throw new Error(`STT ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return String(json.text ?? "");
}
```

#### 3. `apps/web/src/services/intake.ts`
**Action:** CREATE **Layer:** Service **Purpose:** Orchestrate one intake message → draft. Service-role context.
```typescript
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
    await logApiCall(admin, { ownerId: msg.ownerId, provider: "llm", operation: `structure_${msg.type}`, status: "error", latencyMs: Date.now() - t0, meta: { error: String(e) } });
    throw e;
  }
}
```

### VERIFICATION
- [ ] Sending the WhatsApp text "Ajaib saham sekitar 50jt, email saya andi@mail.com" produces a pending draft: category `saham`, provider `Ajaib`, valueEstimate `50000000`, identifier the email — and `wrs_assets` is untouched.
- [ ] A vague message ("ada emas dikit") yields a draft with `lowConfidence` including `valueEstimate`.
- [ ] A voice note transcribes (transcript saved) then structures.
- [ ] Each run writes one `wrs_api_log` row (provider `llm`, ok/error).
- [ ] No prompt path requests or stores a password.
