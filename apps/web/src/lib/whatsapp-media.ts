import "server-only";
import { serverEnv } from "@/lib/env.server";

const GRAPH = "https://graph.facebook.com/v21.0";
// The media URL Graph hands back lives on Meta's CDN. Pin to these hosts before we
// attach the WhatsApp bearer token and fetch — otherwise a tampered/redirected
// `meta.url` could exfiltrate the token or coerce an SSRF to an internal address.
const ALLOWED_MEDIA_HOSTS = /(^|\.)(fbcdn\.net|facebook\.com|whatsapp\.net)$/;
const MAX_MEDIA_BYTES = 16 * 1024 * 1024;

export async function downloadWhatsAppMedia(mediaId: string): Promise<{ base64: string; mime: string }> {
  // Meta media IDs are numeric; reject anything else so it can't escape the path segment.
  if (!/^\d+$/.test(mediaId)) throw new Error("invalid media id");
  const auth = { Authorization: `Bearer ${serverEnv.WHATSAPP_ACCESS_TOKEN}` };
  const metaRes = await fetch(`${GRAPH}/${mediaId}`, { headers: auth, redirect: "manual" });
  if (!metaRes.ok) throw new Error(`media meta ${metaRes.status}`);
  const meta = await metaRes.json();

  let url: URL;
  try { url = new URL(meta.url); } catch { throw new Error("invalid media url"); }
  if (url.protocol !== "https:" || !ALLOWED_MEDIA_HOSTS.test(url.hostname)) {
    throw new Error("media url host not allowed");
  }

  const binRes = await fetch(url, { headers: auth, redirect: "manual" });
  if (!binRes.ok) throw new Error(`media download ${binRes.status}`);
  const buf = Buffer.from(await binRes.arrayBuffer());
  if (buf.byteLength > MAX_MEDIA_BYTES) throw new Error("media too large");
  return { base64: buf.toString("base64"), mime: meta.mime_type ?? "application/octet-stream" };
}
