import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  listAssets, createAsset, updateAsset, archiveAsset,
  type Asset, type AssetInput,
} from "@warisly/db";

const STALE_MONTHS = 6;

export function isFresh(a: Asset): boolean {
  if (!a.lastReviewedAt) return false;
  const months = (Date.now() - new Date(a.lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
  return months <= STALE_MONTHS;
}

export interface Registry {
  assets: Asset[];
  liabilities: Asset[];
  total: number;
  freshCount: number;
  staleCount: number;
}

export async function getRegistry(supabase: SupabaseClient): Promise<Registry> {
  const all = await listAssets(supabase, { includeArchived: false });
  const assets = all.filter((a) => !a.isLiability);
  const liabilities = all.filter((a) => a.isLiability);
  const freshCount = all.filter(isFresh).length;
  return { assets, liabilities, total: all.length, freshCount, staleCount: all.length - freshCount };
}

export const assetInputSchema = z.object({
  category: z.enum(["saham","reksa_dana","bank","e_wallet","emas","crypto","asuransi","bpjs","properti","fisik","utang","lainnya"]),
  isLiability: z.boolean().default(false),
  provider: z.string().trim().max(120).nullable(),
  label: z.string().trim().max(120).nullable(),
  identifier: z.string().trim().max(200).nullable(),
  valueEstimate: z.number().int().nonnegative().nullable(),
  currency: z.string().default("IDR"),
  detail: z.record(z.unknown()).default({}),
  providerBeneficiarySet: z.boolean().nullable().default(null),
});

export type AssetFormValues = z.infer<typeof assetInputSchema>;

export async function addAsset(supabase: SupabaseClient, ownerId: string, values: unknown): Promise<Asset> {
  const v = assetInputSchema.parse(values);
  const input: AssetInput = { ...v, lastReviewedAt: new Date().toISOString() };
  return createAsset(supabase, ownerId, input);
}

export async function editAsset(supabase: SupabaseClient, id: string, values: unknown): Promise<Asset> {
  const v = assetInputSchema.partial().parse(values);
  return updateAsset(supabase, id, { ...v, lastReviewedAt: new Date().toISOString() });
}

export async function removeAsset(supabase: SupabaseClient, id: string): Promise<void> {
  return archiveAsset(supabase, id);
}
