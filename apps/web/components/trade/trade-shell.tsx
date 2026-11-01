"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Diamond,
  ArrowLeft,
  Home,
  Search,
  Plus,
  Heart,
  LayoutDashboard,
  Megaphone,
  PlusCircle,
  ShieldCheck,
  Store,
  User,
  X,
} from "lucide-react";
import { lastBrowseUrl } from "@/lib/trade/browse-context";
import type { LucideIcon } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { getNotificationUnreadCount } from "@/lib/trade/api";
import { MobileActionBar } from "./mobile-action-bar";
import { useMobileViewport } from "./use-mobile-viewport";

type TradeShellProps = Readonly<{
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  mobileActions?: React.ReactNode;
  mobileActionsLabel?: string;
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
  { label: "Home", href: "/trade", icon: Home },
  { label: "Explore", href: "/trade/explore", icon: Search },
  { label: "Sell", href: "/trade/sell", icon: Plus, kind: "primary" },
  { label: "Saved", href: "/trade/saved", icon: Heart },
  { label: "Profile", href: "/trade/profile", icon: User },
];

export function TradeShell({
  children,
  eyebrow = "UM Nexus Trade",
  title,
  description,
  action,
  mobileActions,
  mobileActionsLabel = "Page actions",
  hideHero = false,
}: TradeShellProps) {
  const pathname = usePathname();
  const surfaceRef = useRef<HTMLElement>(null);
  useMobileViewport(surfaceRef, pathname);
  const router = useRouter();
  const home = pathname === "/trade";
  const pageTitles: Record<string, string> = { "/trade/explore": "All Items", "/trade/sell": "Post an Item", "/trade/profile": "Profile", "/trade/saved": "Saved Items", "/trade/want": "Wanted Board", "/trade/dashboard": "My Trade", "/trade/notifications": "Alerts", "/trade/moderation": "Safety Review", "/trade/evaluation": "Evaluation", "/trade/launch-checklist": "Launch Checklist" };
  const mobileTitle = pageTitles[pathname] ?? (pathname.endsWith("/edit") ? "Edit Listing" : "Item Details");
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
    <main ref={surfaceRef} className={`trade-page-surface pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0 ${home ? "nexus-marketplace-home" : ""}`}>
      <header className="nexus-header sticky top-0 z-40 bg-white pt-[env(safe-area-inset-top)] md:bg-white/95 md:backdrop-blur-xl">
        <div className="trade-container flex min-h-[64px] items-center justify-between gap-3 py-2.5">
          <Link aria-label="UM Nexus Trade — home" className={`nexus-brand flex min-w-0 items-center gap-2.5 ${home ? "" : "hidden md:flex"}`} href="/trade">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e9f5f3] text-[#0c514d]"><Diamond aria-hidden="true" className="h-6 w-6" /></span>
            <span className="min-w-0"><span className="block text-lg font-bold tracking-tight text-[#104f4b]">UM NEXUS</span><span className="block text-[10px] text-slate-500">Your campus. Your marketplace.</span></span>
          </Link>
          {!home ? <div className="flex min-w-0 flex-1 items-center md:hidden"><Link aria-label="Back to marketplace" className="nexus-icon-button" href="/trade" onClick={(event) => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); router.push(pathname === "/trade/explore" ? "/trade" : lastBrowseUrl(), { scroll: false }); } }}><ArrowLeft aria-hidden="true" className="h-5 w-5" /></Link><span aria-level={pathname === "/trade/explore" || pathname === "/trade/sell" ? 1 : undefined} className={`flex-1 truncate text-center text-sm font-semibold ${pathname === "/trade/profile" ? "pr-10" : ""}`} role={pathname === "/trade/explore" || pathname === "/trade/sell" ? "heading" : undefined}>{mobileTitle}</span></div> : null}
          <nav aria-label="Trade navigation" className="hidden items-center gap-1 lg:flex">
            {mainNav.map((item) => <DesktopNavLink active={isActiveRoute(pathname, item.href)} item={item} key={item.href} pathname={pathname} />)}
            <Link className="trade-button-ghost" href="/trade/explore">Explore</Link>
          </nav>
          <div className={`flex items-center gap-1 ${pathname === "/trade/profile" ? "hidden md:flex" : ""}`}>
            <UtilityLink active={isActiveRoute(pathname, "/trade/notifications")} href="/trade/notifications" icon={Bell} label="Alerts" mobile unreadCount={unreadAlerts} />
            <span className="hidden md:inline-flex"><UtilityLink active={isActiveRoute(pathname, "/trade/profile")} href="/trade/profile" icon={User} label="Profile" mobile /></span>
          </div>
        </div>
      </header>

      <div className={`trade-container nexus-content flex flex-col gap-5 py-4 lg:py-6 ${pathname === "/trade/sell" ? "nexus-sell" : ""}`}>
        {!hideHero ? (
          <section className="nexus-page-heading flex min-w-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 max-w-3xl">
              <p className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-800 md:block">{eyebrow}</p>
              <h1 className="mt-2 text-xl font-semibold leading-tight text-slate-950 sm:text-3xl">{title}</h1>
              {description ? (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">{description}</p>
              ) : null}
            </div>
            {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
          </section>
        ) : null}
        {showOnboarding && home ? <div className="hidden md:block"><TradeOnboardingCard onDismiss={dismissOnboarding} /></div> : null}
        {children}
      </div>

      {mobileActions ? <MobileActionBar label={mobileActionsLabel}>{mobileActions}</MobileActionBar> : <nav
        aria-label="Mobile trade navigation"
        className="nexus-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {mobileNav.map((item) => (
            <MobileNavLink active={isActiveRoute(pathname, item.href)} item={item} key={item.href} pathname={pathname} />
          ))}
        </div>
      </nav>}
    </main>
  );
}

function TradeOnboardingCard({ onDismiss }: Readonly<{ onDismiss: () => void }>) {
  return <section className="flex items-center gap-2 rounded-lg bg-[#f0f8f6] px-3 py-2 text-xs text-[#155c55]"><ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="flex-1">A marketplace for the UM community. <Link className="underline" href="/safety">Trade safely</Link></span><button aria-label="Dismiss welcome banner" className="nexus-icon-button" onClick={onDismiss} type="button"><X aria-hidden="true" className="h-4 w-4" /></button></section>;
}

function DesktopNavLink({ active, item }: Readonly<{ active: boolean; item: NavItem; pathname: string }>) {
  const Icon = item.icon;
  return <Link aria-current={active ? "page" : undefined} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${item.kind === "primary" ? "bg-[#105651] text-white" : active ? "bg-[#edf6f3] text-[#105651]" : "text-slate-600 hover:bg-slate-50"}`} prefetch={item.href === "/trade" || item.href === "/trade/explore"} href={item.href}><Icon aria-hidden="true" className="h-4 w-4" />{item.label}</Link>;
}

function MobileNavLink({ active, item }: Readonly<{ active: boolean; item: NavItem; pathname: string }>) {
  const Icon = item.icon;
  const primary = item.kind === "primary";
  return <Link aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium ${active ? "text-[#0b514c]" : "text-slate-500"}`} prefetch={item.href === "/trade" || item.href === "/trade/explore"} href={item.href}>
    <span className={primary ? "-mt-7 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-[#105651] text-white shadow-md" : "flex h-7 w-8 items-center justify-center"}><Icon aria-hidden="true" className={primary ? "h-6 w-6" : `h-[21px] w-[21px] ${active ? "stroke-[2.3]" : "stroke-[1.6]"}`} /></span>{item.label}
  </Link>;
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
      prefetch={false}
      aria-label={label}
      className={`relative inline-flex items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
        mobile ? "h-10 w-10 border-transparent bg-transparent p-0 text-[#0c514d]" : "min-h-10 border-slate-200 bg-white px-3 py-2 text-slate-700"
      } ${active ? "border-teal-200 bg-teal-50 text-teal-900" : "hover:bg-slate-50"}`}
      href={href}
    >
      <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${active ? "text-teal-900" : ""}`} />
      {!mobile ? (
        <span className="hidden max-w-[11rem] truncate sm:inline">
          {subtitle ?? label}
        </span>
      ) : null}
      {label === "Alerts" && unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-teal-700 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white ring-2 ring-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

const TRADE_APP_ROUTE_SEGMENTS = new Set([
  "explore",
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
