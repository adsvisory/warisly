# IMPLEMENTATION BRIEF: Assets Schema + RLS
## Surface: supabase
## Brief: #4a
## Phase: 1 (MVP)
## Depends on: #1
## Blocks: #4b, #5b, #6b
## Parallel with: None

### CONTEXT
The asset registry table: owner-scoped assets and liabilities with an approximate value, freshness date, a rich `detail` JSONB, and provider-beneficiary tracking — all RLS-scoped to the owner.

### NON-NEGOTIABLE CHECK
No credential/password column — `identifier` holds an account email/number only and is flagged for client-side encryption (P2). No money movement. RLS scopes every row to its owner (`owner_id = auth.uid()`). `value_estimate` is explicitly an estimate, surfaced via `<Estimate>` (Discovery-first). Heir read access is added later with the release mechanism (Batch 7) via a release-gated policy — NOT here.

### REUSE ANALYSIS (required before new schema)
Considered reusing:
- `wrs_owners` columns → rejected: assets are 1-to-many per owner, not owner attributes.
- `wrs_settings` JSONB → rejected: per-user records, not global config.
- A `detail` JSONB on a generic table → adopted *within* this table for the flexible "tentang aset ini" fields, avoiding a column-per-attribute sprawl.
Why a new table: assets are a distinct, owner-scoped, multi-row entity needing their own RLS, indexes, and (later) release-gated heir policy — no existing structure provides this.

### PRE-FLIGHT CHECKS
- [ ] `wrs_owners`, `wrs_asset_category` enum, `wrs_set_updated_at()` exist (Brief #1).

### DATABASE MIGRATIONS

```sql
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
```

### VERIFICATION
- [ ] Migration applies clean.
- [ ] User A inserts an asset with their own `owner_id` → succeeds; inserting with User B's `owner_id` → rejected by RLS.
- [ ] User B `select * from wrs_assets` returns zero of User A's rows.
- [ ] Updating a row bumps `updated_at`.
- [ ] Deleting the owner cascades the assets.
