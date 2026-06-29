import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnerIdentity } from "@warisly/db";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");
  const identity = await getOwnerIdentity(supabase);
  return (
    <AppShell ownerName={identity?.fullName ?? null} ownerPhone={identity?.phone ?? user.phone ?? null}>
      {children}
    </AppShell>
  );
}
