-- Migration: 2026-06-27_0013_intake_storage.sql
-- Scanned-asset intake (#11a): private bucket for retained OFFLINE-DOCUMENT photos.
-- Financial-account screenshots are NEVER uploaded here — the intake service drops the
-- image after extraction (Cardinal 1: no honeypot). See src/services/asset-scan.ts.

-- 1) Intake metadata + document references live in wrs_assets.detail (already added in
--    migration 0002). Idempotent guard so this migration is safe on any branch.
alter table wrs_assets
  add column if not exists detail jsonb not null default '{}'::jsonb;

-- 2) Private bucket for retained offline-document photos ONLY.
insert into storage.buckets (id, name, public)
values ('wrs-documents', 'wrs-documents', false)
on conflict (id) do nothing;

-- 3) RLS on storage.objects — owner-scoped by first path segment {owner_id}/...
--    wrs_owners.id == auth.users.id (1:1), so owner_id == auth.uid().
--    Path convention enforced by the app: {owner_id}/{asset_id}/{doc_id}.jpg
--    Heir read access at claim time is OUT OF SCOPE here: released documents are served
--    via server-generated signed URLs after release_state = 'released' (heir has no
--    standing account, Cardinal 4) — handled in the release/heir brief, not here.

drop policy if exists "wrs_docs_owner_select" on storage.objects;
create policy "wrs_docs_owner_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'wrs-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "wrs_docs_owner_insert" on storage.objects;
create policy "wrs_docs_owner_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'wrs-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "wrs_docs_owner_delete" on storage.objects;
create policy "wrs_docs_owner_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'wrs-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
