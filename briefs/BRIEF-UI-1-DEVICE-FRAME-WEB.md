# IMPLEMENTATION BRIEF: Desktop Device Frame (mobile app feel)
## Surface: web (`apps/web`) — owner app shell
## Brief: #UI-1
## Phase: 1 (MVP)
## Depends on: #3 (AppShell exists)
## Blocks: None
## Parallel with: None

### CONTEXT
On desktop the mobile-first owner app renders as a narrow column in a wide cream page. This wraps the logged-in `(app)` area in a tasteful phone frame on desktop (`md:`+) while staying full-bleed on real mobile, and fixes the bottom nav so it pins *inside* the frame rather than to the browser viewport.

### NON-NEGOTIABLE CHECK
Pure presentational change — no data, RLS, release, or copy touched. Bahasa copy unchanged. Real-mobile experience is unchanged (full-bleed). The dossier print path is preserved (frame/scroll collapse under `print:`). Only the authenticated `(app)` surface is framed; public/landing/heir surfaces stay responsive full-width (a shareable heir link must never be locked into a phone frame). Brand-disciplined: no fake status bar/notch — calm heritage tone preserved.

### PRE-FLIGHT CHECKS
- [ ] `apps/web/src/components/layout/AppShell.tsx` exists (#3) and `(app)/layout.tsx` renders it.
- [ ] Tailwind ≥ 3.4 (repo uses ^3.4.14 → `h-dvh`/`min-h-dvh` available).
- [ ] Tokens `tinta` / `kertas` / `paper-edge` exist in the preset.

### FILES TO CREATE/MODIFY

#### 1. `apps/web/src/components/layout/DeviceFrame.tsx`
**Action:** CREATE **Layer:** Component **Purpose:** Desktop phone chrome; passthrough on mobile; collapses for print.
```typescript
export function DeviceFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-kertas md:flex md:min-h-dvh md:items-center md:justify-center md:bg-tinta md:p-6 print:block print:min-h-0 print:bg-white print:p-0">
      <div
        className="
          h-dvh w-full overflow-hidden bg-kertas
          md:h-[860px] md:max-h-[calc(100dvh-3rem)] md:w-[400px]
          md:rounded-[2.75rem] md:border-[10px] md:border-[#10142b] md:shadow-2xl
          print:h-auto print:max-h-none print:w-full print:overflow-visible print:rounded-none print:border-0 print:shadow-none
        "
      >
        {children}
      </div>
    </div>
  );
}
```

#### 2. `apps/web/src/components/layout/AppShell.tsx`
**Action:** MODIFY **Layer:** Component **Purpose:** Fixed-height flex column — content scrolls, nav pinned inside the frame (not viewport-fixed).
Replace the whole file with:
```typescript
import Link from "next/link";
import { Home, Wallet, Users, User } from "lucide-react";
import { copy } from "@warisly/lib";

const items = [
  { href: "/beranda", label: copy.nav.home, Icon: Home },
  { href: "/aset", label: copy.nav.assets, Icon: Wallet },
  { href: "/amanah", label: copy.nav.amanah, Icon: Users },
  { href: "/profil", label: copy.nav.profile, Icon: User },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col print:block print:h-auto">
      <main className="flex-1 overflow-y-auto px-6 pt-8 pb-6 print:overflow-visible">
        {children}
      </main>
      <nav className="shrink-0 border-t border-paper-edge bg-kertas/95 backdrop-blur print:hidden">
        <ul className="grid grid-cols-4">
          {items.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex flex-col items-center gap-1 py-3 font-sans text-xs text-tinta"
              >
                <Icon size={20} /> {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
```

#### 3. `apps/web/app/(app)/layout.tsx`
**Action:** MODIFY **Layer:** Page **Purpose:** Wrap the shell in the device frame.
```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { DeviceFrame } from "@/components/layout/DeviceFrame"; // ← add

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");
  return (
    <DeviceFrame>
      <AppShell>{children}</AppShell>
    </DeviceFrame>
  );
}
```

### VERIFICATION
- [ ] Desktop (≥ md): `/beranda` shows a centered ~400×860 phone with a dark bezel + shadow on a Tinta backdrop; the bottom nav is pinned to the bottom *of the phone*, and long content scrolls inside it (page body does not scroll).
- [ ] Real mobile (< md): full-bleed, nav pinned to the bottom of the viewport — visually unchanged from before.
- [ ] Tapping nav items navigates; the nav stays put while content scrolls.
- [ ] `/dosier` → browser Print: the frame, bezel, and bottom nav disappear and the dossier prints full-width with no clipping.
- [ ] Public pages (`/`, `/masuk`, `/klaim/...`, `/wali/...`) are untouched (still full-width responsive).

### OPTIONAL FOLLOW-UP (not in this brief)
To frame `/masuk` and the landing for visual continuity, wrap their top-level `<main>` in `<DeviceFrame>` too (no `AppShell`, so no bottom nav). Skipped here to keep the change scoped to the app surface.
```
