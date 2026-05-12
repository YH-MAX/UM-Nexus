"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
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
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 shadow-sm shadow-slate-200/50 backdrop-blur-xl">
        <div className="trade-container flex h-16 items-center justify-between gap-3">
          <Link
            className="flex min-w-0 items-center gap-2 rounded-lg pr-2 font-semibold text-slate-950 transition hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            href="/trade"
          >
            <span className="trade-icon-frame-dark h-9 w-9">
              <Store aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="hidden leading-tight sm:inline">
              <span className="block text-base">UM Nexus Trade</span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                UM-only marketplace
              </span>
            </span>
            <span className="truncate text-base sm:hidden">UM Nexus</span>
          </Link>

          <nav aria-label="Trade navigation" className="hidden items-center gap-2 lg:flex">
            {mainNav.map((item) => (
              <DesktopNavLink active={isActiveRoute(pathname, item.href)} item={item} key={item.href} />
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <UtilityLink active={isActiveRoute(pathname, "/trade/notifications")} href="/trade/notifications" icon={Bell} label="Alerts" unreadCount={unreadAlerts} />
            <UtilityLink active={isActiveRoute(pathname, "/trade/profile")} href="/trade/profile" icon={User} label="Profile" />
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <UtilityLink active={isActiveRoute(pathname, "/trade/notifications")} href="/trade/notifications" icon={Bell} label="Alerts" mobile unreadCount={unreadAlerts} />
            <UtilityLink active={isActiveRoute(pathname, "/trade/profile")} href="/trade/profile" icon={User} label="Profile" mobile />
          </div>
        </div>
      </header>

      <div className="trade-container flex flex-col gap-6 py-6 lg:py-8">
        <section className="flex min-w-0 flex-col gap-4 border-b border-slate-200/80 pb-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className="trade-kicker">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-[2rem] font-semibold leading-tight text-slate-950 sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
        </section>
        {showOnboarding ? <TradeOnboardingCard onDismiss={dismissOnboarding} /> : null}
        {children}
      </div>

      <nav
        aria-label="Mobile trade navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {mobileNav.map((item) => (
            <MobileNavLink active={isActiveRoute(pathname, item.href)} item={item} key={item.href} />
          ))}
        </div>
      </nav>
    </main>
  );
}

function TradeOnboardingCard({ onDismiss }: Readonly<{ onDismiss: () => void }>) {
  return (
    <section className="trade-alert trade-alert-success">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="trade-icon-frame bg-white text-emerald-700">
            <ShieldCheck aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-emerald-950">
              Welcome to UM Nexus Trade.
            </p>
            <p className="mt-1 text-sm text-emerald-900">
              Buy and sell safely inside the University of Malaya campus community.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Link className="trade-button-secondary border-emerald-200 px-3 py-2 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100" href="/trade">
            Browse
          </Link>
          <Link className="trade-button-secondary border-emerald-200 px-3 py-2 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100" href="/trade/sell">
            Sell an item
          </Link>
          <Link className="trade-button-secondary border-emerald-200 px-3 py-2 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100" href="/trade/profile">
            Complete profile
          </Link>
          <button
            aria-label="Dismiss welcome banner"
            className="trade-button-ghost text-emerald-800 hover:bg-emerald-100"
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

function DesktopNavLink({ active, item }: Readonly<{ active: boolean; item: NavItem }>) {
  const Icon = item.icon;
  const className =
    item.kind === "primary"
      ? "border-emerald-700 bg-emerald-700 text-white shadow-sm shadow-emerald-900/10 hover:bg-emerald-800"
      : active
        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
        : item.kind === "secondary"
          ? "border-slate-300 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
          : "border-transparent bg-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950";

  return (
    <Link
      className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${className}`}
      href={item.href}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function MobileNavLink({ active, item }: Readonly<{ active: boolean; item: NavItem }>) {
  const Icon = item.icon;
  const className =
    item.kind === "primary"
      ? "text-emerald-700"
      : active
        ? "text-slate-950"
        : "text-slate-500";

  return (
    <Link
      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-semibold transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${className}`}
      href={item.href}
    >
      <span
        className={`flex h-8 w-10 items-center justify-center rounded-lg ${
          active || item.kind === "primary" ? "bg-emerald-50 ring-1 ring-emerald-100" : "bg-transparent"
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
}: Readonly<{
  active: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  mobile?: boolean;
  unreadCount?: number;
}>) {
  return (
    <Link
      aria-label={label}
      className={`relative inline-flex items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
        mobile ? "h-10 w-10 p-0" : "h-10 px-3"
      } ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
      href={href}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {!mobile ? <span>{label}</span> : null}
      {label === "Alerts" && unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white ring-2 ring-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/trade") {
    return pathname === "/trade" || /^\/trade\/[^/]+$/.test(pathname);
  }
  if (href === "/trade/want") {
    return pathname.startsWith("/trade/want") || pathname.startsWith("/wanted-posts");
  }
  if (href === "/trade/dashboard") {
    return pathname.startsWith("/trade/dashboard") || /^\/trade\/[^/]+\/edit$/.test(pathname);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
