"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, Wallet, User, Plus, Monitor, Smartphone, type LucideIcon } from "lucide-react";
import { Seal } from "@warisly/ui";
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
  },
} as const;

// Primary navigation is intentionally just the two pillars an owner returns to.
// Account-level, set-once concerns (amanah, release rule, identity, language)
// live behind the avatar → /profil, so they don't crowd the nav.
const NAV = [
  { href: "/beranda", key: "home", Icon: Home, mobile: true },
  { href: "/aset", key: "assets", Icon: Wallet, mobile: true },
] as const;

// Routes that belong to the account area — the avatar lights up for all of them.
const ACCOUNT_ROUTES = ["/profil", "/amanah", "/rilis"] as const;

type Item = { href: string; label: string; Icon: LucideIcon };
type ActiveFn = (href: string) => boolean;

function initials(name?: string | null) {
  if (!name) return "";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function Avatar({ name, size = "md" }: { name?: string | null; size?: "sm" | "md" }) {
  const init = initials(name);
  const dim = size === "sm" ? "h-8 w-8 text-[12px]" : "h-9 w-9 text-[13px]";
  return (
    <span className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-emas font-sans font-semibold text-tinta`}>
      {init || <User size={size === "sm" ? 16 : 18} />}
    </span>
  );
}

function Rail({
  items, isActive, accountActive, accountLabel, profileLabel, ownerName,
}: {
  items: Item[]; isActive: ActiveFn; accountActive: boolean;
  accountLabel: string; profileLabel: string; ownerName?: string | null;
}) {
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
      <div className={`mt-auto border-t pt-3 ${s.footBorder}`}>
        <Link
          href="/profil"
          aria-current={accountActive ? "page" : undefined}
          className={`flex items-center gap-3 rounded-xl px-2.5 py-2 transition ${accountActive ? s.active : s.inactive}`}
        >
          <Avatar name={ownerName} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-sans text-sm font-medium">{accountLabel}</span>
            <span className="block truncate font-sans text-[11px] opacity-70">{profileLabel}</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}

function MobileTopBar({
  ownerName, accountLabel, accountActive, className = "",
}: {
  ownerName?: string | null; accountLabel: string; accountActive: boolean; className?: string;
}) {
  return (
    <header className={`flex items-center justify-between border-b border-paper-edge bg-kertas/95 px-4 py-2.5 backdrop-blur print:hidden ${className}`}>
      <Link href="/beranda" className="flex items-center gap-2">
        <Seal size={22} />
        <span className="font-display text-base text-tinta">Warisly<span className="text-emas">.</span></span>
      </Link>
      <Link
        href="/profil"
        aria-label={accountLabel}
        aria-current={accountActive ? "page" : undefined}
        className={`rounded-full transition ${accountActive ? "ring-2 ring-emas ring-offset-2 ring-offset-kertas" : ""}`}
      >
        <Avatar name={ownerName} size="sm" />
      </Link>
    </header>
  );
}

function BottomNavItem({ href, label, Icon, active }: Item & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 flex-col items-center gap-1 py-2.5 font-sans text-[10.5px] ${active ? "text-tinta" : "text-paper-muted"}`}
    >
      <Icon size={20} /> {label}
    </Link>
  );
}

// The center "add asset" action is the primary thing an owner does on mobile, so
// it gets a raised gold button that floats above the bar, flanked by the two nav
// pillars (Beranda · Aset).
function BottomNav({
  items, isActive, addHref, addLabel, className = "",
}: {
  items: Item[]; isActive: ActiveFn; addHref: string; addLabel: string; className?: string;
}) {
  const mid = Math.ceil(items.length / 2);
  const left = items.slice(0, mid);
  const right = items.slice(mid);
  return (
    <nav className={`border-t border-paper-edge bg-kertas/95 backdrop-blur print:hidden ${className}`}>
      <div className="mx-auto flex max-w-md items-end px-2">
        {left.map((it) => (
          <BottomNavItem key={it.href} {...it} active={isActive(it.href)} />
        ))}
        <Link
          href={addHref}
          aria-label={addLabel}
          aria-current={isActive(addHref) ? "page" : undefined}
          className="-mt-5 flex shrink-0 flex-col items-center gap-1 px-3"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emas text-tinta shadow-lg shadow-emas/30 ring-4 ring-kertas transition active:scale-95">
            <Plus size={26} />
          </span>
          <span className="font-sans text-[10.5px] font-medium text-tinta">{addLabel}</span>
        </Link>
        {right.map((it) => (
          <BottomNavItem key={it.href} {...it} active={isActive(it.href)} />
        ))}
      </div>
    </nav>
  );
}

export function AppShell({
  children, ownerName, ownerPhone,
}: {
  children: React.ReactNode; ownerName?: string | null; ownerPhone?: string | null;
}) {
  const t = useTranslations();
  const [mode, setMode] = useState<Mode>("responsive");
  const [mounted, setMounted] = useState(false);
  // True when this AppShell is the one rendered *inside* the mobile-preview iframe.
  // Such an instance must never render the device frame again (that would nest
  // iframes forever) or the toggle — it just renders the normal mobile layout,
  // which is faithful because the iframe's viewport is already ~400px wide.
  const [inIframe, setInIframe] = useState(false);
  const pathname = usePathname();
  const isActive: ActiveFn = (href) => pathname === href || pathname.startsWith(href + "/");

  const railItems: Item[] = NAV.map((n) => ({ href: n.href, label: t(`nav.${n.key}`), Icon: n.Icon }));
  const mobileItems: Item[] = NAV.filter((n) => n.mobile).map((n) => ({ href: n.href, label: t(`nav.${n.key}`), Icon: n.Icon }));

  const profileLabel = t("nav.profile");
  const accountLabel = ownerName || ownerPhone || profileLabel;
  const accountActive = ACCOUNT_ROUTES.some((h) => isActive(h));

  // Breadcrumb covers every reachable route, including the account-area pages
  // that are no longer in the primary nav.
  const CRUMB: Record<string, string> = {
    "/beranda": t("nav.home"),
    "/aset": t("nav.assets"),
    "/amanah": t("nav.amanah"),
    "/rilis": t("nav.releaseRule"),
    "/dosier": t("nav.dosier"),
    "/profil": t("nav.profile"),
  };
  const crumb = Object.entries(CRUMB).find(([href]) => isActive(href))?.[1] ?? t("nav.home");

  useEffect(() => {
    setMounted(true);
    // Same-origin self/top comparison is safe here; if it ever throws (embedded
    // cross-origin) we're definitely framed, so treat that as inside the frame.
    try {
      if (window.self !== window.top) setInIframe(true);
    } catch {
      setInIframe(true);
    }
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

  // Mobile phone-mockup mode — only when this is the top-level window. The phone
  // is an iframe loading the same route, so the preview renders at a real ~400px
  // viewport and the layout is faithful without any per-page overrides. The
  // iframe's own AppShell has inIframe=true, so it falls through to the normal
  // responsive layout below (no nested frame, no toggle).
  if (mounted && mode === "mobile" && !inIframe) {
    return (
      <>
        {Toggle}
        <DeviceFrame src={pathname} />
      </>
    );
  }

  return (
    <>
      {!inIframe && Toggle}
      <div className="min-h-dvh bg-kertas md:flex">
        <Rail
          items={railItems} isActive={isActive} accountActive={accountActive}
          accountLabel={accountLabel} profileLabel={profileLabel} ownerName={ownerName}
        />
        <div className="flex min-h-dvh flex-1 flex-col">
          <MobileTopBar ownerName={ownerName} accountLabel={accountLabel} accountActive={accountActive} className="sticky top-0 z-30 md:hidden" />
          <header className="hidden items-center justify-between border-b border-paper-edge px-10 py-4 md:flex print:hidden">
            <span className="font-sans text-[13px] text-paper-muted">{crumb}</span>
          </header>
          <main className="flex-1 px-6 pb-24 pt-8 md:px-10 md:py-9 print:p-0">
            {/* key=pathname remounts on navigation so each page gently fades in. */}
            <div key={pathname} className="mx-auto w-full max-w-[760px] animate-fade-in print:max-w-none print:animate-none">{children}</div>
          </main>
        </div>
        <BottomNav items={mobileItems} isActive={isActive} addHref="/aset/pindai" addLabel={t("nav.add")} className="fixed inset-x-0 bottom-0 z-40 md:hidden" />
      </div>
    </>
  );
}
