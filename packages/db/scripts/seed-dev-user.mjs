// Seed (or refresh) a dev sign-in user for the POC "bypass number" login on /masuk.
//
// This uses the Supabase service-role key, which is allowed here: it is a trusted
// OFFLINE script, not a user-facing request path. The login flow itself never
// touches the service-role key (it signs in with the anon client). See
// apps/web/src/app/actions/auth.ts → signInBypass.
//
// Run once per dev phone number:
//   pnpm --filter @warisly/db seed:dev-user +6281234567890
// or, if DEV_LOGIN_PHONE is set in apps/web/.env.local:
//   pnpm --filter @warisly/db seed:dev-user
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
const phone = (process.argv[2] || get("DEV_LOGIN_PHONE") || get("NEXT_PUBLIC_DEV_LOGIN_PHONE") || "").trim();

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

async function main() {
  let userId;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr) {
    // Likely "already registered" — find and refresh the existing user.
    const existing = await findUserByEmail(email);
    if (!existing) throw new Error(createErr.message);
    userId = existing.id;
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (updErr) throw new Error(updErr.message);
    console.log(`↻ Refreshed existing dev user: ${email}`);
  } else {
    userId = created.user.id;
    console.log(`✓ Created dev user: ${email}`);
  }

  // Best-effort: attach the phone number for realism. Sign-in uses the email, so
  // this is cosmetic and is allowed to fail (e.g. Phone provider not enabled).
  const { error: phoneErr } = await admin.auth.admin.updateUserById(userId, {
    phone,
    phone_confirm: true,
  });
  if (phoneErr) {
    console.warn(`  (couldn't attach phone: ${phoneErr.message} — sign-in still works)`);
  }

  console.log("");
  console.log(`Sign in at /masuk → dev form → enter the number:  ${phone}`);
  console.log("(the password is supplied server-side; you only type the number)");
}

main().catch((e) => die(e.message));
