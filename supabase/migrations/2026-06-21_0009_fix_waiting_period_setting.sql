-- Migration: 2026-06-21_0009_fix_waiting_period_setting.sql
-- FIX: services/release-rule.ts reads getSetting("release.waiting_period_days")
-- expecting { default, min, max }, but 0001 seeded three flat keys. The composite
-- key did not exist, so the service silently fell back to a hardcoded { min:7, max:90 }.
-- This adds the composite key (so bounds come from settings as intended) and removes
-- the three unused flat keys. Max is restored to the intended 30 days.

insert into wrs_settings (key, value, description) values
  ('release.waiting_period_days', '{"default":14,"min":7,"max":30}',
   'Waiting-period bounds (days) for the release safety window: default/min/max')
on conflict (key) do update set value = excluded.value, description = excluded.description;

delete from wrs_settings
where key in (
  'release.waiting_period_days_default',
  'release.waiting_period_days_min',
  'release.waiting_period_days_max'
);

-- Verify:
--   select value from wrs_settings where key = 'release.waiting_period_days';
--   -> {"default":14,"min":7,"max":30}
--   select count(*) from wrs_settings where key like 'release.waiting_period_days\_%';
--   -> 0
