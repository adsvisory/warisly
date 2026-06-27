import "server-only";
import crypto from "node:crypto";
import { serverEnv } from "@/lib/env.server";

export interface StartResult { vendorRef: string; sessionUrl: string; }
export interface WebhookResult { vendorRef: string; passed: boolean; nik: string | null; }

// ── VENDOR INTEGRATION POINT ─────────────────────────────────────────────────
// Adapt to your Dukcapil-licensed vendor (Privy / VIDA / Verihubs). Generic
// REST+HMAC shape below; change endpoint, auth, and field names per their docs.
// Request ektp + liveness + Dukcapil match. NEVER request or persist raw biometrics.

export async function startVerification(ownerId: string, callbackUrl: string): Promise<StartResult> {
  const res = await fetch(`${serverEnv.EKYC_BASE_URL}/verifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${serverEnv.EKYC_API_KEY}` },
    body: JSON.stringify({ reference: ownerId, callback_url: callbackUrl, checks: ["ektp", "liveness", "dukcapil"] }),
  });
  // Don't fold the vendor response body into the error — it may echo the ownerId
  // reference or partial identity data into logs. Status code is enough to diagnose.
  if (!res.ok) throw new Error(`eKYC start failed: ${res.status}`);
  const j = await res.json();
  return { vendorRef: j.id as string, sessionUrl: j.url as string };
}

export function verifyEkycWebhook(raw: string, signature: string | null): WebhookResult | null {
  if (!signature) return null;
  const expected = crypto.createHmac("sha256", serverEnv.EKYC_WEBHOOK_SECRET).update(raw).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const j = JSON.parse(raw);
  // Map vendor payload → our minimal result. Do NOT pull any biometric fields.
  return { vendorRef: j.id as string, passed: j.status === "passed", nik: (j.verified_nik as string) ?? null };
}
