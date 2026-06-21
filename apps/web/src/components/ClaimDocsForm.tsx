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
