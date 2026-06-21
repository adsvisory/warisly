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
