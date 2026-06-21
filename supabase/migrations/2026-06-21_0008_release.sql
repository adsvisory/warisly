-- Migration: 2026-06-21_0008_release.sql

-- 1) Estate release state on the owner record (authoritative) ----------------
alter table wrs_owners add column release_state wrs_release_state not null default 'sealed';

-- Guard: an authenticated owner can NEVER change their own release_state.
-- Service-role (auth.uid() is null in that context) is the only path that may.
create or replace function wrs_guard_owner_release_state()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and new.release_state is distinct from old.release_state then
    raise exception 'release_state cannot be changed by the owner';
  end if;
  return new;
end;
$$;
create trigger wrs_owners_guard_release_state
  before update on wrs_owners
  for each row execute function wrs_guard_owner_release_state();

-- Lock: once an estate is not 'sealed', the owner can no longer mutate their
-- own records. Service-role (auth.uid() null) is unaffected.
create or replace function wrs_block_if_not_sealed()
returns trigger language plpgsql as $$
declare st wrs_release_state;
begin
  if auth.uid() is null then
    return coalesce(new, old);                 -- service-role: allow
  end if;
  select release_state into st from wrs_owners where id = auth.uid();
  if st is distinct from 'sealed' then
    raise exception 'record is locked after release';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger wrs_assets_lock     before insert or update or delete on wrs_assets     for each row execute function wrs_block_if_not_sealed();
create trigger wrs_trustees_lock   before insert or update or delete on wrs_trustees   for each row execute function wrs_block_if_not_sealed();
create trigger wrs_recipients_lock before insert or update or delete on wrs_recipients for each row execute function wrs_block_if_not_sealed();
create trigger wrs_wishes_lock     before insert or update or delete on wrs_wishes     for each row execute function wrs_block_if_not_sealed();

-- 2) Release requests (the claim state machine) ------------------------------
create type wrs_release_request_status as enum (
  'initiated',            -- claim opened via the heir link
  'documents_submitted',  -- akta kematian + KK uploaded
  'identity_verified',    -- heir eKYC passed and NIK matched a recipient
  'under_review',         -- back-office reviewing
  'approved',             -- first admin approval recorded (awaiting the second)
  'waiting_period',       -- dual-control complete; owner safety-ping window running
  'released',             -- estate released to the matched heir
  'rejected',             -- review rejected / owner responded alive
  'cancelled'
);

create table wrs_release_requests (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null references wrs_owners (id) on delete cascade,
  status               wrs_release_request_status not null default 'initiated',
  claim_token          uuid not null unique default gen_random_uuid(),
  claimant_name        text,
  claimant_ekyc_ref    text,                          -- heir eKYC pass token (no biometrics)
  matched_recipient_id uuid references wrs_recipients (id) on delete set null,
  akta_path            text,                           -- private storage path
  kk_path              text,
  waiting_until        timestamptz,                    -- end of the safety-ping window
  released_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index wrs_release_requests_owner_idx on wrs_release_requests (owner_id, created_at desc);
create index wrs_release_requests_active_idx on wrs_release_requests (status)
  where status in ('under_review', 'approved', 'waiting_period');
create trigger wrs_release_requests_updated_at before update on wrs_release_requests
  for each row execute function wrs_set_updated_at();

alter table wrs_release_requests enable row level security;
-- Owner may SEE a claim on their estate (powers the safety ping + transparency log).
create policy "release_requests_select_own" on wrs_release_requests
  for select to authenticated using (owner_id = auth.uid());
-- No owner insert/update: heir flow + admin/engine act via service-role only.

-- 3) Dual-control approvals --------------------------------------------------
create table wrs_release_approvals (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references wrs_release_requests (id) on delete cascade,
  admin_id    text not null,                           -- staff identifier (OPS)
  decision    text not null check (decision in ('approve', 'reject')),
  note        text,
  created_at  timestamptz not null default now(),
  unique (request_id, admin_id)                        -- forces TWO distinct approvers
);
create index wrs_release_approvals_request_idx on wrs_release_approvals (request_id);

alter table wrs_release_approvals enable row level security;
-- No authenticated policies: admins act via service-role only.

-- 4) Private documents bucket (akta kematian, KK) ----------------------------
insert into storage.buckets (id, name, public)
  values ('release-docs', 'release-docs', false)
  on conflict (id) do nothing;
-- No storage policies for anon/authenticated → only service-role reads/writes.
-- Heir uploads + admin reads go through server actions (service-role) + signed URLs.
