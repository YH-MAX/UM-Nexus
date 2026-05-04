"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { StatusPill } from "@/components/trade/status-pill";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  formatMoney,
  formatPickupLocation,
  cancelContactRequest,
  getTradeDashboard,
  updateContactRequest,
  updateTradeTransaction,
  type ContactRequest,
  type TradeDashboard,
  type TradeTransaction,
} from "@/lib/trade/api";

export default function TradeDashboardPage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [dashboard, setDashboard] = useState<TradeDashboard | null>(null);
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
      title="My trade dashboard"
      description="Track seller recommendations, buyer demand, match contact state, and completed transaction evidence."
    >
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {!user ? (
        <RequireAuthCard description="Sign in with your UM account to see your listings, wanted posts, match contacts, and transaction evidence." />
      ) : null}

      {user && isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Loading dashboard...
        </div>
      ) : user && dashboard ? (
        <div className="grid gap-5">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="My listings" value={dashboard.listings.length} />
            <Metric label="Saved listings" value={dashboard.favorites.length} />
            <Metric label="Wanted posts" value={dashboard.wanted_posts.length} />
            <Metric label="Suggested matches" value={dashboard.matches.length} />
            <Metric label="Contact requests" value={dashboard.contact_requests_received.length} />
          </section>
          <section className="grid gap-4 sm:grid-cols-3">
            <SmallMetric label="Recommendations accepted" value={dashboard.metrics.recommendations_accepted} />
            <SmallMetric label="Decision feedback" value={dashboard.metrics.decision_feedback_count} />
            <SmallMetric
              label="Avg price adjustment"
              value={dashboard.metrics.average_price_adjustment === null ? "No data" : formatMoney(dashboard.metrics.average_price_adjustment)}
            />
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <Panel title="Seller listings">
              {dashboard.listings.length === 0 ? (
                <EmptyState text="No listings yet." href="/trade/sell" label="Create listing" />
              ) : (
                dashboard.listings.map((listing) => (
                  <Link className="block rounded-lg border border-slate-200 p-4 transition hover:border-emerald-300" href={`/trade/${listing.id}`} key={listing.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{listing.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{formatMoney(listing.price, listing.currency)}</p>
                      </div>
                      <StatusPill tone={listing.risk_level === "high" ? "danger" : listing.is_ai_enriched ? "good" : "warn"}>
                        {listing.risk_level ? `${listing.risk_level} risk` : "not enriched"}
                      </StatusPill>
                    </div>
                    {listing.suggested_listing_price ? (
                      <p className="mt-2 text-sm text-emerald-800">
                        Suggested {formatMoney(listing.suggested_listing_price, listing.currency)}
                      </p>
                    ) : null}
                  </Link>
                ))
              )}
            </Panel>

            <Panel title="Saved listings">
              {dashboard.favorites.length === 0 ? (
                <EmptyState text="No saved listings yet." href="/trade" label="Browse marketplace" />
              ) : (
                dashboard.favorites.slice(0, 6).map((favorite) => (
                  favorite.listing ? (
                    <Link className="block rounded-lg border border-slate-200 p-4 transition hover:border-emerald-300" href={`/trade/${favorite.listing.id}`} key={favorite.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{favorite.listing.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{formatMoney(favorite.listing.price, favorite.listing.currency)}</p>
                        </div>
                        <StatusPill>{favorite.listing.status}</StatusPill>
                      </div>
                    </Link>
                  ) : null
                ))
              )}
            </Panel>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <Panel title="Buyer wanted posts">
              {dashboard.wanted_posts.length === 0 ? (
                <EmptyState text="No wanted posts yet." href="/trade/want" label="Create wanted post" />
              ) : (
                dashboard.wanted_posts.map((post) => (
                  <Link className="block rounded-lg border border-slate-200 p-4 transition hover:border-emerald-300" href={`/wanted-posts/${post.id}`} key={post.id}>
                    <p className="font-semibold text-slate-950">{post.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Budget {formatMoney(post.max_budget, post.currency)} · {formatPickupLocation(post.preferred_pickup_area)}
                    </p>
                  </Link>
                ))
              )}
            </Panel>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <Panel title="Contact requests received">
              {dashboard.contact_requests_received.length === 0 ? (
                <p className="text-sm text-slate-600">No buyer requests yet.</p>
              ) : (
                dashboard.contact_requests_received.map((request) => (
                  <ContactRequestCard
                    isUpdating={isUpdating === request.id}
                    key={request.id}
                    request={request}
                    role="seller"
                    onAnswer={answerContactRequest}
                  />
                ))
              )}
            </Panel>

            <Panel title="Contact requests sent">
              {dashboard.contact_requests_sent.length === 0 ? (
                <p className="text-sm text-slate-600">No sent requests yet.</p>
              ) : (
                dashboard.contact_requests_sent.map((request) => (
                  <ContactRequestCard
                    isUpdating={false}
                    key={request.id}
                    request={request}
                    role="buyer"
                    onAnswer={answerContactRequest}
                    onCancel={cancelSentRequest}
                  />
                ))
              )}
            </Panel>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <Panel title="Match activity">
              {dashboard.matches.length === 0 ? (
                <p className="text-sm text-slate-600">No match activity yet.</p>
              ) : (
                dashboard.matches.slice(0, 6).map((match) => (
                  <Link className="block rounded-lg border border-slate-200 p-4 transition hover:border-cyan-300" href={`/wanted-posts/${match.wanted_post_id}`} key={match.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-950">{match.wanted_post.title}</p>
                      <p className="text-lg font-semibold text-emerald-800">{Math.round(match.match_score)}%</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{match.status.replaceAll("_", " ")}</p>
                  </Link>
                ))
              )}
            </Panel>

            <Panel title="Transaction loop">
              {dashboard.transactions.length === 0 ? (
                <p className="text-sm text-slate-600">Contact a recommended match to start a transaction record.</p>
              ) : (
                dashboard.transactions.map((transaction) => (
                  <div className="rounded-lg border border-slate-200 p-4" key={transaction.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{transaction.status.replaceAll("_", " ")}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {formatMoney(transaction.agreed_price, transaction.currency)}
                        </p>
                      </div>
                      {transaction.completed_at ? <StatusPill tone="good">completed</StatusPill> : <StatusPill tone="warn">open</StatusPill>}
                    </div>
                    {!transaction.completed_at ? (
                      <div className="mt-3 grid gap-3">
                        <label className="text-sm font-semibold text-slate-700">
                          Agreed price
                          <input
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
                            type="number"
                            value={transactionDrafts[transaction.id]?.agreedPrice ?? ""}
                          />
                        </label>
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
                        <RevenueDelta dashboard={dashboard} transaction={transaction} draft={transactionDrafts[transaction.id]} />
                        <button
                          className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                          disabled={isUpdating === transaction.id}
                          onClick={() => void markCompleted(transaction)}
                          type="button"
                        >
                          {isUpdating === transaction.id ? "Updating..." : "Mark completed"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </Panel>
          </section>
        </div>
      ) : null}
    </TradeShell>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function SmallMetric({ label, value }: Readonly<{ label: string; value: number | string }>) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function RevenueDelta({
  dashboard,
  transaction,
  draft,
}: Readonly<{
  dashboard: TradeDashboard;
  transaction: TradeTransaction;
  draft?: { agreedPrice: string; followedAi: boolean };
}>) {
  const listing = dashboard.listings.find((item) => item.id === transaction.listing_id);
  const suggestedPrice = listing?.suggested_listing_price;
  const agreedPrice = Number(draft?.agreedPrice);
  if (!suggestedPrice || !Number.isFinite(agreedPrice) || agreedPrice <= 0) {
    return null;
  }
  const delta = agreedPrice - suggestedPrice;
  return (
    <p className={`text-sm font-semibold ${delta >= 0 ? "text-emerald-800" : "text-amber-800"}`}>
      {delta >= 0 ? "+" : ""}
      {formatMoney(delta, listing.currency)} versus AI suggested price
    </p>
  );
}

function ContactRequestCard({
  isUpdating,
  request,
  role,
  onAnswer,
  onCancel,
}: Readonly<{
  isUpdating: boolean;
  request: ContactRequest;
  role: "seller" | "buyer";
  onAnswer: (request: ContactRequest, status: "accepted" | "rejected") => Promise<void>;
  onCancel?: (request: ContactRequest) => Promise<void>;
}>) {
  const listingTitle = request.listing?.title ?? "Listing";
  const canAnswer = role === "seller" && request.status === "pending";
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{listingTitle}</p>
          <p className="mt-1 text-sm text-slate-600">{request.message ?? "No message provided."}</p>
        </div>
        <StatusPill tone={request.status === "accepted" ? "good" : request.status === "rejected" ? "danger" : "warn"}>
          {request.status}
        </StatusPill>
      </div>
      {request.status === "accepted" ? (
        <div className="mt-3 grid gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
          <p>Buyer: {request.buyer_contact_method} {request.buyer_contact_value ?? "Hidden"}</p>
          <p>Seller: {request.seller_contact_method ?? "contact"} {request.seller_contact_value ?? "Hidden"}</p>
        </div>
      ) : null}
      {canAnswer ? (
        <div className="mt-3 flex gap-2">
          <button
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isUpdating}
            onClick={() => void onAnswer(request, "accepted")}
            type="button"
          >
            Accept
          </button>
          <button
            className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isUpdating}
            onClick={() => void onAnswer(request, "rejected")}
            type="button"
          >
            Reject
          </button>
        </div>
      ) : null}
      {role === "buyer" && request.status === "pending" && onCancel ? (
        <button
          className="mt-3 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400"
          disabled={isUpdating}
          onClick={() => void onCancel(request)}
          type="button"
        >
          Cancel request
        </button>
      ) : null}
    </div>
  );
}

function Panel({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

function EmptyState({ text, href, label }: Readonly<{ text: string; href: string; label: string }>) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
      <p className="text-sm text-slate-600">{text}</p>
      <Link className="mt-3 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white" href={href}>
        {label}
      </Link>
    </div>
  );
}
