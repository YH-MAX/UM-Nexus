"use client";

import { useCallback, useEffect, useState } from "react";

import { MatchSuggestions } from "@/components/trade/match-suggestions";
import { StatusPill } from "@/components/trade/status-pill";
import { TradeResultCard } from "@/components/trade/trade-result-card";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  applyRecommendedPrice,
  contactMatch,
  enrichListing,
  formatCategory,
  formatMoney,
  getListing,
  getListingMatches,
  getTradeResultStatus,
  reportListing,
  simulateListingPrice,
  submitDecisionFeedback,
  type Listing,
  type PriceSimulation,
  type TradeMatch,
  type TradeResultStatus,
} from "@/lib/trade/api";

type ListingDetailPageProps = Readonly<{
  listingId: string;
}>;

export function ListingDetailClient({ listingId }: ListingDetailPageProps) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [resultStatus, setResultStatus] = useState<TradeResultStatus | null>(null);
  const [matches, setMatches] = useState<TradeMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [simulationPrice, setSimulationPrice] = useState("");
  const [simulation, setSimulation] = useState<PriceSimulation | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const primaryImage =
    listing?.images.find((image) => image.is_primary) ?? listing?.images[0] ?? null;
  const galleryImages = listing?.images.filter((image) => image.id !== primaryImage?.id) ?? [];

  const loadData = useCallback(async () => {
    const [nextListing, nextResult, nextMatches] = await Promise.all([
      getListing(listingId),
      getTradeResultStatus(listingId),
      getListingMatches(listingId, { limit: 10, minScore: 58 }),
    ]);
    setListing(nextListing);
    setSimulationPrice(String(Math.round(nextListing.price)));
    setResultStatus(nextResult);
    setMatches(nextMatches);
  }, [listingId]);

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
      const accepted = await enrichListing(listingId);
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

  async function handleApplyPrice() {
    setIsActing(true);
    setError(null);
    setActionNotice(null);
    try {
      const updated = await applyRecommendedPrice(listingId);
      setListing(updated);
      setActionNotice("Recommended price applied to this listing.");
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to apply recommended price.");
    } finally {
      setIsActing(false);
    }
  }

  async function handleReportListing() {
    setIsActing(true);
    setError(null);
    setActionNotice(null);
    try {
      await reportListing(listingId, {
        report_type: "suspicious_listing",
        reason: "Reported from listing detail for moderator review.",
      });
      setActionNotice("Report submitted for moderator review.");
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to report listing.");
    } finally {
      setIsActing(false);
    }
  }

  async function handleContactTopMatch() {
    const topMatch = matches[0];
    if (!topMatch) {
      return;
    }
    setIsActing(true);
    setError(null);
    setActionNotice(null);
    try {
      await contactMatch(topMatch.id, {
        message: "I am interested in this AI-ranked campus resale match.",
      });
      setActionNotice("Match contacted and transaction intent recorded.");
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to contact this match.");
    } finally {
      setIsActing(false);
    }
  }

  async function handleSimulatePrice() {
    const proposedPrice = Number(simulationPrice);
    if (!Number.isFinite(proposedPrice) || proposedPrice <= 0) {
      setError("Enter a valid proposed price.");
      return;
    }
    setIsActing(true);
    setError(null);
    setActionNotice(null);
    try {
      setSimulation(await simulateListingPrice(listingId, proposedPrice));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to simulate this price.");
    } finally {
      setIsActing(false);
    }
  }

  async function handleFeedback(
    feedbackType: "accepted_price" | "rejected_price" | "changed_price" | "ignored_recommendation",
  ) {
    const proposedPrice = Number(simulationPrice);
    setIsActing(true);
    setError(null);
    setActionNotice(null);
    try {
      await submitDecisionFeedback(listingId, {
        feedback_type: feedbackType,
        applied_price: feedbackType === "changed_price" && Number.isFinite(proposedPrice) ? proposedPrice : undefined,
        reason:
          feedbackType === "changed_price"
            ? "Seller adjusted the price after reviewing the simulation."
            : "Seller submitted decision feedback from listing detail.",
      });
      setActionNotice("Decision feedback recorded for the outcome dashboard.");
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to submit decision feedback.");
    } finally {
      setIsActing(false);
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
      {actionNotice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {actionNotice}
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

            {listing.risk_level && listing.risk_level !== "low" ? (
              <RiskWarning listing={listing} />
            ) : null}

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
                <div className="mt-4 space-y-4">
                  {primaryImage ? (
                    <div
                      className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                      key={primaryImage.id}
                    >
                      <div className="flex aspect-video items-center justify-center bg-slate-100">
                        {primaryImage.public_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={listing.title}
                            className="h-full w-full object-cover"
                            src={primaryImage.public_url}
                          />
                        ) : (
                          <span className="px-4 text-center text-sm text-slate-500">
                            {primaryImage.storage_path}
                          </span>
                        )}
                      </div>
                      <div className="p-3 text-xs text-slate-600">
                        Primary image
                      </div>
                    </div>
                  ) : null}

                  {galleryImages.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {galleryImages.map((image) => (
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
                          <div className="p-3 text-xs text-slate-600">Gallery image</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
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
              <div className="mt-3 grid gap-2">
                <button
                  className="w-full rounded-lg border border-emerald-700 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                  disabled={isActing || !resultStatus?.result}
                  onClick={() => void handleApplyPrice()}
                  type="button"
                >
                  Apply suggested price
                </button>
                <button
                  className="w-full rounded-lg border border-cyan-700 bg-white px-4 py-3 text-sm font-semibold text-cyan-900 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                  disabled={isActing || matches.length === 0}
                  onClick={() => void handleContactTopMatch()}
                  type="button"
                >
                  Contact top buyer
                </button>
                <button
                  className="w-full rounded-lg border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-800 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  disabled={isActing}
                  onClick={() => void handleReportListing()}
                  type="button"
                >
                  Report listing
                </button>
              </div>
              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-950">Price what-if</h3>
                <div className="mt-3 flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    min="1"
                    onChange={(event) => setSimulationPrice(event.target.value)}
                    type="number"
                    value={simulationPrice}
                  />
                  <button
                    className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                    disabled={isActing}
                    onClick={() => void handleSimulatePrice()}
                    type="button"
                  >
                    Test
                  </button>
                </div>
                {simulation ? (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
                    <p className="font-semibold text-slate-950">
                      {formatMoney(simulation.proposed_price, listing.currency)} · {simulation.action_type.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 leading-5 text-slate-600">{simulation.price_competitiveness}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {simulation.expected_time_to_sell} · {simulation.expected_buyer_interest} interest
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="mt-5 grid gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Decision feedback
                </p>
                <button
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  disabled={isActing || !resultStatus?.result}
                  onClick={() => void handleFeedback("accepted_price")}
                  type="button"
                >
                  Recommendation useful
                </button>
                <button
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  disabled={isActing || !resultStatus?.result}
                  onClick={() => void handleFeedback("changed_price")}
                  type="button"
                >
                  I changed the price
                </button>
                <button
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  disabled={isActing || !resultStatus?.result}
                  onClick={() => void handleFeedback("rejected_price")}
                  type="button"
                >
                  Not useful
                </button>
              </div>
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
                <SideMetric label="Analysis mode" value={resultStatus?.result?.metadata.analysis_mode?.replaceAll("_", " ") ?? "Not analyzed"} />
                <SideMetric label="Data source" value={resultStatus?.result?.metadata.data_source?.replaceAll("_", " ") ?? "Not analyzed"} />
                <SideMetric label="Image analysis" value={resultStatus?.result?.metadata.image_analysis_skipped ? "Text only" : "Image ready"} />
                <SideMetric label="Moderation" value={listing.moderation_status.replaceAll("_", " ")} />
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

function RiskWarning({ listing }: Readonly<{ listing: Listing }>) {
  const items = riskEvidenceItems(listing);
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-amber-950">
            {listing.risk_level} risk listing
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            The decision engine found trust signals that should be checked before a fast transaction.
          </p>
        </div>
        <StatusPill tone={listing.risk_level === "high" ? "danger" : "warn"}>
          {listing.moderation_status.replaceAll("_", " ")}
        </StatusPill>
      </div>
      {items.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <div className="rounded-lg border border-amber-200 bg-white p-3 text-sm text-amber-950" key={item}>
              {item}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function riskEvidenceItems(listing: Listing): string[] {
  const evidence = listing.risk_evidence;
  const items: string[] = [];
  const rawEvidence = evidence?.evidence;
  if (Array.isArray(rawEvidence)) {
    items.push(...rawEvidence.slice(0, 4).map((item) => String(item)));
  }
  const duplicateCount = Number(evidence?.duplicate_image_count ?? 0);
  if (duplicateCount > 0) {
    items.push(`${duplicateCount} duplicate image signal(s) found.`);
  }
  if (evidence?.image_analysis_skipped) {
    items.push("Image analysis was skipped; only text and structured context were used.");
  }
  return items;
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
