-- Migration: 2026-06-21_0001_schema_foundation.sql
-- Warisly foundation: enums, owners, settings, events (audit), api_log (observability), RLS.

-- ── Enums ────────────────────────────────────────────────────────────────
create type wrs_release_state as enum ('sealed', 'pending_release', 'released', 'locked');

create type wrs_asset_category as enum (
  'saham', 'reksa_dana', 'bank', 'e_wallet', 'emas',
  'crypto', 'asuransi', 'bpjs', 'properti', 'fisik', 'utang', 'lainnya'
);

create type wrs_kyc_status as enum ('unverified', 'verified');

-- ── updated_at trigger fn ────────────────────────────────────────────────
create or replace function wrs_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── wrs_owners (1:1 with auth.users) ─────────────────────────────────────
create table wrs_owners (
  id              uuid primary key references auth.users (id) on delete cascade,
  full_name       text,
  phone           text,
  locale          text not null default 'id',
  kyc_status      wrs_kyc_status not null default 'unverified',
  release_eligible boolean not null default false,
  consent_pdp_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger wrs_owners_updated_at before update on wrs_owners
  for each row execute function wrs_set_updated_at();

alter table wrs_owners enable row level security;
create policy "owners_select_self" on wrs_owners
  for select to authenticated using (id = auth.uid());
create policy "owners_insert_self" on wrs_owners
  for insert to authenticated with check (id = auth.uid());
create policy "owners_update_self" on wrs_owners
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ── wrs_settings (global config; never hardcode values in app) ────────────
create table wrs_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now()
);
create trigger wrs_settings_updated_at before update on wrs_settings
  for each row execute function wrs_set_updated_at();

alter table wrs_settings enable row level security;
create policy "settings_read_auth" on wrs_settings
  for select to authenticated using (true);
-- No write policy: only service-role (which bypasses RLS) may write settings.

insert into wrs_settings (key, value, description) values
  ('release.waiting_period_days_default', '14',
    'Default waiting period (days) before a release proceeds'),
  ('release.waiting_period_days_min', '7',  'Minimum allowed waiting period'),
  ('release.waiting_period_days_max', '30', 'Maximum allowed waiting period'),
  ('release.ping_channels', '["whatsapp","email","sms"]',
    'Channels used for the multi-channel safety ping'),
  ('trustees.quorum', '{"required":2,"of":3}',
    'Trustee quorum required to corroborate a release'),
  ('intake.ai_confidence_threshold', '0.7',
    'Below this, a parsed field is flagged "belum yakin" for owner review')
on conflict (key) do nothing;

-- ── wrs_events (domain + audit; powers the owner transparency log) ────────
create table wrs_events (
  id           bigint generated always as identity primary key,
  owner_id     uuid references wrs_owners (id) on delete cascade,
  actor        text not null check (actor in ('owner','heir','admin','system')),
  event_type   text not null,
  subject_type text,
  subject_id   text,
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index wrs_events_owner_created_idx on wrs_events (owner_id, created_at desc);

alter table wrs_events enable row level security;
create policy "events_select_own" on wrs_events
  for select to authenticated using (owner_id = auth.uid());
-- No insert/update/delete policy: events are written server-side via service-role only.

-- ── wrs_api_log (external-call observability; fully internal) ─────────────
create table wrs_api_log (
  id          bigint generated always as identity primary key,
  owner_id    uuid references wrs_owners (id) on delete set null,
  provider    text not null,        -- 'whatsapp' | 'llm' | 'ekyc' | 'email' | 'sms'
  operation   text not null,
  status      text not null,        -- 'ok' | 'error' | 'provider_unavailable'
  latency_ms  integer,
  cost_micros bigint not null default 0,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index wrs_api_log_provider_created_idx on wrs_api_log (provider, created_at desc);

alter table wrs_api_log enable row level security;
-- No policies at all: anon/authenticated are denied; only service-role can read/write.
