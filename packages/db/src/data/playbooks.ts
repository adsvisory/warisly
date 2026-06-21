import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssetCategory } from "./assets";

export interface PlaybookStep { order: number; text: string; }
export interface DossierDoc { key: string; label: string; }
export interface Playbook {
  id: string; providerKey: string | null; category: AssetCategory | null;
  title: string; version: number; steps: PlaybookStep[]; documents: DossierDoc[]; notes: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toPlaybook(r: any): Playbook {
  return {
    id: r.id, providerKey: r.provider_key, category: r.category, title: r.title,
    version: r.version, steps: r.steps ?? [], documents: r.documents ?? [], notes: r.notes,
  };
}

export async function listActivePlaybooks(supabase: SupabaseClient): Promise<Playbook[]> {
  const { data, error } = await supabase
    .from("wrs_playbooks")
    .select("id, provider_key, category, title, version, steps, documents, notes")
    .eq("is_active", true);
  if (error) throw new Error(`listActivePlaybooks failed: ${error.message}`);
  return (data as any[]).map(toPlaybook);
}
