import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getStaffByEmail } from "@warisly/db";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PUBLIC = ["/masuk", "/auth/callback"];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p)) || pathname.startsWith("/_next")) return res;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (toSet: CookieToSet[]) => toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/masuk", req.url));

  // allowlist
  const staff = await getStaffByEmail(supabase, user.email ?? "");
  if (!staff?.active) { await supabase.auth.signOut(); return NextResponse.redirect(new URL("/masuk?denied=1", req.url)); }

  // MFA (AAL2) enforcement
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") {
    const target = aal?.nextLevel === "aal2" ? "/mfa" : "/mfa/enroll";
    if (!pathname.startsWith("/mfa")) return NextResponse.redirect(new URL(target, req.url));
  }
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
