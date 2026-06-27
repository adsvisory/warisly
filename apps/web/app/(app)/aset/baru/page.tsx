import { getTranslations } from "next-intl/server";
import { Eyebrow, H1 } from "@warisly/ui";
import { AssetForm } from "@/components/AssetForm";

export default async function BaruPage() {
  const t = await getTranslations();
  return (
    <div>
      <Eyebrow>{t("common.brand")}</Eyebrow>
      <H1>{t("assets.newTitle")}</H1>
      <AssetForm />
    </div>
  );
}
