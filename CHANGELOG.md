# Changelog

All notable changes to Warisly. Semantic versioning `MAJOR.MINOR.PATCH`.

## [web 0.14.1 · admin 0.11.1] — Fix Vercel build under Turborepo strict env mode

Build-only fix, no product, schema, or RLS change. Both Next.js apps failed to build on Vercel
because Turborepo 2.x runs tasks in **strict environment mode** by default: the `build` task was
handed none of the Supabase / WhatsApp / eKYC / OpenAI env vars, so `@supabase/ssr` client
creation (`/mfa/enroll` prerender) and the env Zod parse (`/api/ekyc/webhook` page-data
collection) threw on `undefined`. Local builds were unaffected because Next.js reads `.env.local`
from disk; Vercel injects env only into the process environment, which Turbo then filtered out.

### Fixed
- Declared every build-time env var in the `build` task's `env` key in `turbo.json`, so Turbo
  passes them through to `next build`. Confirmed via `turbo run build --dry` (envMode `strict`,
  all vars now listed). **No code change** — the values must still be set in Vercel Project
  Settings for Production + Preview, which is independent of this fix.

## [Unreleased] — Friction on asset archiving

UX safeguard, no schema change. Archiving is reversible at the data layer but has no restore UI,
so from the owner's side it reads as destructive — it should not be a one-click action.

### Changed
- **Asset archive now requires a deliberate two-step confirmation.** On the asset detail page the
  bare "Arsipkan" button is replaced by a server-rendered `<details>` disclosure (same pattern as the
  Amanah page, no new client JS): clicking it reveals a calm explanation of the consequence ("this
  asset will leave the recovery map your family receives…") and a distinct warm-danger confirm button.
- New reusable `bata` danger token family in the Tailwind preset (the app's first destructive-action
  color), used here instead of a one-off hex.

## [0.14.0] — KTP candidate-NIK pre-fill (owner + heir)

KYC pre-fill: an owner (or an heir, on a plain claim link) photographs their KTP, an LLM vision
model reads **only NIK / name / DOB** into a draft, the user reviews/edits every field, and only
the confirmed text is saved as an **unverified candidate** identity. OCR is not verification — it
sets no verified flag, matches no recipient, and arms no release; the eKYC Dukcapil face-match
remains the sole authority (Cardinal #5). The KTP image is OCR'd in memory and dropped — never
uploaded, never stored (Cardinal #3). The heir path runs with no account, authorized by the claim
token only (Cardinal #4). Briefs #12a, #12b-i, #12b-ii, #12b-iii.

### Added
- **`detail` JSONB column on `wrs_owners` and `wrs_release_requests`** (migration `0014`). The
  unverified candidate identity lives under `detail.candidate` (`status:'unverified'`, `source:'ktp_ocr'`),
  kept strictly separate from the verified fields (`kyc_status` / `verified_nik` / claim `status`).
  Additive-only; no new RLS policy needed — existing per-row policies already scope the column
  (owner writes own row via `owners_update_self`; heir writes run service-role, token-gated).
- **KTP OCR engine** (`lib/prompts/ktp-ocr.ts`, `recognizeKtp` in `lib/llm.ts`, `services/ktp-ocr.ts`).
  Reuses the existing OpenAI `gpt-4o` vision client (no separate provider). The prompt extracts
  **only** NIK/name/DOB and explicitly ignores address/religion/marital status/etc. Every call is
  logged to `wrs_api_log`; on error only the error class is recorded (no PII).
- **Shared `KtpScan` component** (`components/kyc/KtpScan.tsx`) — capture → OCR → review → save,
  reused by the owner profile and the heir claim flow. Image downscaled in-browser (strips EXIF),
  sent for OCR, then dropped. Nothing is saved until the user confirms.
- **Owner KTP step** (`/profil/ktp`, session + RLS-gated) with a pre-fill entry link on the profile
  page, and **heir KTP step** (`/klaim/[token]/ktp`, token-gated, no account).

### Notes
- Reconciled the briefs (which assumed Gemini, `wrs_claims`/`wrs_profiles`, and `src/data/*`) onto
  this codebase: OpenAI vision, `wrs_release_requests`/`wrs_owners`, and `@warisly/db` data layer.
- Observability logs the OCR call against the estate `owner_id` (FK-valid), never the claim id;
  the heir token is validated against a strict uuid shape before any DB query.

## [0.13.0] — Scanned-asset intake (photo → AI draft → owner-confirmed save)

In-app capture flow: the owner photographs an app screen or a physical document, an LLM vision
model reads it into a **draft**, the owner verifies/edits every field, and only then is the asset
saved. No credential or account-access path is introduced (Cardinal #1). Nothing is written until
the owner taps confirm (Cardinal #6). Briefs #11a, #11b-i, #11b-ii, #11b-iii.

### Added
- **Private `wrs-documents` storage bucket + owner-scoped RLS** (migration `0013`). Owner-only
  read/write/delete keyed off the first path segment (`{owner_id}/{asset_id}/{doc_id}`), and
  `wrs_owners.id == auth.uid()` so the path convention is RLS-enforced. Holds **offline-document
  photos only** (sertifikat, polis, BPKB, bilyet); financial-account screenshots are **never**
  uploaded — the image is dropped after extraction (no honeypot). `wrs_assets.detail` already
  existed (migration `0002`); the migration keeps an idempotent guard.
- **Vision extraction engine** — `extractScannedAsset` (`src/lib/llm.ts`) + prompt/type in
  `src/lib/prompts/asset-extraction.ts`. Classifies the image (`financial_screenshot` /
  `offline_document` / `unknown`), normalizes Indonesian rupiah formats ("Rp 1,2jt" → 1200000),
  and returns `rawValueSeen` (the exact string read) plus `fieldsNeedingReview`. The prompt forbids
  passwords/PINs/CVV/OTP, and the service re-strips any credential-like identifier.
- **`asset-scan` service** (`src/services/asset-scan.ts`) — `buildScanDraft` (draft only, never
  persisted; logs each LLM call to `wrs_api_log`) and `commitScannedAsset` (RLS-bound owner insert
  via `addAsset`, optional document upload, `asset.created` audit event to `wrs_events`).
- **Capture + review UI** — `ScanCapture` (rear-camera/gallery, in-browser downscale that strips
  EXIF/GPS via canvas re-encode) and `ScanReview` (shows "what we read", lets the owner correct
  every field; the single primary CTA uses the `nyala` accent). New page `/aset/pindai` and a
  "Pindai" entry point on the asset list. Bahasa-first copy under the `scan` i18n namespace (id/en).
- **`attachDocumentImage`** data helper (`packages/db`) — stores an offline-document image on the
  RLS-bound owner client and records its reference in `detail.document`.
- **Extract route** `app/api/intake/extract/route.ts` and commit server action
  `src/app/actions/asset-scan.ts` (both thin: auth → validate → service).

### Notes
- Reuses the existing OpenAI gpt-4o vision port and `OPENAI_API_KEY` rather than adding a separate
  Gemini provider (the briefs named Gemini; the repo standard is OpenAI for vision/STT). No new env
  vars. Swap the model in one place (`VISION_MODEL` in `src/lib/llm.ts`) if needed.

## [0.12.0] — Canonical 20-item inheritance category catalog (estate-path aware)

Catalog completeness for the owner registry, plus awareness-only estate-path notes. No
division math, no share calculation — the notes describe *who claims and how*, never how
much anyone is owed (Cardinal #7). No credential/access path touched.

### Added
- **`asset_category_catalog` config in `wrs_settings`** (migration `0012`) — one canonical,
  versionable list of 20 inheritance categories in 5 groups, each carrying `estate_path`
  (`general` | `bypass` | `liability`), claim routes, and a Bahasa/English informational note.
  Config, not a new table (read-mostly public reference data; no per-user rows, no RLS surface).
- **9 new `wrs_asset_category` enum values** (migration `0011`, purely additive) so the new
  categories are storable: `obligasi, p2p, luar_negeri, pensiun, bisnis, domain, ip, poin, game`.
  Existing 12 values and all rows untouched; no renames, no backfill.
- **Catalog accessor** `getAssetCategoryCatalog` in `@warisly/db`, web service
  `listAssetCategories`, client-safe `groupCategories`/`findCategory` helpers, and a
  `fetchAssetCategories` server action.
- i18n labels for the 9 new categories + a `categoryPlaceholder` string (id + en).

### Changed
- **AssetForm now reads the catalog** instead of a hardcoded 12-item list: a grouped dropdown
  (5 optgroups / 20 options), a calm estate-path note under the selected category, and the
  existing provider-beneficiary field surfaced **only** for bypass categories
  (asuransi/BPJS/pensiun). Falls back to the legacy enum list if the catalog is unavailable,
  so the form never blocks.

## [0.11.1] — Drop "recovery guide" framing from the owner asset list

Copy/UX tweak on the owner surface — no schema, no logic change.

### Changed
- **Asset list no longer shows "Lihat panduan pemulihan" per card** (`aset/page.tsx`). Recovery is an
  heir-facing, after-release concern; surfacing it on every asset row turned the owner's own registry
  into a constant death reminder — against the warm, non-morbid voice. The whole asset row is now a
  tappable link into the asset detail (view / edit / archive) instead. The `common.viewRecovery` string
  is kept for the heir claim surface (`/klaim/[token]`), where a recovery guide belongs.

## [0.11.0] — Admin back-office: auth, MFA, shell & dual-control review

Stands up the hardened internal back-office surface (`apps/admin`) — staff sign-in, enforced MFA,
and the claim-review workflow with two-person release approval. Internal surface only; fully
separate from owner/heir auth (the three never cross). No owner/heir tokens touched, and **no
release happens here** — approval only advances a claim to `approved` (the release engine arms later).

### Added (Brief #9c-i — Auth, MFA & shell)
- **`wrs_staff` allowlist + RBAC** (migration `2026-06-21_0010_staff.sql`): `email` PK, `role`
  (`reviewer` | `admin`), `active`. RLS enabled in the same migration — a signed-in staff member can
  read **only their own row** (`lower(auth.jwt() ->> 'email') = email`); no insert/update/delete
  policy, so writes are service-role only.
- **Staff sign-in** via email magic-link restricted to the allowlist. `sendMagicLink` only sends to
  active staff and always redirects `?sent=1`, so the form never leaks who is/isn't staff.
- **Enforced TOTP MFA (AAL2)** — `/mfa/enroll` (first-time) and `/mfa` (step-up). Access is gated in
  **middleware** (session + allowlist + AAL2), not just UI; the locked `(ops)` shell re-checks
  `getStaff()` + `hasAAL2()` as defense in depth.
- Service-role client is `server-only`; the browser/SSR path uses the RLS-bound anon key.

### Added (Brief #9c-ii — Review queue, claim detail & dual-control)
- **Review queue** (`/antrean`) — `under_review` / `approved` / `waiting_period` claims, oldest first.
- **Claim detail** (`/klaim/[id]`) — owner/claimant identity, NIK-match result (flagged "perlu
  tinjauan manual" when unmatched), and death-cert / KK documents shown via **short-lived (120s)
  signed URLs** — never public.
- **Dual-control approval** — quorum is **two distinct staff** (`wrs_release_approvals` unique
  `(request_id, admin_id)` + a distinct-count check); a self double-approve is blocked. A single
  reject moves the claim to `rejected` (conservative bias). Every decision and the quorum event are
  audited to `wrs_events`. All reads/writes go through service-role inside server actions on the
  AAL2-gated admin surface.

### Notes
- `apps/admin` gains a `@supabase/ssr` dependency and a `NEXT_PUBLIC_SUPABASE_ANON_KEY` env var
  (fill in Vercel + local `.env.local`).
- Migration `0010_staff.sql` is **written but not yet applied** — run it against the dev DB before use.

## [0.10.4] — Shell & shared-component visual refresh

Design pass on the app frame and shared UI primitives — moves Warisly off the generic dark-admin
look toward a warm "bound-ledger" aesthetic. No schema change, no logic change.

### Design
- **Navigation rail reworked.** Replaced the dark navy gradient slab with a flat parchment spine
  (`bg-parchment`) continuous with the page paper. The active item is now a clean inverse-filled pill
  (ink pill on the parchment rail, cream pill on the ink rail) — the old left color-stripe + tinted
  highlight (a generic admin-template tell) is gone. A second refined solid-ink variant ships behind
  the `RAIL_VARIANT` flag in `AppShell.tsx` — flip one constant to compare.
- **Cobalt fully retired across the app.** Every page and form swept off `nyala`: primary buttons →
  ink (`bg-tinta` + cream text + `hover:bg-tinta-hover`), action links → gold (`text-emas`), input
  focus rings → gold. No `bg-nyala` / `text-nyala` / `focus:border-nyala` remain anywhere.
- **All card surfaces warm + flat.** Inline `bg-white` card/field surfaces → `bg-panel`; `shadow-sm`
  removed from cards (lift comes from tone + hairline border, not elevation). Print views keep white.
- **Cards are flat, warm paper.** `Card` uses `bg-panel` (warm off-white) with a hairline
  `paper-edge` border and no drop shadow — lift comes from tone, not elevation.
- **Estimates read like ledger entries.** `Estimate` figures are set in Fraunces (`font-display`)
  with tabular numerals.
- **Freshness chip de-genericised.** Stale state swapped off raw Tailwind `amber-*` onto warm brand
  gold (`emas`).
- New tokens: `panel`, `parchment`, `tinta.hover`, `emas.ink`, `emas.glow`, `paper.line`.

## [0.10.3] — Security hardening (audit follow-up)

Code-only fixes from a security audit of the heir edge, webhooks, and config. No schema change.

### Security
- **Heir status page no longer over-reads.** `/klaim/[token]` now uses a new minimal
  `getReleaseStatusByToken` (status only) instead of the full request row — the anonymous,
  token-gated page is no longer handed pre-release claimant identity / matched-recipient /
  document-path fields.
- **eKYC webhook is now idempotent / replay-safe.** `markEkycResult` guards the transition with
  `.eq("status","created")`, so a replayed (or reordered) signed webhook updates zero rows and can no
  longer re-apply a `verified`/`release_eligible` result. Duplicates are logged as `ignored_duplicate`;
  each genuine pass/fail now writes a `wrs_events` audit entry.
- **WhatsApp media fetch hardened against SSRF/token exfiltration.** Media IDs are validated numeric;
  the Graph-returned download URL is pinned to Meta CDN hosts over HTTPS with `redirect: "manual"` and a
  size cap before the bearer token is attached.
- **Release config fails closed.** `getReleaseConfig` now throws if the safety-critical `wrs_settings`
  rows (waiting period / ping channels / quorum) are missing, instead of silently falling back to
  hardcoded defaults (the old fallback also contradicted the seeded `max`).
- **Token leakage / log hygiene.** `Referrer-Policy: no-referrer` on `/klaim/*` and `/wali/*` so URL
  bearer tokens don't leak via referrer; error logging in intake, eKYC start, and the eKYC webhook now
  records the error class only — never raw upstream bodies that can echo PII/identifiers.

## [0.10.2] — Prototype-aligned screens: beranda, assets, amanah, dosier, rilis, profil, heir (presentational)

Continues the all-surfaces prototype port (same tokens, no rebrand). Owner + heir surfaces only.

### Changed (UI — owner)
- **Beranda** is now a dashboard: welcome eyebrow + "Semuanya tercatat." headline + map lede; an
  **estimated-total-value stat card** (sums non-liability assets) paired with a **"Tersegel & aman"
  Seal mini-card**; a freshness reminder banner when any asset is stale; and a **"Aset terbaru"
  row-list** (badge, provider, sealed chip, value) with "Lihat semua" + recovery/add actions. Cold-start
  state preserved.
- **Aset list / detail**: white row-list cards with category badges, serif provider, sealed/freshness
  chips, right-aligned `Estimate`, and Assets/Debts sections.
- **Amanah**: list-first — quorum pill, recipient/trustee **person rows with avatars + status pills**,
  faraid/wasiat info notes; add-forms collapsed behind native `<details>` disclosures (no JS).
- **Dosier**: per-provider **navy Seal header cards** + **numbered claim-step cards**; print-friendly
  (`print:` overrides keep it white/bordered on paper).
- **Rilis**: Clock-medallion waiting-period card + **channel toggle switches** + quorum note (form
  field names/values preserved exactly).
- **Profil**: KYC medallion (green check / shield) + dashed-gold privacy note + release-rule link card.

### Changed (UI — heir, public)
- **Klaim status** (`/klaim/[token]`): centered card with a **progress timeline** (documents →
  identity → review → released) driven by the existing release statuses; **upload tiles** (drag-target
  style with done-state) replace bare file inputs in `ClaimDocsForm`.
- **Trustee invite** (`/wali/[token]`): heir-card layout with greeting, dashed-gold reassurance, accept.

### Changed (shared)
- `@warisly/ui` `Card` upgraded to solid white, `rounded-2xl`, `shadow-sm`, `p-5` (propagates to all
  card-using screens).
- `assetCategories` icon mapping used on beranda recent-assets.

### Fixed
- Phone-mockup fidelity: generalized the `.phone-frame` stacking override to a reusable `frame-stack`
  class so multi-column grids (asset form, beranda summary) stack inside the ~400px mockup and on real
  <640px devices, while staying multi-column on real desktop.

### Added (i18n keys, id + en)
- `beranda.{welcome,headline,mapLede,totalValue,totalValueSub,sealedTitle,sealedSub,recentAssets,viewAll}`
- `klaim.{tlDocs,tlIdentity,tlReview,tlReleased}`

### Notes
- The back-office **admin surface** in the prototype was intentionally NOT built — it drives the
  safety-critical release engine (dual-control, audit, dead-man's-switch) and must be a brief-driven
  effort with the real backend, not a presentational port.
- Live verification used a seeded test owner (assets/trustees/recipients/wishes + KYC verified). The
  heir **status timeline** was verified via typecheck/build only — writing to `wrs_release_requests`
  (release engine) is gated and was not performed.

## [0.10.1] — Prototype-aligned shell + asset form (presentational)

Brings the live owner app up to the all-surfaces prototype (same design tokens, no rebrand).

### Changed (UI — `AppShell`)
- **Dark navy rail** on desktop (`bg-gradient from-tinta to-#1a2040`): Seal + wordmark, six nav
  entries (Beranda, Aset, Amanah, Dosier, Aturan rilis, Profil) with gold active-state
  (left border + tint + `#cda35a` icon), `ink-muted` inactive with hover, and a footer sign-out.
- Added a slim **topbar with a route breadcrumb** on desktop.
- Restyled the **mobile bottom nav** (4 items: Beranda/Aset/Amanah/Profil) on `kertas/95` blur.
- **Kept the Desktop/Mobile toggle and the phone mockup** (`DeviceFrame`) — the mobile mode still
  renders the centered phone bezel with its own bottom nav.

### Changed (UI — `AssetForm`)
- Form now sits in a **white card grouped into eyebrow'd sections** (Tentang aset / Nilai & catatan /
  Penerima manfaat di penyedia), with a 2-column type+provider grid, **custom-styled selects**
  (chevron, focus ring), a **dashed-gold "no password" reassurance**, and a bordered action row
  (`✓ Simpan` + `Batal`).

### Fixed
- Phone-mockup fidelity: viewport-based `sm:` prefixes key off the desktop viewport, not the ~400px
  frame, so the type+provider grid used to stay 2-column (cramped) inside the mockup. Added a scoped
  `.phone-frame .asset-grid` override so it stacks in the mockup (and on real <640px devices) while
  staying 2-column on real desktop.

### Added (i18n keys)
- `nav.dosier`, `nav.releaseRule`; `assets.form.section{About,Value,Beneficiary}`; `common.cancel`
  (both `id` + `en`).

## [0.10.0] — Bilingual surface (Bahasa + English) with language toggle

### Added (i18n — no schema change; `wrs_owners.locale` already existed from Brief #1)
- **next-intl** (cookie-based, no URL routing). `src/i18n/request.ts` resolves the active locale
  from a `locale` cookie (default `id`) and loads `messages/{id,en}.json`; `next.config.ts` wraps the
  config with `createNextIntlPlugin`; `app/layout.tsx` is now async and wraps the tree in
  `NextIntlClientProvider` with `<html lang={locale}>`.
- Full bilingual dictionaries `messages/id.json` + `messages/en.json` covering every owner/heir
  surface (landing, masuk, beranda, assets + form + categories, drafts, amanah, wali, waliConfirm,
  profil, rilis, dosier, klaim, nav, common).
- **Language toggle** on `/profil` (`components/LanguageToggle.tsx`) — Indonesia / English.
  `actions/locale.ts#setLocaleAction` sets the `locale` cookie, persists to `wrs_owners.locale` when
  signed in (`@warisly/db#setOwnerLocale`), and revalidates the layout. Verified live: the whole
  surface flips ID↔EN and persists across navigation + reload (cookie **and** DB).

### Changed
- Every owner/heir page and shared component now renders via `t()` instead of hardcoded Bahasa /
  the `@warisly/lib` `copy` object: `AppShell` nav, auth (`masuk` + `actions/auth.ts`), claim
  (`klaim` + `actions/claim.ts` + `ClaimDocsForm`) — server actions now return error **codes** that
  the client maps to translated strings. `@warisly/ui` `Estimate`, `FreshnessChip`, `SealedChip`
  accept optional label props (Bahasa defaults preserved).
- `src/lib/categories.ts` no longer exports `assetCategoryLabel`; it exports the ordered
  `assetCategories` key array, with labels resolved at call sites via `t(\`assets.categories.${k}\`)`.
- Bumped `apps/web` to `0.10.0` (was a stale `0.1.0`), aligning `package.json` with the CHANGELOG.

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
