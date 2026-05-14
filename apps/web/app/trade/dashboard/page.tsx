"use client";

import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Check,
  ChevronRight,
  FileText,
  Heart,
  Inbox,
  Megaphone,
  MessageSquare,
  PlusCircle,
  Search,
  Send,
  Shield,
  Store,
  Tag,
  Zap,
} from "lucide-react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { AcceptRequestModal } from "@/components/trade/accept-request-modal";
import { CompleteTradeModal } from "@/components/trade/complete-trade-modal";
import { StatusPill, statusTone } from "@/components/trade/status-pill";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  cancelContactRequest,
  cancelWantedResponse,
  formatMoney,
  formatPickupLocation,
  formatRelativeTime,
  getTradeDashboard,
  resolveContactRequest,
  updateContactRequest,
  updateWantedResponse,
  updateTradeTransaction,
  type ContactRequest,
  type Listing,
  type TradeDashboard,
  type TradeTransaction,
  type WantedPost,
  type WantedResponse,
} from "@/lib/trade/api";

type DashboardTab = "overview" | "listings" | "received" | "sent" | "wanted" | "drafts" | "sold";

const tabs: Array<{ id: DashboardTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "listings", label: "My Listings" },
  { id: "received", label: "Buyer Requests" },
  { id: "sent", label: "My Requests" },
  { id: "wanted", label: "Wanted" },
  { id: "drafts", label: "Drafts" },
  { id: "sold", label: "Sold" },
];

const tradeDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-trade-dashboard-display",
});

function TradeStatCard({
  label,
  value,
  detail,
  icon: Icon,
  iconTone,
}: Readonly<{
  label: string;
  value: number | string;
  detail: string;
  icon: LucideIcon;
  iconTone: "gold" | "mint";
}>) {
  const iconWrap =
    iconTone === "mint"
      ? "bg-[#E7F7EF] text-[#07875D]"
      : "bg-[#FFF8EA] text-[#C98A1D]";
  return (
    <div className="flex min-h-[118px] items-center justify-between gap-3 rounded-2xl border border-[#E8DED0] bg-white p-4 shadow-[0_1px_3px_rgba(17,16,14,0.06)]">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6B6257]">{label}</p>
        <p className="mt-2 text-3xl font-bold tabular-nums text-[#111111]">{value}</p>
        <p className="mt-1 text-xs font-medium text-[#6B6257]">{detail}</p>
      </div>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconWrap}`}>
        <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
      </span>
    </div>
  );
}

function TradeDashEmpty({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
  iconVariant = "gold",
}: Readonly<{
  icon: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  iconVariant?: "gold" | "mint";
}>) {
  const circle =
    iconVariant === "mint"
      ? "bg-[#E7F7EF] text-[#07875D] ring-[#07875D]/15"
      : "bg-[#FFF8EA] text-[#C98A1D] ring-[#D99A2B]/20";
  return (
    <div className="rounded-xl border border-dashed border-[#D99A2B]/35 bg-gradient-to-b from-[#FFFBF2]/80 to-[#FAF7F0]/60 px-4 py-10 text-center">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ring-2 ${circle}`}>
        <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h3 className="mt-4 text-base font-bold text-[#111111]">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#6B6257]">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-6 text-sm font-semibold text-white shadow-md transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          href={actionHref}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function DashboardHero({ displayClass }: Readonly<{ displayClass: string }>) {
  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C98A1D]">UM Nexus Trade</p>
        <h1
          className={`${displayClass} mt-2 text-4xl font-semibold leading-tight text-[#111111] sm:text-[2.75rem] sm:leading-[1.08]`}
        >
          My Trade
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#6B6257] sm:text-[17px]">
          Manage your listings, drafts, saved items, buyer requests, and completed campus trades.
        </p>
      </div>
      <div className="shrink-0 lg:pt-1">
        <Link
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 text-sm font-semibold text-white shadow-md transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 sm:w-auto"
          href="/trade/sell"
        >
          <PlusCircle aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          Sell an Item
        </Link>
      </div>
    </header>
  );
}

function DashboardSidebar() {
  const rows = [
    { href: "/trade/sell", label: "Create a new listing", icon: PlusCircle },
    { href: "/trade/want", label: "Post wanted request", icon: Megaphone },
    { href: "/trade", label: "Browse listings", icon: Store },
    { href: "/trade/dashboard?tab=drafts", label: "Manage drafts", icon: FileText },
  ] as const;
  return (
    <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24">
      <section className="rounded-2xl border border-[#E8DED0] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-[#C98A1D]">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF8EA]">
            <Zap aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          </span>
          <h2 className="text-sm font-bold text-[#111111]">Quick actions</h2>
        </div>
        <ul className="mt-4 divide-y divide-[#E8DED0]/80">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <li key={row.href}>
                <Link
                  className="group flex items-center gap-3 rounded-xl py-3 pl-1 pr-1 transition hover:bg-[#FAF7F0]"
                  href={row.href}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E8DED0] bg-[#FFFBF2] text-[#A85F00] transition group-hover:border-[#D99A2B]/40">
                    <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-[#111111]">{row.label}</span>
                  <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[#6B6257] transition group-hover:text-[#A85F00]" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="rounded-2xl border border-[#E8DED0] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF8EA] text-[#C98A1D]">
            <Shield aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#111111]">Trade safely on campus</h2>
            <ul className="mt-3 space-y-2">
              {[
                "Meet in public, well-lit areas",
                "Bring a friend when possible",
                "Inspect items before buying",
                "Use secure on-campus locations",
              ].map((line) => (
                <li className="flex gap-2 text-sm text-[#6B6257]" key={line}>
                  <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#07875D]" strokeWidth={2.5} />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <Link
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#A85F00] underline-offset-2 hover:underline"
              href="/trade"
            >
              Learn more about safe trading
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </aside>
  );
}

export default function TradeDashboardPage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const searchParams = useSearchParams();
  const [dashboard, setDashboard] = useState<TradeDashboard | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null);
  const [highlightedListingId, setHighlightedListingId] = useState<string | null>(null);
  const [highlightedWantedResponseId, setHighlightedWantedResponseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [transactionDrafts, setTransactionDrafts] = useState<Record<string, { agreedPrice: string; followedAi: boolean }>>({});
  const [acceptModal, setAcceptModal] = useState<ContactRequest | null>(null);
  const [completeModal, setCompleteModal] = useState<ContactRequest | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    const nextDashboard = await getTradeDashboard();
    setDashboard(nextDashboard);
    setTransactionDrafts((current) => {
      const next = { ...current };
      for (const transaction of nextDashboard.transactions) {
        next[transaction.id] ??= {
          agreedPrice: transaction.agreed_price ? String(Math.round(transaction.agreed_price)) : "",
          followedAi: transaction.followed_ai_recommendation ?? true,
        };
      }
      return next;
    });
  }

  function notifyAlertStateChanged() {
    window.dispatchEvent(new Event("trade:notifications-changed"));
  }

  useEffect(() => {
    if (isAuthLoading || !user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    void loadDashboard()
      .catch((nextError) => {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load trade dashboard.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, user]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    const requestId = searchParams.get("request_id");
    const listingId = searchParams.get("listing_id");
    const wantedResponseId = searchParams.get("wanted_response_id");
    if (isDashboardTab(tab)) {
      setActiveTab(tab);
    } else if (wantedResponseId) {
      setActiveTab("wanted");
    } else if (requestId && dashboard?.contact_requests_received.some((request) => request.id === requestId)) {
      setActiveTab("received");
    } else if (requestId && dashboard?.contact_requests_sent.some((request) => request.id === requestId)) {
      setActiveTab("sent");
    } else if (listingId && dashboard?.listings.some((listing) => listing.id === listingId)) {
      setActiveTab("listings");
    }
    setHighlightedRequestId(requestId);
    setHighlightedListingId(listingId);
    setHighlightedWantedResponseId(wantedResponseId);
  }, [dashboard, searchParams]);

  useEffect(() => {
    if (!dashboard || !highlightedRequestId) {
      return;
    }
    const timeout = window.setTimeout(() => {
      document.getElementById(`request-${highlightedRequestId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
    return () => window.clearTimeout(timeout);
  }, [activeTab, dashboard, highlightedRequestId]);

  useEffect(() => {
    if (!dashboard || !highlightedListingId) {
      return;
    }
    const timeout = window.setTimeout(() => {
      document.getElementById(`listing-${highlightedListingId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
    return () => window.clearTimeout(timeout);
  }, [activeTab, dashboard, highlightedListingId]);

  useEffect(() => {
    if (!dashboard || !highlightedWantedResponseId) {
      return;
    }
    const timeout = window.setTimeout(() => {
      document.getElementById(`wanted-response-${highlightedWantedResponseId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
    return () => window.clearTimeout(timeout);
  }, [activeTab, dashboard, highlightedWantedResponseId]);

  useEffect(() => {
    if (!highlightedRequestId && !highlightedListingId && !highlightedWantedResponseId) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setHighlightedRequestId(null);
      setHighlightedListingId(null);
      setHighlightedWantedResponseId(null);
    }, 60_000);
    return () => window.clearTimeout(timeout);
  }, [highlightedRequestId, highlightedListingId, highlightedWantedResponseId]);

  const stats = useMemo(() => {
    const listings = dashboard?.listings ?? [];
    return {
      activeListings: listings.filter((listing) => ["available", "reserved"].includes(listing.status)).length,
      pendingRequests: [
        ...(dashboard?.contact_requests_received ?? []),
        ...(dashboard?.contact_requests_sent ?? []),
      ].filter((request) => request.status === "pending").length,
      pendingWantedResponses: [
        ...(dashboard?.wanted_responses_received ?? []),
        ...(dashboard?.wanted_responses_sent ?? []),
      ].filter((response) => response.status === "pending").length,
      savedItems: dashboard?.favorites.length ?? 0,
      soldItems: listings.filter((listing) => listing.status === "sold").length,
    };
  }, [dashboard]);

  async function markCompleted(transaction: TradeTransaction) {
    const draft = transactionDrafts[transaction.id];
    const agreedPrice = Number(draft?.agreedPrice);
    if (!Number.isFinite(agreedPrice) || agreedPrice <= 0) {
      setError("Enter an agreed price before completing the transaction.");
      return;
    }
    setIsUpdating(transaction.id);
    setError(null);
    try {
      await updateTradeTransaction(transaction.id, {
        status: "completed",
        agreed_price: agreedPrice,
        followed_ai_recommendation: draft?.followedAi ?? true,
      });
      setNotice("Transaction marked completed. Your dashboard is up to date.");
      await loadDashboard();
      notifyAlertStateChanged();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update transaction.");
    } finally {
      setIsUpdating(null);
    }
  }

  async function answerContactRequest(request: ContactRequest, status: "accepted" | "rejected") {
    if (status === "accepted") {
      setAcceptModal(request);
      return;
    }
    // Rejection goes straight through — no modal needed
    setIsUpdating(request.id);
    setError(null);
    setNotice(null);
    try {
      await updateContactRequest(request.id, {
        status: "rejected",
        seller_response: "Rejected by seller.",
        mark_listing_reserved: false,
      });
      setNotice("Request rejected. The buyer has been notified and can keep browsing other UM listings.");
      await loadDashboard();
      notifyAlertStateChanged();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update contact request.");
    } finally {
      setIsUpdating(null);
    }
  }

  async function confirmAcceptRequest(request: ContactRequest, markReserved: boolean) {
    setAcceptModal(null);
    setIsUpdating(request.id);
    setError(null);
    setNotice(null);
    try {
      await updateContactRequest(request.id, {
        status: "accepted",
        seller_response: "Accepted. Contact details are now visible.",
        mark_listing_reserved: markReserved,
      });
      setNotice(
        markReserved
          ? "Request accepted and listing marked as reserved. The buyer has been notified."
          : "Request accepted. The buyer has been notified and can see your contact details.",
      );
      await loadDashboard();
      notifyAlertStateChanged();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to accept contact request.");
    } finally {
      setIsUpdating(null);
    }
  }

  async function resolveSellerRequest(
    request: ContactRequest,
    action: "mark_completed" | "cancel_accepted" | "buyer_no_response",
  ) {
    if (action === "mark_completed") {
      setCompleteModal(request);
      return;
    }
    setIsUpdating(request.id);
    setError(null);
    setNotice(null);
    try {
      await resolveContactRequest(request.id, {
        action,
        agreed_price: undefined,
        sold_source: undefined,
      });
      setNotice("Request closed. The buyer has been notified and the listing can receive interest again.");
      await loadDashboard();
      notifyAlertStateChanged();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to resolve contact request.");
    } finally {
      setIsUpdating(null);
    }
  }

  async function confirmCompleteTrade(request: ContactRequest, agreedPrice: number) {
    setCompleteModal(null);
    setIsUpdating(request.id);
    setError(null);
    setNotice(null);
    try {
      await resolveContactRequest(request.id, {
        action: "mark_completed",
        agreed_price: agreedPrice,
        sold_source: "accepted_request",
      });
      setNotice("Trade marked completed. The buyer has been notified and pending requests were closed.");
      await loadDashboard();
      notifyAlertStateChanged();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to complete trade.");
    } finally {
      setIsUpdating(null);
    }
  }

  async function cancelSentRequest(request: ContactRequest) {
    setIsUpdating(request.id);
    setError(null);
    setNotice(null);
    try {
      await cancelContactRequest(request.id);
      setNotice("Request cancelled. The seller has been notified that your pending request is closed.");
      await loadDashboard();
      notifyAlertStateChanged();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to cancel contact request.");
    } finally {
      setIsUpdating(null);
    }
  }

  async function answerWantedResponse(response: WantedResponse, status: "accepted" | "rejected") {
    setIsUpdating(response.id);
    setError(null);
    setNotice(null);
    try {
      await updateWantedResponse(response.id, {
        status,
        buyer_response: status === "accepted" ? "Accepted. Contact details are now visible." : "Rejected by buyer.",
      });
      setNotice(status === "accepted" ? "Offer accepted. Seller contact is visible now." : "Offer rejected. The seller has been notified.");
      await loadDashboard();
      notifyAlertStateChanged();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update wanted response.");
    } finally {
      setIsUpdating(null);
    }
  }

  async function cancelSentWantedResponse(response: WantedResponse) {
    setIsUpdating(response.id);
    setError(null);
    setNotice(null);
    try {
      await cancelWantedResponse(response.id);
      setNotice("Offer cancelled. The buyer has been notified.");
      await loadDashboard();
      notifyAlertStateChanged();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to cancel wanted response.");
    } finally {
      setIsUpdating(null);
    }
  }

  return (
    <div className={user ? tradeDisplay.variable : undefined}>
      <TradeShell
        description="Manage your listings, drafts, saved items, buyer requests, and completed campus trades."
        hideHero={Boolean(user)}
        title="My Trade"
      >
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-900 shadow-sm" role="alert">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-4 text-sm font-medium text-emerald-950 shadow-sm">
            {notice}
          </div>
        ) : null}

        {!user ? (
          <RequireAuthCard
            description="Sign in with your UM account to see your listings, saved items, contact requests, and transaction evidence."
            intent="dashboard"
            returnTo="/trade/dashboard"
          />
        ) : null}

        {user && isLoading ? (
          <div className="mx-auto w-full max-w-[90rem] space-y-6 pb-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
              <div className="trade-loading-block h-10 w-48 max-w-full rounded-lg bg-stone-200/70" />
              <div className="trade-loading-block h-12 w-40 rounded-xl bg-stone-200/60" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="trade-loading-block h-[118px] rounded-2xl bg-stone-200/50" key={index} />
              ))}
            </div>
            <div className="trade-loading-block h-14 w-full rounded-2xl bg-stone-200/50" />
            <div className="trade-loading-block min-h-[200px] w-full rounded-2xl bg-stone-200/40" />
          </div>
        ) : null}

        {user && dashboard ? (
          <div className="mx-auto w-full max-w-[90rem] space-y-7 pb-6">
            <DashboardHero displayClass={tradeDisplay.className} />

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <TradeStatCard
                detail="Available or reserved"
                icon={Store}
                iconTone="gold"
                label="Active listings"
                value={stats.activeListings}
              />
              <TradeStatCard
                detail="Awaiting response"
                icon={Inbox}
                iconTone="mint"
                label="Pending requests"
                value={stats.pendingRequests}
              />
              <TradeStatCard
                detail="Wanted offers"
                icon={Send}
                iconTone="gold"
                label="Wanted responses"
                value={stats.pendingWantedResponses}
              />
              <TradeStatCard detail="Saved for later" icon={Heart} iconTone="mint" label="Saved items" value={stats.savedItems} />
            </section>

            <div className="-mx-1 overflow-x-auto pb-1">
              <div className="inline-flex min-w-0 gap-1 rounded-2xl border border-[#E8DED0] bg-white p-2 shadow-sm">
                {tabs.map((tab) => (
                  <button
                    aria-pressed={activeTab === tab.id}
                    className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
                      activeTab === tab.id
                        ? "bg-stone-950 text-white shadow-md"
                        : "text-[#6B6257] hover:bg-[#FAF7F0] hover:text-[#111111]"
                    }`}
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:items-start lg:gap-8 xl:gap-9">
              <div className="min-w-0">
                {activeTab === "overview" ? (
                  <Overview dashboard={dashboard} highlightedRequestId={highlightedRequestId} />
                ) : activeTab === "listings" ? (
                  <ListingList
                    highlightedListingId={highlightedListingId}
                    listings={dashboard.listings.filter((listing) => listing.status !== "draft" && listing.status !== "sold")}
                  />
                ) : activeTab === "drafts" ? (
                  <ListingList
                    emptyLabel="No drafts yet."
                    highlightedListingId={highlightedListingId}
                    listings={dashboard.listings.filter((listing) => listing.status === "draft")}
                  />
                ) : activeTab === "sold" ? (
                  <SoldTab
                    dashboard={dashboard}
                    isUpdating={isUpdating}
                    markCompleted={markCompleted}
                    setTransactionDrafts={setTransactionDrafts}
                    transactionDrafts={transactionDrafts}
                  />
                ) : activeTab === "received" ? (
                  <RequestList
                    emptyText="No buyer requests yet."
                    isUpdating={isUpdating}
                    highlightedRequestId={highlightedRequestId}
                    requests={dashboard.contact_requests_received}
                    role="seller"
                    onAnswer={answerContactRequest}
                    onResolve={resolveSellerRequest}
                  />
                ) : activeTab === "sent" ? (
                  <RequestList
                    emptyText="No sent requests yet."
                    isUpdating={isUpdating}
                    highlightedRequestId={highlightedRequestId}
                    requests={dashboard.contact_requests_sent}
                    role="buyer"
                    onAnswer={answerContactRequest}
                    onCancel={cancelSentRequest}
                  />
                ) : (
                  <WantedResponsesTab
                    highlightedWantedResponseId={highlightedWantedResponseId}
                    isUpdating={isUpdating}
                    listings={dashboard.listings}
                    received={dashboard.wanted_responses_received}
                    sent={dashboard.wanted_responses_sent}
                    wantedPosts={dashboard.wanted_posts}
                    onAnswer={answerWantedResponse}
                    onCancel={cancelSentWantedResponse}
                  />
                )}
              </div>

              <DashboardSidebar />
            </div>

            {acceptModal ? (
              <AcceptRequestModal
                isUpdating={isUpdating === acceptModal.id}
                request={acceptModal}
                onCancel={() => setAcceptModal(null)}
                onConfirm={(markReserved) => void confirmAcceptRequest(acceptModal, markReserved)}
              />
            ) : null}
            {completeModal ? (
              <CompleteTradeModal
                isUpdating={isUpdating === completeModal.id}
                request={completeModal}
                onCancel={() => setCompleteModal(null)}
                onConfirm={(agreedPrice) => void confirmCompleteTrade(completeModal, agreedPrice)}
              />
            ) : null}
          </div>
        ) : null}
      </TradeShell>
    </div>
  );
}

function Overview({
  dashboard,
  highlightedRequestId,
}: Readonly<{ dashboard: TradeDashboard; highlightedRequestId: string | null }>) {
  const recentRequests = [
    ...dashboard.contact_requests_received.map((request) => ({ request, role: "seller" as const })),
    ...dashboard.contact_requests_sent.map((request) => ({ request, role: "buyer" as const })),
  ];

  return (
    <section className="grid gap-5 md:grid-cols-2">
      <DashboardPanel
        actionHref="/trade/dashboard?tab=listings"
        actionLabel="View all"
        title="Recent listings"
      >
        {dashboard.listings.length === 0 ? (
          <TradeDashEmpty
            actionHref="/trade/sell"
            actionLabel="Create Listing"
            description="Create your first listing to start receiving buyer requests."
            icon={Tag}
            title="No listings yet"
          />
        ) : (
          dashboard.listings.slice(0, 4).map((listing) => <ListingRow key={listing.id} listing={listing} />)
        )}
      </DashboardPanel>
      <DashboardPanel
        actionHref="/trade/dashboard?tab=received"
        actionLabel="View all"
        title="Recent requests"
      >
        {recentRequests.length === 0 ? (
          <div className="rounded-xl border border-[#E8DED0]/90 bg-[#FFFBF2]/50 px-4 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF8EA] text-[#C98A1D]">
              <MessageSquare aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <p className="mt-4 text-sm font-medium text-[#6B6257]">No contact requests yet.</p>
          </div>
        ) : (
          recentRequests
            .slice(0, 4)
            .map(({ request, role }) => (
              <RequestCard
                isHighlighted={highlightedRequestId === request.id}
                key={request.id}
                request={request}
                role={role}
              />
            ))
        )}
      </DashboardPanel>
      <DashboardPanel actionHref="/trade/dashboard?tab=wanted" actionLabel="View all" title="Wanted posts">
        {dashboard.wanted_posts.length === 0 ? (
          <TradeDashEmpty
            actionHref="/trade/want"
            actionLabel="Post Wanted Request"
            description="Tell UM sellers what you are looking for."
            icon={Search}
            title="No wanted posts"
          />
        ) : (
          dashboard.wanted_posts.slice(0, 4).map((post) => (
            <Link
              className="block rounded-xl border border-[#E8DED0] bg-[#FAF7F0]/40 p-4 transition hover:border-[#D99A2B]/35 hover:bg-[#FFFBF2]"
              href={`/wanted-posts/${post.id}`}
              key={post.id}
            >
              <p className="font-semibold text-[#111111]">{post.title}</p>
              <p className="mt-1 text-sm text-[#6B6257]">
                Budget {formatMoney(post.max_budget, post.currency)} · {formatPickupLocation(post.preferred_pickup_area)}
              </p>
            </Link>
          ))
        )}
      </DashboardPanel>
      <DashboardPanel actionHref="/trade/saved" actionLabel="View all" title="Saved listings">
        {dashboard.favorites.length === 0 ? (
          <TradeDashEmpty
            actionHref="/trade"
            actionLabel="Browse listings"
            description="Tap the heart on listings you want to compare later."
            icon={Heart}
            iconVariant="mint"
            title="No saved listings"
          />
        ) : (
          dashboard.favorites.slice(0, 4).map((favorite) =>
            favorite.listing ? <ListingRow key={favorite.id} listing={favorite.listing} /> : null,
          )
        )}
      </DashboardPanel>
    </section>
  );
}

function ListingList({
  listings,
  emptyLabel = "No listings in this tab.",
  highlightedListingId = null,
}: Readonly<{ listings: Listing[]; emptyLabel?: string; highlightedListingId?: string | null }>) {
  if (listings.length === 0) {
    return (
      <TradeDashEmpty
        actionHref="/trade/sell"
        actionLabel="Create listing"
        description={emptyLabel}
        icon={Tag}
        title="Nothing here yet"
      />
    );
  }
  return (
    <section className="grid gap-3">
      {listings.map((listing) => (
        <ListingRow isHighlighted={highlightedListingId === listing.id} key={listing.id} listing={listing} />
      ))}
    </section>
  );
}

function ListingRow({ isHighlighted = false, listing }: Readonly<{ isHighlighted?: boolean; listing: Listing }>) {
  return (
    <Link
      className={`block rounded-xl border border-[#E8DED0] bg-white p-4 shadow-sm transition hover:border-[#D99A2B]/30 hover:shadow-md ${
        isHighlighted ? "border-[#07875D]/40 bg-[#E7F7EF]/50 ring-2 ring-[#07875D]/25" : ""
      }`}
      data-highlighted={isHighlighted ? "true" : "false"}
      href={`/trade/${listing.id}`}
      id={`listing-${listing.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[#111111]">{listing.title}</p>
          <p className="mt-1 text-sm text-[#6B6257]">
            {formatMoney(listing.price, listing.currency)} · {formatPickupLocation(listing.pickup_location ?? listing.pickup_area)}
          </p>
          <p className="mt-1 text-xs text-[#6B6257]">Posted {formatRelativeTime(listing.created_at)}</p>
        </div>
        <StatusPill tone={statusTone(listing.status)}>{listing.status}</StatusPill>
      </div>
    </Link>
  );
}

function RequestList({
  emptyText,
  isUpdating,
  highlightedRequestId,
  requests,
  role,
  onAnswer,
  onCancel,
  onResolve,
}: Readonly<{
  emptyText: string;
  isUpdating: string | null;
  highlightedRequestId?: string | null;
  requests: ContactRequest[];
  role: "seller" | "buyer";
  onAnswer: (request: ContactRequest, status: "accepted" | "rejected") => Promise<void>;
  onCancel?: (request: ContactRequest) => Promise<void>;
  onResolve?: (request: ContactRequest, action: "mark_completed" | "cancel_accepted" | "buyer_no_response") => Promise<void>;
}>) {
  if (requests.length === 0) {
    return (
      <TradeDashEmpty
        actionHref={role === "seller" ? "/trade/sell" : "/trade"}
        actionLabel={role === "seller" ? "Sell an Item" : "Browse listings"}
        description={emptyText}
        icon={Inbox}
        title="No requests"
      />
    );
  }
  return (
    <section className="grid gap-3">
      {requests.map((request) => (
        <RequestCard
          isUpdating={isUpdating === request.id}
          isHighlighted={highlightedRequestId === request.id}
          key={request.id}
          request={request}
          role={role}
          onAnswer={onAnswer}
          onCancel={onCancel}
          onResolve={onResolve}
        />
      ))}
    </section>
  );
}

function WantedResponsesTab({
  highlightedWantedResponseId,
  isUpdating,
  listings,
  received,
  sent,
  wantedPosts,
  onAnswer,
  onCancel,
}: Readonly<{
  highlightedWantedResponseId: string | null;
  isUpdating: string | null;
  listings: Listing[];
  received: WantedResponse[];
  sent: WantedResponse[];
  wantedPosts: WantedPost[];
  onAnswer: (response: WantedResponse, status: "accepted" | "rejected") => Promise<void>;
  onCancel: (response: WantedResponse) => Promise<void>;
}>) {
  const listingsFromWanted = listings.filter((listing) => listing.source_wanted_post_id);
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <DashboardPanel title="My Wanted Posts">
        {wantedPosts.length === 0 ? (
          <TradeDashEmpty
            actionHref="/trade/want"
            actionLabel="Post Wanted Request"
            description="Post what you need so UM students can send offers."
            icon={Megaphone}
            title="No wanted posts"
          />
        ) : (
          wantedPosts.map((post) => (
            <Link
              className="block rounded-xl border border-[#E8DED0] bg-[#FAF7F0]/30 p-4 transition hover:border-[#D99A2B]/35 hover:bg-[#FFFBF2]"
              href={`/wanted-posts/${post.id}`}
              key={post.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-[#111111]">{post.title}</p>
                  <p className="mt-1 text-sm text-[#6B6257]">
                    {post.desired_item_name ?? "Flexible item"} · {formatMoney(post.max_budget, post.currency)} ·{" "}
                    {formatPickupLocation(post.preferred_pickup_area)}
                  </p>
                  <p className="mt-2 text-xs text-[#6B6257]">{formatRelativeTime(post.created_at)}</p>
                </div>
                <StatusPill tone={post.status === "active" ? "good" : "warn"}>
                  {post.status === "active" ? "Active · sellers can send offers" : "Closed · no new offers"}
                </StatusPill>
              </div>
              <span className="mt-3 inline-flex rounded-lg border border-[#E8DED0] bg-[#FFF8EA] px-3 py-2 text-sm font-semibold text-[#A85F00]">
                View Offers
              </span>
            </Link>
          ))
        )}
      </DashboardPanel>
      <DashboardPanel title="Incoming Offers">
        {received.length === 0 ? (
          <TradeDashEmpty
            actionHref="/trade/want"
            actionLabel="Post Wanted Request"
            description="Seller offers for your wanted posts will appear here."
            icon={Inbox}
            title="No incoming offers"
          />
        ) : (
          received.map((response) => (
            <WantedResponseCard
              isHighlighted={highlightedWantedResponseId === response.id}
              isUpdating={isUpdating === response.id}
              key={response.id}
              response={response}
              role="buyer"
              onAnswer={onAnswer}
            />
          ))
        )}
      </DashboardPanel>
      <DashboardPanel title="My Sent Offers">
        {sent.length === 0 ? (
          <TradeDashEmpty
            actionHref="/trade/want"
            actionLabel="Browse wanted board"
            description="Respond to buyer demand when you have the right item."
            icon={Send}
            title="No sent offers"
          />
        ) : (
          sent.map((response) => (
            <WantedResponseCard
              isHighlighted={highlightedWantedResponseId === response.id}
              isUpdating={isUpdating === response.id}
              key={response.id}
              response={response}
              role="seller"
              onCancel={onCancel}
            />
          ))
        )}
      </DashboardPanel>
      <DashboardPanel title="Listings From Wanted">
        {listingsFromWanted.length === 0 ? (
          <TradeDashEmpty
            actionHref="/trade/want"
            actionLabel="Browse wanted board"
            description="Listings you create from a wanted request will appear here for quick follow-up."
            icon={Store}
            title="No wanted-linked listings"
          />
        ) : (
          listingsFromWanted.map((listing) => <ListingRow key={listing.id} listing={listing} />)
        )}
      </DashboardPanel>
    </section>
  );
}

function WantedResponseCard({
  isHighlighted = false,
  isUpdating = false,
  response,
  role,
  onAnswer,
  onCancel,
}: Readonly<{
  isHighlighted?: boolean;
  isUpdating?: boolean;
  response: WantedResponse;
  role: "buyer" | "seller";
  onAnswer?: (response: WantedResponse, status: "accepted" | "rejected") => Promise<void>;
  onCancel?: (response: WantedResponse) => Promise<void>;
}>) {
  const wantedTitle = response.wanted_post?.title ?? "Wanted request";
  return (
    <article
      className={`rounded-xl border border-[#E8DED0] bg-white p-4 shadow-sm transition ${
        isHighlighted ? "border-[#07875D]/40 ring-2 ring-[#07875D]/20" : ""
      }`}
      data-highlighted={isHighlighted ? "true" : "false"}
      id={`wanted-response-${response.id}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link className="font-semibold text-slate-950 transition hover:text-emerald-800" href={`/wanted-posts/${response.wanted_post_id}`}>
            {wantedTitle}
          </Link>
          <p className="mt-1 text-sm leading-6 text-slate-600">{response.message ?? "No offer message provided."}</p>
          <p className="mt-2 text-xs text-slate-500">{formatRelativeTime(response.created_at)}</p>
        </div>
        <StatusPill tone={statusTone(response.status)}>{response.status}</StatusPill>
      </div>
      <OfferStatusTimeline status={response.status} />

      {response.listing ? (
        <Link className="mt-3 block rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm transition hover:border-emerald-200 hover:bg-emerald-50" href={`/trade/${response.listing.id}`}>
          <span className="font-semibold text-slate-950">{response.listing.title}</span>
          <span className="mt-1 block text-slate-600">
            {formatMoney(response.listing.price, response.listing.currency)} · {formatPickupLocation(response.listing.pickup_location ?? response.listing.pickup_area)}
          </span>
        </Link>
      ) : null}

      {response.status === "accepted" ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
          Seller contact: {formatContactLine(response.seller_contact_method, response.seller_contact_value)}
          {response.contact_reveal_blocked_reason ? (
            <p className="mt-1 text-xs font-semibold text-emerald-800">{response.contact_reveal_blocked_reason}</p>
          ) : null}
        </div>
      ) : null}

      {response.buyer_response ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Buyer note: {response.buyer_response}
        </p>
      ) : null}

      {role === "buyer" && response.status === "pending" && onAnswer ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="trade-button-primary" disabled={isUpdating} onClick={() => void onAnswer(response, "accepted")} type="button">
            {isUpdating ? "Updating..." : "Accept offer"}
          </button>
          <button className="trade-button-secondary border-rose-200 text-rose-700 hover:bg-rose-50" disabled={isUpdating} onClick={() => void onAnswer(response, "rejected")} type="button">
            Reject
          </button>
        </div>
      ) : null}

      {role === "seller" && response.status === "pending" && onCancel ? (
        <button className="trade-button-secondary mt-3" disabled={isUpdating} onClick={() => void onCancel(response)} type="button">
          {isUpdating ? "Cancelling..." : "Cancel offer"}
        </button>
      ) : null}
    </article>
  );
}

function OfferStatusTimeline({ status }: Readonly<{ status: string }>) {
  const terminalLabel =
    status === "accepted"
      ? "Accepted"
      : status === "rejected"
        ? "Rejected"
        : status === "cancelled"
          ? "Cancelled"
          : "Accepted / Rejected / Cancelled";
  const steps = ["Offer sent", "Buyer reviewing", terminalLabel];
  const activeIndex = status === "pending" ? 1 : 2;

  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
      {steps.map((step, index) => (
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600" key={step}>
          <span className={`h-2.5 w-2.5 rounded-full ${index <= activeIndex ? "bg-emerald-600" : "bg-slate-300"}`} />
          <span className={index <= activeIndex ? "text-slate-950" : ""}>{step}</span>
        </div>
      ))}
    </div>
  );
}

function RequestCard({
  isUpdating = false,
  isHighlighted = false,
  request,
  role,
  onAnswer,
  onCancel,
  onResolve,
}: Readonly<{
  isUpdating?: boolean;
  isHighlighted?: boolean;
  request: ContactRequest;
  role: "seller" | "buyer";
  onAnswer?: (request: ContactRequest, status: "accepted" | "rejected") => Promise<void>;
  onCancel?: (request: ContactRequest) => Promise<void>;
  onResolve?: (request: ContactRequest, action: "mark_completed" | "cancel_accepted" | "buyer_no_response") => Promise<void>;
}>) {
  const canAnswer = role === "seller" && request.status === "pending" && onAnswer;
  return (
    <article
      className={`rounded-xl border border-[#E8DED0] bg-white p-4 shadow-sm transition ${
        isHighlighted ? "border-[#07875D]/40 ring-2 ring-[#07875D]/20" : ""
      }`}
      data-highlighted={isHighlighted ? "true" : "false"}
      id={`request-${request.id}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-slate-950">{request.listing?.title ?? "Listing"}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{request.message ?? "No message provided."}</p>
          <p className="mt-2 text-xs text-slate-500">{formatRelativeTime(request.created_at)}</p>
        </div>
        <StatusPill tone={statusTone(request.status)}>{request.status}</StatusPill>
      </div>
      {role === "seller" && request.buyer_contact_value ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Buyer contact: {request.buyer_contact_method} {request.buyer_contact_value}
        </div>
      ) : null}
      {request.status === "accepted" ? (
        <div className="mt-3 grid gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
          <p>Buyer: {formatContactLine(request.buyer_contact_method, request.buyer_contact_value)}</p>
          <p>
            Seller:{" "}
            {request.contact_reveal_blocked_reason
              ? request.contact_reveal_blocked_reason
              : formatContactLine(request.seller_contact_method, request.seller_contact_value)}
          </p>
          <p className="font-semibold">
            {request.seller_contact_method === "in_app"
              ? "Seller chose in-app requests only. Use the buyer contact above to arrange pickup safely."
              : "Contact details available. Arrange pickup safely on campus."}
          </p>
        </div>
      ) : null}
      <RequestTimeline request={request} />
      {canAnswer ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="trade-button-primary" disabled={isUpdating} onClick={() => void onAnswer(request, "accepted")} type="button">
            Accept
          </button>
          <button className="trade-button-secondary border-rose-200 text-rose-700 hover:bg-rose-50" disabled={isUpdating} onClick={() => void onAnswer(request, "rejected")} type="button">
            Reject
          </button>
        </div>
      ) : null}
      {role === "buyer" && request.status === "pending" && onCancel ? (
        <button className="trade-button-secondary mt-3" disabled={isUpdating} onClick={() => void onCancel(request)} type="button">
          Cancel request
        </button>
      ) : null}
      {role === "seller" && request.status === "accepted" && onResolve ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="trade-button-primary" disabled={isUpdating} onClick={() => void onResolve(request, "mark_completed")} type="button">
            Mark completed
          </button>
          <button className="trade-button-secondary" disabled={isUpdating} onClick={() => void onResolve(request, "buyer_no_response")} type="button">
            Buyer no response
          </button>
          <button className="trade-button-secondary border-rose-200 text-rose-700 hover:bg-rose-50" disabled={isUpdating} onClick={() => void onResolve(request, "cancel_accepted")} type="button">
            Cancel accepted
          </button>
        </div>
      ) : null}
    </article>
  );
}

function RequestTimeline({ request }: Readonly<{ request: ContactRequest }>) {
  const steps = [
    { id: "pending", label: "Sent", active: true },
    { id: "accepted", label: "Accepted", active: request.status === "accepted" },
    { id: "rejected", label: "Rejected", active: request.status === "rejected" },
    { id: "cancelled", label: "Cancelled", active: request.status === "cancelled" },
    { id: "expired", label: "Expired", active: request.status === "expired" },
  ];
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {steps.map((step) => (
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            step.active
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-slate-50 text-slate-400"
          }`}
          key={step.id}
        >
          {step.label}
        </span>
      ))}
    </div>
  );
}

function formatContactLine(method: string | null | undefined, value: string | null | undefined): string {
  if (!method) {
    return "Not revealed yet";
  }
  if (method === "in_app") {
    return "In-app request only";
  }
  return value ? `${method} ${value}` : `${method} not provided`;
}

function isDashboardTab(value: string | null): value is DashboardTab {
  return tabs.some((tab) => tab.id === value);
}

function SoldTab({
  dashboard,
  isUpdating,
  markCompleted,
  setTransactionDrafts,
  transactionDrafts,
}: Readonly<{
  dashboard: TradeDashboard;
  isUpdating: string | null;
  markCompleted: (transaction: TradeTransaction) => Promise<void>;
  setTransactionDrafts: React.Dispatch<React.SetStateAction<Record<string, { agreedPrice: string; followedAi: boolean }>>>;
  transactionDrafts: Record<string, { agreedPrice: string; followedAi: boolean }>;
}>) {
  const soldListings = dashboard.listings.filter((listing) => listing.status === "sold");
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <DashboardPanel title="Sold listings">
        {soldListings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E8DED0] bg-[#FAF7F0]/50 px-4 py-8 text-center text-sm text-[#6B6257]">
            No sold listings yet.
          </div>
        ) : (
          soldListings.map((listing) => <ListingRow key={listing.id} listing={listing} />)
        )}
      </DashboardPanel>
      <DashboardPanel title="Transaction records">
        {dashboard.transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E8DED0] bg-[#FAF7F0]/50 px-4 py-8 text-center text-sm text-[#6B6257]">
            Accepted requests and completed trades will appear here.
          </div>
        ) : (
          dashboard.transactions.map((transaction) => (
            <div className="rounded-xl border border-[#E8DED0] bg-white p-4 shadow-sm" key={transaction.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#111111]">{transaction.status.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-sm text-[#6B6257]">{formatMoney(transaction.agreed_price, transaction.currency)}</p>
                </div>
                <StatusPill tone={transaction.completed_at ? "accepted" : "pending"}>
                  {transaction.completed_at ? "completed" : "open"}
                </StatusPill>
              </div>
              {!transaction.completed_at ? (
                <div className="mt-3 grid gap-3">
                  <p className="text-xs text-[#6B6257]">
                    Help improve future price suggestions by recording the final sale price.
                  </p>
                  <input
                    className="trade-input"
                    min="1"
                    onChange={(event) =>
                      setTransactionDrafts((current) => ({
                        ...current,
                        [transaction.id]: {
                          agreedPrice: event.target.value,
                          followedAi: current[transaction.id]?.followedAi ?? true,
                        },
                      }))
                    }
                    placeholder="Final agreed price (RM)"
                    type="number"
                    value={transactionDrafts[transaction.id]?.agreedPrice ?? ""}
                  />
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#111111]">
                    <input
                      checked={transactionDrafts[transaction.id]?.followedAi ?? true}
                      onChange={(event) =>
                        setTransactionDrafts((current) => ({
                          ...current,
                          [transaction.id]: {
                            agreedPrice: current[transaction.id]?.agreedPrice ?? "",
                            followedAi: event.target.checked,
                          },
                        }))
                      }
                      type="checkbox"
                    />
                    I followed the AI price suggestion
                  </label>
                  <button className="trade-button-primary" disabled={isUpdating === transaction.id} onClick={() => void markCompleted(transaction)} type="button">
                    {isUpdating === transaction.id ? "Updating…" : "Mark completed"}
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </DashboardPanel>
    </section>
  );
}

function DashboardPanel({
  title,
  actionHref,
  actionLabel,
  children,
}: Readonly<{
  title: string;
  actionHref?: string;
  actionLabel?: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="rounded-2xl border border-[#E8DED0] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E8DED0]/80 pb-4">
        <h2 className="text-base font-bold text-[#111111]">{title}</h2>
        {actionHref && actionLabel ? (
          <Link className="text-sm font-semibold text-[#A85F00] transition hover:text-[#C98A1D]" href={actionHref}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

