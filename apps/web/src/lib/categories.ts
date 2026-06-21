import type { AssetCategory } from "@warisly/db";

export const assetCategoryLabel: Record<AssetCategory, string> = {
  saham: "Saham", reksa_dana: "Reksa Dana", bank: "Rekening Bank", e_wallet: "E-wallet",
  emas: "Emas", crypto: "Crypto", asuransi: "Asuransi", bpjs: "BPJS",
  properti: "Properti", fisik: "Aset Fisik", utang: "Utang", lainnya: "Lainnya",
};
