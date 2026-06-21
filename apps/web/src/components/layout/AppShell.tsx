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
