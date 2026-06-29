# Changelog

All notable changes to Warisly. Semantic versioning `MAJOR.MINOR.PATCH`.

## [web 0.17.3] — Full-bleed portrait live scanner

The live scanner now fills the phone screen in portrait instead of showing a letterboxed
landscape band — the right shape for the screenshots and documents owners actually scan.
**UX-only. No schema, RLS, API, release-engine, or no-access change.** Pixels are still
analysed and downscaled on-device; nothing leaves the phone until the same confirmed
extraction.

### Changed
- **`CameraScanner` preview is now `object-cover` (full-bleed portrait).** The frame is
  cropped to the visible portrait slice consistently across all three uses: the preview,
  the edge-detection analysis (so the gold guide and auto-capture match what's on screen),
  and the saved still (so the capture is what the owner framed, not the wider sensor
  frame). A shared `coverCrop()` computes that slice.
- **Requests a higher-res rear frame** (`width 1920` / `height 1080`, `aspectRatio 9/16`)
  so the cropped portrait strip stays sharp. Browsers that ignore the hints just return
  their native orientation, which the cover-crop handles either way.
- **`frameToDownscaledBase64`** gains an optional source `crop` so the capture can grab
  just the on-screen region (canvas output still carries no EXIF).

## [web 0.17.2] — Center "add asset" button on the mobile bottom bar

The mobile bottom bar now leads with the action owners take most: a raised gold **+
Tambah** button floats in the center between the two pillars (Beranda · Aset), linking
straight to the single add-asset screen (`/aset/pindai`). **UX-only. No schema, RLS,
API, release-engine, or no-access change.**

### Changed
- **`BottomNav`** — restructured to a three-slot bar (left pillar · raised add FAB ·
  right pillar). The center button is a gold circle with a `+` glyph that rises above
  the bar (with a `ring-kertas` halo so it reads as floating) and a "Tambah" label,
  wired to `/aset/pindai`. Desktop is unaffected (the bar is mobile/preview-only).
- **`nav.add`** copy added (`id`: "Tambah", `en`: "Add"). Labelled "Tambah" rather than
  "Aset" to avoid duplicating the asset-list tab beside it.

## [web 0.17.1] — One screen to add an asset (scan · upload · manual)

Adding an asset is now a single step. The separate method picker is retired: every
"Tambah aset" entry lands straight on the capture screen, which now offers all three
options as one-tap tiles — **Pindai langsung** (live scanner, recommended), **Unggah
dari galeri**, and **Isi manual**. **No schema, RLS, API, or product-behaviour change.
No new credential or account-access path — the no-access promise is intact.** All paths
still produce a draft the owner confirms before anything is saved (Cardinal 6).

### Changed
- **`/aset/pindai` is the single "Tambah aset" screen.** `ScanCapture` gains an optional
  `manualHref` that renders a third "Isi manual" tile (→ `/aset/baru/manual`); the live
  scan tile carries a "Disarankan" badge. Page retitled "Tambah aset".
- **Every add-asset entry point** (beranda ×2, asset-list header) now links directly to
  `/aset/pindai`, removing the intermediate picker tap.
- **`/aset/baru` now redirects to `/aset/pindai`** — the two-tile picker from 0.15.1 is
  gone; `/aset/baru/manual` is unchanged. Gallery and manual must open from a direct tap,
  so a single in-place screen is genuinely the fewest steps (no deep-link auto-open).

## [web 0.17.0] — Two-pillar navigation with avatar account access

Primary navigation is now just the two pillars an owner returns to — **Beranda** and
**Aset**. Account-level, set-once concerns (Amanah, release rule, identity, language)
move behind the profile avatar at the foot of the desktop rail and in a new slim mobile
top bar, both linking to `/profil`. **No schema, RLS, API, release-engine, or
no-access change — this is pure information architecture.** Amanah, release rule, and
the `/amanah` + `/rilis` routes are untouched and still reachable; they're just entered
from the account hub now instead of the nav.

### Changed
- **`AppShell`** — `NAV` trimmed to Beranda + Aset. The desktop rail's sign-out footer
  is replaced by an avatar (real initials from `wrs_owners.full_name`, falling back to a
  user glyph) that links to `/profil` and lights up for the whole account area
  (`/profil`, `/amanah`, `/rilis`). Sign-out continues to live on the profile page.
- **`profil`** — now an account hub: an Amanah card (→ trustees, heirs, wishes) sits
  above identity verification, release rule, and language. Page title broadened to
  "Akun" / "Account".

### Added
- **Mobile top bar** — a slim Seal-and-avatar header (shown on small viewports and in
  the phone preview) so the account hub is reachable without a Profile nav tab.
- **`getOwnerIdentity`** (`@warisly/db`) — RLS-bound read of the owner's non-secret
  `full_name` + `phone` for the avatar. No account-access data.

## [web 0.16.0] — Live scanner with edge-detection auto-capture

The asset scan now opens a real camera preview that finds the document's edges and
captures on its own once the frame is sharp, filled, and held steady. **No schema,
RLS, API, or product-behaviour change. No new credential or account-access path — the
no-access promise is intact.** The still is downscaled on-device (stripping EXIF/GPS)
and still runs through the same extract → review → confirm flow, so nothing is saved
until the owner confirms (Cardinal 6).

### Added
- **`CameraScanner`** — a full-screen live camera (`getUserMedia`, rear lens) that runs
  an in-browser Sobel edge detector on each frame (`lib/edge-detect.ts`, a pure,
  dependency-free analyser on a 192px downscaled copy). A gold guide snaps to the
  detected document; when the frame is in focus, fills the view, and the hand is steady
  for ~0.5s it auto-captures. A manual shutter and a torch toggle (where supported) are
  always available. All pixel analysis is local — nothing is uploaded until the
  confirmed extraction, same as before.
- **`frameToDownscaledBase64`** in `lib/image.ts` — downscales a `<video>`/canvas frame
  to ≤1600px JPEG (canvas output carries no EXIF), mirroring the existing file path.

### Changed
- **`ScanCapture` now leads with "Pindai langsung" (live scan)** when `getUserMedia` is
  available, with gallery upload alongside it. Devices without camera-stream support
  fall back to the previous `<input capture>` tile, so the flow still works everywhere.

## [web 0.15.2] — Loaders on the login screen

Extends the 0.15.0 loading layer to `/masuk`. UX-only. **No schema, RLS, API, or
product-behaviour change. No new credential or account-access path — the no-access
promise is intact.**

### Changed
- **Sign-in buttons now show an inline spinner while submitting** and disable to
  block double-submits. Phone "Kirim kode" and OTP "Verifikasi" reuse their
  existing `pending` state; the dev bypass and dev email-login forms (direct
  server actions) use `SubmitButton` (`useFormStatus`). Primary buttons also pick
  up the same subtle press-scale used app-wide.

## [web 0.15.1] — One "Tambah aset" with a scan-or-manual picker

Adding an asset now starts with a choice instead of two competing header buttons.
**No schema, RLS, API, or product-behaviour change. No new credential or
account-access path — the no-access promise is intact.** Both paths still produce
a draft the owner confirms before anything is saved (Cardinal 6).

### Changed
- **`/aset/baru` is now a method picker** — two tiles: **Pindai** (recommended;
  routes to the existing `/aset/pindai` scan flow) and **Isi manual** (the
  existing `AssetForm`, moved to `/aset/baru/manual`). Surfaces the lower-friction
  scan path as the default while keeping manual one tap away — important for
  assets with no screenshot (physical gold, property, debts).
- **Asset list header trimmed** from three buttons to two: the standalone
  "Pindai" button is gone (now inside the picker); "Tambah aset" → the picker,
  "Lihat panduan" unchanged. Every "add" entry point (beranda included) routes
  through the same picker.
- Reuses the existing no-access reassurance copy on the picker screen.

### Added
- `assets.chooser` copy block in `id`/`en` (Bahasa-first, warm, non-morbid).

## [web 0.15.0] — Loading states + premium motion layer

UX-only polish: the app now tells you when it's working, and content settles in
instead of snapping. **No schema, RLS, API, or product-behaviour change. No new
credential or account-access path — the no-access promise is intact.**

### Added
- **Top progress bar on navigation** (`nextjs-toploader` in the root layout). A
  2px lit-fuse bar — no spinner — gives instant "we heard you" feedback on every
  route change: a gold gradient trail brightening to a white-hot tip, with a
  flickering amber-ember spark at the leading edge (styled via `#nprogress` in
  globals.css, gated behind `prefers-reduced-motion`). Keeps a slow load visibly
  burning rather than looking parked near the end.
- **Route skeletons** — `loading.tsx` for `/beranda`, `/aset`, `/dosier`, and
  `/profil`. While each page's data loads, a shimmer placeholder that mirrors the
  real layout streams in (Suspense), so the page lands without shifting (no CLS).
- **`Skeleton` primitive** (`@warisly/ui`) — parchment base with a slow, soft
  sweep in the warm-paper palette. Decorative, hidden from the a11y tree.
- **`SubmitButton`** — reflects the parent `<form action>` pending state via
  `useFormStatus`: shows an inline spinner and disables to block double-submits.
  Wired into the asset form and the profile (verify / sign-out) forms.
- **Inline spinners** on the AI/OCR waits where "is it loading?" hurt most: KTP
  scan (reading / saving), asset scan capture + review, and claim-doc upload.

### Changed
- **Shared `Button`** gains a `loading` prop (inline spinner + auto-disable) and a
  subtle press-scale (`active:scale-[0.98]`).
- **Page entrance + list stagger** — pages gently fade in on navigation; asset
  lists and the home summary reveal their rows in a soft stagger.

### Accessibility
- A global `prefers-reduced-motion` guard neutralises all animation/transition
  while keeping content (and skeletons) fully visible.

## [web 0.14.6] — Allow the dev bypass on the production deployment (POC)

Dev-login posture change for the POC. No schema or RLS change.

### Changed
- **`devLoginAllowed()` is now gated solely by `DEV_LOGIN_BYPASS=1`** — the previous hard block on
  `VERCEL_ENV === "production"` is removed. Reason: the project's only public URL during the POC
  (`warisly-web.vercel.app`) IS the production deployment, so the bypass was unreachable there
  (`/masuk?error=disabled`). The bypass now runs wherever `DEV_LOGIN_BYPASS=1` is set, including
  production.
- ⚠️ **Trade-off:** a password-bypass login is now reachable on the public production URL by
  anyone who knows a seeded number. **Unset `DEV_LOGIN_BYPASS` (or set `0`) in the production env
  before a real launch.** Still Warisly's own auth only — no external-account access, no stored
  credentials (no-access promise intact).

## [web 0.14.5] — Fix dev bypass login on Vercel (production build)

Dev-only bugfix, **non-production**. No schema, RLS, or product-behaviour change.

### Fixed
- **Dev "Masuk cepat tanpa OTP" now works on Vercel.** The quick-login button invoked the
  `signInBypass` server action directly from an `onClick` handler; a `redirect()` from a
  directly-invoked action doesn't navigate in a production build (it only "worked" under the more
  forgiving `next dev`). Replaced it with a real `<form action={signInBypass}>` submit (the same
  mechanism the email-login popup already uses), so the post-login redirect navigates correctly in
  the Vercel build. The phone field is carried via a hidden input synced to the visible field.
- **Dev-login failures are now visible.** Both dev sign-in paths redirect to `/masuk?error=…` on
  failure but the page never displayed it (silent reload). `/masuk` now reads the `error` query
  param and shows a message — `disabled` (gate off in this environment) vs `invalid` (bad
  credentials / dev user not seeded) — making Vercel misconfig diagnosable instead of silent.

## [web 0.14.4] — Security review hardening

From a security review of the POC. No schema, RLS, or product-behaviour change — log/PII
hygiene and input-robustness only.

### Fixed
- **No PII in error logs (no-access posture):** the LLM and STT clients (`lib/llm.ts`) no longer
  fold the upstream API response body into the thrown `Error` — that body can echo back the
  request (a KTP image, a financial screenshot, or intake text). Errors now carry the HTTP
  status only. The WhatsApp webhook's background-structuring `catch` now logs the error **class**
  (`e.name`) instead of the raw error object, so a thrown LLM/STT error can't carry intake PII
  into Vercel logs.
- **Token-format guard on public/token-gated lookups:** `getReleaseStatusByToken` (claim) and
  `getTrusteeByToken` / `confirmTrusteeByToken` (deputy) now validate the UUID shape before
  querying, so a malformed token returns null/false (→ `notFound`) instead of raising a Postgres
  `invalid input syntax for type uuid` error that surfaced as an unhandled 500. Matches the
  guard already present on `resolveOpenClaimByToken`.

## [web 0.14.2] — Dev login bypass for the POC

Dev-only convenience, **non-production**. No schema, RLS, or production-behaviour change.

### Added
- **"Bypass number" sign-in on `/masuk`** (`signInBypass`): type a phone number and go
  straight to `/beranda`, no SMS round-trip — for the POC. The team can demo the owner app on
  the deployed preview without an SMS provider configured.
- **Offline seed script** `packages/db/scripts/seed-dev-user.mjs` (`pnpm --filter @warisly/db
  seed:dev-user +62…`) to create/refresh the dev user. It is the only thing that uses the
  service-role key, and it is an offline script — **not** a request path.
- **Comprehensive demo content** seeded for the dev owner by default (pass `--no-content` to
  skip): a verified, release-eligible "Budi Santoso" profile with a release rule, 18 assets
  across most categories (incl. liabilities), 3 trustees (quorum met), 4 recipients, 3 wishes,
  and 2 pending WhatsApp intake drafts. Re-running resets this fixture to a known state. All
  rows are written via the service-role client in the offline script (RLS bypass is expected
  there); only non-secret identifiers are stored — no passwords/PINs/seed phrases.

### Safety / no-access posture
- The bypass signs in with the **anon client** (`signInWithPassword`); the service-role key
  **never** touches the login request path (keeps RLS the permission spine).
- Triple-gated so it can never authenticate on production: hard block when
  `VERCEL_ENV === "production"`, requires explicit `DEV_LOGIN_BYPASS=1` (never set in prod), and
  the UI only renders when `NEXT_PUBLIC_DEV_LOGIN=1`. No passwords/tokens for any external
  provider are stored — this is Warisly's own auth only.
- `signInPassword` (existing email dev login) moved to the same gate, so both dev paths share
  one switch and both work on Vercel preview.

### Changed
- New env vars (dev-only, documented in `.env.example` and `turbo.json`): `DEV_LOGIN_BYPASS`,
  `DEV_LOGIN_PASSWORD`, `NEXT_PUBLIC_DEV_LOGIN`, `NEXT_PUBLIC_DEV_LOGIN_PHONE`.

## [web 0.14.1 · admin 0.11.1] — Fix Vercel build under Turborepo strict env mode

Build-only fix, no product, schema, or RLS change. Both Next.js apps failed to build on Vercel
because Turborepo 2.x runs tasks in **strict environment mode** by default: the `build` task was
handed none of the Supabase / WhatsApp / eKYC / OpenAI env vars, so `@supabase/ssr` client
creation (`/mfa/enroll` prerender) and the env Zod parse (`/api/ekyc/webhook` page-data
collection) threw on `undefined`. Local builds were unaffected because Next.js reads `.env.local`
from disk; Vercel injects env only into the process environment, which Turbo then filtered out.

### Fixed
- **web:** made the env Zod validation lazy in `src/lib/env.server.ts` and `src/lib/env.ts` — the
  schema is now parsed on first property access (request time) via a memoized `Proxy`, never at
  module import. `next build` collects page data by importing route modules, so the previous
  eager top-level `.parse()` crashed the whole build whenever a server secret was absent. A
  webhook secret is never needed to *build* the app, only to serve a request, so the build no
  longer depends on runtime secrets at all. Verified by building with `.env.local` removed.
- Declared every build-time env var in the `build` task's `env` key in `turbo.json`, so Turbo
  passes them through to `next build`. This is still required for the `NEXT_PUBLIC_*` vars, which
  Next.js inlines into the client bundle at build time — those values must be set in Vercel
  Project Settings for Production + Preview. Server-only secrets are now read at request time and
  no longer gate the build.

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
