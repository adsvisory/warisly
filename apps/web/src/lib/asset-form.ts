export function parseAssetForm(formData: FormData) {
  const valueRaw = String(formData.get("valueEstimate") ?? "").replace(/[^\d]/g, "");
  const benef = String(formData.get("providerBeneficiarySet") ?? "");
  const category = String(formData.get("category") ?? "lainnya");
  return {
    category,
    isLiability: category === "utang",
    provider: String(formData.get("provider") ?? "").trim() || null,
    label: String(formData.get("label") ?? "").trim() || null,
    identifier: String(formData.get("identifier") ?? "").trim() || null,
    valueEstimate: valueRaw ? Number(valueRaw) : null,
    currency: "IDR",
    detail: { instructions: String(formData.get("instructions") ?? "").trim() },
    providerBeneficiarySet: benef === "" ? null : benef === "ya",
  };
}
