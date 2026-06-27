// Scanned-asset extraction prompt + output type (#11b-i).
//
// CATEGORY_CODES are the canonical wrs_asset_category enum codes (migrations 0001 + 0011).
// They MUST match the catalog seeded into wrs_settings (migration 0012) 1:1, otherwise the
// review dropdown (#11b-iii) would reject an extracted value. Keep in sync with the enum in
// services/assets.ts (assetInputSchema).
export const CATEGORY_CODES = [
  "saham", "reksa_dana", "bank", "e_wallet", "emas", "crypto",
  "asuransi", "bpjs", "properti", "fisik", "utang", "lainnya",
  "obligasi", "p2p", "luar_negeri", "pensiun", "bisnis",
  "domain", "ip", "poin", "game",
] as const;

export type ExtractedAssetDraft = {
  imageKind: "financial_screenshot" | "offline_document" | "unknown";
  category: string | null; // one of CATEGORY_CODES
  provider: string | null; // free text, e.g. "Ajaib", "BCA"
  identifier: string | null; // email / account no / policy no — NEVER a secret
  valueEstimate: number | null; // normalized integer rupiah
  rawValueSeen: string | null; // exact string the model read, for human verify
  valueNote: string | null; // non-rupiah measure, e.g. "25 gram"
  currency: string; // default "IDR"
  documentNumber: string | null; // certificate/policy number if a document
  confidence: "high" | "medium" | "low";
  fieldsNeedingReview: string[]; // names of fields the owner should double-check
};

// Bahasa-first system prompt. Output is constrained by a JSON schema (response_format) in
// llm.ts, so this prompt focuses on classification + Indonesian normalization rules.
export const ASSET_EXTRACTION_PROMPT = `Anda membaca SATU gambar dari pengguna Indonesia dan mengekstrak satu aset keuangan (atau dokumen offline) menjadi JSON. Gunakan bahasa dan format Indonesia.

KLASIFIKASI imageKind:
- "financial_screenshot": tangkapan layar aplikasi/bank/broker/e-wallet yang menampilkan akun atau saldo.
- "offline_document": foto dokumen fisik (sertifikat tanah, BPKB, polis asuransi, bilyet deposito, dll.).
- "unknown": tidak dapat dipastikan.

CATEGORY (gunakan TEPAT salah satu kode ini atau null):
${CATEGORY_CODES.join(", ")}.

NORMALISASI RUPIAH (lokal Indonesia: "." = ribuan, "," = desimal):
- "Rp 1.200.000" -> 1200000
- "Rp 1,2 jt" / "Rp 1,2 juta" -> 1200000
- "Rp 80jt" / "80 jt" -> 80000000
- "Rp 350rb" / "350 ribu" -> 350000
- "Rp 1,5 M" / "1,5 miliar" -> 1500000000
Selalu isi rawValueSeen = teks persis yang Anda baca (mis. "Rp 1,2jt"). Jika nilainya satuan non-rupiah (mis. gram emas), set valueEstimate=null dan tulis ke valueNote (mis. "25 gram").

ATURAN KERAS:
- JANGAN PERNAH mengekstrak password, PIN, CVV, OTP, atau "kata sandi". Jika terlihat, abaikan. identifier hanya boleh berupa email, nomor akun, username, atau nomor polis/sertifikat.
- Jangan mengarang. Jika sebuah field tidak terlihat, gunakan null.
- valueEstimate adalah ESTIMASI; jika ragu, turunkan confidence dan tambahkan nama field ke fieldsNeedingReview.

Kembalikan HANYA objek JSON dengan kunci: imageKind, category, provider, identifier, valueEstimate, rawValueSeen, valueNote, currency, documentNumber, confidence, fieldsNeedingReview.`;
