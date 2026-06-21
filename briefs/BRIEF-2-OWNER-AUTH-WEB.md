# IMPLEMENTATION BRIEF: Owner Auth (Phone OTP) — apps/web
## Surface: web (`apps/web`)
## Brief: #2  (reissue — supersedes BRIEF-2-OWNER-AUTH-OWNER)
## Phase: 1 (MVP)
## Depends on: #0b, #1
## Blocks: #4c, #8a
## Parallel with: #3

### CONTEXT
Owner sign-in via Supabase phone OTP, session-refresh middleware, a protected `(app)` route group, and a profile upsert into `wrs_owners`. Profile write lives in `@warisly/db` (the only DB layer); auth SDK calls live in a server action.

### NON-NEGOTIABLE CHECK
No password stored (OTP only; passkey is P2). Profile upsert runs as the authenticated user through RLS (Brief #1), not service-role. DB write is in `packages/db/src/data`, not in the action. Bahasa-first copy.

### PRE-FLIGHT CHECKS
- [ ] Supabase Dashboard → Authentication → Providers → **Phone** enabled + SMS provider (e.g. Twilio) configured. OTP cannot send otherwise.
- [ ] `wrs_owners` with self-scoped RLS exists (Brief #1).
- [ ] `apps/web/src/lib/supabase/{server,client}.ts` exist (Brief #0b).

### FILES TO CREATE/MODIFY

#### 1. `packages/db/src/data/owners.ts`
**Action:** CREATE **Layer:** Data **Purpose:** RLS-aware owner-profile write.
```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

export async function upsertOwnerProfile(
  supabase: SupabaseClient,
  input: { id: string; phone: string | null },
) {
  const { error } = await supabase
    .from("wrs_owners")
    .upsert({ id: input.id, phone: input.phone }, { onConflict: "id" });
  if (error) throw new Error(`upsertOwnerProfile failed: ${error.message}`);
}
```

#### 2. `packages/db/src/index.ts`
**Action:** MODIFY **Layer:** Data **Purpose:** Export the new data module.
```typescript
export * from "./admin";
export * from "./types";
export * from "./data/owners"; // ← add
```

#### 3. `apps/web/src/lib/supabase/middleware.ts`
**Action:** CREATE **Layer:** Util **Purpose:** Refresh session each request + gate the app area.
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/beranda") || path.startsWith("/aset") ||
    path.startsWith("/amanah") || path.startsWith("/profil");
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/masuk";
    return NextResponse.redirect(url);
  }

  return response;
}
```

#### 4. `apps/web/middleware.ts`
**Action:** CREATE **Layer:** Middleware
```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.png$).*)"],
};
```

#### 5. `apps/web/src/app/actions/auth.ts`
**Action:** CREATE **Layer:** Server Action
```typescript
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { upsertOwnerProfile } from "@warisly/db";

export async function sendOtp(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  if (!phone) return { error: "Nomor telepon wajib diisi." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) return { error: "Gagal mengirim kode. Coba lagi." };
  return { ok: true, phone };
}

export async function verifyOtp(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (error || !data.user) return { error: "Kode salah atau kedaluwarsa." };
  await upsertOwnerProfile(supabase, { id: data.user.id, phone });
  redirect("/beranda");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/masuk");
}
```

#### 6. `apps/web/app/masuk/page.tsx`
**Action:** CREATE **Layer:** Page
```typescript
"use client";

import { useState } from "react";
import { sendOtp, verifyOtp } from "@/app/actions/auth";
import { copy } from "@warisly/lib";

export default function MasukPage() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSend(formData: FormData) {
    setPending(true); setError(null);
    const res = await sendOtp(formData);
    setPending(false);
    if (res?.error) return setError(res.error);
    if (res?.phone) { setPhone(res.phone); setStep("otp"); }
  }
  async function onVerify(formData: FormData) {
    setPending(true); setError(null);
    formData.set("phone", phone);
    const res = await verifyOtp(formData);
    setPending(false);
    if (res?.error) setError(res.error);
  }

  const field = "rounded-lg border border-paper-edge bg-white px-4 py-3 font-sans text-paper-text outline-none focus:border-nyala";
  const primary = "mt-2 rounded-lg bg-nyala px-4 py-3 font-sans font-medium text-white active:bg-nyala-pressed disabled:opacity-60";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="font-sans text-xs uppercase tracking-eyebrow text-emas">{copy.brand}</p>
      <h1 className="mt-3 font-display text-3xl text-tinta">Masuk</h1>
      <p className="mt-2 font-sans text-sm text-paper-muted">
        {copy.reassurePassword} — cukup nomor telepon.
      </p>

      {step === "phone" ? (
        <form action={onSend} className="mt-8 flex flex-col gap-3">
          <label className="font-sans text-sm text-paper-text" htmlFor="phone">Nomor telepon</label>
          <input id="phone" name="phone" type="tel" placeholder="+62…" required className={field} />
          <button type="submit" disabled={pending} className={primary}>
            {pending ? "Mengirim…" : "Kirim kode"}
          </button>
        </form>
      ) : (
        <form action={onVerify} className="mt-8 flex flex-col gap-3">
          <label className="font-sans text-sm text-paper-text" htmlFor="token">
            Masukkan kode dari SMS ke {phone}
          </label>
          <input id="token" name="token" inputMode="numeric" autoComplete="one-time-code" required className={`${field} tracking-widest`} />
          <button type="submit" disabled={pending} className={primary}>
            {pending ? "Memverifikasi…" : "Masuk"}
          </button>
          <button type="button" onClick={() => setStep("phone")} className="font-sans text-sm text-nyala underline">
            Ganti nomor
          </button>
        </form>
      )}
      {error && <p className="mt-4 font-sans text-sm text-red-700">{error}</p>}
    </main>
  );
}
```

#### 7. `apps/web/app/(app)/layout.tsx`
**Action:** CREATE **Layer:** Page **Purpose:** Server-guard the authenticated area.
```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");
  return <>{children}</>;
}
```

#### 8. `apps/web/app/(app)/beranda/page.tsx`
**Action:** CREATE **Layer:** Page **Purpose:** Placeholder home (replaced by the dashboard in #4c-i).
```typescript
import { signOut } from "@/app/actions/auth";

export default function Beranda() {
  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="font-display text-3xl text-tinta">Beranda</h1>
      <p className="mt-3 text-paper-text">Anda sudah masuk. Daftar aset akan tampil di sini.</p>
      <form action={signOut} className="mt-8">
        <button className="font-sans text-sm text-nyala underline">Keluar</button>
      </form>
    </main>
  );
}
```

### VERIFICATION
- [ ] `/beranda` while signed out → redirects to `/masuk`.
- [ ] Phone → SMS code → verify → lands on `/beranda`; a `wrs_owners` row exists for the user.
- [ ] A second user cannot read the first user's `wrs_owners` row (RLS).
- [ ] `signOut` clears the session → `/masuk`.
