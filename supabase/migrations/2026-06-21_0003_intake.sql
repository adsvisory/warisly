-- Migration: 2026-06-21_0003_intake.sql
create type wrs_intake_status as enum ('received', 'structured', 'failed', 'ignored');
create type wrs_draft_status  as enum ('pending', 'confirmed', 'discarded');

-- Raw inbound (internal only) ------------------------------------------------
create table wrs_intake_messages (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid references wrs_owners (id) on delete cascade,
  wa_message_id text unique,                 -- idempotency: WhatsApp retries the same id
  wa_from       text,                         -- sender MSISDN (normalised to +E.164)
  type          text not null,                -- 'text' | 'audio' | 'image' | 'unsupported'
  text_body     text,
  media_id      text,
  media_mime    text,
  transcript    text,                         -- filled by STT for audio
  status        wrs_intake_status not null default 'received',
  created_at    timestamptz not null default now()
);
create index wrs_intake_owner_idx on wrs_intake_messages (owner_id, created_at desc);

alter table wrs_intake_messages enable row level security;
-- No policies: service-role only (webhook + structuring). Owners never read raw intake.

-- Structured drafts (owner-confirmable) -------------------------------------
create table wrs_asset_drafts (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references wrs_owners (id) on delete cascade,
  source            text not null default 'whatsapp',
  intake_message_id uuid references wrs_intake_messages (id) on delete set null,
  category          wrs_asset_category,
  provider          text,
  label             text,
  identifier        text,
  value_estimate    bigint,
  detail            jsonb not null default '{}'::jsonb,
  confidence        jsonb not null default '{}'::jsonb,   -- per-field 0..1 + lowConfidence[] flags
  status            wrs_draft_status not null default 'pending',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index wrs_drafts_owner_status_idx on wrs_asset_drafts (owner_id, status, created_at desc);
create trigger wrs_drafts_updated_at before update on wrs_asset_drafts
  for each row execute function wrs_set_updated_at();

alter table wrs_asset_drafts enable row level security;
create policy "drafts_select_own" on wrs_asset_drafts
  for select to authenticated using (owner_id = auth.uid());
create policy "drafts_update_own" on wrs_asset_drafts
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "drafts_delete_own" on wrs_asset_drafts
  for delete to authenticated using (owner_id = auth.uid());
-- No insert policy: drafts are inserted by the structuring pipeline (service-role) only.
