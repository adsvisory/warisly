"use client";

import { createAssetAction, updateAssetAction } from "@/app/actions/assets";
import { assetCategoryLabel } from "@/lib/categories";
import { copy } from "@warisly/lib";
import type { Asset } from "@warisly/db";

export function AssetForm({ initial, action: actionProp, hidden, submitLabel }: {
  initial?: Partial<Asset>;
  action?: (fd: FormData) => void | Promise<void>;
  hidden?: Record<string, string>;
  submitLabel?: string;
}) {
  const editing = !!initial?.id;
  const action = actionProp ?? (editing ? updateAssetAction : createAssetAction);
  const field = "rounded-lg border border-paper-edge bg-white px-4 py-3 font-sans text-paper-text outline-none focus:border-nyala";
  const instructions = (initial?.detail as { instructions?: string } | undefined)?.instructions ?? "";
  const benefDefault = initial?.providerBeneficiarySet == null ? "" : initial.providerBeneficiarySet ? "ya" : "tidak";

  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      {editing && initial?.id && <input type="hidden" name="id" value={initial.id} />}
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}

      <label className="font-sans text-sm text-paper-text">Jenis aset</label>
      <select name="category" defaultValue={initial?.category ?? "saham"} className={field}>
        {Object.entries(assetCategoryLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>

      <label className="font-sans text-sm text-paper-text">Penyedia (mis. Ajaib, BCA, GoPay)</label>
      <input name="provider" defaultValue={initial?.provider ?? ""} className={field} />

      <label className="font-sans text-sm text-paper-text">Nama / label</label>
      <input name="label" defaultValue={initial?.label ?? ""} className={field} />

      <label className="font-sans text-sm text-paper-text">Pengenal akun — email/nomor, <strong>bukan password</strong></label>
      <input name="identifier" defaultValue={initial?.identifier ?? ""} className={field} />

      <label className="font-sans text-sm text-paper-text">Perkiraan nilai (Rp, estimasi)</label>
      <input name="valueEstimate" inputMode="numeric" defaultValue={initial?.valueEstimate?.toString() ?? ""} className={field} />

      <label className="font-sans text-sm text-paper-text">Apakah penyedia sudah mencatat ahli waris / penerima manfaat?</label>
      <select name="providerBeneficiarySet" defaultValue={benefDefault} className={field}>
        <option value="">Belum tahu</option>
        <option value="ya">Ya</option>
        <option value="tidak">Tidak</option>
      </select>
      <span className="font-sans text-xs text-paper-muted">
        Mis. ahli waris di asuransi/BPJS/bank yang bisa klaim langsung ke penyedia. Ini bukan daftar penerima di Warisly (atur itu di Amanah).
      </span>

      <label className="font-sans text-sm text-paper-text">Catatan untuk keluarga</label>
      <textarea name="instructions" defaultValue={instructions} rows={3} className={field} />

      <p className="font-sans text-xs text-paper-muted">{copy.reassurePassword}</p>
      <button type="submit" className="mt-2 rounded-lg bg-nyala px-4 py-3 font-sans font-medium text-white active:bg-nyala-pressed">
        {submitLabel ?? copy.actions.save}
      </button>
    </form>
  );
}
