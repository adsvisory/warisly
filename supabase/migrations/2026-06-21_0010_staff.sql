-- Migration: 2026-06-21_0010_staff.sql
-- Back-office staff allowlist + RBAC. Internal surface only — separate from
-- owner/heir auth (the three never cross). Writes are service-role only.

create type wrs_staff_role as enum ('reviewer', 'admin');

create table wrs_staff (
  email      text primary key,
  full_name  text,
  role       wrs_staff_role not null default 'reviewer',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table wrs_staff enable row level security;

-- A signed-in staff member may read ONLY their own row (to resolve role/membership).
create policy wrs_staff_self_read on wrs_staff for select to authenticated
  using (lower(auth.jwt() ->> 'email') = email);
-- No insert/update/delete policy — writes are service-role only.

-- Seed (replace with real staff emails before go-live).
insert into wrs_staff (email, full_name, role) values
  ('aulia@warisly.id', 'Aulia', 'admin')
on conflict (email) do nothing;
