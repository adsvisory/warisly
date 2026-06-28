# Warisly — App Documentation

*Features, capabilities & functions — as actually built.*

> Versions at time of writing: **web `0.14.4`**, **admin `0.11.1`**.
> This document describes the implemented system. Items still on the roadmap are flagged **(Phase 2)**.

---

## 1. What Warisly Is

Warisly is a **no-access digital inheritance registry for Indonesia**. An owner lists the digital
assets they hold — brokerage, e-wallets, banks, reksa dana, crypto, gold, insurance, BPJS,
pension, property, debts, and more — together with the steps and documents an heir needs to claim
each one. When the owner passes away, Warisly releases that listing — with a ready-to-use recovery
guide — to the heirs and deputies the owner chose.

### The Core Promise (the one rule everything defers to)

Warisly is a **map and a playbook, never a vault of keys.** It **never holds the ability to access,
move, or touch a user's money or accounts.**

- **DO store:** provider name, asset type, a non-secret identifier an heir needs (e.g. account
  email, the bank an RDN is linked to), an optional self-reported estimate (flagged as such),
  recovery-playbook references, owner free-text notes, deputy assignments, and release rules.
- **NEVER store:** passwords, PINs, OTPs, login tokens, security answers, biometric data, or
  anything that grants account access — ever, even "encrypted for convenience."

This guarantee is enforced in code (e.g. the scanner actively strips anything that looks like a
secret) and in the database permission model, not just in copy.

---

## 2. The Three Surfaces / Audiences

| Surface | App | Audience | Auth model |
|---------|-----|----------|------------|
| **Owner app** | `@warisly/web` | The person organizing their legacy | Phone/OTP login (Supabase Auth) |
| **Heir recovery** | `@warisly/web` (public routes) | The family claiming after a death | **None** — reachable by a plain web link, no install, no account |
| **Back-office (Ops)** | `@warisly/admin` | Internal Warisly staff | Email login + **mandatory MFA (AAL2)**, staff allowlist |

Plus one token-gated micro-surface: the **deputy/wali confirmation** page (no account, link only).

---

## 3. System Architecture

A pnpm + Turborepo monorepo with two Next.js (App Router, TypeScript) apps and three shared
packages, deployed on Vercel with Supabase as the backend.

```
warisly/
├── apps/
│   ├── web/      → owner app + public heir recovery + webhooks   (@warisly/web)
│   └── admin/    → internal back-office / release review console  (@warisly/admin)
├── packages/
│   ├── db/       → data-access layer (repositories) + types       (@warisly/db)
│   ├── lib/      → shared brand copy / vocabulary                 (@warisly/lib)
│   └── ui/       → design-system components (Seal, Card, Chip…)   (@warisly/ui)
└── supabase/migrations/  → the single source of schema truth (15 migrations)
```

### Layered architecture (strict)

```
Request → Route/Action → Service → Repository → (RLS) → Database → back up the chain
```

| Layer | Where | Responsibility |
|-------|-------|----------------|
| Routes / Server Actions | `apps/*/app/**` | HTTP/auth/parsing only — thin, no business logic |
| Services | `apps/web/src/services/`, `apps/admin/src/services/` | Business logic, orchestration, Zod validation |
| Repositories | `packages/db/src/data/` | Data access only (Supabase client), typed returns, RLS-aware |
| Workflows | *(Phase 2)* | Durable release/reminder jobs via Inngest/Trigger.dev |

### Stack

- **Next.js 15** (App Router) + **React 19** + TypeScript, **Tailwind** design system
- **Supabase** — Postgres + Row-Level Security + Auth + Storage (Singapore region)
- **next-intl** — Bahasa Indonesia first, English secondary
- **Zod** — validation on every input
- **WhatsApp Cloud API** — intake drop-box
- **OpenAI (`gpt-4o`)** — vision OCR + structured extraction; STT for voice notes
- **eKYC vendor** (Verihubs/Dukcapil-class) — owner & heir identity verification
- **Resend** (email) + local SMS gateway — notifications / release pings

---

## 4. Owner App — Features & Functions

The owner app lives behind phone/OTP login under the `(app)` route group, rendered inside a mobile
**device frame** with a bottom tab shell (Beranda · Aset · Amanah · Profil) and an in-app language
toggle.

### 4.1 Authentication
- **Phone / OTP sign-in** via Supabase Auth (the primary production path).
- **Dev-only login bypasses** for the POC (sign in by phone or email with no SMS round-trip),
  triple-gated so they can **never** activate on production (`VERCEL_ENV` block + `DEV_LOGIN_BYPASS`
  server flag + `NEXT_PUBLIC_DEV_LOGIN` UI flag). All dev logins use the anon client — the
  service-role key never touches a login path.
- An offline seed script (`pnpm --filter @warisly/db seed:dev-user`) provisions a demo owner
  ("Budi Santoso") with full sample content for demos.

### 4.2 Asset Registry (`/aset`)
The heart of the owner app — the inventory of everything the family would need to find.

- **List / view / add / edit / archive** assets and liabilities.
- **20-item canonical inheritance catalog** (config-driven, in `wrs_settings`), grouped into:
  *Keuangan digital* (bank, e-wallet, saham, reksa dana, SBN/obligasi, crypto, emas digital, P2P,
  investasi luar negeri), *Proteksi & jaminan sosial* (asuransi/takaful, BPJS, dana pensiun),
  *Bisnis & kreatif digital* (online business, domains, IP & royalti, poin/loyalitas, akun game),
  *Fisik & dokumen* (properti & kendaraan, barang berharga fisik), and *Utang & liabilitas*.
- Each catalog entry carries **awareness metadata** (bilingual): which "estate path" it follows
  (general estate / bypass-to-beneficiary / liability), claim-route hints, whether a beneficiary
  field is relevant, and a plain-language note on how it's inherited. This is *awareness only* —
  Warisly never computes inheritance shares or division.
- **Per-asset fields:** provider, owner's label/nickname, a non-secret identifier (account email
  etc.), optional self-reported value estimate (always rendered as "estimasi"), currency,
  beneficiary-set tracking, and a free-form `detail` (ownership share, co-owners, linked accounts).
- **Per-asset recovery notes** (migration `0015`) — owner-authored, *non-secret* instructions
  specific to that asset ("RDN is linked to BCA, ask for RM Budi at the Pondok Indah branch; the
  physical gold is in safe-deposit box #123"). The form carries an explicit "never your password"
  warning.
- **Freshness tracking** — assets are flagged *Terkini* (fresh) or *Perlu ditinjau* (needs review)
  based on a 6-month staleness window; the registry summarizes fresh/stale counts.
- **Two-step archive confirmation** — archiving is a deliberate disclosure + warm-danger confirm,
  because from the family's side a removed asset disappears from the recovery map.

### 4.3 Intake & AI Structuring
Three PUSH-only ways to get an asset into the registry. Warisly **never** browses or connects to a
user's inbox or accounts — all intake is user-initiated.

**a) WhatsApp drop-box** (`/api/whatsapp/webhook`)
- Owner sends a text, voice note, or photo to Warisly's WhatsApp number.
- Webhook verifies the Meta signature, is **idempotent** on the WhatsApp message ID, responds fast,
  then structures the message in the background.
- **Text** → LLM structured extraction. **Voice note** → speech-to-text → extraction.
  **Image** → vision-model extraction.
- The result becomes a **draft** (`/aset/draf`) with **per-field confidence scores**; fields below
  the configured threshold are flagged *"belum yakin"* for the owner to check.
- **Nothing is saved until the owner explicitly confirms** the draft.

**b) Camera / screenshot scan** (`/aset/pindai`)
- Capture or upload an image; a vision model extracts a draft asset (provider, identifier, value).
- **Cardinal no-honeypot rule, enforced in code:** the image is classified as a
  *financial-account screenshot* vs an *offline document*. Screenshots are extracted in memory and
  **dropped** — never stored. Only offline-document photos are retained (private, owner-scoped
  bucket).
- Any identifier matching a secret pattern (`password`, `PIN`, `CVV`, `OTP`, `sandi`…) is
  **stripped** — both on extraction and again on save, even after manual edits.
- Owner reviews the draft and confirms before it's written.

**c) Manual web form** (`/aset/baru`, `/aset/[id]/edit`) — the always-available direct entry path.

### 4.4 Recovery Dossier (`/dosier`)
The owner's preview of exactly what their family will receive.

- Assembles every active (non-archived) asset and matches it to a **recovery playbook**.
- **Playbook matching:** by normalized provider key first (e.g. "ajaib", "bca", "gopay"), falling
  back to a category-level generic playbook.
- Playbooks are **versioned data** in `wrs_playbooks` (steps + required documents), never hardcoded
  — updating a provider's process is a data edit, not a deploy.
- **Consolidated document checklist:** merges a base set every family needs (Akta Kematian, Kartu
  Keluarga, Surat Keterangan Ahli Waris, KTP Ahli Waris) with each asset's playbook-specific docs,
  de-duplicated.
- Liabilities are listed separately. The dossier is **printable** (print button).

### 4.5 Amanah — People & Trust (`/amanah`)
Who acts, who receives, and what the owner wants said.

- **Trustees / Wali** (who *act*): name + contact (WhatsApp/phone/email), primary vs backup role.
  Each gets a unique **confirmation token**; status moves invited → confirmed/declined.
  A configurable **quorum** (default 2 of 3) governs how many confirmed trustees are needed.
  The page shows whether quorum is met.
- **Recipients** (who *receive*): name, relationship (pasangan/anak/orang tua/saudara/lainnya),
  optional NIK (16-digit validated; flagged for client-side encryption in Phase 2), a note, and a
  **visibility** setting — *now* vs *after_death* — that the database enforces.
- **Wishes / Wasiat:** free-text informational messages to the family.

### 4.6 Deputy / Wali Confirmation (`/wali/[token]`)
- A public, token-gated page (no account) where an invited trustee accepts their role with one tap.
- Reassures up front: *"Kami tidak pernah minta password Anda."*
- Token shape is validated before any DB query (malformed → not-found, no 500 leak).

### 4.7 Identity Verification — eKYC (`/profil` → eKYC flow)
- Owner starts a verification session; Warisly redirects to the vendor and receives an **async
  signed webhook** (`/api/ekyc/webhook`) with pass/fail.
- On pass: stores the Dukcapil-confirmed NIK + vendor reference, sets `kyc_status = verified`, and
  makes the owner **release-eligible**.
- **Only the eKYC callback** can set verified state. Result metadata stores pass/fail only —
  **never raw biometrics**. Idempotent against replayed webhooks.

### 4.8 KTP OCR Pre-fill (`/profil/ktp`)
- Owner photographs their KTP; a vision model reads **only NIK / name / DOB** (address, religion,
  marital status etc. are explicitly ignored).
- The image is OCR'd **in memory and dropped** — never uploaded or stored.
- The owner reviews/edits every field; the confirmed text is saved as an **unverified candidate**
  identity (`detail.candidate`, `status:'unverified'`). **OCR is not verification** — it sets no
  verified flag and arms no release; eKYC remains the sole authority.

### 4.9 Release Rule (`/rilis`)
- Owner configures their **dead-man's-switch parameters**: a **waiting period** (bounded by config,
  e.g. 7–30 days, default 14) and which **safety-ping channels** (WhatsApp/email/SMS) to use.
- Requires the owner to be **verified/eligible** first.
- All bounds come from `wrs_settings` — the service **fails closed** (refuses to proceed) rather
  than fall back to a hardcoded window if config is missing.

### 4.10 Home & Profile
- **Beranda** (`/beranda`) — overview/dashboard landing.
- **Profil** (`/profil`) — identity, eKYC entry, KTP pre-fill, PDP consent, locale.

---

## 5. Heir Recovery — Features & Functions

**The guarantee:** heir recovery works from a plain released web link. **No install, no account
creation, no login wall — ever.** The whole flow is authorized by a claim token, not a session.

### 5.1 Start a claim (`/klaim`)
- The heir enters the deceased's phone number to begin.
- **Privacy-by-design (no enumeration oracle):** a release request is materialized **only** when
  the heir actually uploads documents, and the response is **identical whether or not** the phone
  matches a registered owner. Nobody can probe whether a person is a Warisly user, and nobody can
  open a claim against a *living* owner just by knowing their number.

### 5.2 Submit proof (`/klaim/dokumen`)
- Upload **Akta Kematian** and **Kartu Keluarga** (PDF/JPG/PNG, ≤ 8 MB each).
- Files go to a **private** `release-docs` bucket (no public/authenticated read — service-role +
  signed URLs only).
- Re-submitting against an in-flight claim is a no-op (no storage flooding).

### 5.3 Heir KTP step (`/klaim/[token]/ktp`)
- Same KTP-OCR component as the owner, but **token-gated with no account**. Reads only NIK/name/DOB,
  image dropped after OCR, saved as an unverified candidate on the claim record.

### 5.4 Status & guide (`/klaim/[token]`, `/klaim/terkirim`)
- Token-gated claim status, and a confirmation/sent screen.
- After a verified release, the heir receives the **recovery dossier** — the asset map plus the
  step-by-step playbooks and document checklist — served via server-generated **signed URLs**
  (the heir never gets a standing account or direct DB access).

---

## 6. Back-Office (Ops) — Features & Functions

The internal console (`@warisly/admin`, separate Next.js app on port 3001) where staff review and
approve releases. Owner, heir, and staff auth **never cross**.

### 6.1 Staff auth & access control
- **Email login** + **mandatory MFA** — the Ops layout redirects to `/mfa` unless the session is
  **AAL2** (second factor satisfied).
- **Staff allowlist** (`wrs_staff`) with roles **reviewer** / **admin**; a signed-in staff member
  can read only their own row to resolve membership.

### 6.2 Review queue (`/antrean`)
- Lists active release requests awaiting review.

### 6.3 Claim detail & decision (`/klaim/[id]`)
- Full request detail with the uploaded Akta + KK rendered via **short-lived signed URLs** (120s).
- **Dual-control approval:** a release needs **two distinct approvers**. The first approval moves
  the request to `approved`; a single reject moves it to `rejected`. Every decision is written to
  the append-only `wrs_release_approvals` (unique per request+admin, forcing distinct approvers) and
  audited in `wrs_events` with the acting staff email.

---

## 7. The Release Engine — Dead-Man's Switch (safety-critical)

The single highest-stakes system. Two failure modes are both catastrophic — a **false positive**
(releasing a living owner's data) and a **false negative** (never releasing when needed). The code
is biased toward **staying sealed**.

### Estate states & claim state machine
- **Estate `release_state`:** `sealed → pending_release → released → locked`.
- **Claim `status`:** `initiated → documents_submitted → identity_verified → under_review →
  approved → waiting_period → released` (with `rejected` / `cancelled` branches).

### The safety gates (a release requires ALL of)
1. A claim opened by an heir via the claim link, with **death documents** (Akta + KK) submitted.
2. **Identity** corroboration (heir eKYC / NIK matched to a recipient) and back-office review.
3. **Dual-control:** two distinct admin approvers.
4. A **waiting period** during which Warisly **pings the owner** across their chosen channels.
5. **No owner response** within the window. *The owner responding at any point cancels the release.*

### Database-enforced safety (not just app checks)
- **Owners can never change their own `release_state`** — a trigger blocks it; only the
  service-role context (used by the engine) may transition it.
- **Post-release lock:** once an estate leaves `sealed`, triggers block the owner from
  inserting/updating/deleting their assets, trustees, recipients, or wishes — the record freezes.
- **Append-only audit:** every release-related action is recorded in `wrs_events`.

### Status
- **Phase 1 (now): release is manual / human-verified** through the back-office. There is no
  automated trigger in the MVP.
- **Phase 2:** the waiting-period + multi-channel ping + auto-cancellation become **durable
  workflows** (Inngest / Trigger.dev) — never cron, `setTimeout`, or polling.

---

## 8. Cross-Cutting Capabilities

### 8.1 Security model — RLS as the permission spine
- **Every** `wrs_` table holding user data has **Row-Level Security enabled** with policies shipped
  in the same migration that creates it.
- **Owner** sees/edits only their own rows; **deputies/heirs** get read access **only after a
  verified release**; **"now vs. after-death"** visibility is enforced by RLS keyed off release
  state, not by `if` checks in code.
- The browser/app uses the **anon key** and is bound by RLS. The **service-role key is server-only**
  and never used in a user-facing request path — only in trusted, narrowly-scoped server contexts
  (webhooks, the release engine, signed-URL generation, the offline seed script).

### 8.2 Observability (mandatory)
- **`wrs_api_log`** — every external call (LLM, WhatsApp, STT, vision, eKYC, email, SMS): provider,
  operation, status, latency, cost. Fire-and-forget. **On error only the error *class* is logged**,
  never the raw upstream body (which can echo back a KTP image or financial screenshot — PII).
- **`wrs_events`** — append-only audit trail for auth events, intake confirmations, deputy
  invites/confirmations, and every release action. Doubles as a UU PDP / compliance artifact.

### 8.3 Configuration (no hardcoded tunables)
- Waiting-period bounds, ping channels, trustee quorum, AI confidence threshold, base documents,
  and the 20-item asset catalog all live in **`wrs_settings`**.
- **Provider recovery playbooks** live **versioned** in `wrs_playbooks` — a playbook change is a
  data edit + version bump, not a code deploy.

### 8.4 Localization & copy
- **Bahasa Indonesia first**, English secondary (via `next-intl`), with an in-app and public
  language toggle.
- **Tone:** warm, calm, reassuring — never morbid or alarming. Leads with *"we never ask for your
  passwords"* (`Kami tidak pernah minta password Anda`). The "sealed until needed" / *Tersegel*
  vocabulary runs throughout.
- **Design language:** a "bound-ledger" aesthetic — ink + gold on warm paper, a wax-`Seal` motif.

### 8.5 Compliance (UU PDP / PSE)
- Hold the minimum; consent-based (`consent_pdp_at`); data export & deletion as data-subject rights.
- Residency: Supabase **Singapore** now, with the stack kept self-hostable on AWS/GCP **Jakarta** if
  onshore residency is required for a B2B2C partner.
- TLS in transit, AES-256 at rest; **client-side encryption for sensitive identifiers** (NIK,
  account numbers) is a flagged **Phase 2** fast-follow — until then, collection is minimized.

---

## 9. Data Model (tables — all `wrs_`-prefixed, all RLS-protected)

| Table | Holds |
|-------|-------|
| `wrs_owners` | Owner profile (1:1 with `auth.users`): name, phone, locale, KYC status, verified NIK, eKYC ref, release-eligible flag, **`release_state`**, **`release_rule`** (JSON), PDP consent, `detail.candidate` (unverified OCR identity) |
| `wrs_settings` | Global config: waiting-period bounds, ping channels, trustee quorum, AI threshold, base documents, **20-item asset catalog** |
| `wrs_events` | Append-only audit / domain event log (powers the owner transparency log) |
| `wrs_api_log` | External-call observability (internal only — no anon/authenticated access) |
| `wrs_assets` | The registry: category, provider, label, non-secret identifier, value estimate, beneficiary-set flag, freshness, `detail` JSON, **`recovery_notes`** |
| `wrs_intake_messages` | Raw inbound WhatsApp (service-role only; owners never read raw intake) |
| `wrs_asset_drafts` | AI-structured drafts awaiting owner confirmation, with per-field confidence |
| `wrs_playbooks` | Versioned provider/category recovery playbooks (steps + documents) |
| `wrs_trustees` | Deputies/wali: contact, role, status, confirmation token, quorum |
| `wrs_recipients` | Heirs: relationship, optional NIK, **now/after-death visibility** |
| `wrs_wishes` | Free-text wasiat / messages to family |
| `wrs_ekyc_sessions` | eKYC verification sessions (pass/fail only — no biometrics) |
| `wrs_release_requests` | The claim state machine: token, claimant, matched recipient, doc paths, waiting-until, `detail.candidate` |
| `wrs_release_approvals` | Dual-control approvals (unique per request+admin → forces 2 distinct approvers) |
| `wrs_staff` | Back-office allowlist + RBAC (reviewer/admin) |
| **Storage** | `release-docs` (private: Akta/KK), `wrs-documents` (private, owner-scoped: offline-document photos only) |

---

## 10. External Integrations

| Integration | Used for | Notes |
|-------------|----------|-------|
| **Supabase** | Postgres, RLS, Auth (phone/OTP), Storage | Anon key client-side; service-role server-only |
| **WhatsApp Cloud API** | Intake drop-box (text/voice/image) | Meta-signature verified, idempotent on message ID |
| **OpenAI `gpt-4o`** | Vision OCR + structured asset extraction; STT for voice | Every call logged; errors logged by class only |
| **eKYC vendor** | Owner & heir identity verification (Dukcapil-class) | Async signed webhook; stores pass/fail + NIK, never biometrics |
| **Resend** | Transactional email / release pings | |
| **Local SMS gateway** | SMS release pings | |
| **Inngest / Trigger.dev** | Durable release & reminder workflows | **(Phase 2)** |

---

## 11. Build, Run & Conventions

- **Package manager:** pnpm (workspace + Turborepo). `pnpm dev` / `build` / `lint` / `typecheck`
  run across the workspace.
- **Naming:** API/action schemas are **camelCase**; DB columns are **snake_case**; the route/action
  layer transforms camelCase → snake_case before calling services.
- **Migrations** are the only schema truth (`supabase/migrations/`, sequential). Every new
  user-data table ships with RLS + policies in the same migration; changes are additive-first.
- **Versioning:** semantic `MAJOR.MINOR.PATCH` per app, shown in the app footer, tracked in the
  `CHANGELOG.md`.

---

## 12. Roadmap (Phase 2)

- **Automated release engine** via durable workflows (waiting period, multi-channel pings,
  owner-response auto-cancel).
- **Client-side encryption** for sensitive identifiers (NIK, account numbers) — heir-decryptable
  without Warisly ever holding the key.
- **Email / document forwarding** as an additional PUSH intake channel.
- Expanded, provider-verified playbook library (current starter playbooks are placeholders pending
  verification of each provider's real heir process).

---

*This document reflects the codebase as built. Keep it in sync with the product spec, brand guide,
and `CHANGELOG.md` as the build evolves.*
