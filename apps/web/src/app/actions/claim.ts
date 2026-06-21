"use server";

import { redirect } from "next/navigation";
import { startClaimByPhone, submitDocuments } from "@/services/release-claim";

export async function startClaimAction(_prev: unknown, formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  if (!phone) return { error: "Nomor telepon wajib diisi." };
  const res = await startClaimByPhone(phone);
  if (!res.found) return { error: "Kami tidak menemukan data atas nomor ini. Hubungi dukungan jika Anda yakin terdaftar." };
  redirect(`/klaim/${res.claimToken}`);
}

export async function uploadDocsAction(_prev: unknown, formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const akta = formData.get("akta");
  const kk = formData.get("kk");
  if (!(akta instanceof File) || !(kk instanceof File) || akta.size === 0 || kk.size === 0) {
    return { error: "Unggah akta kematian dan kartu keluarga (KK)." };
  }
  try {
    await submitDocuments(token, akta, kk);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal mengunggah." };
  }
  redirect(`/klaim/${token}`);
}
