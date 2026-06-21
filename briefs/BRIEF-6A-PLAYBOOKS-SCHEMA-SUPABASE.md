# IMPLEMENTATION BRIEF: Playbooks Schema + Seeds
## Surface: supabase
## Brief: #6a
## Phase: 1 (MVP)
## Depends on: #1
## Blocks: #6b
## Parallel with: None

### CONTEXT
`wrs_playbooks` — Warisly-maintained, versioned recovery guides (steps + per-provider document additions), matched to assets by provider or category. Plus a seeded base-documents list every dossier merges in.

### NON-NEGOTIABLE CHECK
Playbooks are non-sensitive reference data, readable by authenticated users; writes are admin/service-role only (no write policy). The dossier is assembled on demand from assets + playbooks — no owner data lives here. Faraid/wasiat content is informational only (none added here). Seeded steps are explicitly marked PLACEHOLDER to prevent shipping unverified claim processes.

### REUSE ANALYSIS (required before new schema)
- `wrs_assets.detail` JSONB → rejected: playbooks are shared reference data, not per-asset owner data; storing them per-asset would duplicate across owners and leak maintenance into user rows.
- `wrs_settings` row → rejected for playbooks: playbooks are many, queryable by provider/category, versioned — a settings blob can't index or match them. (Base documents, which ARE a single global list, correctly live as a `wrs_settings` row.)
- A separate `wrs_doc_checklist` table → rejected: the per-provider docs are a small array owned by each playbook → `documents` JSONB on the playbook avoids a join; the global base docs live in `wrs_settings`.

### PRE-FLIGHT CHECKS
- [ ] `wrs_asset_category`, `wrs_set_updated_at()`, `wrs_settings` exist (#1).

### DATABASE MIGRATIONS

```sql
-- Migration: 2026-06-21_0004_playbooks.sql
create table wrs_playbooks (
  id           uuid primary key default gen_random_uuid(),
  provider_key text,                        -- normalised provider ('ajaib','bca','gopay'); null = category fallback
  category     wrs_asset_category,          -- scope/fallback category
  title        text not null,
  version      integer not null default 1,
  steps        jsonb not null default '[]'::jsonb,    -- [{ "order":1, "text":"…" }]
  documents    jsonb not null default '[]'::jsonb,    -- [{ "key":"…", "label":"…" }]
  notes        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index wrs_playbooks_lookup_idx on wrs_playbooks (provider_key, category) where is_active;
create trigger wrs_playbooks_updated_at before update on wrs_playbooks
  for each row execute function wrs_set_updated_at();

alter table wrs_playbooks enable row level security;
create policy "playbooks_read_auth" on wrs_playbooks
  for select to authenticated using (is_active);
-- writes: admin/service-role only (no write policy).

-- Base documents merged into every dossier
insert into wrs_settings (key, value, description) values
('dossier.base_documents',
 '[{"key":"akta_kematian","label":"Akta Kematian"},{"key":"kk","label":"Kartu Keluarga (KK)"},{"key":"surat_ahli_waris","label":"Surat Keterangan Ahli Waris"},{"key":"ktp_ahli_waris","label":"KTP Ahli Waris"}]',
 'Documents the family needs for any claim, merged into every dossier')
on conflict (key) do nothing;

-- Starter playbooks. STEPS ARE PLACEHOLDERS — admin must replace with verified provider processes.
insert into wrs_playbooks (provider_key, category, title, steps, documents, notes) values
('ajaib','saham','Klaim akun Ajaib (saham)',
 '[{"order":1,"text":"Hubungi support Ajaib dan sampaikan pemegang akun telah meninggal."},{"order":2,"text":"Siapkan dokumen ahli waris yang diminta."},{"order":3,"text":"Ikuti proses verifikasi resmi Ajaib untuk pencairan ke ahli waris."}]',
 '[{"key":"rdn_bank","label":"Info bank RDN terkait"}]',
 'PLACEHOLDER — verifikasi langkah resmi dengan Ajaib sebelum dipakai.'),
('bca','bank','Klaim rekening BCA',
 '[{"order":1,"text":"Datang ke kantor cabang BCA tempat rekening dibuka."},{"order":2,"text":"Bawa dokumen ahli waris dan buku tabungan bila ada."},{"order":3,"text":"Ajukan permohonan pencairan saldo waris sesuai prosedur bank."}]',
 '[{"key":"buku_tabungan","label":"Buku tabungan (bila ada)"}]',
 'PLACEHOLDER — verifikasi dengan BCA.'),
('gopay','e_wallet','Klaim saldo GoPay',
 '[{"order":1,"text":"Hubungi layanan pelanggan Gojek/GoPay."},{"order":2,"text":"Sampaikan situasi dan siapkan dokumen ahli waris."},{"order":3,"text":"Ikuti prosedur resmi untuk saldo akun yang pemiliknya meninggal."}]',
 '[]',
 'PLACEHOLDER — verifikasi dengan GoPay.'),
(null,'bank','Klaim rekening bank (umum)',
 '[{"order":1,"text":"Identifikasi bank dan cabang tempat rekening dibuka."},{"order":2,"text":"Hubungi atau datangi bank dengan dokumen ahli waris."},{"order":3,"text":"Ajukan pencairan saldo waris sesuai prosedur bank tersebut."}]',
 '[]',
 'Fallback umum untuk rekening bank tanpa playbook spesifik.');
```

### VERIFICATION
- [ ] Migration applies clean; `select count(*) from wrs_playbooks` = 4.
- [ ] An authenticated user can `select` playbooks but cannot `insert`/`update` (no write policy).
- [ ] `wrs_settings` has `dossier.base_documents` with 4 entries.
- [ ] The Ajaib/BCA/GoPay notes carry the PLACEHOLDER warning (reminder to verify before launch).
