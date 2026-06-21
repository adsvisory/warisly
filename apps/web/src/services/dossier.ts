import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listAssets, listActivePlaybooks, getSetting,
  type Asset, type Playbook, type DossierDoc,
} from "@warisly/db";

function normalizeProvider(s: string | null): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchPlaybook(asset: Asset, playbooks: Playbook[]): Playbook | null {
  const norm = normalizeProvider(asset.provider);
  if (norm) {
    const byProvider = playbooks.find((p) => p.providerKey && norm.includes(p.providerKey));
    if (byProvider) return byProvider;
  }
  return playbooks.find((p) => !p.providerKey && p.category === asset.category) ?? null;
}

export interface DossierEntry { asset: Asset; playbook: Playbook | null; }
export interface Dossier {
  assets: DossierEntry[];
  liabilities: Asset[];
  documents: DossierDoc[]; // consolidated + deduped
  generatedAt: string;
}

export async function assembleDossier(supabase: SupabaseClient): Promise<Dossier> {
  const [all, playbooks, baseDocs] = await Promise.all([
    listAssets(supabase, { includeArchived: false }),
    listActivePlaybooks(supabase),
    getSetting<DossierDoc[]>(supabase, "dossier.base_documents"),
  ]);

  const entries: DossierEntry[] = all
    .filter((a) => !a.isLiability)
    .map((asset) => ({ asset, playbook: matchPlaybook(asset, playbooks) }));

  const docMap = new Map<string, DossierDoc>();
  for (const d of baseDocs ?? []) docMap.set(d.key, d);
  for (const e of entries) for (const d of e.playbook?.documents ?? []) docMap.set(d.key, d);

  return {
    assets: entries,
    liabilities: all.filter((a) => a.isLiability),
    documents: [...docMap.values()],
    generatedAt: new Date().toISOString(),
  };
}
