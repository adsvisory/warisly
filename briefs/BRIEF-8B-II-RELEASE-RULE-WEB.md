# IMPLEMENTATION BRIEF: Release Rule UI
## Surface: web (`apps/web`) + db (`packages/db`)
## Brief: #8b-ii
## Phase: 1 (MVP)
## Depends on: #8b-i, #8a-ii, #6b (getSetting), #3
## Blocks: None
## Parallel with: None

### CONTEXT
The owner configures the release safeguards: a waiting period (bounded by settings) and ping channels, with the trustee quorum shown for context. The page is **gated behind `release_eligible`** — only verified owners can set it.

### NON-NEGOTIABLE CHECK
Release safety is configured here and enforced in #9d: waiting period + multi-channel ping are first-class, never optional to zero (min ≥ settings floor; at least one channel required). Page is gated behind eKYC verification. `/rilis` is added to the protected route set. Bounds come from `wrs_settings`, never hardcoded. Owner-RLS throughout. No credentials.

### PRE-FLIGHT CHECKS
- [ ] `release_rule` column exists (#8b-i); `release_eligible` set on verify (#8a-ii); `getSetting` (#6b); middleware protected-prefix list (#2).
- [ ] `wrs_settings` has `release.waiting_period_days` ({default,min,max}) and `release.ping_channels` (string[]) and `trustees.quorum` (#1). If keys differ, the service falls back to safe defaults.

### FILES TO CREATE/MODIFY

#### 1. `packages/db/src/data/release-rule.ts`
**Action:** CREATE **Layer:** Data
```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ReleaseRule { waitingDays: number; channels: string[]; }

export async function getReleaseRule(supabase: SupabaseClient): Promise<{ rule: ReleaseRule | null; eligible: boolean }> {
  const { data, error } = await supabase.from("wrs_owners")
    .select("release_rule, release_eligible").maybeSingle();
  if (error) throw new Error(`getReleaseRule failed: ${error.message}`);
  return { rule: (data?.release_rule as ReleaseRule) ?? null, eligible: data?.release_eligible ?? false };
}

export async function setReleaseRule(supabase: SupabaseClient, ownerId: string, rule: ReleaseRule): Promise<void> {
  const { error } = await supabase.from("wrs_owners").update({ release_rule: rule }).eq("id", ownerId);
  if (error) throw new Error(`setReleaseRule failed: ${error.message}`);
}
```

#### 2. `packages/db/src/index.ts`
**Action:** MODIFY
```typescript
export * from "./data/release-rule"; // ← add
```

#### 3. `apps/web/src/services/release-rule.ts`
**Action:** CREATE **Layer:** Service
```typescript
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getReleaseRule, setReleaseRule, getSetting, type ReleaseRule } from "@warisly/db";

interface Bounds { default: number; min: number; max: number; }
interface Quorum { required: number; of: number; }

export interface ReleaseConfig {
  eligible: boolean;
  rule: ReleaseRule;
  bounds: Bounds;
  allowedChannels: string[];
  quorum: Quorum;
}

export async function getReleaseConfig(supabase: SupabaseClient): Promise<ReleaseConfig> {
  const [current, dflt, channels, quorum] = await Promise.all([
    getReleaseRule(supabase),
    getSetting<Bounds>(supabase, "release.waiting_period_days"),
    getSetting<string[]>(supabase, "release.ping_channels"),
    getSetting<Quorum>(supabase, "trustees.quorum"),
  ]);
  const bounds = dflt ?? { default: 14, min: 7, max: 90 };
  const allowedChannels = channels ?? ["whatsapp", "email", "sms"];
  const q = quorum ?? { required: 2, of: 3 };
  return {
    eligible: current.eligible,
    rule: current.rule ?? { waitingDays: bounds.default, channels: ["whatsapp"] },
    bounds,
    allowedChannels,
    quorum: q,
  };
}

export async function saveReleaseRule(supabase: SupabaseClient, ownerId: string, values: { waitingDays: unknown; channels: string[] }): Promise<void> {
  const cfg = await getReleaseConfig(supabase);
  if (!cfg.eligible) throw new Error("Identitas belum terverifikasi.");
  const waitingDays = Number(values.waitingDays);
  if (!Number.isInteger(waitingDays) || waitingDays < cfg.bounds.min || waitingDays > cfg.bounds.max) {
    throw new Error(`Masa tunggu harus antara ${cfg.bounds.min} dan ${cfg.bounds.max} hari.`);
  }
  const channels = values.channels.filter((c) => cfg.allowedChannels.includes(c));
  if (channels.length === 0) throw new Error("Pilih minimal satu kanal konfirmasi.");
  await setReleaseRule(supabase, ownerId, { waitingDays, channels });
}
```

#### 4. `apps/web/src/app/actions/release-rule.ts`
**Action:** CREATE **Layer:** Server Action
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveReleaseRule } from "@/services/release-rule";

export async function saveReleaseRuleAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");
  const channels = formData.getAll("channels").map(String);
  await saveReleaseRule(supabase, user.id, { waitingDays: formData.get("waitingDays"), channels });
  revalidatePath("/rilis");
}
```

#### 5. `apps/web/app/(app)/rilis/page.tsx`
**Action:** CREATE **Layer:** Page
```typescript
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getReleaseConfig } from "@/services/release-rule";
import { Eyebrow, H1, Card } from "@warisly/ui";
import { saveReleaseRuleAction } from "@/app/actions/release-rule";

const channelLabel: Record<string, string> = { whatsapp: "WhatsApp", email: "Email", sms: "SMS" };

export default async function RilisPage() {
  const supabase = await createClient();
  const cfg = await getReleaseConfig(supabase);

  if (!cfg.eligible) {
    return (
      <div className="pb-8">
        <Eyebrow>Aturan Rilis</Eyebrow>
        <H1>Verifikasi dulu</H1>
        <Card className="mt-6">
          <p className="text-paper-text">Aturan rilis dapat diatur setelah identitas Anda terverifikasi.</p>
          <Link href="/profil" className="mt-3 inline-block font-sans text-sm text-nyala underline">Ke verifikasi identitas →</Link>
        </Card>
      </div>
    );
  }

  const field = "mt-1 w-full rounded-lg border border-paper-edge bg-white px-3 py-2.5 font-sans text-sm text-paper-text outline-none focus:border-nyala";

  return (
    <div className="pb-8">
      <Link href="/profil" className="font-sans text-sm text-nyala underline">← Profil</Link>
      <Eyebrow>Aturan Rilis</Eyebrow>
      <H1>Masa tunggu & konfirmasi</H1>
      <p className="mt-2 font-sans text-sm text-paper-muted">
        Sebelum apa pun dirilis, Warisly menunggu selama masa tunggu dan mengirim konfirmasi lewat kanal yang Anda pilih. Ini mencegah rilis karena kesalahan.
      </p>

      <Card className="mt-6">
        <form action={saveReleaseRuleAction} className="flex flex-col gap-4">
          <label className="block">
            <span className="font-sans text-sm text-paper-muted">Masa tunggu (hari)</span>
            <input name="waitingDays" type="number" min={cfg.bounds.min} max={cfg.bounds.max} defaultValue={cfg.rule.waitingDays} required className={field} />
            <span className="mt-1 block font-sans text-xs text-paper-muted">Antara {cfg.bounds.min} dan {cfg.bounds.max} hari.</span>
          </label>

          <fieldset>
            <span className="font-sans text-sm text-paper-muted">Kanal konfirmasi</span>
            <div className="mt-2 flex flex-col gap-2">
              {cfg.allowedChannels.map((c) => (
                <label key={c} className="flex items-center gap-2 font-sans text-sm text-paper-text">
                  <input type="checkbox" name="channels" value={c} defaultChecked={cfg.rule.channels.includes(c)} />
                  {channelLabel[c] ?? c}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="rounded-lg bg-kertas/60 p-3 font-sans text-xs text-paper-muted">
            Kuorum wali: butuh {cfg.quorum.required} dari {cfg.quorum.of} wali untuk memulai proses rilis. Atur wali di Amanah.
          </div>

          <button className="rounded-lg bg-nyala px-4 py-3 font-sans font-medium text-white active:bg-nyala-pressed">
            Simpan aturan
          </button>
        </form>
      </Card>
    </div>
  );
}
```

#### 6. `apps/web/src/lib/supabase/middleware.ts`
**Action:** MODIFY — add `/rilis` to the protected prefixes
```typescript
// in the isProtected check, extend the list:
const protectedPrefixes = ["/beranda", "/aset", "/amanah", "/profil", "/rilis"]; // ← add /rilis
```

### VERIFICATION
- [ ] Signed-out → `/rilis` redirects to `/masuk` (middleware).
- [ ] Verified owner sees the form with waiting period defaulted from settings and channels pre-checked; unverified owner sees the "Verifikasi dulu" gate.
- [ ] Saving `waitingDays` below the settings floor or with zero channels throws the Bahasa validation error; a valid save persists `{ waitingDays, channels }` to `release_rule`.
- [ ] Quorum line reflects `trustees.quorum` from settings.
