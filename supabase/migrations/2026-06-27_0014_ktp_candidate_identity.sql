-- Migration: 2026-06-27_0014_ktp_candidate_identity.sql
-- Brief #12a — storage for the UNVERIFIED, OCR-derived candidate identity (NIK / name / DOB).
--
-- Adds a misc-JSONB `detail` column to two EXISTING, already-RLS-protected tables:
--   • wrs_owners            — owner pre-fills their own NIK before eKYC.
--   • wrs_release_requests  — heir pre-fills their NIK on the claim record (#9b-iii).
--
-- Cardinal 3 (no raw biometrics): only TEXT (NIK/name/DOB) is ever stored here. The KTP
--   image is OCR'd in memory and dropped (#12b-i/ii/iii) — never written to this column.
-- Cardinal 5 (release safety): the candidate lives under a SEPARATE `detail.candidate` key
--   and is `status:'unverified'`. It MUST NOT be mistaken for the verified identity. Nothing
--   in this path touches wrs_owners.kyc_status / verified_nik / release_eligible, nor
--   wrs_release_requests.status / claimant_ekyc_ref / matched_recipient_id, nor any
--   wrs_owners.release_state. Only the eKYC (Verihubs/Dukcapil) callback may set verified state.
--
-- RLS: these are columns on EXISTING tables — the row-level policies already shipped with each
--   table scope the new column automatically, so NO new policy is required:
--     • wrs_owners            → "owners_update_self" lets an owner write only their own row
--                               (id = auth.uid()); the release_state guard trigger is untouched.
--     • wrs_release_requests  → no authenticated insert/update policy at all; the heir write
--                               runs via the service-role server context, token-gated (#12b-iii).
--
-- Additive-only, idempotent. No backfill, no lock risk, fully reversible (drop column).

-- Owner profile — candidate identity the owner pre-fills for themselves.
alter table wrs_owners
  add column if not exists detail jsonb not null default '{}'::jsonb;

-- Heir claim record (#9b-iii) — candidate identity the heir pre-fills on the claim.
alter table wrs_release_requests
  add column if not exists detail jsonb not null default '{}'::jsonb;

-- Documented shape (no DB-side enforcement; written by the app in #12b-ii / #12b-iii):
--   detail.candidate = {
--     nik:         text,            -- 16 digits, user-confirmed OCR result
--     name:        text,
--     dob:         text,            -- ISO yyyy-mm-dd or raw text
--     source:      'ktp_ocr',
--     status:      'unverified',    -- NEVER 'verified' from this path
--     captured_at: timestamptz
--   }
comment on column wrs_owners.detail is
  'Misc owner JSONB. detail.candidate = unverified OCR identity (NIK/name/DOB). Never the verified identity.';
comment on column wrs_release_requests.detail is
  'Misc claim JSONB. detail.candidate = unverified OCR heir identity (NIK/name/DOB). Never flips status/release.';
