"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, IdCard, Plus, Check, Loader2 } from "lucide-react";
import { submitClaimAction, uploadDocsAction } from "@/app/actions/claim";

function UploadTile({ name, label, Icon }: { name: string; label: string; Icon: typeof FileText }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const done = !!fileName;
  return (
    <label
      className={`mt-3 flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-4 py-3.5 transition ${
        done ? "border-daun bg-daun/[0.04]" : "border-dashed border-paper-edge hover:border-emas"
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-kertas text-daun">
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-sm font-semibold text-paper-text">{label}</span>
        <span className="block truncate font-sans text-xs text-paper-muted">{fileName ?? "—"}</span>
      </span>
      <span className={done ? "text-daun" : "text-paper-muted"}>{done ? <Check size={20} /> : <Plus size={20} />}</span>
      <input
        name={name}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        required
        className="sr-only"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
    </label>
  );
}

// `token` present → legacy continue-a-claim path (uploadDocsAction). Absent → the
// proof-gated front door (submitClaimAction), which reads the phone from a cookie.
export function ClaimDocsForm({ token }: { token?: string }) {
  const t = useTranslations("klaim");
  const [state, action, pending] = useActionState(token ? uploadDocsAction : submitClaimAction, null);
  return (
    <form action={action} className="mt-5 flex flex-col">
      {token && <input type="hidden" name="token" value={token} />}
      <UploadTile name="akta" label={t("aktaLabel")} Icon={FileText} />
      <UploadTile name="kk" label={t("kkLabel")} Icon={IdCard} />
      <button
        disabled={pending}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-tinta px-4 py-3 font-sans text-sm font-semibold text-ink-text transition hover:bg-tinta-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
      >
        {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
        {pending ? t("uploading") : t("upload")}
      </button>
      {state?.error && <p className="mt-3 font-sans text-sm text-red-700">{t(state.error)}</p>}
    </form>
  );
}
