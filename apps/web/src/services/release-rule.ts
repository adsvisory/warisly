import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getReleaseRule, setReleaseRule, getSetting, type ReleaseRule } from "@warisly/db";

interface Bounds { default: number; min: number; max: number; }
interface Quorum { required: number; of: number; }

export interface ReleaseConfig {
  eligible: boolean;
  rule: ReleaseRule;
  bounds: Bounds;
  allowedChannels: string[];
  quorum: Quorum;
}

export async function getReleaseConfig(supabase: SupabaseClient): Promise<ReleaseConfig> {
  const [current, dflt, channels, quorum] = await Promise.all([
    getReleaseRule(supabase),
    getSetting<Bounds>(supabase, "release.waiting_period_days"),
    getSetting<string[]>(supabase, "release.ping_channels"),
    getSetting<Quorum>(supabase, "trustees.quorum"),
  ]);
  // Safety-critical tunables MUST come from config (wrs_settings), never code.
  // Fail closed: if a setting is missing we refuse to proceed rather than fall back
  // to a magic number that could silently widen the waiting window or quorum.
  if (!dflt || !channels || !quorum) {
    throw new Error(
      "Release configuration missing from wrs_settings (waiting_period_days / ping_channels / trustees.quorum). Refusing to fall back to hardcoded defaults.",
    );
  }
  const bounds = dflt;
  const allowedChannels = channels;
  const q = quorum;
  return {
    eligible: current.eligible,
    rule: current.rule ?? { waitingDays: bounds.default, channels: ["whatsapp"] },
    bounds,
    allowedChannels,
    quorum: q,
  };
}

export async function saveReleaseRule(supabase: SupabaseClient, ownerId: string, values: { waitingDays: unknown; channels: string[] }): Promise<void> {
  const cfg = await getReleaseConfig(supabase);
  if (!cfg.eligible) throw new Error("Identitas belum terverifikasi.");
  const waitingDays = Number(values.waitingDays);
  if (!Number.isInteger(waitingDays) || waitingDays < cfg.bounds.min || waitingDays > cfg.bounds.max) {
    throw new Error(`Masa tunggu harus antara ${cfg.bounds.min} dan ${cfg.bounds.max} hari.`);
  }
  const channels = values.channels.filter((c) => cfg.allowedChannels.includes(c));
  if (channels.length === 0) throw new Error("Pilih minimal satu kanal konfirmasi.");
  await setReleaseRule(supabase, ownerId, { waitingDays, channels });
}
