# IMPLEMENTATION BRIEF: eKYC Flow (verification + gating)
## Surface: web (`apps/web`) + db (`packages/db`)
## Brief: #8a-ii
## Phase: 1 (MVP)
## Depends on: #8a-i, #2, #3, #5a-ii (logApiCall)
## Blocks: #8b-ii
## Parallel with: None

### CONTEXT
The owner verification flow: create a session, redirect to a Dukcapil-licensed eKYC vendor, receive the async result by webhook, and on pass flip `kyc_status='verified'` + `release_eligible=true`. Plus the `/profil` page that triggers it.

> **VENDOR SEAM:** Everything on the Warisly side is complete. The two functions in `lib/ekyc.ts` (`startVerification`, `verifyEkycWebhook`) are the one place that must be adapted to your chosen vendor's API (Decision pending: Privy / VIDA / Verihubs — all Dukcapil-licensed). They are written against a generic REST+HMAC contract; adjust the endpoint, auth header, and field names to match the vendor's docs.

### NON-NEGOTIABLE CHECK
No raw biometrics are read or stored — the adapter maps the vendor payload to `{ passed, nik }` only. Webhook is HMAC-verified before any state change. Session create + result write use service-role (non-interactive); the owner reads status under RLS. The trust line "Warisly tidak menyimpan data biometrik" appears on the verify UI. No credentials, no provider-auth bypass.

### PRE-FLIGHT CHECKS
- [ ] `wrs_ekyc_sessions` + owner columns exist (#8a-i).
- [ ] `adminClient()` (#0b), `logApiCall` exported from `@warisly/db` (#5a-ii), `signOut` action (#2), `copy` (#0a).

### FILES TO CREATE/MODIFY

#### 1. `packages/db/src/data/ekyc.ts`
**Action:** CREATE **Layer:** Data
```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

export type EkycStatus = "created" | "passed" | "failed" | "expired";

export interface OwnerKyc { kycStatus: string; releaseEligible: boolean; kycVerifiedAt: string | null; }

export async function createEkycSession(supabase: SupabaseClient, ownerId: string, vendorRef: string): Promise<string> {
  const { data, error } = await supabase.from("wrs_ekyc_sessions")
    .insert({ owner_id: ownerId, vendor_ref: vendorRef, status: "created" })
    .select("id").single();
  if (error) throw new Error(`createEkycSession failed: ${error.message}`);
  return data.id as string;
}

export async function markEkycResult(supabase: SupabaseClient, vendorRef: string, status: EkycStatus, meta: Record<string, unknown>): Promise<{ ownerId: string } | null> {
  const { data, error } = await supabase.from("wrs_ekyc_sessions")
    .update({ status, result_meta: meta }).eq("vendor_ref", vendorRef)
    .select("owner_id").maybeSingle();
  if (error) throw new Error(`markEkycResult failed: ${error.message}`);
  return data ? { ownerId: data.owner_id as string } : null;
}

export async function setOwnerVerified(supabase: SupabaseClient, ownerId: string, input: { verifiedNik: string | null; ekycRef: string }): Promise<void> {
  const { error } = await supabase.from("wrs_owners").update({
    kyc_status: "verified",
    verified_nik: input.verifiedNik,
    ekyc_ref: input.ekycRef,
    kyc_verified_at: new Date().toISOString(),
    release_eligible: true,
  }).eq("id", ownerId);
  if (error) throw new Error(`setOwnerVerified failed: ${error.message}`);
}

export async function getOwnerKyc(supabase: SupabaseClient): Promise<OwnerKyc | null> {
  const { data, error } = await supabase.from("wrs_owners")
    .select("kyc_status, release_eligible, kyc_verified_at").maybeSingle();
  if (error) throw new Error(`getOwnerKyc failed: ${error.message}`);
  if (!data) return null;
  return { kycStatus: data.kyc_status, releaseEligible: data.release_eligible, kycVerifiedAt: data.kyc_verified_at };
}
```

#### 2. `packages/db/src/index.ts`
**Action:** MODIFY
```typescript
export * from "./data/ekyc"; // ← add
```

#### 3. `apps/web/src/lib/ekyc.ts`
**Action:** CREATE **Layer:** Adapter (**VENDOR INTEGRATION POINT**)
```typescript
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
  if (!res.ok) throw new Error(`eKYC start ${res.status}: ${await res.text()}`);
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
```

#### 4. `apps/web/src/services/ekyc.ts`
**Action:** CREATE **Layer:** Service
```typescript
import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { createEkycSession, markEkycResult, setOwnerVerified, logApiCall } from "@warisly/db";
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
  if (session && result.passed) {
    await setOwnerVerified(admin, session.ownerId, { verifiedNik: result.nik, ekycRef: result.vendorRef });
  }
  await logApiCall(admin, { ownerId: session?.ownerId ?? null, provider: "ekyc", operation: "webhook", status: result.passed ? "ok" : "failed", latencyMs: 0 });
}
```

#### 5. `apps/web/src/app/actions/ekyc.ts`
**Action:** CREATE **Layer:** Server Action
```typescript
"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { beginEkyc } from "@/services/ekyc";

export async function startEkycAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const baseUrl = `${proto}://${h.get("host")}`;
  const url = await beginEkyc(user.id, baseUrl);
  redirect(url); // hand off to the vendor's verification page
}
```

#### 6. `apps/web/app/api/ekyc/webhook/route.ts`
**Action:** CREATE **Layer:** Route Handler
```typescript
import { handleEkycWebhook } from "@/services/ekyc";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  try {
    await handleEkycWebhook(raw, req.headers.get("x-signature"));
  } catch (err) {
    console.error("[ekyc webhook]", err);
    return new Response("error", { status: 400 });
  }
  return new Response("ok", { status: 200 });
}
```

#### 7. `apps/web/app/(app)/profil/page.tsx`
**Action:** CREATE **Layer:** Page
```typescript
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOwnerKyc } from "@warisly/db";
import { Eyebrow, H1, Card } from "@warisly/ui";
import { startEkycAction } from "@/app/actions/ekyc";
import { signOut } from "@/app/actions/auth";

export default async function ProfilPage() {
  const supabase = await createClient();
  const kyc = await getOwnerKyc(supabase);
  const verified = kyc?.kycStatus === "verified";

  return (
    <div className="pb-8">
      <Eyebrow>Profil</Eyebrow>
      <H1>Identitas & keamanan</H1>

      <Card className="mt-6">
        <p className="font-sans text-sm text-paper-muted">Verifikasi identitas</p>
        <p className="mt-1 font-display text-xl text-tinta">{verified ? "Terverifikasi" : "Belum terverifikasi"}</p>
        <p className="mt-2 font-sans text-xs text-paper-muted">
          Verifikasi diperlukan agar warisan dapat dirilis ke keluarga dengan aman. Warisly tidak menyimpan data biometrik Anda — verifikasi diproses penyedia berlisensi Dukcapil.
        </p>
        {!verified && (
          <form action={startEkycAction} className="mt-4">
            <button className="rounded-lg bg-nyala px-4 py-3 font-sans font-medium text-white active:bg-nyala-pressed">
              Verifikasi identitas
            </button>
          </form>
        )}
      </Card>

      {verified && (
        <Link href="/rilis" className="mt-4 block">
          <Card>
            <p className="font-sans text-sm text-paper-muted">Aturan rilis</p>
            <p className="mt-1 font-display text-lg text-tinta">Atur masa tunggu & konfirmasi →</p>
          </Card>
        </Link>
      )}

      <form action={signOut} className="mt-8">
        <button className="font-sans text-sm text-nyala underline">Keluar</button>
      </form>
    </div>
  );
}
```

#### 8. `apps/web/src/lib/env.server.ts`
**Action:** MODIFY — add eKYC vars to the schema
```typescript
// inside the z.object({ ... }) server schema, add:
  EKYC_BASE_URL: z.string().url(),
  EKYC_API_KEY: z.string().min(1),
  EKYC_WEBHOOK_SECRET: z.string().min(1),
```

### ENVIRONMENT VARIABLES
```
EKYC_BASE_URL=        # vendor API base (Privy / VIDA / Verihubs)
EKYC_API_KEY=         # server-side; never exposed to client
EKYC_WEBHOOK_SECRET=  # HMAC secret for webhook signature
```

### VERIFICATION
- [ ] `/profil` shows "Belum terverifikasi" + a single Nyala "Verifikasi identitas" button.
- [ ] Tapping it creates a session row (status `created`) and redirects to the vendor URL.
- [ ] A signed webhook with `status: passed` flips the session to `passed`, sets `kyc_status='verified'`, `release_eligible=true`, stores `verified_nik`/`ekyc_ref`/`kyc_verified_at`; `/profil` then shows "Terverifikasi" and reveals the "Aturan rilis" link.
- [ ] An unsigned/forged webhook returns 400 and changes nothing.
- [ ] No biometric field is persisted anywhere; `result_meta` holds only `{ passed }`.
