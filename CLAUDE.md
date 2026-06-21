# warisly -- Claude Code Instructions

## What This Is
Warisly is a **no-access digital inheritance registry for Indonesia**. Owners list the digital assets they hold (brokerage, e-wallets, banks, reksa dana, crypto, gold, insurance, property, debts) plus the steps and documents an heir needs to claim each one. When the owner passes away, Warisly releases that listing — with a ready-to-use recovery guide — to the heirs/deputies they chose.

Two surfaces, two audiences:
- **Owner app** — the person organizing their legacy (native app and/or web).
- **Heir recovery** — the family claiming after a death. **Always reachable by a plain web link. No install, no account creation, no login wall.**

---

## CORE PROMISE — READ FIRST (NON-NEGOTIABLE)

Warisly is a **map and a playbook, never a vault of keys.** The entire product, brand, and regulatory posture rests on one fact: **we never hold the ability to access, move, or touch a user's money or accounts.** Every decision in this codebase defers to that.

If a feature, shortcut, or "nice-to-have" would give Warisly (or anyone who breached our database) a way into a user's external account — it does not get built. No exceptions, no matter how it's framed.

---

## Stack
- Next.js (App Router) + TypeScript on **Vercel**
- **Supabase** — Postgres + Row-Level Security (RLS) + phone/OTP Auth + Storage
- **WhatsApp Cloud API** for intake (via a BSP; On-Premises API was sunset Oct 2025 — Cloud API only)
- **LLM** with structured (JSON) output + speech-to-text + vision model — AI structuring of intake
- **Inngest / Trigger.dev** — durable release & reminder workflows (Phase 2)
- Notifications: WhatsApp (primary) + **Resend** (email) + local SMS gateway
- Zod validation on all inputs
- pnpm package manager

---

## Layered Architecture (STRICT — ALL CODE MUST COMPLY)

| Layer | Location | Responsibility | Rules |
|-------|----------|---------------|-------|
| Routes / Actions | `src/app/api/**/route.ts`, server actions | HTTP/auth/parsing. Parse → call service → respond. | Thin. No business logic. No DB queries. |
| Services | `src/services/` | Business logic, orchestration, validation | No raw DB queries. No HTTP objects. May call repos, other services, workflows. |
| Repositories | `src/repositories/` | Data access only (Supabase client) | Queries only. Typed returns. **RLS-aware** (see RLS section). No business logic. |
| Workflows | `src/workflows/` | Durable jobs: release engine, reminders | Inngest/Trigger.dev only. Never naive cron/setTimeout. |
| Intake | `src/intake/` | WhatsApp webhook + AI structuring | Thin webhook → enqueue → service. PUSH only — never pulls from user inboxes/accounts. |

**Data flow:** Request → Route/Action → Service → Repository → (RLS) → Database → back up the chain.

---

## VIOLATIONS (never do these)

**Access / no-access (cardinal sins):**
- Store a password, PIN, OTP, login token, session cookie, security answer, or biometric — for ANY provider, anywhere, ever.
- Call a provider API to authenticate *as the user*, read balances by logging in, transact, or move money.
- Bypass, automate around, or "assist past" KYC / 2FA / face verification.
- Introduce any code path that lets Warisly — or an attacker holding our database — reach a user's external account.

**Heir guarantee:**
- Gate heir recovery behind an app install, account creation, or login wall. Heir recovery MUST work from a released web link.

**Data layer:**
- Raw/ad-hoc DB queries outside `src/repositories/`.
- Business logic inside route handlers / server actions.
- Use the Supabase **service-role key** in any user-facing request path (it bypasses RLS — see RLS section).
- A new user-data table without RLS enabled and policies in the same migration.

**Release engine:**
- Auto-release a record without the full safety gate (see Release Engine).
- Shorten/skip the waiting period or the owner-ping step in code.

**Intake / AI:**
- Save an AI-structured entry without explicit user confirmation.
- Browse, scrape, or connect to a user's inbox or accounts. Intake is always user-initiated PUSH.

**Observability & config:**
- Make an external call (LLM, WhatsApp, STT, vision, SMS, email) without observability wiring.
- Hardcode tunables (waiting periods, ping cadence, playbook content, template IDs).
- Write PII or sensitive identifiers into plaintext logs.

**Copy:**
- English-first UX, or morbid/alarming wording. Bahasa-first, warm, never about endings.

**VIOLATION of any item above → REJECT the change.**

---

## Table Prefix
All tables use the `wrs_` prefix. No exceptions.

## Naming Convention (MANDATORY)
| Layer | Convention | Example |
|-------|-----------|---------|
| Route/action schemas (API) | **camelCase** | `assetType`, `deputyId`, `releaseState` |
| DB columns | **snake_case** | `asset_type`, `deputy_id`, `release_state` |
| Service/repo internals | **snake_case** | `input.asset_type` |

The route/action layer transforms camelCase (API) → snake_case before calling services.

---

## The No-Access Guarantee — what we DO and DON'T store (CRITICAL)

**DO store:** provider/institution name, asset type, a non-secret identifier an heir needs (e.g., account email, the bank an RDN is linked to), approximate value (optional, self-reported, flagged as an estimate), recovery-playbook reference, owner free-text notes, deputy assignments, release rules.

**NEVER store:** passwords, PINs, OTPs, login tokens, security answers, biometric data, or anything that grants account access — even "temporarily," even "encrypted for convenience."

**Sensitive identifiers** (account numbers, etc.) belong in **client-side-encrypted notes that Warisly cannot read** (Phase 2 design — heir-decryptable without Warisly holding the key). Until that ships, minimize what is collected.

---

## RLS — The Permission Spine (CRITICAL)

Access control lives in the **database via Row-Level Security**, not in app code.

- **Every** `wrs_` table holding user data has RLS **enabled**, with policies shipped in the same migration that creates it.
- Access model:
  - **Owner** sees and edits their own records.
  - **Deputies** see only what's assigned to them, only in the state allowed.
  - **"Now vs. after-death"** visibility is enforced by RLS policies keyed off a **release state**, never by `if` checks in services.
- **Never** use the service-role key in a user-facing path. The browser/app uses the **anon key** and is bound by RLS. The service-role key is used only inside trusted server workflows (webhook processing, the release engine) with explicit, narrow scoping.
- Heir/deputy read access is granted **only after a verified release** (see Release Engine).
- For every new table, **test all four corners**: owner can / owner can't, deputy can / deputy can't, pre-release / post-release.

**VIOLATION: a table without RLS, or a service-role key in a user-facing route → REJECT.**

---

## Release Engine — the dead-man's switch (SAFETY-CRITICAL)

The single highest-stakes system. Two opposite failure modes are both catastrophic: a **false positive** (releasing a living owner's data) and a **false negative** (never releasing when it's needed). Bias the code toward **staying sealed**.

- **Phase 1: release is MANUAL / human-verified.** Do not build an automated trigger in the MVP.
- **When automated (Phase 2):** use **Inngest/Trigger.dev durable workflows** — delays, retries, cancellation. NEVER cron, `setTimeout`, or a polling loop.
- A release requires **ALL** of:
  1. A death report by an **authorized** deputy.
  2. A **waiting period** during which Warisly pings the owner across channels (WhatsApp, email, SMS).
  3. **No owner response** within the window.
  4. Confirmation (death certificate upload and/or multi-deputy confirmation).
- **When in doubt, do NOT release.** Fail-safe = sealed.
- The owner responding at any point **cancels** the release.
- Release actions are **append-only and audited** (`wrs_events`). After release, the record **locks** (no further edits).

**VIOLATION: any release path that skips a gate, shortens the window, or auto-releases without the full check → REJECT.**

---

## Intake & AI Structuring

- **Channels:** WhatsApp drop-box (text / voice note / photo / screenshot), manual web form, and (Phase 2) email/document forwarding. **All PUSH — user-initiated.** Warisly never browses or connects to a user's inbox or accounts.
- **AI structuring:** free-form input → structured **draft** entry → **user MUST confirm** before it is saved. Never auto-save a parsed entry.
- **WhatsApp webhook:** verify the Meta signature; keep the handler thin (validate → enqueue → process in a service/workflow). Idempotent on Meta message IDs.
- All LLM / STT / vision calls go through the observability wiring below.

---

## Observability (MANDATORY)

Every external call and every sensitive lifecycle event is recorded. No exceptions.

- **`wrs_api_log`** — every LLM, WhatsApp send, STT, vision, SMS, and email call: provider, endpoint, latency, cost (0 for free), status. Fire-and-forget.
- **`wrs_events`** — audit trail for auth events, intake confirmations, deputy invites/confirmations, and **every release-related action**. This doubles as a UU PDP / compliance artifact.
- **Never** log passwords (we hold none), sensitive identifiers, or full PII payloads in plaintext.

**VIOLATION: an external call without a log entry, or a release action without an audit entry → REJECT.**

---

## Config (no hardcoded tunables)

Anything tunable comes from the database, not from magic numbers in code:
- Waiting periods, ping schedules, reminder cadences → config table.
- **Provider recovery playbooks** live in data (`wrs_playbooks`), **versioned** — never hardcoded in services. A playbook change is a data edit + version bump, not a code deploy.
- BSP/template IDs, channel settings → config/env.

Acceptable to hardcode: structural constants, math identities, enum string values, route paths.

---

## Localization & Copy

- **Bahasa Indonesia first**, English secondary.
- Tone: warm, calm, reassuring — **never morbid or alarming**. Lead with *"we never ask for your passwords."*
- Write from the user's side of the screen: active voice, plain verbs, name things by what the user controls. See the brand guide for voice rules and the `Seal` / `Tersegel` ("sealed until needed") vocabulary.

---

## Compliance & Data (UU PDP / PSE)

- **Hold the minimum.** Consent-based. Support data **export** and **deletion** (data-subject rights) from day one.
- **Residency:** Supabase **Singapore** region now; keep the stack self-hostable on **AWS/GCP Jakarta** if onshore residency is demanded (e.g., a bank/insurer B2B2C partner). Register as a **PSE**.
- **Encryption:** TLS in transit; AES-256 at rest (Supabase-managed); **client-side encryption** for sensitive identifiers as a fast-follow.

---

## File Conventions
- Routes: `src/app/api/{domain}/route.ts`  ·  Server actions: `src/app/{feature}/actions.ts`
- Services: `src/services/{domain}.service.ts`
- Repositories: `src/repositories/{domain}.repo.ts`
- Workflows: `src/workflows/{name}.ts`
- Intake: `src/intake/{channel}.ts`
- Zod schemas: `src/schemas/{domain}.ts` (or colocated)
- Migrations: `supabase/migrations/XXXX_{description}.sql` (sequential)

---

## Commands
- `pnpm dev` — start dev server
- `pnpm build` / `pnpm start` — build / run
- `pnpm lint` / `pnpm typecheck` — static checks (run both before considering a task done)
- `pnpm test` — run tests
- `supabase migration new {name}` — scaffold a migration
- `supabase db reset` — rebuild the **local** DB from migrations + seed
- `supabase db push` — apply migrations (**dev only** unless explicitly told to target production)

---

## Environment & Secrets

| Service | Env Var | Notes |
|---------|---------|-------|
| Supabase URL | `NEXT_PUBLIC_SUPABASE_URL` | Public |
| Supabase anon key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side, **RLS-bound** |
| Supabase service-role | `SUPABASE_SERVICE_ROLE_KEY` | **Server-only. Never in a client bundle or user-facing route.** |
| WhatsApp token | `WHATSAPP_TOKEN` | Meta/BSP |
| WhatsApp phone ID | `WHATSAPP_PHONE_NUMBER_ID` | |
| WhatsApp verify token | `WHATSAPP_VERIFY_TOKEN` | Webhook verification |
| Meta app secret | `META_APP_SECRET` | Webhook signature verification |
| LLM | `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` | Structuring |
| Speech-to-text | `STT_API_KEY` | Voice notes |
| Email | `RESEND_API_KEY` | Notifications |
| SMS | `SMS_GATEWAY_KEY` | Local Indonesian gateway |
| Inngest | `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` | Release/reminder workflows (Phase 2) |

Rule: **service-role and all secret keys are server-only.** Anything `NEXT_PUBLIC_*` is assumed to ship to the browser.

---

## Before Every Edit
1. **Read the file first.**
2. Trace the full flow: trigger → route/action → service → repository → **RLS** → DB write → read path.
3. For any new table/column, confirm RLS covers **owner + deputy + pre/post-release**.
4. Confirm every external call is observability-wired.
5. **Confirm no credential or account-access path was introduced.** (The cardinal check.)

---

## DB Schema Change Pre-Flight (MANDATORY)

Before writing ANY migration or schema-dependent code, **STOP and warn**:
1. **What** — exact change (table/column/type/constraint/migration filename).
2. **Where** — which database/branch (local/dev vs production).
3. **Consequences** — data-loss risk, backfill needs, lock/downtime, reversibility, **RLS impact** (does the new column or table need policies?).
4. **Plan** — additive-first → backfill → enforce.

Then wait for explicit approval. **Every new user-data table must ship with RLS enabled + policies in the same migration** — a table without RLS is a VIOLATION.

---

## Migration Safety
- The Supabase migration chain is the **only** schema truth. Read existing migrations for the table you touch; never assume a column exists from memory.
- **Additive-first.** Destructive changes (drops, renames, type narrowing, NOT NULL backfill) require staging + explicit confirmation.
- Seed sensible defaults for any new config in the migration.

---

## Completion Checklist (verify ALL before done)

**No-access & heir:**
- [ ] No credential / account-access path introduced (no passwords, tokens, logins, transactions, KYC bypass).
- [ ] Heir recovery still works from a plain web link (no new install/login gate).

**Data layer:**
- [ ] No queries outside `src/repositories/`; no business logic in routes/actions.
- [ ] RLS enabled + policies shipped for any new table; all four corners tested (owner/deputy × pre/post-release).
- [ ] No service-role key in a user-facing path.

**Release & intake:**
- [ ] Release paths preserve the full safety gate; fail-safe is "sealed."
- [ ] AI-structured entries require explicit user confirmation before save.

**Observability & config:**
- [ ] Every external call wired to `wrs_api_log`; release/auth events to `wrs_events`.
- [ ] No PII or sensitive identifiers in plaintext logs.
- [ ] No hardcoded tunables; config/playbooks in DB.

**Copy & docs:**
- [ ] Bahasa-first, warm, non-morbid copy.
- [ ] CHANGELOG entry added; migration includes RLS.

---

## Branches & Deploy
- `main` → Vercel **preview** (safe, default working branch).
- production branch → Vercel **production** (treat as if real grieving families depend on it — because they will).
- **Never run migrations against production** unless explicitly told "run on production."
- When in doubt, work on `main`.

---

## Versioning
Semantic versioning, `MAJOR.MINOR.PATCH`:
- `X.0.0` — **founder only**, never self-bump.
- `0.X.0` — Claude: new feature, schema migration, breaking API change.
- `0.0.X` — Claude: bug fix, copy change, config tweak, styling.

Every commit targets a version. Never skip versions. If unsure MINOR vs PATCH, it's PATCH. Track in `package.json`, show in the app footer.

---

## Debugging Protocol (diagnose before fixing)

**1. Verify the schema (Supabase SQL):**
```sql
-- table + columns exist, types match
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'wrs_<table>' order by ordinal_position;

-- RLS is actually ON and policies exist
select relrowsecurity from pg_class where relname = 'wrs_<table>';
select policyname, cmd, qual from pg_policies where tablename = 'wrs_<table>';
```

**2. Reproduce the access path with the right key.** If data is "missing," first check whether RLS is filtering it — query as the **anon/user** role, not service-role. A row invisible under RLS is usually correct behavior, not a bug.

**3. Check the lifecycle state.** For release issues, inspect the record's `release_state` and the `wrs_events` audit trail before touching workflow code.

**4. Check observability.** Did the external call happen? `select * from wrs_api_log ... order by created_at desc`. Did the event fire? `select * from wrs_events ...`.

**5. Trace the full write path** — trigger → service → repo → DB row → read — before assuming the bug is where the symptom shows.

---

*Living document — keep it in sync with the product spec, brand guide, and decisions log as the build evolves.*
