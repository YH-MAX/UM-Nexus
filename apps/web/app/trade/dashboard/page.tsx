"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Heart, Inbox, PackageCheck, PlusCircle, Store } from "lucide-react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { DashboardStatCard } from "@/components/trade/dashboard-stat-card";
import { EmptyState } from "@/components/trade/empty-state";
import { StatusPill, statusTone } from "@/components/trade/status-pill";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  cancelContactRequest,
  formatMoney,
  formatPickupLocation,
  formatRelativeTime,
  getTradeDashboard,
  resolveContactRequest,
  updateContactRequest,
  updateTradeTransaction,
  type ContactRequest,
  type Listing,
  type TradeDashboard,
  type TradeTransaction,
} from "@/lib/trade/api";

type DashboardTab = "overview" | "listings" | "received" | "sent" | "drafts" | "sold";

const tabs: Array<{ id: DashboardTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "listings", label: "My Listings" },
  { id: "received", label: "Received Requests" },
  { id: "sent", label: "Sent Requests" },
  { id: "drafts", label: "Drafts" },
  { id: "sold", label: "Sold" },
];

export default function TradeDashboardPage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const searchParams = useSearchParams();
  const [dashboard, setDashboard] = useState<TradeDashboard | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null);
  const [highlightedListingId, setHighlightedListingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [transactionDrafts, setTransactionDrafts] = useState<Record<string, { agreedPrice: string; followedAi: boolean }>>({});
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
    if (isDashboardTab(tab)) {
      setActiveTab(tab);
    } else if (requestId && dashboard?.contact_requests_received.some((request) => request.id === requestId)) {
      setActiveTab("received");
    } else if (requestId && dashboard?.contact_requests_sent.some((request) => request.id === requestId)) {
      setActiveTab("sent");
    } else if (listingId && dashboard?.listings.some((listing) => listing.id === listingId)) {
      setActiveTab("listings");
    }
    setHighlightedRequestId(requestId);
    setHighlightedListingId(listingId);
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
    if (!highlightedRequestId && !highlightedListingId) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setHighlightedRequestId(null);
      setHighlightedListingId(null);
    }, 60_000);
    return () => window.clearTimeout(timeout);
  }, [highlightedRequestId, highlightedListingId]);

  const stats = useMemo(() => {
    const listings = dashboard?.listings ?? [];
    return {
      activeListings: listings.filter((listing) => ["available", "reserved"].includes(listing.status)).length,
      pendingRequests: [
        ...(dashboard?.contact_requests_received ?? []),
        ...(dashboard?.contact_requests_sent ?? []),
      ].filter((request) => request.status === "pending").length,
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
    setIsUpdating(request.id);
    setError(null);
    setNotice(null);
    try {
      await updateContactRequest(request.id, {
        status,
        seller_response: status === "accepted" ? "Accepted. Contact details are now visible." : "Rejected by seller.",
        mark_listing_reserved: status === "accepted" ? window.confirm("Do you want to mark this listing as reserved?") : false,
      });
      setNotice(
        status === "accepted"
          ? "Request accepted. The buyer has been notified and can see seller contact after their profile is complete."
          : "Request rejected. The buyer has been notified and can keep browsing other UM listings.",
      );
      await loadDashboard();
      notifyAlertStateChanged();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update contact request.");
    } finally {
      setIsUpdating(null);
    }
  }

  async function resolveSellerRequest(
    request: ContactRequest,
    action: "mark_completed" | "cancel_accepted" | "buyer_no_response",
  ) {
    setIsUpdating(request.id);
    setError(null);
    setNotice(null);
    try {
      const agreedPrice =
        action === "mark_completed" ? Number(window.prompt("Optional agreed price in RM", String(request.listing?.price ?? ""))) : undefined;
      await resolveContactRequest(request.id, {
        action,
        agreed_price: Number.isFinite(agreedPrice) && agreedPrice ? agreedPrice : undefined,
        sold_source: action === "mark_completed" ? "accepted_request" : undefined,
      });
      setNotice(
        action === "mark_completed"
          ? "Trade marked completed. The buyer has been notified and pending requests were closed."
          : "Request closed. The buyer has been notified and the listing can receive interest again.",
      );
      await loadDashboard();
      notifyAlertStateChanged();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to resolve contact request.");
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

  return (
    <TradeShell
      title="My Trade"
      description="Manage your listings, drafts, saved items, buyer requests, and completed campus trades."
      action={
        <Link className="trade-button-primary" href="/trade/sell">
          <PlusCircle aria-hidden="true" className="h-4 w-4" />
          Sell an Item
        </Link>
      }
    >
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {notice}
        </div>
      ) : null}

      {!user ? (
        <RequireAuthCard description="Sign in with your UM account to see your listings, saved items, contact requests, and transaction evidence." intent="dashboard" returnTo="/trade/dashboard" />
      ) : null}

      {user && isLoading ? (
        <div className="trade-card p-5 text-sm text-slate-600">Loading dashboard...</div>
      ) : user && dashboard ? (
        <div className="grid gap-5">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardStatCard detail="Available or reserved" icon={Store} label="Active listings" value={stats.activeListings} />
            <DashboardStatCard detail="Awaiting response" icon={Inbox} label="Pending requests" value={stats.pendingRequests} />
            <DashboardStatCard detail="Saved for later" icon={Heart} label="Saved items" value={stats.savedItems} />
            <DashboardStatCard detail="Marked sold" icon={PackageCheck} label="Sold items" value={stats.soldItems} />
          </section>

          <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {tabs.map((tab) => (
              <button
                aria-pressed={activeTab === tab.id}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" ? (
            <Overview dashboard={dashboard} highlightedRequestId={highlightedRequestId} />
          ) : activeTab === "listings" ? (
            <ListingList highlightedListingId={highlightedListingId} listings={dashboard.listings.filter((listing) => listing.status !== "draft" && listing.status !== "sold")} />
          ) : activeTab === "drafts" ? (
            <ListingList emptyLabel="No drafts yet." highlightedListingId={highlightedListingId} listings={dashboard.listings.filter((listing) => listing.status === "draft")} />
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
          ) : (
            <RequestList
              emptyText="No sent requests yet."
              isUpdating={isUpdating}
              highlightedRequestId={highlightedRequestId}
              requests={dashboard.contact_requests_sent}
              role="buyer"
              onAnswer={answerContactRequest}
              onCancel={cancelSentRequest}
            />
          )}
        </div>
      ) : null}
    </TradeShell>
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
    <section className="grid gap-5 lg:grid-cols-2">
      <Panel title="Recent listings">
        {dashboard.listings.length === 0 ? (
          <EmptyState actionHref="/trade/sell" actionLabel="Create listing" description="Create your first listing to start receiving buyer requests." title="No listings yet" />
        ) : (
          dashboard.listings.slice(0, 4).map((listing) => <ListingRow key={listing.id} listing={listing} />)
        )}
      </Panel>
      <Panel title="Recent requests">
        {recentRequests.length === 0 ? (
          <p className="text-sm text-slate-600">No contact requests yet.</p>
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
      </Panel>
      <Panel title="Wanted posts">
        {dashboard.wanted_posts.length === 0 ? (
          <EmptyState actionHref="/trade/want" actionLabel="Post wanted request" description="Tell UM sellers what you are looking for." title="No wanted posts" />
        ) : (
          dashboard.wanted_posts.slice(0, 4).map((post) => (
            <Link className="block rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-200 hover:bg-emerald-50" href={`/wanted-posts/${post.id}`} key={post.id}>
              <p className="font-semibold text-slate-950">{post.title}</p>
              <p className="mt-1 text-sm text-slate-600">
                Budget {formatMoney(post.max_budget, post.currency)} · {formatPickupLocation(post.preferred_pickup_area)}
              </p>
            </Link>
          ))
        )}
      </Panel>
      <Panel title="Saved listings">
        {dashboard.favorites.length === 0 ? (
          <EmptyState actionHref="/trade" actionLabel="Browse listings" description="Tap the heart on listings you want to compare later." title="No saved listings" />
        ) : (
          dashboard.favorites.slice(0, 4).map((favorite) => (
            favorite.listing ? <ListingRow key={favorite.id} listing={favorite.listing} /> : null
          ))
        )}
      </Panel>
    </section>
  );
}

function ListingList({
  listings,
  emptyLabel = "No listings in this tab.",
  highlightedListingId = null,
}: Readonly<{ listings: Listing[]; emptyLabel?: string; highlightedListingId?: string | null }>) {
  if (listings.length === 0) {
    return <EmptyState actionHref="/trade/sell" actionLabel="Create listing" description={emptyLabel} title="Nothing here yet" />;
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
      className={`trade-card trade-card-hover block p-4 ${
        isHighlighted ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200" : ""
      }`}
      data-highlighted={isHighlighted ? "true" : "false"}
      href={`/trade/${listing.id}`}
      id={`listing-${listing.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{listing.title}</p>
          <p className="mt-1 text-sm text-slate-600">
            {formatMoney(listing.price, listing.currency)} · {formatPickupLocation(listing.pickup_location ?? listing.pickup_area)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Posted {formatRelativeTime(listing.created_at)}</p>
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
      <EmptyState
        actionHref={role === "seller" ? "/trade/sell" : "/trade"}
        actionLabel={role === "seller" ? "Sell an Item" : "Browse listings"}
        description={emptyText}
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
      className={`trade-card p-4 transition ${
        isHighlighted ? "border-emerald-300 ring-4 ring-emerald-100" : ""
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
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Buyer contact: {request.buyer_contact_method} {request.buyer_contact_value}
        </div>
      ) : null}
      {request.status === "accepted" ? (
        <div className="mt-3 grid gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
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
      <Panel title="Sold listings">
        {soldListings.length === 0 ? (
          <p className="text-sm text-slate-600">No sold listings yet.</p>
        ) : (
          soldListings.map((listing) => <ListingRow key={listing.id} listing={listing} />)
        )}
      </Panel>
      <Panel title="Transaction records">
        {dashboard.transactions.length === 0 ? (
          <p className="text-sm text-slate-600">Accepted requests and completed trades will appear here.</p>
        ) : (
          dashboard.transactions.map((transaction) => (
            <div className="rounded-2xl border border-slate-200 p-4" key={transaction.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{transaction.status.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-sm text-slate-600">{formatMoney(transaction.agreed_price, transaction.currency)}</p>
                </div>
                <StatusPill tone={transaction.completed_at ? "accepted" : "pending"}>
                  {transaction.completed_at ? "completed" : "open"}
                </StatusPill>
              </div>
              {!transaction.completed_at ? (
                <div className="mt-3 grid gap-3">
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
                    placeholder="Agreed price"
                    type="number"
                    value={transactionDrafts[transaction.id]?.agreedPrice ?? ""}
                  />
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
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
                    Followed AI recommendation
                  </label>
                  <button className="trade-button-primary" disabled={isUpdating === transaction.id} onClick={() => void markCompleted(transaction)} type="button">
                    {isUpdating === transaction.id ? "Updating..." : "Mark completed"}
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </Panel>
    </section>
  );
}

function Panel({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="trade-card p-5">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}
