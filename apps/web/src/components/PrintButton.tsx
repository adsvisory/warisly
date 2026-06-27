"use client";

import { Button } from "@warisly/ui";
import { useTranslations } from "next-intl";

export function PrintButton() {
  const t = useTranslations();
  return (
    <Button variant="primary" onClick={() => window.print()}>
      {t("dosier.print")}
    </Button>
  );
}
