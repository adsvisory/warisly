"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { KtpScan } from "@/components/kyc/KtpScan";
import { ocrHeirKtpAction, commitHeirKtpAction } from "./actions";

export default function HeirKtpPage() {
  const t = useTranslations("ktp");
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;

  return (
    <main className="mx-auto w-full max-w-[560px] px-6 py-12">
      <p className="font-sans text-[11px] font-semibold uppercase tracking-eyebrow text-emas">{t("heirEyebrow")}</p>
      <h1 className="mt-2 font-display text-3xl text-tinta">{t("heirTitle")}</h1>
      <p className="mt-2 font-serif text-[17px] leading-relaxed text-paper-muted">{t("heirIntro")}</p>

      <div className="mt-6">
        <KtpScan
          onOcr={(img) => ocrHeirKtpAction(token, img)}
          onConfirm={async (v) => {
            const r = await commitHeirKtpAction(token, v);
            if (r.ok) router.push(`/klaim/${token}`);
            return r;
          }}
        />
      </div>
    </main>
  );
}
