"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  Diamond,
  Heart,
  LayoutDashboard,
  Megaphone,
  PlusCircle,
  ShieldCheck,
  Store,
  User,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { getNotificationUnreadCount } from "@/lib/trade/api";

type TradeShellProps = Readonly<{
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** When true, the page title / description / action hero is omitted (used by marketplace browse layout). */
  hideHero?: boolean;
}>;

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  kind?: "primary" | "secondary" | "normal" | "utility";
};

const mainNav: NavItem[] = [
  { label: "Browse", href: "/trade", icon: Store },
  { label: "Sell", href: "/trade/sell", icon: PlusCircle, kind: "primary" },
  { label: "Wanted", href: "/trade/want", icon: Megaphone, kind: "secondary" },
  { label: "Saved", href: "/trade/saved", icon: Heart },
  { label: "My Trade", href: "/trade/dashboard", icon: LayoutDashboard },
];

const mobileNav: NavItem[] = [
  { label: "Browse", href: "/trade", icon: Store },
  { label: "Sell", href: "/trade/sell", icon: PlusCircle, kind: "primary" },
  { label: "Wanted", href: "/trade/want", icon: Megaphone },
  { label: "Saved", href: "/trade/saved", icon: Heart },
  { label: "Me", href: "/trade/dashboard", icon: User },
];

export function TradeShell({
  children,
  eyebrow = "UM Nexus Trade",
  title,
  description,
  action,
  hideHero = false,
}: TradeShellProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    if (!user || window.localStorage.getItem("um_nexus_trade_onboarding_dismissed") === "true") {
      setShowOnboarding(false);
      return;
    }
    setShowOnboarding(true);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadAlerts(0);
      return;
    }

    let isMounted = true;
    async function loadUnreadCount() {
      try {
        const result = await getNotificationUnreadCount();
        if (isMounted) {
          setUnreadAlerts(result.unread);
        }
      } catch {
        if (isMounted) {
          setUnreadAlerts(0);
        }
      }
    }

    const handleNotificationsChanged = () => {
      void loadUnreadCount();
    };

    void loadUnreadCount();
    const intervalId = window.setInterval(loadUnreadCount, 60_000);
    window.addEventListener("trade:notifications-changed", handleNotificationsChanged);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("trade:notifications-changed", handleNotificationsChanged);
    };
  }, [pathname, user]);

  function dismissOnboarding() {
    window.localStorage.setItem("um_nexus_trade_onboarding_dismissed", "true");
    setShowOnboarding(false);
  }

  return (
    <main className="trade-page-surface pb-24 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090807] shadow-lg shadow-black/25">
        <div className="trade-container flex min-h-[72px] items-center justify-between gap-3 py-3 lg:min-h-[76px]">
          <Link
            className="flex min-w-0 max-w-[min(100%,14rem)] items-center gap-3 rounded-xl pr-2 text-white transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 sm:max-w-none"
            href="/trade"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/35 bg-stone-900/80 shadow-inner shadow-black/40">
              <Diamond aria-hidden="true" className="h-4 w-4 text-amber-400" />
            </span>
            <span className="hidden min-w-0 leading-tight sm:block">
              <span className="block truncate text-[15px] font-semibold tracking-tight">UM Nexus Trade</span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-400/95">
                UM-only marketplace
              </span>
            </span>
            <span className="truncate text-[15px] font-semibold sm:hidden">UM Trade</span>
          </Link>

          <nav aria-label="Trade navigation" className="hidden items-center gap-1.5 lg:flex">
            {mainNav.map((item) => (
              <DesktopNavLink active={isActiveRoute(pathname, item.href)} item={item} key={item.href} pathname={pathname} />
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <UtilityLink
              active={isActiveRoute(pathname, "/trade/notifications")}
              href="/trade/notifications"
              icon={Bell}
              label="Alerts"
              unreadCount={unreadAlerts}
            />
            <UtilityLink
              active={isActiveRoute(pathname, "/trade/profile")}
              href="/trade/profile"
              icon={User}
              label="Profile"
              subtitle={user?.email ?? undefined}
            />
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <UtilityLink
              active={isActiveRoute(pathname, "/trade/notifications")}
              href="/trade/notifications"
              icon={Bell}
              label="Alerts"
              mobile
              unreadCount={unreadAlerts}
            />
            <UtilityLink
              active={isActiveRoute(pathname, "/trade/profile")}
              href="/trade/profile"
              icon={User}
              label="Profile"
              mobile
            />
          </div>
        </div>
      </header>

      <div className={`trade-container flex flex-col ${hideHero ? "gap-6 py-6 lg:py-8" : "gap-6 py-6 lg:py-8"}`}>
        {!hideHero ? (
          <section className="flex min-w-0 flex-col gap-4 border-b border-stone-200/80 pb-6 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">{eyebrow}</p>
              <h1 className="mt-2 text-[2rem] font-semibold leading-tight text-stone-950 sm:text-4xl">{title}</h1>
              {description ? (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">{description}</p>
              ) : null}
            </div>
            {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
          </section>
        ) : null}
        {showOnboarding ? <TradeOnboardingCard onDismiss={dismissOnboarding} /> : null}
        {children}
      </div>

      <nav
        aria-label="Mobile trade navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200/90 bg-[#faf8f3]/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-12px_32px_rgba(17,16,14,0.12)] backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {mobileNav.map((item) => (
            <MobileNavLink active={isActiveRoute(pathname, item.href)} item={item} key={item.href} pathname={pathname} />
          ))}
        </div>
      </nav>
    </main>
  );
}

function TradeOnboardingCard({ onDismiss }: Readonly<{ onDismiss: () => void }>) {
  return (
    <section className="trade-alert rounded-2xl border-amber-200/80 bg-gradient-to-br from-amber-50 to-[#fffdf8] text-amber-950 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-700 shadow-sm">
            <ShieldCheck aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-stone-950">Welcome to UM Nexus Trade.</p>
            <p className="mt-1 text-sm text-stone-600">
              Buy and sell safely inside the University of Malaya campus community.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Link
            className="trade-button-secondary border-amber-200 bg-white px-3 py-2 text-stone-900 hover:border-amber-300 hover:bg-amber-50"
            href="/trade"
          >
            Browse
          </Link>
          <Link
            className="trade-button-primary px-3 py-2 shadow-md shadow-amber-900/10"
            href="/trade/sell"
          >
            Sell an item
          </Link>
          <Link
            className="trade-button-secondary border-amber-200 bg-white px-3 py-2 text-stone-900 hover:border-amber-300 hover:bg-amber-50"
            href="/trade/profile"
          >
            Complete profile
          </Link>
          <button
            aria-label="Dismiss welcome banner"
            className="trade-button-ghost text-stone-600 hover:bg-amber-100/60 hover:text-stone-950"
            onClick={onDismiss}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
            Dismiss
          </button>
        </div>
      </div>
    </section>
  );
}

function DesktopNavLink({ active, item, pathname }: Readonly<{ active: boolean; item: NavItem; pathname: string }>) {
  const Icon = item.icon;
  const demoteSellCta =
    (pathname === "/trade/saved" || pathname.startsWith("/trade/dashboard")) && item.href === "/trade/sell";

  if (item.kind === "primary" && !demoteSellCta) {
    return (
      <Link
        className={`inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 text-sm font-semibold text-stone-950 shadow-md shadow-amber-900/20 transition duration-200 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
          active ? "ring-2 ring-amber-200/90 ring-offset-2 ring-offset-[#090807]" : ""
        }`}
        href={item.href}
      >
        <Icon aria-hidden="true" className="h-4 w-4 text-stone-950" />
        {item.label}
      </Link>
    );
  }

  const inactiveSecondary =
    "border border-white/10 bg-white/5 text-stone-200 hover:border-amber-400/30 hover:bg-white/10 hover:text-white";
  const inactiveNormal =
    "border border-transparent bg-transparent text-stone-300 hover:border-white/10 hover:bg-white/5 hover:text-white";
  const activePill =
    "border border-amber-200/60 bg-[#f5f0e6] text-stone-950 shadow-md shadow-black/20";

  const className =
    item.kind === "secondary"
      ? `${active ? activePill : inactiveSecondary}`
      : `${active ? activePill : inactiveNormal}`;

  return (
    <Link
      className={`inline-flex h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${className}`}
      href={item.href}
    >
      <Icon
        aria-hidden="true"
        className={`h-4 w-4 ${
          (item.href === "/trade/saved" || item.href === "/trade/dashboard") && active
            ? "text-[#A85F00]"
            : active
              ? "text-amber-800"
              : ""
        }`}
      />
      <span className={(item.href === "/trade/saved" || item.href === "/trade/dashboard") && active ? "text-[#111111]" : ""}>
        {item.label}
      </span>
    </Link>
  );
}

function MobileNavLink({ active, item, pathname }: Readonly<{ active: boolean; item: NavItem; pathname: string }>) {
  const Icon = item.icon;
  const demoteSellCta =
    (pathname === "/trade/saved" || pathname.startsWith("/trade/dashboard")) && item.href === "/trade/sell";
  const isGold = item.kind === "primary" && !demoteSellCta;

  return (
    <Link
      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
        active ? "text-stone-950" : isGold ? "text-amber-800" : "text-stone-500"
      }`}
      href={item.href}
    >
      <span
        className={`flex h-9 w-10 items-center justify-center rounded-xl transition ${
          isGold
            ? "bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 shadow-sm"
            : active
              ? item.href === "/trade/saved" || item.href === "/trade/dashboard"
                ? "bg-[#f5f0e6] text-[#A85F00] ring-1 ring-amber-200/80"
                : "bg-[#f5f0e6] text-amber-900 ring-1 ring-amber-200/80"
              : "bg-transparent text-stone-500"
        }`}
      >
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      {item.label}
    </Link>
  );
}

function UtilityLink({
  active,
  href,
  icon: Icon,
  label,
  mobile = false,
  unreadCount = 0,
  subtitle,
}: Readonly<{
  active: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  mobile?: boolean;
  unreadCount?: number;
  subtitle?: string;
}>) {
  return (
    <Link
      aria-label={label}
      className={`relative inline-flex items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
        mobile ? "h-10 w-10 border-white/15 bg-white/5 p-0 text-stone-100" : "min-h-10 border-white/15 bg-white/5 px-3 py-2 text-stone-100"
      } ${active ? "border-amber-400/50 bg-[#f5f0e6] text-stone-950 shadow-inner" : "hover:border-amber-400/25 hover:bg-white/10"}`}
      href={href}
    >
      <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${active ? "text-amber-900" : ""}`} />
      {!mobile ? (
        <span className="hidden max-w-[11rem] truncate sm:inline">
          {subtitle ?? label}
        </span>
      ) : null}
      {label === "Alerts" && unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-amber-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-stone-950 ring-2 ring-[#090807]">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

const TRADE_APP_ROUTE_SEGMENTS = new Set([
  "sell",
  "saved",
  "want",
  "dashboard",
  "notifications",
  "profile",
  "moderation",
  "evaluation",
  "launch-checklist",
]);

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/trade") {
    if (pathname === "/trade") {
      return true;
    }
    const detail = pathname.match(/^\/trade\/([^/]+)$/);
    if (!detail) {
      return false;
    }
    return !TRADE_APP_ROUTE_SEGMENTS.has(detail[1]!);
  }
  if (href === "/trade/want") {
    return pathname.startsWith("/trade/want") || pathname.startsWith("/wanted-posts");
  }
  if (href === "/trade/dashboard") {
    return pathname.startsWith("/trade/dashboard") || /^\/trade\/[^/]+\/edit$/.test(pathname);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
