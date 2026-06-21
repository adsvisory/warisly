-- Migration: 2026-06-21_0007_release_rule.sql
alter table wrs_owners add column release_rule jsonb;
-- Shape (validated in the service layer, not enforced by the DB):
--   { "waitingDays": 14, "channels": ["whatsapp", "email"] }
-- NULL = not yet configured. Owner-RLS on wrs_owners already governs read/write.
