# IMPLEMENTATION BRIEF: Amanah UI — Trustees & Confirmation
## Surface: web (`apps/web`)
## Brief: #7c-ii
## Phase: 1 (MVP)
## Depends on: #7b, #3
## Blocks: None
## Parallel with: #7c-i

### CONTEXT
The trustees sub-page (add, quorum status, shareable invite link, delete) and the **public** token-gated confirmation page a trustee opens to accept — no account, consistent with the heir-link model.

### NON-NEGOTIABLE CHECK
Trustees have no account; confirmation is gated by an unguessable UUID token, read/updated via service-role on a public route (the token IS the authorization). Owner management runs under RLS. Quorum comes from settings. The confirm page leads with the no-password reassurance. The public route requires no install/login (heir-link guardrail spirit). Bahasa-first.

### PRE-FLIGHT CHECKS
- [ ] `getAmanah`, `addTrustee`/`removeTrustee` (#7b); `getTrusteeByToken`/`confirmTrusteeByToken` (#7b); `adminClient()` (#0b).
- [ ] Middleware does NOT protect `/wali/*` (it protects `/amanah/*`) — confirm in `apps/web/src/lib/supabase/middleware.ts` (#2). `/wali` is public by design.

### FILES TO CREATE/MODIFY

#### 1. `apps/web/src/app/actions/amanah-trustees.ts`
**Action:** CREATE **Layer:** Server Action
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { addTrustee, removeTrustee } from "@/services/amanah";
import { confirmTrusteeByToken } from "@warisly/db";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");
  return { supabase, user };
}

export async function addTrusteeAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  await addTrustee(supabase, user.id, {
    name: String(formData.get("name") ?? ""),
    contactType: String(formData.get("contactType") ?? "whatsapp"),
    contactValue: String(formData.get("contactValue") ?? ""),
    role: String(formData.get("role") ?? "primary"),
  });
  revalidatePath("/amanah/wali");
}

export async function deleteTrusteeAction(formData: FormData) {
  const { supabase } = await requireUser();
  await removeTrustee(supabase, String(formData.get("id") ?? ""));
  revalidatePath("/amanah/wali");
}

// PUBLIC — no auth. Token-gated via service-role.
export async function confirmTrusteeAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  await confirmTrusteeByToken(adminClient(), token);
  redirect(`/wali/${token}`);
}
```

#### 2. `apps/web/src/components/InviteLink.tsx`
**Action:** CREATE **Layer:** Component **Purpose:** Owner shares this link with the trustee (manual delivery; no send infra in MVP).
```typescript
"use client";

import { useState } from "react";

export function InviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const url = `${window.location.origin}/wali/${token}`;
    navigator.clipboard.writeText(url).then(() => setCopied(true));
  }
  return (
    <div className="mt-2">
      <p className="font-sans text-xs text-paper-muted">Bagikan tautan undangan ini ke wali:</p>
      <button onClick={copy} className="mt-1 font-sans text-xs text-nyala underline">
        {copied ? "Tersalin!" : "Salin tautan undangan"}
      </button>
    </div>
  );
}
```

#### 3. `apps/web/app/(app)/amanah/wali/page.tsx`
**Action:** CREATE **Layer:** Page
```typescript
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAmanah } from "@/services/amanah";
import { Eyebrow, H1, Card } from "@warisly/ui";
import { addTrusteeAction, deleteTrusteeAction } from "@/app/actions/amanah-trustees";
import { InviteLink } from "@/components/InviteLink";

const contactLabel: Record<string, string> = { whatsapp: "WhatsApp", phone: "Telepon", email: "Email" };
const statusLabel: Record<string, string> = { invited: "Menunggu", confirmed: "Terkonfirmasi", declined: "Menolak" };
const roleLabel: Record<string, string> = { primary: "Utama", backup: "Cadangan" };

export default async function WaliPage() {
  const supabase = await createClient();
  const a = await getAmanah(supabase);
  const field = "rounded-lg border border-paper-edge bg-white px-3 py-2.5 font-sans text-sm text-paper-text outline-none focus:border-nyala";
  const addBtn = "rounded-lg bg-tinta px-4 py-2.5 font-sans text-sm font-medium text-ink-text";

  return (
    <div className="pb-8">
      <Link href="/amanah" className="font-sans text-sm text-nyala underline">← Amanah</Link>
      <Eyebrow>Wali Amanah</Eyebrow>
      <H1>Yang mengurus</H1>
      <p className="mt-2 font-sans text-sm text-paper-muted">
        {a.confirmedTrustees}/{a.quorum.required} terkonfirmasi. Kuorum {a.quorum.required}-dari-{a.quorum.of} diperlukan agar proses dapat dimulai. Sertakan cadangan agar rencana tetap jalan.
      </p>

      {a.trustees.map((t) => (
        <Card key={t.id} className="mt-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg text-tinta">{t.name}</p>
              <p className="font-sans text-xs text-paper-muted">{roleLabel[t.role]} · {contactLabel[t.contactType]}: {t.contactValue}</p>
              <p className={`font-sans text-xs ${t.status === "confirmed" ? "text-daun" : "text-amber-700"}`}>{statusLabel[t.status]}</p>
            </div>
            <form action={deleteTrusteeAction}>
              <input type="hidden" name="id" value={t.id} />
              <button className="font-sans text-xs text-paper-muted underline">Hapus</button>
            </form>
          </div>
          {t.status === "invited" && <InviteLink token={t.confirmToken} />}
        </Card>
      ))}

      <Card className="mt-4">
        <form action={addTrusteeAction} className="flex flex-col gap-2">
          <input name="name" placeholder="Nama wali" required className={field} />
          <select name="contactType" className={field}>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Telepon</option>
            <option value="email">Email</option>
          </select>
          <input name="contactValue" placeholder="Nomor / email" required className={field} />
          <select name="role" className={field}>
            <option value="primary">Utama</option>
            <option value="backup">Cadangan</option>
          </select>
          <button className={addBtn}>Tambah wali</button>
        </form>
      </Card>
    </div>
  );
}
```

#### 4. `apps/web/app/wali/[token]/page.tsx`
**Action:** CREATE **Layer:** Page **Purpose:** PUBLIC confirmation — no auth, no install. Token-gated read via service-role.
```typescript
import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { getTrusteeByToken } from "@warisly/db";
import { Seal } from "@warisly/ui";
import { confirmTrusteeAction } from "@/app/actions/amanah-trustees";
import { copy } from "@warisly/lib";

export const dynamic = "force-dynamic";

export default async function WaliConfirm({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const trustee = await getTrusteeByToken(adminClient(), token);
  if (!trustee) notFound();
  const confirmed = trustee.status === "confirmed";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <Seal size={56} />
      <p className="mt-4 font-sans text-xs uppercase tracking-eyebrow text-emas">{copy.brand}</p>
      <h1 className="mt-2 font-display text-2xl text-tinta">Undangan Wali Amanah</h1>
      <p className="mt-3 text-paper-text">
        Halo {trustee.name}, Anda diminta menjadi wali amanah — orang tepercaya yang mengurus warisan digital bila pemilik berhalangan.
      </p>
      <p className="mt-2 font-sans text-sm text-paper-muted">{copy.reassurePassword}</p>

      {confirmed ? (
        <p className="mt-6 font-sans text-sm text-daun">Konfirmasi tersimpan. Terima kasih.</p>
      ) : (
        <form action={confirmTrusteeAction} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <button className="w-full rounded-lg bg-nyala px-4 py-3 font-sans font-medium text-white active:bg-nyala-pressed">
            Saya bersedia
          </button>
        </form>
      )}
    </main>
  );
}
```

### VERIFICATION
- [ ] `/amanah/wali` lists trustees with role/contact/status; adding one shows "Menunggu" + a "Salin tautan undangan" link.
- [ ] Opening `/wali/<token>` (signed out, no account) shows the invitation; "Saya bersedia" flips the trustee to "Terkonfirmasi" and the page then shows the thank-you state.
- [ ] The quorum line on `/amanah/wali` updates as trustees confirm; `getAmanah().quorumMet` flips true at the required count.
- [ ] An invalid/forged token → 404; the confirm path never reveals other trustees.
