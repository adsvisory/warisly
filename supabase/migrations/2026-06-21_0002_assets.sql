-- Migration: 2026-06-21_0002_assets.sql
create table wrs_assets (
  id                        uuid primary key default gen_random_uuid(),
  owner_id                  uuid not null references wrs_owners (id) on delete cascade,
  category                  wrs_asset_category not null,
  is_liability              boolean not null default false,
  provider                  text,                          -- "Ajaib", "BCA", "GoPay"
  label                     text,                          -- owner's nickname for it
  identifier                text,                          -- account email/number — NEVER a password (CSE-flagged, P2)
  value_estimate            bigint,                        -- IDR; approximate, owner-stated
  currency                  text not null default 'IDR',
  detail                    jsonb not null default '{}'::jsonb,  -- ownership share, co-owners, linked accounts, owner instructions
  provider_beneficiary_set  boolean,                       -- null = unknown, true/false = tracked
  last_reviewed_at          timestamptz,
  archived_at               timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index wrs_assets_owner_active_idx on wrs_assets (owner_id) where archived_at is null;
create index wrs_assets_owner_liability_idx on wrs_assets (owner_id, is_liability) where archived_at is null;

create trigger wrs_assets_updated_at before update on wrs_assets
  for each row execute function wrs_set_updated_at();

alter table wrs_assets enable row level security;
create policy "assets_select_own" on wrs_assets
  for select to authenticated using (owner_id = auth.uid());
create policy "assets_insert_own" on wrs_assets
  for insert to authenticated with check (owner_id = auth.uid());
create policy "assets_update_own" on wrs_assets
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "assets_delete_own" on wrs_assets
  for delete to authenticated using (owner_id = auth.uid());
-- NOTE: heir read policy (release-gated) is added in Batch 7 (#9a/#9e), not here.
