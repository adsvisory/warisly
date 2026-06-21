# IMPLEMENTATION BRIEF: Release Data Layer
## Surface: db (`packages/db`)
## Brief: #9b-i
## Phase: 1 (MVP)
## Depends on: #9a
## Blocks: #9b-ii, #9b-iii, #9c, #9d, #9e
## Parallel with: None

### CONTEXT
The complete data layer for the release lifecycle in `@warisly/db`: create/lookup claims, attach documents, record verified identity + NIK match, dual-control approvals, state transitions, the owner `release_state` flip, and the audit-event writer. Heir/admin/engine briefs all import from here.

### NON-NEGOTIABLE CHECK
Every mutating function here runs in a service-role context (heir has no account; admin/engine are privileged) — callers pass the admin client. State transitions are guarded by `.in('status', [...])` preconditions so they're idempotent and can't skip steps. `setOwnerReleaseState` is the ONLY writer of `release_state` and is service-role-only (the owner guard trigger from #9a blocks anyone else). `recordEvent` writes the audit trail. No biometrics — only the eKYC pass token is stored.

### PRE-FLIGHT CHECKS
- [ ] `wrs_release_requests`, `wrs_release_approvals`, `wrs_owners.release_state`, `wrs_recipients` exist (#9a, #7a).

### FILES TO CREATE/MODIFY

#### 1. `packages/db/src/data/release.ts`
**Action:** CREATE **Layer:** Data
```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

export type ReleaseStatus =
  | "initiated" | "documents_submitted" | "identity_verified"
  | "under_review" | "approved" | "waiting_period"
  | "released" | "rejected" | "cancelled";

const ACTIVE: ReleaseStatus[] = [
  "initiated", "documents_submitted", "identity_verified",
  "under_review", "approved", "waiting_period",
];

export interface ReleaseRequest {
  id: string; ownerId: string; status: ReleaseStatus; claimToken: string;
  claimantName: string | null; claimantEkycRef: string | null; matchedRecipientId: string | null;
  aktaPath: string | null; kkPath: string | null;
  waitingUntil: string | null; releasedAt: string | null; createdAt: string;
}

const COLS =
  "id, owner_id, status, claim_token, claimant_name, claimant_ekyc_ref, matched_recipient_id, akta_path, kk_path, waiting_until, released_at, created_at";

/* eslint-disable @typescript-eslint/no-explicit-any */
function toReq(r: any): ReleaseRequest {
  return {
    id: r.id, ownerId: r.owner_id, status: r.status, claimToken: r.claim_token,
    claimantName: r.claimant_name, claimantEkycRef: r.claimant_ekyc_ref, matchedRecipientId: r.matched_recipient_id,
    aktaPath: r.akta_path, kkPath: r.kk_path,
    waitingUntil: r.waiting_until, releasedAt: r.released_at, createdAt: r.created_at,
  };
}

// ── Heir flow ────────────────────────────────────────────────────────────────
export async function getOrCreateReleaseRequest(supabase: SupabaseClient, ownerId: string): Promise<ReleaseRequest> {
  const { data: existing, error: e1 } = await supabase
    .from("wrs_release_requests").select(COLS)
    .eq("owner_id", ownerId).in("status", ACTIVE)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (e1) throw new Error(`getOrCreateReleaseRequest lookup failed: ${e1.message}`);
  if (existing) return toReq(existing);
  const { data, error } = await supabase.from("wrs_release_requests").insert({ owner_id: ownerId }).select(COLS).single();
  if (error) throw new Error(`getOrCreateReleaseRequest insert failed: ${error.message}`);
  return toReq(data);
}

export async function getRequestByToken(supabase: SupabaseClient, token: string): Promise<ReleaseRequest | null> {
  const { data, error } = await supabase.from("wrs_release_requests").select(COLS).eq("claim_token", token).maybeSingle();
  if (error) throw new Error(`getRequestByToken failed: ${error.message}`);
  return data ? toReq(data) : null;
}

export async function setRequestDocuments(supabase: SupabaseClient, token: string, paths: { aktaPath: string; kkPath: string }): Promise<boolean> {
  const { data, error } = await supabase.from("wrs_release_requests")
    .update({ akta_path: paths.aktaPath, kk_path: paths.kkPath, status: "documents_submitted" })
    .eq("claim_token", token).eq("status", "initiated").select("id");
  if (error) throw new Error(`setRequestDocuments failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

export async function setRequestIdentity(
  supabase: SupabaseClient, token: string,
  input: { claimantName: string | null; ekycRef: string; matchedRecipientId: string | null },
): Promise<{ ownerId: string } | null> {
  const { data, error } = await supabase.from("wrs_release_requests")
    .update({
      claimant_name: input.claimantName, claimant_ekyc_ref: input.ekycRef,
      matched_recipient_id: input.matchedRecipientId, status: "under_review",
    })
    .eq("claim_token", token).eq("status", "documents_submitted").select("owner_id").maybeSingle();
  if (error) throw new Error(`setRequestIdentity failed: ${error.message}`);
  return data ? { ownerId: data.owner_id } : null;
}

export async function matchRecipientByNik(supabase: SupabaseClient, ownerId: string, nik: string | null): Promise<string | null> {
  if (!nik) return null;
  const { data, error } = await supabase.from("wrs_recipients").select("id").eq("owner_id", ownerId).eq("nik", nik).maybeSingle();
  if (error) throw new Error(`matchRecipientByNik failed: ${error.message}`);
  return data?.id ?? null;
}

// ── Admin / engine ───────────────────────────────────────────────────────────
export async function getRequestById(supabase: SupabaseClient, id: string): Promise<ReleaseRequest | null> {
  const { data, error } = await supabase.from("wrs_release_requests").select(COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(`getRequestById failed: ${error.message}`);
  return data ? toReq(data) : null;
}

export interface RequestDetail extends ReleaseRequest {
  ownerName: string | null; ownerPhone: string | null;
  matchedRecipientName: string | null;
  approvals: { adminId: string; decision: string; note: string | null; createdAt: string }[];
}

export async function getRequestDetail(supabase: SupabaseClient, id: string): Promise<RequestDetail | null> {
  const req = await getRequestById(supabase, id);
  if (!req) return null;
  const { data: owner } = await supabase.from("wrs_owners").select("full_name, phone").eq("id", req.ownerId).maybeSingle();
  let matchedRecipientName: string | null = null;
  if (req.matchedRecipientId) {
    const { data: rec } = await supabase.from("wrs_recipients").select("name").eq("id", req.matchedRecipientId).maybeSingle();
    matchedRecipientName = rec?.name ?? null;
  }
  const approvals = await listApprovals(supabase, id);
  return { ...req, ownerName: owner?.full_name ?? null, ownerPhone: owner?.phone ?? null, matchedRecipientName, approvals };
}

export async function listReviewQueue(supabase: SupabaseClient): Promise<ReleaseRequest[]> {
  const { data, error } = await supabase.from("wrs_release_requests").select(COLS)
    .in("status", ["under_review", "approved", "waiting_period"]).order("created_at", { ascending: true });
  if (error) throw new Error(`listReviewQueue failed: ${error.message}`);
  return (data as any[]).map(toReq);
}

export async function recordApproval(supabase: SupabaseClient, requestId: string, adminId: string, decision: "approve" | "reject", note: string | null): Promise<void> {
  const { error } = await supabase.from("wrs_release_approvals")
    .upsert({ request_id: requestId, admin_id: adminId, decision, note }, { onConflict: "request_id,admin_id", ignoreDuplicates: true });
  if (error) throw new Error(`recordApproval failed: ${error.message}`);
}

export async function listApprovals(supabase: SupabaseClient, requestId: string): Promise<{ adminId: string; decision: string; note: string | null; createdAt: string }[]> {
  const { data, error } = await supabase.from("wrs_release_approvals").select("admin_id, decision, note, created_at").eq("request_id", requestId).order("created_at");
  if (error) throw new Error(`listApprovals failed: ${error.message}`);
  return (data as any[]).map((r) => ({ adminId: r.admin_id, decision: r.decision, note: r.note, createdAt: r.created_at }));
}

export async function transitionRequest(
  supabase: SupabaseClient, id: string, from: ReleaseStatus[], to: ReleaseStatus,
  patch: { waitingUntil?: string; releasedAt?: string } = {},
): Promise<boolean> {
  const row: Record<string, unknown> = { status: to };
  if (patch.waitingUntil !== undefined) row.waiting_until = patch.waitingUntil;
  if (patch.releasedAt !== undefined) row.released_at = patch.releasedAt;
  const { data, error } = await supabase.from("wrs_release_requests").update(row).eq("id", id).in("status", from).select("id");
  if (error) throw new Error(`transitionRequest failed: ${error.message}`);
  return (data?.length ?? 0) > 0; // false = precondition not met (idempotent no-op)
}

export async function setOwnerReleaseState(supabase: SupabaseClient, ownerId: string, state: "sealed" | "pending_release" | "released" | "locked"): Promise<void> {
  const { error } = await supabase.from("wrs_owners").update({ release_state: state }).eq("id", ownerId);
  if (error) throw new Error(`setOwnerReleaseState failed: ${error.message}`);
}

// ── Audit ────────────────────────────────────────────────────────────────────
export async function recordEvent(supabase: SupabaseClient, e: {
  ownerId: string | null; actor: "owner" | "heir" | "admin" | "system";
  eventType: string; subjectType?: string; subjectId?: string; meta?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from("wrs_events").insert({
    owner_id: e.ownerId, actor: e.actor, event_type: e.eventType,
    subject_type: e.subjectType ?? null, subject_id: e.subjectId ?? null, meta: e.meta ?? {},
  });
  if (error) throw new Error(`recordEvent failed: ${error.message}`);
}
```

#### 2. `packages/db/src/index.ts`
**Action:** MODIFY
```typescript
export * from "./data/release"; // ← add
```

### VERIFICATION
- [ ] `getOrCreateReleaseRequest` returns the existing active request on a second call (no duplicate) and a fresh one only when none is active.
- [ ] `setRequestDocuments` returns false if the request isn't in `initiated` (idempotent precondition).
- [ ] `transitionRequest(id, ['waiting_period'], 'released', {releasedAt})` returns true once, then false on a re-run (idempotency).
- [ ] `recordApproval` twice for the same `(request,admin)` is a no-op; two different admins produce two rows.
- [ ] `recordEvent` writes an audit row readable by the owner (via their `events_select_own` policy).
