"use client";

import { useCallback, useEffect, useState } from "react";

import { MatchSuggestions } from "@/components/trade/match-suggestions";
import { StatusPill } from "@/components/trade/status-pill";
import { TradeResultCard } from "@/components/trade/trade-result-card";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  enrichListing,
  formatCategory,
  formatMoney,
  getListing,
  getListingMatches,
  getTradeResultStatus,
  type Listing,
  type TradeMatch,
  type TradeResultStatus,
} from "@/lib/trade/api";

type ListingDetailPageProps = Readonly<{
  params: {
    id: string;
  };
}>;

export default function ListingDetailPage({ params }: ListingDetailPageProps) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [resultStatus, setResultStatus] = useState<TradeResultStatus | null>(null);
  const [matches, setMatches] = useState<TradeMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [nextListing, nextResult, nextMatches] = await Promise.all([
      getListing(params.id),
      getTradeResultStatus(params.id),
      getListingMatches(params.id),
    ]);
    setListing(nextListing);
    setResultStatus(nextResult);
    setMatches(nextMatches);
  }, [params.id]);

  useEffect(() => {
    let isMounted = true;

    void loadData()
      .catch((nextError) => {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load listing.");
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
  }, [loadData]);

  useEffect(() => {
    if (resultStatus?.status !== "pending" && resultStatus?.status !== "running") {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadData().catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Unable to refresh enrichment status.");
      });
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [loadData, resultStatus?.status]);

  async function handleEnrich() {
    setIsEnriching(true);
    setError(null);

    try {
      const accepted = await enrichListing(params.id);
      setResultStatus({
        listing_id: accepted.listing_id,
        status: "pending",
        agent_run_id: accepted.agent_run_id,
        last_run_id: accepted.agent_run_id,
        updated_at: null,
        error_message: null,
        result: null,
      });
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to enrich listing.");
    } finally {
      setIsEnriching(false);
    }
  }

  return (
    <TradeShell
      title={listing?.title ?? "Listing detail"}
      description="Run the Trade Intelligence pipeline to combine historical comparables, risk signals, demand context, and match suggestions."
    >
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Loading listing...
        </div>
      ) : listing ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
              <div className="grid md:grid-cols-[minmax(0,1fr)_260px]">
                <div className="p-5">
                  <div className="flex flex-wrap gap-2">
                    <StatusPill>{formatCategory(listing.category)}</StatusPill>
                    <StatusPill tone={listing.is_ai_enriched ? "good" : "warn"}>
                      {listing.is_ai_enriched ? "AI enriched" : "Not enriched"}
                    </StatusPill>
                    <StatusPill tone={resultStatus?.status === "completed" ? "good" : "neutral"}>
                      {resultStatus?.status?.replaceAll("_", " ") ?? "not started"}
                    </StatusPill>
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold text-slate-950">
                    {listing.title}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                    {listing.description ?? "No description provided."}
                  </p>
                </div>
                <div className="border-t border-slate-200 bg-slate-950 p-5 text-white md:border-l md:border-t-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
                    Listed price
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {formatMoney(listing.price, listing.currency)}
                  </p>
                  {resultStatus?.result ? (
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      Engine suggests{" "}
                      <span className="font-semibold text-white">
                        {formatMoney(
                          resultStatus.result.recommendation.suggested_listing_price,
                          listing.currency,
                        )}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      Enrich this listing to compare it against campus resale patterns.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid border-t border-slate-200 sm:grid-cols-2 lg:grid-cols-4">
                <Fact label="Item" value={listing.item_name ?? "Not specified"} />
                <Fact label="Condition" value={listing.condition_label ?? "Unknown"} />
                <Fact label="Pickup" value={listing.pickup_area ?? "TBD"} />
                <Fact label="College" value={listing.residential_college ?? "TBD"} />
              </div>
            </section>

            <TradeResultCard
              result={resultStatus?.result ?? null}
              status={resultStatus?.status}
              errorMessage={resultStatus?.error_message}
              currency={listing.currency}
            />

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Listing images</h2>
              {listing.images.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">
                  No image metadata has been uploaded for this listing.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {listing.images.map((image) => (
                    <div
                      className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                      key={image.id}
                    >
                      <div className="flex aspect-video items-center justify-center bg-slate-100">
                        {image.public_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={listing.title}
                            className="h-full w-full object-cover"
                            src={image.public_url}
                          />
                        ) : (
                          <span className="px-4 text-center text-sm text-slate-500">
                            {image.storage_path}
                          </span>
                        )}
                      </div>
                      <div className="p-3 text-xs text-slate-600">
                        {image.is_primary ? "Primary image metadata" : "Image metadata"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <MatchSuggestions matches={matches} />
          </div>

          <aside className="h-fit rounded-lg border border-slate-300 bg-white shadow-sm lg:sticky lg:top-6">
            <div className="border-b border-slate-200 bg-slate-950 p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                Control Center
              </p>
              <h2 className="mt-2 text-xl font-semibold">Enrichment</h2>
            </div>
            <div className="p-5">
              <p className="text-sm leading-6 text-slate-600">
                Queue the decision engine to refresh pricing, risk, demand, and
                buyer-match recommendations.
              </p>
              <button
                className="mt-4 w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={isEnriching || resultStatus?.status === "pending" || resultStatus?.status === "running"}
                onClick={() => void handleEnrich()}
                type="button"
              >
                {isEnriching ? "Enqueueing..." : "Enrich Listing"}
              </button>
              <div className="mt-5 grid gap-3">
                <SideMetric label="AI status" value={resultStatus?.status?.replaceAll("_", " ") ?? "not started"} />
                <SideMetric
                  label="Last analyzed"
                  value={
                    resultStatus?.updated_at
                      ? new Date(resultStatus.updated_at).toLocaleString()
                      : "Not analyzed"
                  }
                />
                <SideMetric label="Risk score" value={String(Math.round(listing.risk_score))} />
                <SideMetric label="Listing status" value={listing.status} />
                <SideMetric label="Brand" value={listing.brand ?? "Not specified"} />
                <SideMetric label="Model" value={listing.model ?? "Not specified"} />
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </TradeShell>
  );
}

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="border-b border-slate-200 bg-slate-50 p-4 last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SideMetric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
