import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import {
  findOwnerIdByPhone, getOrCreateReleaseRequest, getRequestByToken,
  setRequestDocuments, recordEvent,
} from "@warisly/db";

const BUCKET = "release-docs";
const MAX_BYTES = 8 * 1024 * 1024;
const OK_MIME = ["application/pdf", "image/jpeg", "image/png"];

// Proof-gated claim entry. A release request + token is materialized ONLY when the
// heir actually uploads documents, and the caller's response is identical whether or
// not the phone matches a registered owner (claimToken is null on no-match). This
// removes the phone-number enumeration oracle and prevents anyone from opening a
// claim against a living owner just by knowing their number.
export async function submitClaim(phone: string, akta: File, kk: File): Promise<{ claimToken: string | null }> {
  const admin = adminClient();
  const ownerId = await findOwnerIdByPhone(admin, phone);
  if (!ownerId) return { claimToken: null }; // no match → create nothing; uniform UX upstream
  const req = await getOrCreateReleaseRequest(admin, ownerId);
  // Only attach documents (and pay the storage cost) while the claim is still at
  // intake; a re-submit against an in-flight claim is a no-op, not a storage flood.
  if (req.status === "initiated") {
    const aktaPath = await uploadDoc(admin, req.claimToken, "akta", akta);
    const kkPath = await uploadDoc(admin, req.claimToken, "kk", kk);
    const ok = await setRequestDocuments(admin, req.claimToken, { aktaPath, kkPath });
    if (!ok) throw new Error("Gagal menyimpan dokumen.");
    await recordEvent(admin, { ownerId, actor: "heir", eventType: "claim.initiated", subjectType: "release_request", subjectId: req.id });
    await recordEvent(admin, { ownerId, actor: "heir", eventType: "claim.documents_submitted", subjectType: "release_request", subjectId: req.id });
  }
  return { claimToken: req.claimToken };
}

async function uploadDoc(admin: ReturnType<typeof adminClient>, token: string, kind: "akta" | "kk", file: File): Promise<string> {
  if (!OK_MIME.includes(file.type)) throw new Error("Format file harus PDF, JPG, atau PNG.");
  if (file.size > MAX_BYTES) throw new Error("Ukuran file maksimal 8 MB.");
  const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  const path = `${token}/${kind}-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage.from(BUCKET).upload(path, buf, { contentType: file.type, upsert: false });
  if (error) throw new Error(`upload ${kind} failed: ${error.message}`);
  return path;
}

export async function submitDocuments(token: string, akta: File, kk: File): Promise<void> {
  const admin = adminClient();
  const req = await getRequestByToken(admin, token);
  if (!req || req.status !== "initiated") throw new Error("Klaim tidak ditemukan atau sudah melewati tahap ini.");
  const aktaPath = await uploadDoc(admin, token, "akta", akta);
  const kkPath = await uploadDoc(admin, token, "kk", kk);
  const ok = await setRequestDocuments(admin, token, { aktaPath, kkPath });
  if (!ok) throw new Error("Gagal menyimpan dokumen.");
  await recordEvent(admin, { ownerId: req.ownerId, actor: "heir", eventType: "claim.documents_submitted", subjectType: "release_request", subjectId: req.id });
}
