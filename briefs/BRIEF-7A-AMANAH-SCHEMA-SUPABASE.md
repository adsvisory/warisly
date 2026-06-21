# IMPLEMENTATION BRIEF: Amanah Schema (trustees, recipients, wishes)
## Surface: supabase
## Brief: #7a
## Phase: 1 (MVP)
## Depends on: #1
## Blocks: #7b
## Parallel with: None

### CONTEXT
The three honest roles: `wrs_trustees` (who *act* — confirmation token + role), `wrs_recipients` (who *receive* — by NIK, with a now/after-death visibility), and `wrs_wishes` (informational wasiat) — all RLS-scoped to the owner.

### NON-NEGOTIABLE CHECK
RLS scopes every row to its owner. Recipients record who receives the *map*, not a legal allocation — faraid/law governs actual inheritance (surfaced as an awareness note in UI, not enforced here). `nik` is sensitive PII flagged for client-side encryption (P2). Trustee confirmation uses an unguessable `confirm_token` (UUID) handled server-side via service-role — trustees have no account, consistent with the heir-link model. No credentials.

### REUSE ANALYSIS (required before new schema)
- One table with a `role` discriminator → rejected: trustees, recipients, and wishes have different fields, lifecycles (confirmation vs none), and visibility rules; conflating them complicates RLS and risks leaking a recipient's NIK into a trustee row.
- `wrs_owners` columns → rejected: each is one-to-many.
- New ENUMs (role/status/contact/visibility/relationship) vs text+check → chose ENUMs for type-safety at the DB boundary, matching `release_state`/`asset_category` precedent.

### PRE-FLIGHT CHECKS
- [ ] `wrs_owners`, `wrs_set_updated_at()` exist (#1).
- [ ] `wrs_settings` has `trustees.quorum` (#1).

### DATABASE MIGRATIONS

```sql
-- Migration: 2026-06-21_0005_amanah.sql
create type wrs_trustee_role   as enum ('primary', 'backup');
create type wrs_trustee_status as enum ('invited', 'confirmed', 'declined');
create type wrs_contact_type   as enum ('whatsapp', 'phone', 'email');
create type wrs_visibility     as enum ('now', 'after_death');
create type wrs_relationship   as enum ('pasangan', 'anak', 'orang_tua', 'saudara', 'lainnya');

-- Trustees (who ACT) ---------------------------------------------------------
create table wrs_trustees (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references wrs_owners (id) on delete cascade,
  name          text not null,
  contact_type  wrs_contact_type not null,
  contact_value text not null,
  role          wrs_trustee_role not null default 'primary',
  status        wrs_trustee_status not null default 'invited',
  confirm_token uuid not null unique default gen_random_uuid(),
  confirmed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index wrs_trustees_owner_idx on wrs_trustees (owner_id);
create trigger wrs_trustees_updated_at before update on wrs_trustees for each row execute function wrs_set_updated_at();

alter table wrs_trustees enable row level security;
create policy "trustees_select_own" on wrs_trustees for select to authenticated using (owner_id = auth.uid());
create policy "trustees_insert_own" on wrs_trustees for insert to authenticated with check (owner_id = auth.uid());
create policy "trustees_update_own" on wrs_trustees for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "trustees_delete_own" on wrs_trustees for delete to authenticated using (owner_id = auth.uid());
-- Token confirmation is performed server-side via service-role (trustees have no account).

-- Recipients (who RECEIVE) ---------------------------------------------------
create table wrs_recipients (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references wrs_owners (id) on delete cascade,
  name         text not null,
  nik          text,                              -- sensitive PII; client-side-encryption flagged (P2)
  relationship wrs_relationship not null default 'lainnya',
  visibility   wrs_visibility not null default 'after_death',
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index wrs_recipients_owner_idx on wrs_recipients (owner_id);
create trigger wrs_recipients_updated_at before update on wrs_recipients for each row execute function wrs_set_updated_at();

alter table wrs_recipients enable row level security;
create policy "recipients_select_own" on wrs_recipients for select to authenticated using (owner_id = auth.uid());
create policy "recipients_insert_own" on wrs_recipients for insert to authenticated with check (owner_id = auth.uid());
create policy "recipients_update_own" on wrs_recipients for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "recipients_delete_own" on wrs_recipients for delete to authenticated using (owner_id = auth.uid());

-- Wishes / wasiat (informational) -------------------------------------------
create table wrs_wishes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references wrs_owners (id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index wrs_wishes_owner_idx on wrs_wishes (owner_id);
create trigger wrs_wishes_updated_at before update on wrs_wishes for each row execute function wrs_set_updated_at();

alter table wrs_wishes enable row level security;
create policy "wishes_select_own" on wrs_wishes for select to authenticated using (owner_id = auth.uid());
create policy "wishes_insert_own" on wrs_wishes for insert to authenticated with check (owner_id = auth.uid());
create policy "wishes_update_own" on wrs_wishes for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "wishes_delete_own" on wrs_wishes for delete to authenticated using (owner_id = auth.uid());
```

### VERIFICATION
- [ ] Migration applies clean; all three tables RLS-enabled.
- [ ] A trustee row gets a unique `confirm_token` on insert; two rows never collide.
- [ ] User A cannot read User B's trustees/recipients/wishes (RLS).
- [ ] `nik` accepts a 16-char value; documented as CSE-flagged for P2.
