import { handleEkycWebhook } from "@/services/ekyc";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  try {
    await handleEkycWebhook(raw, req.headers.get("x-signature"));
  } catch (err) {
    // Log only the error class — the raw error/payload may carry identity data.
    console.error("[ekyc webhook]", err instanceof Error ? err.name : "error");
    return new Response("error", { status: 400 });
  }
  return new Response("ok", { status: 200 });
}
