"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { submitClaim, submitDocuments } from "@/services/release-claim";

const PHONE_COOKIE = "wrs_claim_phone";
const TOKEN_COOKIE = "wrs_claim_token";
const SECURE = process.env.NODE_ENV === "production";

export async function startClaimAction(_prev: unknown, formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  if (!phone) return { error: "phoneRequired" };
  // Deliberately do NOT look up the owner or create anything here: that would reveal
  // which numbers are registered and let anyone open a claim against a living owner.
  // Stash the phone and move to the document step; the claim is materialized only
  // after real documents are uploaded.
  const c = await cookies();
  c.set(PHONE_COOKIE, phone, { httpOnly: true, secure: SECURE, sameSite: "lax", path: "/klaim", maxAge: 1800 });
  redirect("/klaim/dokumen");
}

export async function submitClaimAction(_prev: unknown, formData: FormData) {
  const c = await cookies();
  const phone = c.get(PHONE_COOKIE)?.value?.trim();
  if (!phone) return { error: "sessionExpired" };
  const akta = formData.get("akta");
  const kk = formData.get("kk");
  if (!(akta instanceof File) || !(kk instanceof File) || akta.size === 0 || kk.size === 0) {
    return { error: "docsRequired" };
  }
  let claimToken: string | null = null;
  try {
    ({ claimToken } = await submitClaim(phone, akta, kk));
  } catch {
    return { error: "uploadFailed" };
  }
  c.delete(PHONE_COOKIE);
  // Set the status cookie only on a real match — but either way we redirect to the
  // same confirmation page, so the response does not reveal whether the number matched.
  if (claimToken) {
    c.set(TOKEN_COOKIE, claimToken, { httpOnly: true, secure: SECURE, sameSite: "lax", path: "/klaim", maxAge: 60 * 60 * 24 * 14 });
  }
  redirect("/klaim/terkirim");
}

export async function uploadDocsAction(_prev: unknown, formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const akta = formData.get("akta");
  const kk = formData.get("kk");
  if (!(akta instanceof File) || !(kk instanceof File) || akta.size === 0 || kk.size === 0) {
    return { error: "docsRequired" };
  }
  try {
    await submitDocuments(token, akta, kk);
  } catch {
    return { error: "uploadFailed" };
  }
  redirect(`/klaim/${token}`);
}
