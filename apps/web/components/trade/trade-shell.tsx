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
  Store,
  User,
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
    <main className="min-h-screen overflow-x-hidden bg-slate-50 pb-24 text-slate-950 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl min-w-0 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link className="flex min-w-0 items-center gap-2 font-semibold text-slate-950" href="/trade">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm">
              <Store aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="hidden text-base sm:inline">UM Nexus Trade</span>
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

      <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="flex min-w-0 flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
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
          {action ? <div className="shrink-0">{action}</div> : null}
        </section>
        {showOnboarding ? <TradeOnboardingCard onDismiss={dismissOnboarding} /> : null}
        {children}
      </div>

      <nav
        aria-label="Mobile trade navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
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
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Welcome to UM Nexus Trade</h2>
          <p className="mt-2 text-sm leading-6">
            Browse UM student listings, sell an item in under one minute, send contact requests safely, and meet on campus before payment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="trade-button-primary" href="/trade">Browse Listings</Link>
          <Link className="trade-button-secondary bg-white" href="/trade/sell">Sell an Item</Link>
          <Link className="trade-button-secondary bg-white" href="/trade/profile">Complete Profile</Link>
          <button className="trade-button-secondary bg-white" onClick={onDismiss} type="button">Dismiss</button>
        </div>
      </div>
    </section>
  );
}

function DesktopNavLink({ active, item }: Readonly<{ active: boolean; item: NavItem }>) {
  const Icon = item.icon;
  const className =
    item.kind === "primary"
      ? "border-emerald-700 bg-emerald-700 text-white shadow-sm hover:bg-emerald-800"
      : active
        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
        : item.kind === "secondary"
          ? "border-slate-300 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950";

  return (
    <Link
      className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${className}`}
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
      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[11px] font-semibold transition hover:bg-slate-50 ${className}`}
      href={item.href}
    >
      <span
        className={`flex h-8 w-10 items-center justify-center rounded-2xl ${
          active || item.kind === "primary" ? "bg-emerald-50" : "bg-transparent"
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
      className={`relative inline-flex items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${
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
