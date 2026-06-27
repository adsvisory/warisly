"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { KtpScan } from "@/components/kyc/KtpScan";
import { ocrOwnerKtpAction, commitOwnerKtpAction } from "./actions";

export default function OwnerKtpPage() {
  const t = useTranslations("ktp");
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <p className="font-sans text-[11px] font-semibold uppercase tracking-eyebrow text-emas">{t("ownerEyebrow")}</p>
      <h1 className="mt-2 font-display text-3xl text-tinta">{t("ownerTitle")}</h1>
      <p className="mt-2 font-serif text-[17px] leading-relaxed text-paper-muted">{t("ownerIntro")}</p>

      <div className="mt-6">
        <KtpScan
          onOcr={(img) => ocrOwnerKtpAction(img)}
          onConfirm={async (v) => {
            const r = await commitOwnerKtpAction(v);
            if (r.ok) router.push("/profil");
            return r;
          }}
        />
      </div>
    </div>
  );
}
