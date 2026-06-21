# IMPLEMENTATION BRIEF: Heir Claim — Entry & Documents
## Surface: web (`apps/web`) — heir surface
## Brief: #9b-ii
## Phase: 1 (MVP)
## Depends on: #9b-i, #0b, #3
## Blocks: #9b-iii
## Parallel with: None

### CONTEXT
The public heir surface: a no-account entry page that starts a claim by the deceased's registered phone, and a token-bound page that uploads the akta kematian + KK to the private bucket, then shows status as the claim progresses.

### NON-NEGOTIABLE CHECK
Cardinal #4 — the heir surface is a plain web link: no install, no account, no login. Reads/writes go through service-role server actions gated by the unguessable `claim_token` (Option A). Documents land in the private `release-docs` bucket via service-role; nothing is public. **Initiating a claim is silent** — the owner is NOT pinged here; the safety ping fires only after identity verification + review (#9d), so a living owner can't be spammed by claim attempts. File type/size validated. Every step audited via `recordEvent`. No credentials, no biometrics in this brief.

> Note (accepted MVP trade-off): entering a phone reveals whether that number is registered. This leaks only registration status — never any registry content — and a release still requires heir eKYC + dual-control + waiting period. Hardening (claim codes shared by the owner) is a later option.

### PRE-FLIGHT CHECKS
- [ ] Release data layer + `release-docs` bucket exist (#9b-i, #9a).
- [ ] `adminClient()` (#0b), `findOwnerIdByPhone` exported from `@warisly/db` (#5a-ii), `Seal` (#3).
- [ ] `/klaim` is NOT in the middleware protected prefixes (it must be public).

### FILES TO CREATE/MODIFY

#### 1. `apps/web/src/services/release-claim.ts`
**Action:** CREATE **Layer:** Service
```typescript
import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import {
  findOwnerIdByPhone, getOrCreateReleaseRequest, getRequestByToken,
  setRequestDocuments, recordEvent,
} from "@warisly/db";

const BUCKET = "release-docs";
const MAX_BYTES = 8 * 1024 * 1024;
const OK_MIME = ["application/pdf", "image/jpeg", "image/png"];

export async function startClaimByPhone(phone: string): Promise<{ found: boolean; claimToken?: string }> {
  const admin = adminClient();
  const ownerId = await findOwnerIdByPhone(admin, phone);
  if (!ownerId) return { found: false };
  const req = await getOrCreateReleaseRequest(admin, ownerId);
  await recordEvent(admin, { ownerId, actor: "heir", eventType: "claim.initiated", subjectType: "release_request", subjectId: req.id });
  return { found: true, claimToken: req.claimToken };
}

async function uploadDoc(admin: ReturnType<typeof adminClient>, token: string, kind: "akta" | "kk", file: File): Promise<string> {
  if (!OK_MIME.includes(file.type)) throw new Error("Format file harus PDF, JPG, atau PNG.");
  if (file.size > MAX_BYTES) throw new Error("Ukuran file maksimal 8 MB.");
  const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  const path = `${token}/${kind}-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage.from(BUCKET).upload(path, buf, { contentType: file.type, upsert: false });
  if (error) throw new Error(`upload ${kind} failed: ${error.message}`);
  return path;
}

export async function submitDocuments(token: string, akta: File, kk: File): Promise<void> {
  const admin = adminClient();
  const req = await getRequestByToken(admin, token);
  if (!req || req.status !== "initiated") throw new Error("Klaim tidak ditemukan atau sudah melewati tahap ini.");
  const aktaPath = await uploadDoc(admin, token, "akta", akta);
  const kkPath = await uploadDoc(admin, token, "kk", kk);
  const ok = await setRequestDocuments(admin, token, { aktaPath, kkPath });
  if (!ok) throw new Error("Gagal menyimpan dokumen.");
  await recordEvent(admin, { ownerId: req.ownerId, actor: "heir", eventType: "claim.documents_submitted", subjectType: "release_request", subjectId: req.id });
}
```

#### 2. `apps/web/src/app/actions/claim.ts`
**Action:** CREATE **Layer:** Server Action
```typescript
"use server";

import { redirect } from "next/navigation";
import { startClaimByPhone, submitDocuments } from "@/services/release-claim";

export async function startClaimAction(_prev: unknown, formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  if (!phone) return { error: "Nomor telepon wajib diisi." };
  const res = await startClaimByPhone(phone);
  if (!res.found) return { error: "Kami tidak menemukan data atas nomor ini. Hubungi dukungan jika Anda yakin terdaftar." };
  redirect(`/klaim/${res.claimToken}`);
}

export async function uploadDocsAction(_prev: unknown, formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const akta = formData.get("akta");
  const kk = formData.get("kk");
  if (!(akta instanceof File) || !(kk instanceof File) || akta.size === 0 || kk.size === 0) {
    return { error: "Unggah akta kematian dan kartu keluarga (KK)." };
  }
  try {
    await submitDocuments(token, akta, kk);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal mengunggah." };
  }
  redirect(`/klaim/${token}`);
}
```

#### 3. `apps/web/app/klaim/page.tsx`
**Action:** CREATE **Layer:** Page (public)
```typescript
"use client";

import { useActionState } from "react";
import { startClaimAction } from "@/app/actions/claim";
import { Seal } from "@warisly/ui";

export default function KlaimPage() {
  const [state, action, pending] = useActionState(startClaimAction, null);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <Seal size={56} />
      <p className="mt-4 font-sans text-xs uppercase tracking-eyebrow text-emas">Warisly</p>
      <h1 className="mt-2 font-display text-2xl text-tinta">Memulai proses warisan</h1>
      <p className="mt-3 text-paper-text">
        Untuk keluarga yang ditinggalkan. Masukkan nomor telepon terdaftar milik orang yang telah berpulang untuk memulai. Tidak perlu membuat akun.
      </p>
      <form action={action} className="mt-6 flex flex-col gap-3">
        <input name="phone" type="tel" placeholder="+62…" required className="rounded-lg border border-paper-edge bg-white px-4 py-3 font-sans text-paper-text outline-none focus:border-nyala" />
        <button disabled={pending} className="rounded-lg bg-nyala px-4 py-3 font-sans font-medium text-white active:bg-nyala-pressed disabled:opacity-60">
          {pending ? "Memeriksa…" : "Mulai"}
        </button>
      </form>
      {state?.error && <p className="mt-4 font-sans text-sm text-paper-muted">{state.error}</p>}
    </main>
  );
}
```

#### 4. `apps/web/src/components/ClaimDocsForm.tsx`
**Action:** CREATE **Layer:** Component (client)
```typescript
"use client";

import { useActionState } from "react";
import { uploadDocsAction } from "@/app/actions/claim";

export function ClaimDocsForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(uploadDocsAction, null);
  const field = "mt-1 w-full rounded-lg border border-paper-edge bg-white px-3 py-2.5 font-sans text-sm text-paper-text";
  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <label className="block">
        <span className="font-sans text-sm text-paper-muted">Akta kematian (PDF/JPG/PNG)</span>
        <input name="akta" type="file" accept="application/pdf,image/jpeg,image/png" required className={field} />
      </label>
      <label className="block">
        <span className="font-sans text-sm text-paper-muted">Kartu Keluarga / KK (PDF/JPG/PNG)</span>
        <input name="kk" type="file" accept="application/pdf,image/jpeg,image/png" required className={field} />
      </label>
      <button disabled={pending} className="rounded-lg bg-nyala px-4 py-3 font-sans font-medium text-white active:bg-nyala-pressed disabled:opacity-60">
        {pending ? "Mengunggah…" : "Unggah dokumen"}
      </button>
      {state?.error && <p className="font-sans text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
```

#### 5. `apps/web/app/klaim/[token]/page.tsx`
**Action:** CREATE **Layer:** Page (public) **Purpose:** Status-driven heir surface. Identity step (#9b-iii) and dossier (#9e) extend this.
```typescript
import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { getRequestByToken } from "@warisly/db";
import { Seal } from "@warisly/ui";
import { ClaimDocsForm } from "@/components/ClaimDocsForm";

export const dynamic = "force-dynamic";

export default async function KlaimToken({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const req = await getRequestByToken(adminClient(), token);
  if (!req) notFound();

  return (
    <main className="mx-auto max-w-sm px-6 py-12">
      <Seal size={48} />
      <p className="mt-4 font-sans text-xs uppercase tracking-eyebrow text-emas">Warisly</p>
      <h1 className="mt-2 font-display text-2xl text-tinta">Proses warisan</h1>

      {req.status === "initiated" && (
        <>
          <p className="mt-3 text-paper-text">Langkah 1 dari 2 — unggah dokumen resmi.</p>
          <ClaimDocsForm token={token} />
        </>
      )}

      {req.status === "documents_submitted" && (
        <p className="mt-3 text-paper-text">Dokumen diterima. Langkah berikutnya adalah verifikasi identitas Anda.</p>
      )}

      {req.status === "under_review" && (
        <p className="mt-3 text-paper-text">Terima kasih. Permohonan sedang ditinjau tim kami, dan keluarga akan dihubungi melalui kanal terdaftar. Mohon menunggu.</p>
      )}

      {(req.status === "approved" || req.status === "waiting_period") && (
        <p className="mt-3 text-paper-text">Permohonan disetujui dan dalam masa tunggu keamanan. Setelah masa tunggu selesai, panduan akan tersedia di halaman ini.</p>
      )}

      {req.status === "released" && (
        <a href={`/klaim/${token}/dosier`} className="mt-5 inline-block rounded-lg bg-nyala px-4 py-3 font-sans font-medium text-white active:bg-nyala-pressed">
          Lihat panduan pemulihan
        </a>
      )}

      {(req.status === "rejected" || req.status === "cancelled") && (
        <p className="mt-3 text-paper-text">Permohonan ini tidak dapat dilanjutkan. Silakan hubungi dukungan Warisly.</p>
      )}
    </main>
  );
}
```

### VERIFICATION
- [ ] Signed-out, no account: `/klaim` → enter a registered owner's phone → redirected to `/klaim/<token>` showing the document step; an unregistered phone → friendly "not found" message (no redirect).
- [ ] Uploading akta + KK stores two objects under `<token>/` in the private `release-docs` bucket; the request moves to `documents_submitted`; an anon client cannot read those objects.
- [ ] A non-PDF/JPG/PNG or >8 MB file is rejected with a Bahasa error.
- [ ] Initiating a claim writes a `claim.initiated` event but sends NO ping to the owner.
- [ ] Re-initiating for the same owner returns the same active claim (no duplicate request).
