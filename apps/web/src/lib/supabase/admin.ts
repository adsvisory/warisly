import "server-only";
import { createAdminClient } from "@warisly/db";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

export function adminClient() {
  return createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY);
}
