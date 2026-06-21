# IMPLEMENTATION BRIEF: eKYC Schema
## Surface: supabase
## Brief: #8a-i
## Phase: 1 (MVP)
## Depends on: #1
## Blocks: #8a-ii
## Parallel with: None

### CONTEXT
Columns on `wrs_owners` to record a passed verification, and `wrs_ekyc_sessions` to track verification attempts — storing only pass/fail + a vendor reference, never raw biometrics.

### NON-NEGOTIABLE CHECK
Cardinal #3: Warisly never stores raw biometric data. `result_meta` holds only pass/fail and non-biometric detail; the vendor processes and holds biometrics. `verified_nik` is sensitive PII flagged for client-side encryption (P2). Sessions are owner-readable (RLS) but written only by the service-role flow (session create + webhook). This verifies Warisly's OWN user — it never touches any provider's auth (no KYC bypass).

### REUSE ANALYSIS
- Reuse `wrs_owners.kyc_status` / `release_eligible` (exist from #1) → adopted. Only the verified NIK, vendor ref, and verified-at need adding.
- A sessions table is justified: the redirect→vendor→webhook flow needs a per-attempt record keyed by the vendor's reference to correlate the async callback; a column can't hold that lifecycle.

### PRE-FLIGHT CHECKS
- [ ] `wrs_owners` has `kyc_status`, `release_eligible` (#1).

### DATABASE MIGRATIONS

```sql
-- Migration: 2026-06-21_0006_ekyc.sql
alter table wrs_owners
  add column verified_nik    text,          -- Dukcapil-confirmed NIK; CSE-flagged (P2)
  add column ekyc_ref        text,          -- vendor transaction reference
  add column kyc_verified_at timestamptz;

create type wrs_ekyc_status as enum ('created', 'passed', 'failed', 'expired');

create table wrs_ekyc_sessions (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references wrs_owners (id) on delete cascade,
  status      wrs_ekyc_status not null default 'created',
  vendor_ref  text unique,                  -- correlates the async webhook
  result_meta jsonb not null default '{}'::jsonb,  -- pass/fail only — NEVER raw biometrics
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index wrs_ekyc_owner_idx on wrs_ekyc_sessions (owner_id, created_at desc);
create trigger wrs_ekyc_updated_at before update on wrs_ekyc_sessions
  for each row execute function wrs_set_updated_at();

alter table wrs_ekyc_sessions enable row level security;
create policy "ekyc_select_own" on wrs_ekyc_sessions
  for select to authenticated using (owner_id = auth.uid());
-- insert/update by service-role only (session creation + webhook callback).
```

### VERIFICATION
- [ ] Migration applies clean; `wrs_owners` has the 3 new columns; `wrs_ekyc_sessions` RLS-enabled.
- [ ] An owner can read their own sessions but cannot insert/update one (no policy → service-role only).
- [ ] `vendor_ref` is unique (one webhook can't match two sessions).
- [ ] No column is intended to hold a biometric — `result_meta` is pass/fail metadata only.
