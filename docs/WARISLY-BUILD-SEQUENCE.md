# Warisly — Build Sequence (Phase 1 / MVP)

**Structure:** monorepo (pnpm workspaces + Turborepo). Surfaces map to workspace locations:
`web` = `apps/web` (owner + heir) · `admin` = `apps/admin` · `ui/db/lib` = `packages/*` · `supabase` = root `supabase/migrations` · `release-engine` = `services/release-engine` (P2).

**How to use:** each row is one implementation brief = one Claude Code session. Execute in order within a batch. Letter suffixes (0a/0b/0c, 4a/4b/4c) can run in parallel once their dependency is met. Format per `Warisly-Project-Instructions.md`.

> Stack (locked): Next.js 15 + React 19 + TS + Tailwind on Vercel · Supabase (Postgres + RLS + Auth + Storage) · WhatsApp Cloud API intake · LLM structuring · Inngest release engine (P2). Prefix `wrs_`. Bahasa-first. **Modular monolith**, not microservices.

---

## Batch 1 — Foundation (the spine) ✅ written

| Brief | Surface / location | What | Depends |
|-------|--------------------|------|---------|
| **0a** | workspace (root + packages) | pnpm/Turbo workspace, `@warisly/{lib,db,ui}` skeletons, brand-token Tailwind preset, Supabase init | None |
| **0b** | web (`apps/web`) | Public Next.js app: brand fonts, Tailwind preset, Supabase cookie clients, Zod env + server-only boundary, landing | 0a |
| **0c** | admin (`apps/admin`) | Internal Next.js console scaffold (locked shell), separate Vercel project | 0a |
| **1** | supabase | Schema foundation + RLS: enums, `wrs_owners`, seeded `wrs_settings`, `wrs_events`, `wrs_api_log`, trigger | 0a |
| **2** | web (`apps/web`) | Owner auth: phone-OTP sign-in, session middleware, protected `(app)` group, profile upsert (data fn in `@warisly/db`) | 0b, 1 |
| **3** | ui (`packages/ui`) | Design system: Seal, Button (Nyala-disciplined), Card, Chip, `<Estimate>`, headings, AppShell, exported from `@warisly/ui` | 0a |

## Batch 2 — Asset registry (core loop, part 1)

| Brief | Surface / location | What | Depends |
|-------|--------------------|------|---------|
| **4a** | supabase | `wrs_assets` (+ `detail` JSONB, estimate value, `last_reviewed_at`, freshness, liability flag, `provider_beneficiary_set`) + RLS | 1 |
| **4b** | db (`packages/db`) | RLS-aware data layer (`packages/db/src/data/assets.ts`) + service layer (`apps/web/src/services/assets.ts`) | 4a |
| **4c** | web | Registry UI: completeness-first dashboard, assets vs liabilities separated, add/edit/archive, freshness chips | 4b, 3 |

## Batch 3 — Intake (WhatsApp + AI structuring)

| Brief | Surface / location | What | Depends |
|-------|--------------------|------|---------|
| **5a** | web (`app/api`) | WhatsApp Cloud API webhook: verify + receive text/voice/image, persist raw to staging, enqueue | 1 |
| **5b** | web (service) | AI structuring: LLM structured-output + STT + vision → **draft** (never auto-save), low-confidence flags | 5a, 4b |
| **5c** | web | Draft-confirm UI: review parse, edit, confirm-before-save; optional encrypted source screenshot | 5b, 4c |

## Batch 4 — Recovery dossier & playbooks

| Brief | Surface / location | What | Depends |
|-------|--------------------|------|---------|
| **6a** | supabase | `wrs_playbooks` (versioned) + `wrs_doc_checklist` + dossier assembly schema + RLS | 1 |
| **6b** | web (service) | Dossier service: assemble map + recovery steps + checklist; printable/exportable | 6a, 4b |
| **6c** | web | Dossier UI + owner preview of the heir view | 6b, 3 |

## Batch 5 — People (three-role Amanah)

| Brief | Surface / location | What | Depends |
|-------|--------------------|------|---------|
| **7a** | supabase | `wrs_trustees`, `wrs_recipients`, `wrs_wishes`, now-vs-after-death visibility + RLS | 1 |
| **7b** | db + web | Amanah data/service + trustee invitations & confirmations | 7a |
| **7c** | web | Amanah UI: trustees (2-of-3 quorum, backups), recipients (NIK, faraid-awareness note), wishes, visibility | 7b, 3 |

## Batch 6 — Owner eKYC + release rule

| Brief | Surface / location | What | Depends |
|-------|--------------------|------|---------|
| **8a** | web + supabase | Dukcapil-linked eKYC vendor — store **only** pass/fail + verified-identity token (no raw biometrics); set `release_eligible` | 1, 2 |
| **8b** | web | Release-rule config: waiting period (gated behind eKYC), ping channels, trustee quorum | 8a, 7 |

## Batch 7 — Release mechanism + Heir + Admin (safety-critical)

| Brief | Surface / location | What | Depends |
|-------|--------------------|------|---------|
| **9a** | supabase | `wrs_release_requests` state machine + RLS + full audit | 1 |
| **9b** | web (heir route group) | Heir claim surface (plain web link, no install): death report → akta + KK upload → heir eKYC matched to NIK | 9a, 8a |
| **9c** | admin | Back-office review console: internal auth + RBAC + MFA, verify, **dual-control** approve, flip `release_state`, audit | 0c, 9a |
| **9d** | release-engine | Multi-channel safety ping + waiting period + idempotent release execution + record lock | 9a, 9c |
| **9e** | web (heir route group) | Released dossier view (post-release, printable) | 9b, 6b |

## Batch 8 — Privacy / observability hardening

| Brief | Surface / location | What | Depends |
|-------|--------------------|------|---------|
| **10a** | web | Owner transparency log UI (reads `wrs_events`) | 1, 3 |
| **10b** | web + supabase | Consent capture + data export + deletion (UU PDP data-subject rights) | 1 |
| **10c** | db | Client-side encryption groundwork for sensitive identifiers/notes (P2 enablement) | 4a, 7a |

---

## Re-homing note (Batch 1 after the monorepo move)
- **Brief 1** is unchanged — it lives at root `supabase/migrations/` either way.
- **Brief 2** moves into `apps/web`; its `ensureOwnerProfile` data function moves to `packages/db/src/data/owners.ts`.
- **Brief 3** becomes the `@warisly/ui` package contents (same components, exported from `packages/ui/src`).

*Living document — check off briefs as they ship; pull P2 items earlier if validation demands.*
