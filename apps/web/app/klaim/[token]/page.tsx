import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Check, ArrowRight } from "lucide-react";
import { adminClient } from "@/lib/supabase/admin";
import { getReleaseStatusByToken } from "@warisly/db";
import { Seal } from "@warisly/ui";
import { ClaimDocsForm } from "@/components/ClaimDocsForm";

export const dynamic = "force-dynamic";

type TLState = "done" | "now" | "next";

function Timeline({ stage, labels }: { stage: number; labels: string[] }) {
  // stage = index of the step currently in progress (0-based); earlier = done, later = next.
  return (
    <ul className="mt-6 space-y-1">
      {labels.map((label, i) => {
        const state: TLState = i < stage ? "done" : i === stage ? "now" : "next";
        return (
          <li key={i} className="flex items-center gap-3 py-1.5">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                state === "done"
                  ? "bg-daun text-white"
                  : state === "now"
                    ? "bg-emas text-white"
                    : "border-[1.5px] border-paper-edge"
              }`}
            >
              {state === "done" && <Check size={11} strokeWidth={3} />}
            </span>
            <span className={`font-sans text-[13.5px] ${state === "next" ? "text-paper-muted" : "text-paper-text"}`}>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default async function KlaimToken({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("klaim");
  const tc = await getTranslations("common");
  const req = await getReleaseStatusByToken(adminClient(), token);
  if (!req) notFound();

  const tlLabels = [t("tlDocs"), t("tlIdentity"), t("tlReview"), t("tlReleased")];

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="flex flex-col items-center text-center">
        <Seal size={48} />
        <p className="mt-4 font-sans text-xs uppercase tracking-eyebrow text-emas">Warisly</p>
        <h1 className="mt-2 font-display text-2xl text-tinta">{t("statusTitle")}</h1>
      </div>

      <div className="mt-6 rounded-2xl border border-paper-edge bg-panel p-6">
        {req.status === "initiated" && (
          <>
            <div className="flex items-center gap-2 font-sans text-xs font-semibold text-emas">
              {t("step1")}
              <span className="ml-1 h-1 flex-1 overflow-hidden rounded-full bg-paper-edge">
                <span className="block h-full w-1/2 bg-emas" />
              </span>
            </div>
            <ClaimDocsForm token={token} />
          </>
        )}

        {req.status === "documents_submitted" && (
          <>
            <p className="font-serif text-[16px] leading-relaxed text-paper-text">{t("docsReceived")}</p>
            <Timeline stage={1} labels={tlLabels} />
          </>
        )}

        {req.status === "under_review" && (
          <>
            <p className="font-serif text-[16px] leading-relaxed text-paper-text">{t("underReview")}</p>
            <Timeline stage={2} labels={tlLabels} />
          </>
        )}

        {(req.status === "approved" || req.status === "waiting_period") && (
          <>
            <p className="font-serif text-[16px] leading-relaxed text-paper-text">{t("waiting")}</p>
            <Timeline stage={3} labels={tlLabels} />
          </>
        )}

        {req.status === "released" && (
          <a
            href={`/klaim/${token}/dosier`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-tinta px-4 py-3 font-sans text-sm font-semibold text-ink-text transition hover:bg-tinta-hover"
          >
            {tc("viewRecovery")} <ArrowRight size={16} />
          </a>
        )}

        {(req.status === "rejected" || req.status === "cancelled") && (
          <p className="font-serif text-[16px] leading-relaxed text-paper-text">{t("rejected")}</p>
        )}
      </div>
    </main>
  );
}
