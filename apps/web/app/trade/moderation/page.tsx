"use client";

import { useEffect, useState } from "react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { StatusPill } from "@/components/trade/status-pill";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  formatCategory,
  formatMoney,
  getModerationListings,
  reviewModerationListing,
  type ModerationListing,
} from "@/lib/trade/api";

export default function TradeModerationPage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [items, setItems] = useState<ModerationListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadQueue() {
    setItems(await getModerationListings());
  }

  useEffect(() => {
    if (isAuthLoading || !user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    void loadQueue()
      .catch((nextError) => {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load moderation queue.");
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

  async function review(id: string, moderationStatus: "approved" | "rejected") {
    setReviewingId(id);
    setError(null);
    try {
      await reviewModerationListing(id, {
        status: moderationStatus === "approved" ? "resolved" : "escalated",
        moderation_status: moderationStatus,
        resolution: moderationStatus === "approved" ? "Listing reviewed and approved." : "Listing rejected by moderator.",
      });
      await loadQueue();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to review listing.");
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <TradeShell
      title="Trust review queue"
      description="Review high-risk listings and user reports before suspicious items reduce marketplace trust."
    >
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {!user ? (
        <RequireAuthCard description="Sign in with a moderator or admin UM account to review high-risk listings and reports." />
      ) : null}

      {user && isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Loading moderation queue...
        </div>
      ) : user && items.length === 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">No listings need review</h2>
          <p className="mt-2 text-sm text-slate-600">High-risk decisions and open reports will appear here.</p>
        </section>
      ) : user ? (
        <section className="grid gap-5">
          {items.map(({ listing, reports }) => (
            <article className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm" key={listing.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill>{formatCategory(listing.category)}</StatusPill>
                    <StatusPill tone={listing.risk_level === "high" ? "danger" : "warn"}>
                      {listing.risk_level ?? "unscored"} risk
                    </StatusPill>
                    <StatusPill tone="warn">{listing.moderation_status.replaceAll("_", " ")}</StatusPill>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-950">{listing.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    {listing.description ?? "No description provided."}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatMoney(listing.price, listing.currency)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    disabled={reviewingId === listing.id}
                    onClick={() => void review(listing.id, "approved")}
                    type="button"
                  >
                    Approve
                  </button>
                  <button
                    className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    disabled={reviewingId === listing.id}
                    onClick={() => void review(listing.id, "rejected")}
                    type="button"
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-950">Risk evidence</h3>
                  <pre className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                    {JSON.stringify(listing.risk_evidence ?? {}, null, 2)}
                  </pre>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-950">Reports</h3>
                  {reports.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">No user reports; queued by risk score.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {reports.map((report) => (
                        <div className="rounded-lg bg-white p-3 text-sm text-slate-700" key={report.id}>
                          <p className="font-semibold text-slate-950">{report.report_type}</p>
                          <p className="mt-1">{report.reason ?? "No reason provided."}</p>
                          <p className="mt-1 text-xs text-slate-500">{report.status}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </TradeShell>
  );
}
