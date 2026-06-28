import { getTranslations } from "next-intl/server";
import { PublicLangToggle } from "@/components/PublicLangToggle";

export default async function Home() {
  const t = await getTranslations();
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
      <PublicLangToggle />
      <p className="font-sans text-xs uppercase tracking-eyebrow text-emas">{t("common.brand")}</p>
      <h1 className="mt-3 font-display text-4xl text-tinta">{t("landing.tagline")}</h1>
      <p className="mt-6 font-sans text-sm text-paper-muted">{t("common.reassure")}</p>
    </main>
  );
}
