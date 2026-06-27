import type { AssetCategory, AssetCategoryInfo } from "@warisly/db";

// Ordered list of category keys. Used as a fallback for the AssetForm dropdown when
// the wrs_settings catalog is unavailable. Display labels live in the i18n dictionary
// under `assets.categories.<key>` — translate at call sites with
// `t(\`assets.categories.${category}\`)`.
export const assetCategories: AssetCategory[] = [
  "saham", "reksa_dana", "bank", "e_wallet",
  "emas", "crypto", "asuransi", "bpjs",
  "properti", "fisik", "utang", "lainnya",
];

/** Find a catalog entry by its category code. */
export function findCategory(
  categories: AssetCategoryInfo[],
  code: string,
): AssetCategoryInfo | null {
  return categories.find((c) => c.code === code) ?? null;
}

/** Group catalog entries for the dropdown, preserving catalog order within each group. */
export function groupCategories(
  categories: AssetCategoryInfo[],
): { group: string; items: AssetCategoryInfo[] }[] {
  const order: string[] = [];
  const byGroup = new Map<string, AssetCategoryInfo[]>();
  for (const c of categories) {
    if (!byGroup.has(c.group)) {
      byGroup.set(c.group, []);
      order.push(c.group);
    }
    byGroup.get(c.group)!.push(c);
  }
  return order.map((group) => ({ group, items: byGroup.get(group)! }));
}
