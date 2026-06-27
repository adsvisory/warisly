import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { createEkycSession, markEkycResult, setOwnerVerified, logApiCall, recordEvent } from "@warisly/db";
import { startVerification, verifyEkycWebhook } from "@/lib/ekyc";

export async function beginEkyc(ownerId: string, baseUrl: string): Promise<string> {
  const admin = adminClient();
  const callbackUrl = `${baseUrl}/api/ekyc/webhook`;
  const t0 = Date.now();
  const { vendorRef, sessionUrl } = await startVerification(ownerId, callbackUrl);
  await createEkycSession(admin, ownerId, vendorRef);
  await logApiCall(admin, { ownerId, provider: "ekyc", operation: "start", status: "ok", latencyMs: Date.now() - t0 });
  return sessionUrl;
}

export async function handleEkycWebhook(raw: string, signature: string | null): Promise<void> {
  const result = verifyEkycWebhook(raw, signature);
  if (!result) throw new Error("invalid eKYC webhook signature");
  const admin = adminClient();
  const session = await markEkycResult(admin, result.vendorRef, result.passed ? "passed" : "failed", { passed: result.passed });
  if (!session) {
    // Already transitioned out of "created" — a duplicate/replayed webhook. Ignore (idempotent).
    await logApiCall(admin, { ownerId: null, provider: "ekyc", operation: "webhook", status: "ignored_duplicate", latencyMs: 0 });
    return;
  }
  if (result.passed) {
    await setOwnerVerified(admin, session.ownerId, { verifiedNik: result.nik, ekycRef: result.vendorRef });
  }
  await recordEvent(admin, {
    ownerId: session.ownerId, actor: "system",
    eventType: result.passed ? "ekyc.passed" : "ekyc.failed",
    subjectType: "ekyc_session", subjectId: result.vendorRef,
  });
  await logApiCall(admin, { ownerId: session.ownerId, provider: "ekyc", operation: "webhook", status: result.passed ? "ok" : "failed", latencyMs: 0 });
}
