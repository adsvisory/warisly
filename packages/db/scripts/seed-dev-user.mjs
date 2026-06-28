// Seed (or refresh) the POC dev sign-in user on /masuk — and, by default, a full
// set of realistic demo content for that owner so the app isn't empty in a demo.
//
// This uses the Supabase service-role key, which is allowed here: it is a trusted
// OFFLINE script, not a user-facing request path. The login flow itself never
// touches the service-role key (it signs in with the anon client). See
// apps/web/src/app/actions/auth.ts → signInBypass.
//
// Usage:
//   pnpm --filter @warisly/db seed:dev-user +6281234567890           # user + demo content
//   pnpm --filter @warisly/db seed:dev-user +6281234567890 --no-content   # user only
//
// Re-running RESETS this dev owner's content (assets/trustees/recipients/wishes/
// drafts/intake) to a known fixture state — safe, because this is a demo user.
//
// Reads config from apps/web/.env.local (or the process environment):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEV_LOGIN_PASSWORD
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const out = {};
  try {
    const raw = readFileSync(new URL("../../../apps/web/.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const s = line.trim();
      if (!s || s.startsWith("#")) continue;
      const eq = s.indexOf("=");
      if (eq === -1) continue;
      const key = s.slice(0, eq).trim();
      let val = s.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
  } catch {
    // No .env.local — fall back to the process environment.
  }
  return out;
}

const fileEnv = loadEnvLocal();
const get = (k) => process.env[k] ?? fileEnv[k];

const url = get("NEXT_PUBLIC_SUPABASE_URL");
const serviceRole = get("SUPABASE_SERVICE_ROLE_KEY");
const password = get("DEV_LOGIN_PASSWORD");
const args = process.argv.slice(2);
const skipContent = args.includes("--no-content");
const phone = (args.find((a) => !a.startsWith("--")) || get("DEV_LOGIN_PHONE") || get("NEXT_PUBLIC_DEV_LOGIN_PHONE") || "").trim();

const die = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

if (!url) die("NEXT_PUBLIC_SUPABASE_URL is missing (set it in apps/web/.env.local).");
if (!serviceRole) die("SUPABASE_SERVICE_ROLE_KEY is missing (set it in apps/web/.env.local).");
if (!password) die("DEV_LOGIN_PASSWORD is missing (set it in apps/web/.env.local).");
if (!phone) die("No phone number. Pass one as an argument, or set DEV_LOGIN_PHONE.");

// MUST stay in sync with devEmailForPhone() in apps/web/src/app/actions/auth.ts.
const email = `dev+${phone.replace(/\D/g, "")}@warisly.test`;

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const iso = (daysAgo) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

async function findUserByEmail(target) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => u.email === target);
    if (found) return found;
    if (data.users.length < 200) break;
  }
  return null;
}

async function ensureUser() {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (!createErr) {
    console.log(`✓ Created dev user: ${email}`);
    return created.user.id;
  }
  const existing = await findUserByEmail(email);
  if (!existing) throw new Error(createErr.message);
  const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });
  if (updErr) throw new Error(updErr.message);
  console.log(`↻ Refreshed existing dev user: ${email}`);
  return existing.id;
}

// ── Demo content ────────────────────────────────────────────────────────────
// Non-secret identifiers only (emails / account numbers an heir would need) — never
// a password, PIN, or seed phrase. Values are owner-stated estimates.
const ASSETS = [
  { category: "saham", provider: "Ajaib", label: "Portofolio Saham IDX", identifier: "budi.santoso@email.com", value: 185_000_000, ben: null, reviewed: 6, created: 2,
    notes: "RDN terhubung ke BCA. Hubungi CS Ajaib dengan akta kematian + KK untuk pencairan ke ahli waris." },
  { category: "reksa_dana", provider: "Bibit", label: "Reksa Dana (campuran & pasar uang)", identifier: "budi.santoso@email.com", value: 96_500_000, ben: null, reviewed: 12, created: 8,
    notes: "Akun via Bibit, kustodian Bank Jago. Redemption oleh ahli waris lewat manajer investasi." },
  { category: "bank", provider: "BCA", label: "Tahapan BCA", identifier: "No. rek 1234567890", value: 142_000_000, ben: true, reviewed: 3, created: 1,
    notes: "Rekening utama untuk operasional rumah tangga. Ahli waris sudah tercatat di bank." },
  { category: "bank", provider: "Bank Jago", label: "Kantong tabungan & darurat", identifier: "No. rek 5566778899", value: 38_000_000, ben: false, reviewed: 40, created: 20 },
  { category: "e_wallet", provider: "GoPay", label: "Saldo & GoPay Tabungan", identifier: phone, value: 4_200_000, ben: null, reviewed: 9, created: 5 },
  { category: "emas", provider: "Pegadaian", label: "Tabungan Emas (≈ 22 gram)", identifier: "Rekening Tabungan Emas", value: 31_000_000, ben: null, reviewed: 30, created: 14,
    notes: "Bisa dicairkan atau dicetak di outlet Pegadaian dengan dokumen ahli waris." },
  { category: "crypto", provider: "Pintu", label: "Bitcoin & Ethereum", identifier: "budi.santoso@email.com", value: 73_000_000, ben: null, reviewed: 18, created: 11,
    notes: "Aset di exchange lokal (custodial). TIDAK ada private key/seed phrase yang disimpan di Warisly — pencairan lewat support Pintu dengan dokumen ahli waris." },
  { category: "asuransi", provider: "Prudential", label: "Asuransi Jiwa PRUlink", identifier: "Polis No. PRU-00891234", value: 1_000_000_000, ben: true, reviewed: 60, created: 45,
    notes: "Uang Pertanggungan untuk Siti (istri) sebagai penerima manfaat. Ajukan klaim ke Prudential dengan akta kematian." },
  { category: "bpjs", provider: "BPJS Ketenagakerjaan", label: "Saldo JHT", identifier: "KPJ 99001234567", value: 88_000_000, ben: true, reviewed: 75, created: 55,
    notes: "JHT dapat diklaim ahli waris di kantor cabang BPJS TK." },
  { category: "obligasi", provider: "Bibit / Kemenkeu", label: "SBN Ritel (ORI & SR)", identifier: "Single Investor ID (SID)", value: 50_000_000, ben: null, reviewed: 50, created: 30 },
  { category: "pensiun", provider: "DPLK Manulife", label: "Dana Pensiun Lembaga Keuangan", identifier: "budi.santoso@email.com", value: 124_000_000, ben: true, reviewed: 120, created: 70 },
  { category: "p2p", provider: "Investree", label: "Pendanaan P2P (lender)", identifier: "budi.santoso@email.com", value: 18_500_000, ben: null, reviewed: 95, created: 60,
    notes: "Beberapa pinjaman masih berjalan. Dana kembali otomatis ke RDL saat jatuh tempo." },
  { category: "luar_negeri", provider: "Interactive Brokers", label: "Saham AS (≈ USD 9.500)", identifier: "budi.santoso@email.com", value: 155_000_000, ben: null, reviewed: 200, created: 90,
    notes: "Akun IBKR (USD). Proses transfer ahli waris memerlukan dokumen yang diterjemahkan/legalisir." },
  { category: "domain", provider: "Niagahoster", label: "Domain & website proyek", identifier: "budi.santoso@email.com", value: 3_500_000, ben: null, reviewed: 230, created: 100 },
  { category: "fisik", provider: "Brankas rumah", label: "Logam mulia & jam tangan", identifier: "Brankas kamar utama", value: 47_000_000, ben: null, reviewed: 260, created: 110,
    notes: "Kombinasi brankas diberikan terpisah kepada Siti. Sertifikat LM ada di map dokumen." },
  { category: "properti", provider: "—", label: "Rumah tinggal (Bintaro)", identifier: "SHM No. 01234 / Bintaro", value: 2_400_000_000, ben: null, reviewed: 280, created: 120,
    notes: "Sertifikat (SHM) atas nama Budi Santoso, disimpan di safe deposit box BCA." },
  { category: "utang", provider: "BCA", label: "Sisa KPR rumah Bintaro", identifier: "KPR No. 778899", value: 420_000_000, ben: null, reviewed: 20, created: 12, liability: true,
    notes: "Sisa pokok KPR. Pertimbangkan pelunasan dari UP asuransi PRUlink." },
  { category: "utang", provider: "BCA Finance", label: "Cicilan mobil", identifier: "Kontrak No. 4455", value: 76_000_000, ben: null, reviewed: 22, created: 9, liability: true },
];

const TRUSTEES = [
  { name: "Siti Santoso", contact_type: "whatsapp", contact_value: "+6281200000011", role: "primary", status: "confirmed", confirmedDaysAgo: 40 },
  { name: "Andi Wijaya", contact_type: "email", contact_value: "andi.wijaya@email.com", role: "primary", status: "confirmed", confirmedDaysAgo: 35 },
  { name: "Rina Santoso", contact_type: "phone", contact_value: "+6281200000022", role: "backup", status: "invited", confirmedDaysAgo: null },
];

const RECIPIENTS = [
  { name: "Siti Santoso", relationship: "pasangan", visibility: "now", note: "Istri — pengelola utama bersama wali." },
  { name: "Rina Santoso", relationship: "anak", visibility: "after_death", note: "Anak pertama." },
  { name: "Dani Santoso", relationship: "anak", visibility: "after_death", note: "Anak kedua (masih sekolah)." },
  { name: "Sukarni", relationship: "orang_tua", visibility: "after_death", note: "Ibu kandung." },
];

const WISHES = [
  { text: "Tolong lunasi sisa KPR rumah Bintaro dari dana asuransi PRUlink terlebih dahulu sebelum membagi aset lainnya." },
  { text: "Sisihkan zakat/sedekah dari total warisan, dan donasikan sebagian untuk panti asuhan Al-Ikhlas." },
  { text: "Akun media sosial pribadi mohon dinonaktifkan, bukan dilanjutkan." },
];

// Two pending WhatsApp drafts (awaiting owner confirmation) to demo the intake inbox.
const INTAKE = [
  { wa: "dev-seed-msg-1", type: "text", text: "Saldo DANA aku kira-kira 750 ribu ya", transcript: null,
    draft: { category: "e_wallet", provider: "DANA", label: null, identifier: null, value: 750_000,
      confidence: { provider: 0.92, valueEstimate: 0.55, lowConfidence: ["valueEstimate"] } } },
  { wa: "dev-seed-msg-2", type: "audio", text: null, transcript: "Eh aku ada saham juga di sekuritas, lupa yang mana, nilainya belasan juta",
    draft: { category: "saham", provider: null, label: null, identifier: null, value: 12_000_000,
      confidence: { category: 0.8, lowConfidence: ["provider", "valueEstimate"] } } },
];

async function reset(ownerId) {
  for (const table of ["wrs_asset_drafts", "wrs_intake_messages", "wrs_assets", "wrs_trustees", "wrs_recipients", "wrs_wishes"]) {
    const { error } = await admin.from(table).delete().eq("owner_id", ownerId);
    if (error) throw new Error(`reset ${table} failed: ${error.message}`);
  }
}

async function insertMany(table, rows) {
  if (rows.length === 0) return;
  const { error } = await admin.from(table).insert(rows);
  if (error) throw new Error(`insert ${table} failed: ${error.message}`);
}

async function seedContent(ownerId) {
  console.log("Seeding demo content (resetting this owner's fixture first)…");
  await reset(ownerId);

  // Owner profile. Marked verified + release-eligible so the full app is demoable.
  // This is a DEV FIXTURE only — the real app sets verified state via the eKYC
  // callback alone; nothing here runs in a user-facing request path.
  const { error: ownerErr } = await admin.from("wrs_owners").upsert(
    {
      id: ownerId,
      full_name: "Budi Santoso",
      phone,
      locale: "id",
      kyc_status: "verified",
      release_eligible: true,
      consent_pdp_at: iso(150),
      release_rule: { waitingDays: 14, channels: ["whatsapp", "email", "sms"] },
    },
    { onConflict: "id" },
  );
  if (ownerErr) throw new Error(`upsert owner failed: ${ownerErr.message}`);

  await insertMany("wrs_assets", ASSETS.map((a) => ({
    owner_id: ownerId,
    category: a.category,
    is_liability: a.liability ?? false,
    provider: a.provider,
    label: a.label,
    identifier: a.identifier,
    value_estimate: a.value,
    currency: "IDR",
    detail: a.notes ? { instructions: a.notes } : {},
    provider_beneficiary_set: a.ben,
    last_reviewed_at: iso(a.reviewed),
    created_at: iso(a.created),
  })));

  await insertMany("wrs_trustees", TRUSTEES.map((tr) => ({
    owner_id: ownerId,
    name: tr.name,
    contact_type: tr.contact_type,
    contact_value: tr.contact_value,
    role: tr.role,
    status: tr.status,
    confirmed_at: tr.confirmedDaysAgo == null ? null : iso(tr.confirmedDaysAgo),
  })));

  await insertMany("wrs_recipients", RECIPIENTS.map((r) => ({
    owner_id: ownerId,
    name: r.name,
    relationship: r.relationship,
    visibility: r.visibility,
    note: r.note,
  })));

  await insertMany("wrs_wishes", WISHES.map((w) => ({ owner_id: ownerId, text: w.text })));

  // Intake messages → linked pending drafts.
  let draftCount = 0;
  for (const m of INTAKE) {
    const { data: msg, error: mErr } = await admin.from("wrs_intake_messages").insert({
      owner_id: ownerId,
      wa_message_id: m.wa,
      wa_from: phone,
      type: m.type,
      text_body: m.text,
      transcript: m.transcript,
      status: "structured",
    }).select("id").single();
    if (mErr) throw new Error(`insert intake failed: ${mErr.message}`);

    const { error: dErr } = await admin.from("wrs_asset_drafts").insert({
      owner_id: ownerId,
      source: "whatsapp",
      intake_message_id: msg.id,
      category: m.draft.category,
      provider: m.draft.provider,
      label: m.draft.label,
      identifier: m.draft.identifier,
      value_estimate: m.draft.value,
      detail: {},
      confidence: m.draft.confidence,
      status: "pending",
    });
    if (dErr) throw new Error(`insert draft failed: ${dErr.message}`);
    draftCount++;
  }

  console.log(
    `✓ Seeded: ${ASSETS.length} assets · ${TRUSTEES.length} trustees · ` +
    `${RECIPIENTS.length} recipients · ${WISHES.length} wishes · ${draftCount} pending drafts`,
  );
}

async function main() {
  const userId = await ensureUser();

  // Best-effort: attach the phone for realism. Sign-in uses the email, so this is
  // cosmetic and is allowed to fail (e.g. Phone provider not enabled).
  const { error: phoneErr } = await admin.auth.admin.updateUserById(userId, { phone, phone_confirm: true });
  if (phoneErr) console.warn(`  (couldn't attach phone: ${phoneErr.message} — sign-in still works)`);

  if (skipContent) {
    console.log("Skipped demo content (--no-content).");
  } else {
    await seedContent(userId);
  }

  console.log("");
  console.log(`Sign in at /masuk → "Masuk cepat tanpa OTP (dev)" → enter:  ${phone}`);
}

main().catch((e) => die(e.message));
