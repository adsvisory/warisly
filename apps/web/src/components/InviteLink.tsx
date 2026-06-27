"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function InviteLink({ token }: { token: string }) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  function copyLink() {
    const url = `${window.location.origin}/wali/${token}`;
    navigator.clipboard.writeText(url).then(() => setCopied(true));
  }
  return (
    <div className="mt-2">
      <p className="font-sans text-xs text-paper-muted">{t("wali.inviteHelp")}</p>
      <button onClick={copyLink} className="mt-1 font-sans text-xs text-emas underline">
        {copied ? t("wali.copied") : t("wali.copyLink")}
      </button>
    </div>
  );
}
