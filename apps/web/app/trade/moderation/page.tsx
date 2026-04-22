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
  getModerationSummary,
  reviewModerationListing,
  type ModerationListing,
  type ModerationSummary,
} from "@/lib/trade/api";

export default function TradeModerationPage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [items, setItems] = useState<ModerationListing[]>([]);
  const [summary, setSummary] = useState<ModerationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadQueue() {
    const [nextItems, nextSummary] = await Promise.all([getModerationListings(), getModerationSummary()]);
    setItems(nextItems);
    setSummary(nextSummary);
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
          {summary ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="High risk" value={summary.high_risk_count} />
              <Metric label="Pending review" value={summary.pending_review_count} />
              <Metric label="Rejected" value={summary.rejected_count} />
              <Metric label="Approved" value={summary.approved_count} />
            </div>
          ) : null}
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
                  <RiskCards evidence={listing.risk_evidence} />
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

function Metric({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function RiskCards({ evidence }: Readonly<{ evidence: Record<string, unknown> | null }>) {
  const cards = riskCards(evidence);
  if (cards.length === 0) {
    return <p className="mt-2 text-sm text-slate-600">No structured evidence recorded yet.</p>;
  }
  return (
    <div className="mt-3 grid gap-2">
      {cards.map((card) => (
        <div className="rounded-lg bg-white p-3 text-sm text-slate-700" key={card.title}>
          <p className="font-semibold text-slate-950">{card.title}</p>
          <p className="mt-1 leading-5">{card.body}</p>
        </div>
      ))}
    </div>
  );
}

function riskCards(evidence: Record<string, unknown> | null): Array<{ title: string; body: string }> {
  if (!evidence) {
    return [];
  }
  const cards: Array<{ title: string; body: string }> = [];
  const rawEvidence = evidence.evidence;
  if (Array.isArray(rawEvidence)) {
    for (const item of rawEvidence.slice(0, 5)) {
      const text = String(item);
      const lowered = text.toLowerCase();
      let title = "Decision evidence";
      if (lowered.includes("price")) {
        title = "Abnormal pricing";
      } else if (lowered.includes("image")) {
        title = "Image trust signal";
      } else if (lowered.includes("report")) {
        title = "User report";
      } else if (lowered.includes("risk")) {
        title = "Risk score";
      } else if (lowered.includes("suspicious") || lowered.includes("counterfeit")) {
        title = "Suspicious wording";
      }
      cards.push({ title, body: text });
    }
  }
  const duplicateCount = Number(evidence.duplicate_image_count ?? 0);
  if (duplicateCount > 0) {
    cards.push({
      title: "Duplicated image",
      body: `${duplicateCount} duplicate image signal(s) were found across listing media.`,
    });
  }
  const action = evidence.recommended_action;
  if (typeof action === "string") {
    cards.push({
      title: "Recommended moderation action",
      body: action.replaceAll("_", " "),
    });
  }
  return cards;
}
