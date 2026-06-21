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
