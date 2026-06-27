"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, Wallet, Users, FileText, Clock, User, Monitor, Smartphone, type LucideIcon } from "lucide-react";
import { Seal } from "@warisly/ui";
import { signOut } from "@/app/actions/auth";
import { DeviceFrame } from "./DeviceFrame";

type Mode = "responsive" | "mobile";
const STORAGE_KEY = "warisly:shell-mode";

// Switch the navigation rail between the warm "bound-ledger" parchment spine and
// a refined solid-ink spine. Both are fully styled — flip this one flag to compare.
const RAIL_VARIANT: "parchment" | "ink" = "ink";

const RAIL = {
  parchment: {
    aside: "bg-parchment border-r border-paper-edge",
    brand: "text-tinta",
    rule: "via-[#D8C9A4]",
    inactive: "text-paper-muted hover:bg-tinta/[0.05] hover:text-tinta",
    active: "bg-tinta text-ink-text",
    activeIcon: "text-emas-glow",
    inactiveIcon: "opacity-70",
    footBorder: "border-paper-edge",
    footText: "text-paper-muted hover:text-tinta",
  },
  ink: {
    aside: "bg-tinta border-r border-tinta",
    brand: "text-ink-text",
    rule: "via-white/15",
    inactive: "text-ink-muted hover:bg-white/[0.06] hover:text-ink-text",
    active: "bg-kertas text-tinta",
    activeIcon: "text-emas",
    inactiveIcon: "opacity-80",
    footBorder: "border-white/10",
    footText: "text-ink-muted hover:text-ink-text",
  },
} as const;

const NAV = [
  { href: "/beranda", key: "home", Icon: Home, mobile: true },
  { href: "/aset", key: "assets", Icon: Wallet, mobile: true },
  { href: "/amanah", key: "amanah", Icon: Users, mobile: true },
  { href: "/dosier", key: "dosier", Icon: FileText, mobile: false },
  { href: "/rilis", key: "releaseRule", Icon: Clock, mobile: false },
  { href: "/profil", key: "profile", Icon: User, mobile: true },
] as const;

type Item = { href: string; label: string; Icon: LucideIcon };
type ActiveFn = (href: string) => boolean;

function Rail({ items, isActive, signOutLabel }: { items: Item[]; isActive: ActiveFn; signOutLabel: string }) {
  const s = RAIL[RAIL_VARIANT];
  return (
    <aside className={`sticky top-0 hidden h-dvh w-[252px] shrink-0 flex-col px-4 py-6 md:flex print:hidden ${s.aside}`}>
      <Link href="/beranda" className="flex items-center gap-3 px-2">
        <Seal size={30} />
        <span className={`font-display text-xl ${s.brand}`}>Warisly<span className="text-emas">.</span></span>
      </Link>
      <div className={`mx-2 mb-3 mt-5 h-px bg-gradient-to-r from-transparent to-transparent ${s.rule}`} />
      <nav className="flex flex-col gap-0.5">
        {items.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-sans text-sm font-medium transition ${active ? s.active : s.inactive}`}
            >
              <Icon size={18} className={active ? s.activeIcon : s.inactiveIcon} /> {label}
            </Link>
          );
        })}
      </nav>
      <form action={signOut} className={`mt-auto border-t px-3 pt-4 ${s.footBorder}`}>
        <button type="submit" className={`font-sans text-[13px] transition ${s.footText}`}>
          {signOutLabel}
        </button>
      </form>
    </aside>
  );
}

function BottomNav({ items, isActive, className = "" }: { items: Item[]; isActive: ActiveFn; className?: string }) {
  return (
    <nav className={`border-t border-paper-edge bg-kertas/95 backdrop-blur print:hidden ${className}`}>
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={`flex flex-col items-center gap-1 py-2.5 font-sans text-[10.5px] ${isActive(href) ? "text-tinta" : "text-paper-muted"}`}
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
  const t = useTranslations();
  const [mode, setMode] = useState<Mode>("responsive");
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isActive: ActiveFn = (href) => pathname === href || pathname.startsWith(href + "/");

  const railItems: Item[] = NAV.map((n) => ({ href: n.href, label: t(`nav.${n.key}`), Icon: n.Icon }));
  const mobileItems: Item[] = NAV.filter((n) => n.mobile).map((n) => ({ href: n.href, label: t(`nav.${n.key}`), Icon: n.Icon }));
  const signOutLabel = t("profil.signOut");
  const crumb = railItems.find((i) => isActive(i.href))?.label ?? t("nav.home");

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

  // Mobile phone-mockup mode: render the phone with its own bottom nav inside the device frame.
  if (mounted && mode === "mobile") {
    return (
      <>
        {Toggle}
        <DeviceFrame>
          <div className="flex h-full flex-col">
            <main className="flex-1 overflow-y-auto px-6 pb-6 pt-8 print:overflow-visible">{children}</main>
            <BottomNav items={mobileItems} isActive={isActive} className="shrink-0" />
          </div>
        </DeviceFrame>
      </>
    );
  }

  return (
    <>
      {Toggle}
      <div className="min-h-dvh bg-kertas md:flex">
        <Rail items={railItems} isActive={isActive} signOutLabel={signOutLabel} />
        <div className="flex min-h-dvh flex-1 flex-col">
          <header className="hidden items-center justify-between border-b border-paper-edge px-10 py-4 md:flex print:hidden">
            <span className="font-sans text-[13px] text-paper-muted">{crumb}</span>
          </header>
          <main className="flex-1 px-6 pb-24 pt-8 md:px-10 md:py-9 print:p-0">
            <div className="mx-auto w-full max-w-[760px] print:max-w-none">{children}</div>
          </main>
        </div>
        <BottomNav items={mobileItems} isActive={isActive} className="fixed inset-x-0 bottom-0 z-40 md:hidden" />
      </div>
    </>
  );
}
