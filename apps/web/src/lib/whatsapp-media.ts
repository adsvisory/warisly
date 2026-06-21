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
