import "server-only";
import { createAdminClient } from "@warisly/db";

// Service-role client. Server-only — the admin console acts on user data
// exclusively via service-role (bypasses RLS), never in a client bundle.
export function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
