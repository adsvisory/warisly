# Changelog

All notable changes to Warisly. Semantic versioning `MAJOR.MINOR.PATCH`.

## [0.9.1] — Settings fix + desktop device frame

### Fixed (migration `0009` APPLIED to live project)
- `2026-06-21_0009_fix_waiting_period_setting.sql` — adds composite `release.waiting_period_days`
  `{default:14,min:7,max:30}` and removes the 3 unused flat keys, so `services/release-rule.ts`
  reads its bounds from settings (max 30) instead of the hardcoded fallback. Verified live.

### Changed (copy)
- Asset form: relabelled the `provider_beneficiary_set` field to "Apakah penyedia sudah mencatat ahli
  waris / penerima manfaat?" + helper, clarifying it's the provider's own beneficiary registration (a
  discovery signal), not Warisly's recipient list. No schema/field change.

### Added (#UI-2 — supersedes #UI-1, presentational only)
- Responsive owner shell: sticky **desktop sidebar** (Seal + wordmark + route-aware nav) and
  **mobile bottom nav**, plus a desktop-only **Desktop/Mobile toggle** (top-right, `localStorage`-persisted)
  that swaps the responsive layout for the phone mockup (`DeviceFrame`, centered ~400×860, dark bezel on
  Tinta). `DeviceFrame.tsx` retained; `(app)/layout.tsx` renders `AppShell` directly (shell owns the frame).
- Brand discipline kept: toggle/sidebar/nav active states use Tinta/Emas — Nyala stays reserved for primary actions.
- MCP-verified: desktop sidebar + toggle (no bottom nav); clicking Mobile → phone frame with inner nav;
  choice persists across reload (`localStorage`); active nav tracks the route; `/klaim` stays unframed.



## [0.9.0] — Brief #9a/#9b-i/#9b-ii: Release spine + heir claim entry

### Added (migration `0008_release` APPLIED to live project)
- `2026-06-21_0008_release.sql` (#9a) — `wrs_owners.release_state` (default `sealed`) with an
  owner-can't-self-release guard trigger; record-lock triggers on assets/trustees/recipients/wishes
  (blocked once not `sealed`); `wrs_release_requests` (9-state claim machine, owner-read RLS only);
  `wrs_release_approvals` (`unique(request_id, admin_id)` → dual-control); private `release-docs` bucket.
- `packages/db/src/data/release.ts` (#9b-i) — full release lifecycle data layer (service-role): create/
  lookup claims, attach docs, identity + NIK match, dual-control approvals, idempotent `transitionRequest`,
  `setOwnerReleaseState` (sole release_state writer), `recordEvent` audit writer.
- Public heir surface (#9b-ii): `/klaim` (no-account entry by deceased's phone), `/klaim/[token]`
  (token-gated, status-driven; doc upload to the private bucket), `ClaimDocsForm`, claim server actions.
  Claim initiation is silent (no owner ping until after verification + review).

### Verification
- `pnpm typecheck` 5/5. Migration applied + verified (release_state, tables, 5 triggers, private bucket).
- MCP self-check on :3000 — `/klaim` public renders (Seal + "Tidak perlu membuat akun"); unregistered
  phone → friendly not-found; `/klaim/<bad-token>` → 404 via live `wrs_release_requests` query.



> An earlier pass executed AI-authored placeholder briefs for #1–#5; those were **replaced**
> by the founder's authoritative briefs. The repo now matches the briefs in `briefs/` verbatim,
> with the documented build-plumbing deviations below.

## [0.8.0] — Briefs #0–#8 (founder briefs, monorepo)

### Migrations (in `supabase/migrations/`, APPLIED to project obhqgodvtngqarnurhrm on 2026-06-21)
- `0001_schema_foundation` — enums, `wrs_owners`, `wrs_settings` (6 seeds), `wrs_events`, `wrs_api_log`.
- `0002_assets` — `wrs_assets` (owner RLS).
- `0003_intake` — `wrs_intake_messages` (internal) + `wrs_asset_drafts` (pipeline-insert only).
- `0004_playbooks` — `wrs_playbooks` (4 PLACEHOLDER seeds) + `dossier.base_documents`.
- `0005_amanah` — `wrs_trustees` / `wrs_recipients` / `wrs_wishes` + 5 enums.
- `0006_ekyc` — `wrs_owners` KYC columns + `wrs_ekyc_sessions` (pass/fail only, no biometrics).
- `0007_release_rule` — `wrs_owners.release_rule` jsonb.

### Owner app (`apps/web`) + packages
- #2 phone-OTP auth · #3 `@warisly/ui` primitives · #4 asset registry (data/service/UI, dossier-less).
- #5 WhatsApp intake → OpenAI structuring → draft confirm-before-save.
- #6 recovery dossier (`/dosier`, print-to-PDF) + versioned playbooks.
- #7 Amanah: trustees (public token confirm at `/wali/[token]`), recipients (masked NIK, faraid note), wishes.
- #8 eKYC (vendor-seam adapter in `lib/ekyc.ts`, pass/fail only) + release-rule config (`/rilis`, eKYC-gated).

### Routes
`/`, `/masuk`, `/beranda`, `/aset`(+`baru`/`[id]`/`[id]/edit`/`draf`/`draf/[id]`), `/dosier`, `/amanah`(+`wali`),
`/wali/[token]` (public), `/profil`, `/rilis`, `/api/whatsapp/webhook`, `/api/ekyc/webhook`.

### Build-plumbing deviations from the briefs (documented; behaviour-preserving)
- `typedRoutes` disabled (briefs use dynamic `redirect()`/`<Link>` targets).
- Cookie `setAll` params annotated (`CookieToSet[]`) — strict mode + `@supabase/ssr` union types.
- `lib/llm.ts` Blob wrapped in `Uint8Array` — `Buffer` isn't a valid `BlobPart` under strict TS.
- `packages/ui` keeps `tailwindcss` + React type devDeps; `apps/web` adds `lucide-react` (used by `AppShell`).
- **Dev-only email+password sign-in** added to `/masuk` (founder-requested for testing). Gated to
  `NODE_ENV !== "production"` in both the UI and the `signInPassword` action — production stays phone-OTP only.

### Verification
- `pnpm typecheck` 5/5 · `pnpm --filter @warisly/web build` builds all 18 routes.
- DB reconciled (old invented schema dropped) + all 7 migrations applied to the live SG project;
  12 `wrs_` tables live, settings + playbooks seeded, verified via REST.
- `packages/db/src/types.ts` left as a placeholder (data layer uses hand-written Row types; regen needs Docker/login).

### Not yet built (no briefs provided)
- #9 release engine / heir claim / admin console · #10 transparency log / consent / export-delete.
