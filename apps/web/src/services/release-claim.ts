import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import {
  findOwnerIdByPhone, getOrCreateReleaseRequest, getRequestByToken,
  setRequestDocuments, recordEvent,
} from "@warisly/db";

const BUCKET = "release-docs";
const MAX_BYTES = 8 * 1024 * 1024;
const OK_MIME = ["application/pdf", "image/jpeg", "image/png"];

export async function startClaimByPhone(phone: string): Promise<{ found: boolean; claimToken?: string }> {
  const admin = adminClient();
  const ownerId = await findOwnerIdByPhone(admin, phone);
  if (!ownerId) return { found: false };
  const req = await getOrCreateReleaseRequest(admin, ownerId);
  await recordEvent(admin, { ownerId, actor: "heir", eventType: "claim.initiated", subjectType: "release_request", subjectId: req.id });
  return { found: true, claimToken: req.claimToken };
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
