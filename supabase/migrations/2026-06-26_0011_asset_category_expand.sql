-- Migration: 2026-06-26_0011_asset_category_expand.sql
-- Additive only. Extends wrs_asset_category with 9 inheritance categories so the
-- canonical 20-item catalog (next migration) can be stored. The existing 12 values
-- and every row in wrs_assets / wrs_draft_entries are untouched — no renames, no
-- backfill, fully reversible-safe (Postgres keeps unused enum labels harmlessly).
--
-- ADD VALUE IF NOT EXISTS is idempotent. PG15 allows it inside a transaction; the
-- new labels are intentionally NOT used as enum literals in this migration, so the
-- "can't use a value added in the same transaction" rule does not apply.

alter type wrs_asset_category add value if not exists 'obligasi';     -- SBN & bonds
alter type wrs_asset_category add value if not exists 'p2p';          -- P2P lending (lender)
alter type wrs_asset_category add value if not exists 'luar_negeri';  -- foreign investments
alter type wrs_asset_category add value if not exists 'pensiun';      -- DPLK/Taspen/Asabri
alter type wrs_asset_category add value if not exists 'bisnis';       -- online business / income
alter type wrs_asset_category add value if not exists 'domain';       -- domains & websites
alter type wrs_asset_category add value if not exists 'ip';           -- IP & royalties
alter type wrs_asset_category add value if not exists 'poin';         -- points & loyalty
alter type wrs_asset_category add value if not exists 'game';         -- gaming assets / virtual items
