"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { StatusPill } from "@/components/trade/status-pill";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  formatMoney,
  getTradeDashboard,
  updateTradeTransaction,
  type TradeDashboard,
  type TradeTransaction,
} from "@/lib/trade/api";

export default function TradeDashboardPage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [dashboard, setDashboard] = useState<TradeDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    const nextDashboard = await getTradeDashboard();
    setDashboard(nextDashboard);
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
    setIsUpdating(transaction.id);
    setError(null);
    try {
      await updateTradeTransaction(transaction.id, {
        status: "completed",
        agreed_price: transaction.agreed_price ?? undefined,
        followed_ai_recommendation: transaction.followed_ai_recommendation ?? undefined,
      });
      await loadDashboard();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update transaction.");
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
            <Metric label="Wanted posts" value={dashboard.wanted_posts.length} />
            <Metric label="Suggested matches" value={dashboard.matches.length} />
            <Metric label="Transactions" value={dashboard.transactions.length} />
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

            <Panel title="Buyer wanted posts">
              {dashboard.wanted_posts.length === 0 ? (
                <EmptyState text="No wanted posts yet." href="/trade/want" label="Create wanted post" />
              ) : (
                dashboard.wanted_posts.map((post) => (
                  <Link className="block rounded-lg border border-slate-200 p-4 transition hover:border-emerald-300" href={`/wanted-posts/${post.id}`} key={post.id}>
                    <p className="font-semibold text-slate-950">{post.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Budget {formatMoney(post.max_budget, post.currency)} · {post.preferred_pickup_area ?? "Any pickup"}
                    </p>
                  </Link>
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
                      <button
                        className="mt-3 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        disabled={isUpdating === transaction.id}
                        onClick={() => void markCompleted(transaction)}
                        type="button"
                      >
                        {isUpdating === transaction.id ? "Updating..." : "Mark completed"}
                      </button>
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
