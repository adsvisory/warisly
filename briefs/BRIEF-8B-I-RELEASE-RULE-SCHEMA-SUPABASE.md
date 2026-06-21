# IMPLEMENTATION BRIEF: Release Rule Schema
## Surface: supabase
## Brief: #8b-i
## Phase: 1 (MVP)
## Depends on: #1
## Blocks: #8b-ii
## Parallel with: #8a-ii

### CONTEXT
A single `release_rule` JSONB column on `wrs_owners` holding the owner's waiting period and ping channels — `{ waitingDays, channels }`.

### NON-NEGOTIABLE CHECK
The rule is per-owner and edited under the existing `wrs_owners` owner-RLS (no new policy needed). It is the owner's *configuration* of the release safeguards (waiting period + multi-channel ping); enforcement happens in the release engine (#9d). No credentials.

### REUSE ANALYSIS
- One JSONB column vs a separate table → chose the column: the rule is strictly 1:1 with the owner, small, and always read/written together. A table would add a join and a redundant FK for no benefit.
- Bounds (min/max waiting days, allowed channels) live in `wrs_settings` (#1), not here — the column stores only the owner's chosen values, validated against settings in the service.

### PRE-FLIGHT CHECKS
- [ ] `wrs_owners` exists with owner-RLS update policy (#1); `wrs_settings` has `release.*` + `trustees.quorum` (#1).

### DATABASE MIGRATIONS

```sql
-- Migration: 2026-06-21_0007_release_rule.sql
alter table wrs_owners add column release_rule jsonb;
-- Shape (validated in the service layer, not enforced by the DB):
--   { "waitingDays": 14, "channels": ["whatsapp", "email"] }
-- NULL = not yet configured. Owner-RLS on wrs_owners already governs read/write.
```

### VERIFICATION
- [ ] Migration applies; `release_rule` is nullable and defaults NULL.
- [ ] An owner can update their own `release_rule`; another owner's row is untouched (existing RLS).
