# IMPLEMENTATION BRIEF: Responsive Shell + Mobile-Mockup Toggle
## Surface: web (`apps/web`) — owner app shell
## Brief: #UI-2  (supersedes #UI-1; folds the device frame into a toggle)
## Phase: 1 (MVP)
## Depends on: #3 (AppShell exists)
## Blocks: None
## Parallel with: None

### CONTEXT
The owner app gets a real responsive layout (sticky left sidebar on desktop, bottom nav on mobile) AND keeps the phone mockup as a testing lens. A desktop-only toggle (top-right) switches between "Desktop" (responsive) and "Mobile" (phone frame), persisted in `localStorage`. On real phones the toggle is hidden and the app is full-bleed either way.

### NON-NEGOTIABLE CHECK
Pure presentational — no data, RLS, release, or copy logic touched; Bahasa nav copy unchanged (`copy.nav.*`). Real-mobile experience unchanged (bottom nav, full-bleed). Dossier print path preserved (toggle, both navs, and frame collapse under `print:`). Brand discipline kept: Nyala is NOT used for nav/toggle state (Tinta/Emas only) — Nyala stays reserved for primary actions. Toggle is a client affordance; no SSR/hydration mismatch (server + first client render use the default, `localStorage` is read after mount).

### PRE-FLIGHT CHECKS
- [ ] `apps/web/src/components/layout/AppShell.tsx` exists (#3); `(app)/layout.tsx` renders it.
- [ ] `@warisly/ui` exports `Seal`; `@warisly/lib` exports `copy.nav.{home,assets,amanah,profile}`.
- [ ] `lucide-react` is a dep of `apps/web` (it is — used by AppShell).
- [ ] Tailwind ≥ 3.4 (`h-dvh`/`min-h-dvh`); tokens `tinta`/`kertas`/`paper-edge`/`emas`/`ink-text` exist.
- [ ] If #UI-1 was applied: this brief overwrites `DeviceFrame.tsx` (identical) and rewrites `(app)/layout.tsx` to stop wrapping in `DeviceFrame` (the shell now owns it conditionally).

### FILES TO CREATE/MODIFY

#### 1. `apps/web/src/components/layout/DeviceFrame.tsx`
**Action:** CREATE (or overwrite if from #UI-1) **Layer:** Component **Purpose:** Phone chrome on desktop; passthrough on mobile; collapses for print.
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
**Action:** MODIFY (replace whole file) **Layer:** Component **Purpose:** Responsive layout + persisted Desktop/Mobile toggle.
```typescript
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, Users, User, Monitor, Smartphone } from "lucide-react";
import { Seal } from "@warisly/ui";
import { copy } from "@warisly/lib";
import { DeviceFrame } from "./DeviceFrame";

type Mode = "responsive" | "mobile";
const STORAGE_KEY = "warisly:shell-mode";

const items = [
  { href: "/beranda", label: copy.nav.home, Icon: Home },
  { href: "/aset", label: copy.nav.assets, Icon: Wallet },
  { href: "/amanah", label: copy.nav.amanah, Icon: Users },
  { href: "/profil", label: copy.nav.profile, Icon: User },
] as const;

type ActiveFn = (href: string) => boolean;

function Sidebar({ isActive }: { isActive: ActiveFn }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-paper-edge bg-kertas px-4 py-6 md:flex print:hidden">
      <Link href="/beranda" className="mb-8 flex items-center gap-2 px-2">
        <Seal size={32} />
        <span className="font-display text-xl text-tinta">Warisly<span className="text-emas">.</span></span>
      </Link>
      <nav className="flex flex-col gap-1">
        {items.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-sm ${isActive(href) ? "bg-tinta/5 font-medium text-tinta" : "text-paper-muted hover:text-tinta"}`}
          >
            <Icon size={18} /> {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function BottomNav({ isActive, className = "" }: { isActive: ActiveFn; className?: string }) {
  return (
    <nav className={`border-t border-paper-edge bg-kertas/95 backdrop-blur print:hidden ${className}`}>
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={`flex flex-col items-center gap-1 py-3 font-sans text-xs ${isActive(href) ? "text-tinta" : "text-paper-muted"}`}
            >
              <Icon size={20} /> {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("responsive");
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isActive: ActiveFn = (href) => pathname === href || pathname.startsWith(href + "/");

  useEffect(() => {
    setMounted(true);
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Mode | null;
      if (saved === "mobile" || saved === "responsive") setMode(saved);
    } catch {}
  }, []);

  function choose(next: Mode) {
    setMode(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch {}
  }

  const Toggle = (
    <div className="fixed right-4 top-4 z-50 hidden items-center gap-1 rounded-full border border-paper-edge bg-kertas/95 p-1 shadow-sm backdrop-blur md:flex print:hidden">
      <button
        type="button" onClick={() => choose("responsive")} aria-pressed={mode === "responsive"}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-xs ${mode === "responsive" ? "bg-tinta text-ink-text" : "text-paper-muted hover:text-tinta"}`}
      >
        <Monitor size={14} /> Desktop
      </button>
      <button
        type="button" onClick={() => choose("mobile")} aria-pressed={mode === "mobile"}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-xs ${mode === "mobile" ? "bg-tinta text-ink-text" : "text-paper-muted hover:text-tinta"}`}
      >
        <Smartphone size={14} /> Mobile
      </button>
    </div>
  );

  // Mobile-mockup view (also how it looks on a real phone): narrow column + pinned bottom nav.
  if (mounted && mode === "mobile") {
    return (
      <>
        {Toggle}
        <DeviceFrame>
          <div className="flex h-full flex-col">
            <main className="flex-1 overflow-y-auto px-6 pb-6 pt-8 print:overflow-visible">{children}</main>
            <BottomNav isActive={isActive} className="shrink-0" />
          </div>
        </DeviceFrame>
      </>
    );
  }

  // Responsive view (default): sidebar on desktop, bottom nav on mobile.
  return (
    <>
      {Toggle}
      <div className="min-h-dvh md:flex">
        <Sidebar isActive={isActive} />
        <div className="flex min-h-dvh flex-1 flex-col">
          <main className="flex-1 px-6 pb-24 pt-8 md:px-10 md:pb-12">
            <div className="mx-auto w-full max-w-2xl print:max-w-none">{children}</div>
          </main>
        </div>
        <BottomNav isActive={isActive} className="fixed inset-x-0 bottom-0 md:hidden" />
      </div>
    </>
  );
}
```

#### 3. `apps/web/app/(app)/layout.tsx`
**Action:** MODIFY **Layer:** Page **Purpose:** Render the shell directly (it now owns the frame conditionally).
```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");
  return <AppShell>{children}</AppShell>;
}
```

### VERIFICATION
- [ ] Desktop default: `/beranda` shows the responsive layout — sticky left sidebar with active-item highlight, wide centered content (`max-w-2xl`), no bottom nav. A "Desktop | Mobile" toggle sits top-right.
- [ ] Clicking "Mobile" switches to the phone mockup (≈400×860, dark bezel, Tinta backdrop) with the bottom nav inside it; reload keeps the choice (`localStorage`); clicking "Desktop" switches back.
- [ ] Real mobile (< md): no toggle, no sidebar — bottom nav pinned to the viewport (unchanged from before) in both modes.
- [ ] Sidebar/bottom-nav active state tracks the route (e.g. `/aset/baru` highlights "Aset").
- [ ] `/dosier` → Print: toggle, sidebar, bottom nav, and any frame all disappear; the dossier prints full-width, no clipping.
- [ ] Public pages (`/`, `/masuk`, `/klaim/...`, `/wali/...`) untouched.

### OPTIONAL
To hide the toggle in production later, wrap the `Toggle` render in `process.env.NODE_ENV !== "production"` (keep it for MVP testing as-is).
```
