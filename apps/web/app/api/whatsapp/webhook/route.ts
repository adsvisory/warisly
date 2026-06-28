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
      // Log the error class only — a thrown LLM/STT error must not carry intake PII into logs.
      catch (e) { console.error("structureIntakeMessage failed", intakeId, e instanceof Error ? e.name : "error"); }
    }
  });

  return new Response("ok", { status: 200 });
}
