-- ONE-TIME RECONCILIATION — run BEFORE applying the real migrations.
-- The earlier AI-authored 0001 created the wrong foundation (enums `release_state`,
-- `actor_role`; `wrs_owners`/`wrs_events`/`wrs_api_log` with different columns) and is
-- already live on the dev project. This drops it so the founder's real migrations
-- (2026-06-21_0001..0003) apply cleanly. DEV DATABASE ONLY — destroys all wrs_ data.

drop table if exists wrs_api_log cascade;
drop table if exists wrs_events cascade;
drop table if exists wrs_settings cascade;
drop table if exists wrs_owners cascade;

drop type if exists release_state;
drop type if exists actor_role;
drop type if exists asset_category;     -- only existed if a later invented migration was applied

drop function if exists wrs_set_updated_at() cascade;

-- If the invented 0001 was applied via `supabase db push` (not the SQL editor),
-- also clear its stale migration-history row so the CLI re-applies cleanly:
--   delete from supabase_migrations.schema_migrations where version = '0001';
