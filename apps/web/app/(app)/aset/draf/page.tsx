import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { listDrafts } from "@warisly/db";
import { Eyebrow, H1, Card } from "@warisly/ui";

export default async function DrafPage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const drafts = await listDrafts(supabase, "pending");
  return (
    <div>
      <Eyebrow>{t("drafts.fromWhatsapp")}</Eyebrow>
      <H1>{t("drafts.inboxTitle")}</H1>
      {drafts.length === 0 ? (
        <p className="mt-4 text-sm text-paper-muted">{t("drafts.none")}</p>
      ) : (
        drafts.map((d) => (
          <Link key={d.id} href={`/aset/draf/${d.id}`}>
            <Card className="mt-3">
              <p className="font-display text-lg text-tinta">{d.provider ?? (d.category ? t(`assets.categories.${d.category}`) : t("drafts.assetFallback"))}</p>
              <p className="font-sans text-xs text-paper-muted">{d.label ?? t("drafts.tapReview")}</p>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}
