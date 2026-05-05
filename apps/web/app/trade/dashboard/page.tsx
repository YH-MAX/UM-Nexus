"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  const [dashboard, setDashboard] = useState<TradeDashboard | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [transactionDrafts, setTransactionDrafts] = useState<Record<string, { agreedPrice: string; followedAi: boolean }>>({});
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
      await loadDashboard();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update transaction.");
    } finally {
      setIsUpdating(null);
    }
  }

  async function answerContactRequest(request: ContactRequest, status: "accepted" | "rejected") {
    setIsUpdating(request.id);
    setError(null);
    try {
      await updateContactRequest(request.id, {
        status,
        seller_response: status === "accepted" ? "Accepted. Contact details are now visible." : "Rejected by seller.",
      });
      await loadDashboard();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update contact request.");
    } finally {
      setIsUpdating(null);
    }
  }

  async function cancelSentRequest(request: ContactRequest) {
    setIsUpdating(request.id);
    setError(null);
    try {
      await cancelContactRequest(request.id);
      await loadDashboard();
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

      {!user ? (
        <RequireAuthCard description="Sign in with your UM account to see your listings, saved items, contact requests, and transaction evidence." />
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
            <Overview dashboard={dashboard} />
          ) : activeTab === "listings" ? (
            <ListingList listings={dashboard.listings.filter((listing) => listing.status !== "draft" && listing.status !== "sold")} />
          ) : activeTab === "drafts" ? (
            <ListingList emptyLabel="No drafts yet." listings={dashboard.listings.filter((listing) => listing.status === "draft")} />
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
              requests={dashboard.contact_requests_received}
              role="seller"
              onAnswer={answerContactRequest}
            />
          ) : (
            <RequestList
              emptyText="No sent requests yet."
              isUpdating={isUpdating}
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

function Overview({ dashboard }: Readonly<{ dashboard: TradeDashboard }>) {
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
        {[...dashboard.contact_requests_received, ...dashboard.contact_requests_sent].length === 0 ? (
          <p className="text-sm text-slate-600">No contact requests yet.</p>
        ) : (
          [...dashboard.contact_requests_received, ...dashboard.contact_requests_sent]
            .slice(0, 4)
            .map((request) => <RequestCard key={request.id} request={request} role="buyer" />)
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

function ListingList({ listings, emptyLabel = "No listings in this tab." }: Readonly<{ listings: Listing[]; emptyLabel?: string }>) {
  if (listings.length === 0) {
    return <EmptyState actionHref="/trade/sell" actionLabel="Create listing" description={emptyLabel} title="Nothing here yet" />;
  }
  return (
    <section className="grid gap-3">
      {listings.map((listing) => <ListingRow key={listing.id} listing={listing} />)}
    </section>
  );
}

function ListingRow({ listing }: Readonly<{ listing: Listing }>) {
  return (
    <Link className="trade-card trade-card-hover block p-4" href={`/trade/${listing.id}`}>
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
  requests,
  role,
  onAnswer,
  onCancel,
}: Readonly<{
  emptyText: string;
  isUpdating: string | null;
  requests: ContactRequest[];
  role: "seller" | "buyer";
  onAnswer: (request: ContactRequest, status: "accepted" | "rejected") => Promise<void>;
  onCancel?: (request: ContactRequest) => Promise<void>;
}>) {
  if (requests.length === 0) {
    return <EmptyState actionHref="/trade" actionLabel="Browse listings" description={emptyText} title="No requests" />;
  }
  return (
    <section className="grid gap-3">
      {requests.map((request) => (
        <RequestCard
          isUpdating={isUpdating === request.id}
          key={request.id}
          request={request}
          role={role}
          onAnswer={onAnswer}
          onCancel={onCancel}
        />
      ))}
    </section>
  );
}

function RequestCard({
  isUpdating = false,
  request,
  role,
  onAnswer,
  onCancel,
}: Readonly<{
  isUpdating?: boolean;
  request: ContactRequest;
  role: "seller" | "buyer";
  onAnswer?: (request: ContactRequest, status: "accepted" | "rejected") => Promise<void>;
  onCancel?: (request: ContactRequest) => Promise<void>;
}>) {
  const canAnswer = role === "seller" && request.status === "pending" && onAnswer;
  return (
    <article className="trade-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-slate-950">{request.listing?.title ?? "Listing"}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{request.message ?? "No message provided."}</p>
          <p className="mt-2 text-xs text-slate-500">{formatRelativeTime(request.created_at)}</p>
        </div>
        <StatusPill tone={statusTone(request.status)}>{request.status}</StatusPill>
      </div>
      {request.status === "accepted" ? (
        <div className="mt-3 grid gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
          <p>Buyer: {request.buyer_contact_method} {request.buyer_contact_value ?? "Hidden"}</p>
          <p>Seller: {request.seller_contact_method ?? "contact"} {request.seller_contact_value ?? "Hidden"}</p>
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
