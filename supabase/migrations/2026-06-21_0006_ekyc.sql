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
