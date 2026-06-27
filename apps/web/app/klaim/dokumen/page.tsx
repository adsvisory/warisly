import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Seal } from "@warisly/ui";
import { ClaimDocsForm } from "@/components/ClaimDocsForm";

export const dynamic = "force-dynamic";

export default async function KlaimDokumen() {
  // Guard: only reachable after the phone step stashed a (cookie) value.
  const c = await cookies();
  if (!c.get("wrs_claim_phone")) redirect("/klaim");
  const t = await getTranslations("klaim");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <Seal size={56} />
      <p className="mt-4 font-sans text-xs uppercase tracking-eyebrow text-emas">Warisly</p>
      <h1 className="mt-2 font-display text-2xl text-tinta">{t("docsTitle")}</h1>
      <p className="mt-3 text-paper-text">{t("docsIntro")}</p>
      <ClaimDocsForm />
    </main>
  );
}
