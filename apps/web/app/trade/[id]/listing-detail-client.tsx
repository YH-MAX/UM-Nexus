"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  BadgeCheck,
  BellRing,
  Flag,
  Heart,
  Image as ImageIcon,
  Info,
  MapPin,
  MessageCircle,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";

import { DirectContactAction, DirectSellerContact, useSellerContact, type SellerContactState } from "@/components/trade/direct-seller-contact";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { buildAuthHref } from "@/lib/auth/return-intent";
import { MatchSuggestions } from "@/components/trade/match-suggestions";
import { PriceText } from "@/components/trade/price-text";
import { SafetyNotice } from "@/components/trade/safety-notice";
import { StatusPill, statusTone } from "@/components/trade/status-pill";
import { TradeResultCard } from "@/components/trade/trade-result-card";
import { TradeShell } from "@/components/trade/trade-shell";
import { getPublicListingSnapshot } from "@/lib/trade/public-listing-cache";
import {
  addFavorite,
  applyRecommendedPrice,
  contactMatch,
  deleteListing,
  enrichListing,
  formatCategory,
  formatMoney,
  formatPickupLocation,
  formatRelativeTime,
  getFavorites,
  getListing,
  getListingMatches,
  getSellerDisplayName,
  getTradeResultStatus,
  publishListing,
  removeFavorite,
  reportListing,
  reportUser,
  simulateListingPrice,
  submitDecisionFeedback,
  trackProductEvent,
  updateListingStatus,
  type Listing,
  type PriceSimulation,
  type TradeMatch,
  type TradeResultStatus,
} from "@/lib/trade/api";

type ListingDetailPageProps = Readonly<{
  listingId: string;
}>;

export function ListingDetailClient({ listingId }: ListingDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  const processedIntentRef = useRef<string | null>(null);
  const [listing, setListing] = useState<Listing | null>(() => getPublicListingSnapshot(listingId) ?? null);
  const [resultStatus, setResultStatus] = useState<TradeResultStatus | null>(null);
  const [matches, setMatches] = useState<TradeMatch[]>([]);
  const [isLoading, setIsLoading] = useState(() => !getPublicListingSnapshot(listingId));
  const loadGeneration = useRef(0);
  const [secondaryRevision, setSecondaryRevision] = useState(0);
  const [secondaryLoading, setSecondaryLoading] = useState(true);
  const [secondaryError, setSecondaryError] = useState<string | null>(null);
  const [favoritesScope, setFavoritesScope] = useState<string | null>(null);
  const isFavoriteLoading = Boolean(user && favoritesScope !== `${user.id}:${listingId}`);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [simulationPrice, setSimulationPrice] = useState("");
  const [simulation, setSimulation] = useState<PriceSimulation | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const generation = ++loadGeneration.current;
    let nextListing: Listing;
    try {
      nextListing = await getListing(listingId);
    } catch (error) {
      if (generation !== loadGeneration.current) return;
      throw error;
    }
    if (generation !== loadGeneration.current) return;
    setListing(nextListing);
    setSimulationPrice(String(Math.round(nextListing.price)));
    setIsLoading(false);
    setSecondaryRevision((revision) => revision + 1);
  }, [listingId]);

  useEffect(() => {
    if (isAuthLoading) return;
    let isMounted = true;
    const snapshot = getPublicListingSnapshot(listingId);
    setListing(snapshot ?? null);
    setIsLoading(!snapshot);
    setError(null);

    void loadData()
      .catch((nextError) => {
        if (isMounted) {
          setListing(null);
          setError(nextError instanceof Error ? nextError.message : "Unable to load listing.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      // Invalidate asynchronous reads from the previous route/account, not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      loadGeneration.current++;
    };
  }, [isAuthLoading, listingId, loadData, user?.id]);

  // Favorites and seller-only intelligence never block the item or its contact action.
  useEffect(() => {
    let active = true;
    setIsSaved(false);
    setFavoritesScope(null);
    if (user?.id) {
      void getFavorites().then((favorites) => {
        if (active) setIsSaved(favorites.some((favorite) => favorite.listing_id === listingId));
      }).catch(() => {}).finally(() => { if (active) setFavoritesScope(`${user.id}:${listingId}`); });
    }
    return () => { active = false; };
  }, [listingId, user?.id]);

  const isSeller = Boolean(user && listing && user.id === listing.seller_id);
  useEffect(() => {
    let active = true;
    setResultStatus(null);
    setMatches([]);
    setSecondaryError(null);
    setSecondaryLoading(isSeller);
    if (isSeller && secondaryRevision > 0) {
      const failed = () => { if (active) setSecondaryError("Some seller insights could not load. Your item and contact details are still available."); };
      void Promise.allSettled([
        getTradeResultStatus(listingId).then((result) => { if (active) setResultStatus(result); }).catch(failed),
        getListingMatches(listingId, { limit: 10, minScore: 58 }).then((items) => { if (active) setMatches(items); }).catch(failed),
      ]).finally(() => { if (active) setSecondaryLoading(false); });
    }
    return () => { active = false; };
  }, [isSeller, listingId, secondaryRevision, user?.id]);

  useEffect(() => {
    void trackProductEvent({
      event_type: "listing_viewed",
      entity_type: "listing",
      entity_id: listingId,
    });
  }, [listingId]);

  useEffect(() => {
    if (resultStatus?.status !== "pending" && resultStatus?.status !== "running") {
      return;
    }

    const timer = window.setTimeout(() => {
      void getTradeResultStatus(listingId).then((result) => {
        if (!active) return;
        setResultStatus(result);
        if (result.status === "completed") void loadData().catch(() => {});
      }).catch(() => { if (active) setSecondaryError("Unable to refresh seller insights. Your item is still available."); });
    }, 1500);

    let active = true;
    return () => { active = false; window.clearTimeout(timer); };
  }, [listingId, loadData, resultStatus]);

  useEffect(() => {
    if (!user || !listing || processedIntentRef.current === searchParams.toString()) {
      return;
    }
    const intent = searchParams.get("intent");
    const listingIntentId = searchParams.get("listingId");
    if (listingIntentId && listingIntentId !== listing.id) {
      return;
    }
    processedIntentRef.current = searchParams.toString();
    if (intent === "save_listing" && isFavoriteLoading) {
      processedIntentRef.current = null;
      return;
    }
    if (intent === "save_listing" && !isSaved) {
      void handleFavorite().then(() => {
        setActionNotice("Listing saved.");
        router.replace(`/trade/${listing.id}`);
      });
    } else if (intent === "contact_listing") {
      setActionNotice("You are back on this listing. Use the seller's selected contact method to get in touch directly.");
      router.replace(`/trade/${listing.id}`);
    } else if (intent === "report_listing") {
      setActionNotice("You are back on this listing. Use Report listing when you are ready to submit the report.");
      router.replace(`/trade/${listing.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFavoriteLoading, isSaved, listing, router, searchParams, user]);

  async function runAction(action: () => Promise<void>, fallback: string) {
    setIsActing(true);
    setError(null);
    setActionNotice(null);
    try {
      await action();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : fallback);
    } finally {
      setIsActing(false);
    }
  }

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
    await runAction(async () => {
      const updated = await applyRecommendedPrice(listingId);
      setListing(updated);
      setActionNotice("Recommended price applied to this listing.");
      await loadData();
    }, "Unable to apply recommended price.");
  }

  async function handleFavorite() {
    if (!listing) {
      return;
    }
    if (!user) {
      router.push(buildAuthHref("login", { returnTo: `/trade/${listing.id}`, intent: "save_listing", listingId: listing.id }));
      return;
    }
    await runAction(async () => {
      if (isSaved) {
        await removeFavorite(listing.id);
        setIsSaved(false);
        setActionNotice("Listing removed from saved items.");
      } else {
        await addFavorite(listing.id);
        setIsSaved(true);
        setActionNotice("Listing saved.");
      }
      void trackProductEvent({
        event_type: "favorite_toggled",
        entity_type: "listing",
        entity_id: listing.id,
        metadata: { saved: !isSaved },
      });
    }, "Unable to update saved listing.");
  }

  async function handleReportListing() {
    if (!user) {
      router.push(buildAuthHref("login", { returnTo: `/trade/${listingId}`, intent: "report_listing", listingId }));
      return;
    }
    await runAction(async () => {
      await reportListing(listingId, {
        report_type: "scam_suspicion",
        reason: "Reported from listing detail for moderator review.",
      });
      void trackProductEvent({
        event_type: "report_submitted",
        entity_type: "listing",
        entity_id: listingId,
        metadata: { report_type: "scam_suspicion" },
      });
      setActionNotice("Report submitted for moderator review.");
      await loadData();
    }, "Unable to report listing.");
  }

  async function handleReportSeller() {
    if (!listing) {
      return;
    }
    if (!user) {
      router.push(buildAuthHref("login", { returnTo: `/trade/${listing.id}`, intent: "report_listing", listingId: listing.id }));
      return;
    }
    await runAction(async () => {
      await reportUser(listing.seller_id, {
        report_type: "suspicious_payment_behavior",
        reason: "Reported from listing detail for admin review.",
      });
      setActionNotice("Seller report submitted for admin review.");
    }, "Unable to report this seller.");
  }

  async function handleListingStatus(status: "available" | "reserved" | "sold" | "hidden" | "deleted") {
    if (!listing) {
      return;
    }
    const soldSource =
      status === "sold"
        ? window.prompt(
            "Who did you sell it to? Type accepted_request, outside_um_nexus, or prefer_not_to_say.",
            "prefer_not_to_say",
          )
        : null;
    await runAction(async () => {
      const updated =
        status === "available" && listing.status === "draft"
          ? await publishListing(listing.id)
          : status === "deleted"
            ? await deleteListing(listing.id)
            : await updateListingStatus(listing.id, {
                status,
                reason: `Seller marked listing ${status}.`,
                sold_source:
                  status === "sold" && ["accepted_request", "outside_um_nexus", "prefer_not_to_say"].includes(soldSource || "")
                    ? (soldSource as "accepted_request" | "outside_um_nexus" | "prefer_not_to_say")
                    : undefined,
              });
      setListing(updated);
      setActionNotice(
        updated.status === "sold"
          ? "Listing marked as sold. Pending requests have been closed."
          : `Listing marked ${updated.status}.`,
      );
      if (updated.status === "sold") {
        void trackProductEvent({
          event_type: "listing_sold",
          entity_type: "listing",
          entity_id: updated.id,
        });
      }
      await loadData();
    }, "Unable to update listing status.");
  }

  async function handleContactTopMatch() {
    const topMatch = matches[0];
    if (!topMatch) {
      return;
    }
    await runAction(async () => {
      await contactMatch(topMatch.id, {
        message: "I am interested in this AI-ranked campus resale match.",
      });
      setActionNotice("Match contacted and transaction intent recorded.");
      await loadData();
    }, "Unable to contact this match.");
  }

  async function handleSimulatePrice() {
    const proposedPrice = Number(simulationPrice);
    if (!Number.isFinite(proposedPrice) || proposedPrice <= 0) {
      setError("Enter a valid proposed price.");
      return;
    }
    await runAction(async () => {
      setSimulation(await simulateListingPrice(listingId, proposedPrice));
    }, "Unable to simulate this price.");
  }

  async function handleFeedback(
    feedbackType: "accepted_price" | "rejected_price" | "changed_price" | "ignored_recommendation",
  ) {
    const proposedPrice = Number(simulationPrice);
    await runAction(async () => {
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
    }, "Unable to submit decision feedback.");
  }

  const contactAvailable = Boolean(listing && ["available", "reserved"].includes(listing.status));
  const sellerContact = useSellerContact(listingId, user?.id, Boolean(user && !isSeller && contactAvailable));

  return (
    <TradeShell
      title={listing?.title ?? "Listing detail"}
      description="Review the item, seller, pickup location, and safety details before contacting the seller."
    >
      {error ? (
        <div className="trade-alert trade-alert-danger flex gap-3">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}
      {actionNotice ? (
        <div className="trade-alert trade-alert-success flex gap-3">
          <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{actionNotice}</p>
        </div>
      ) : null}

      {isLoading ? (
        <ListingDetailLoading />
      ) : listing ? (
        <>
          {/* Back navigation */}
          <Link
            className="trade-button-ghost w-fit min-h-9 px-2.5 text-slate-600"
            href="/trade"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to listings
          </Link>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
            {/* Left column */}
            <div className="grid gap-5">
              <ImageGallery listing={listing} />

              {/* Description with metadata chips */}
              <section className="trade-card p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="trade-kicker">Item details</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">Description</h2>
                  </div>
                  <StatusPill tone={statusTone(listing.status)}>{listing.status.replaceAll("_", " ")}</StatusPill>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="trade-chip">
                    {formatCategory(listing.category)}
                  </span>
                  {listing.condition ?? listing.condition_label ? (
                    <span className="trade-chip">
                      {(listing.condition ?? listing.condition_label ?? "").replaceAll("_", " ")}
                    </span>
                  ) : null}
                  <span className="trade-chip">
                    <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-emerald-700" />
                    {formatPickupLocation(listing.pickup_location ?? listing.pickup_area)}
                  </span>
                  <span className="trade-chip text-slate-500">
                    Posted {formatRelativeTime(listing.created_at)}
                  </span>
                </div>
                <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-700">
                  {listing.description ?? "No description provided."}
                </p>
              </section>

              {listing.risk_level && listing.risk_level !== "low" ? <RiskWarning listing={listing} /> : null}

              {/* Seller card — enhanced with verified badge */}
              <SellerCard listing={listing} />

              <SafetyNotice />

              {isSeller ? (
                <>
                {secondaryLoading ? <p className="trade-helper-text" role="status">Loading seller insights…</p> : null}
                {secondaryError ? <p className="trade-alert trade-alert-warning" role="alert">{secondaryError}</p> : null}
                <SellerIntelligencePanel
                  isActing={isActing}
                  isEnriching={isEnriching}
                  listing={listing}
                  matches={matches}
                  resultStatus={resultStatus}
                  simulation={simulation}
                  simulationPrice={simulationPrice}
                  onApplyPrice={handleApplyPrice}
                  onContactTopMatch={handleContactTopMatch}
                  onEnrich={handleEnrich}
                  onFeedback={handleFeedback}
                  onSimulate={handleSimulatePrice}
                  onSimulationPriceChange={setSimulationPrice}
                />
                </>
              ) : (
      <section className="trade-card p-5 text-center">
                  <p className="text-sm font-semibold text-slate-900">Looking for more campus items?</p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
                    Compare price, pickup area, and seller trust signals before contacting a seller.
                  </p>
                  <Link className="trade-button-secondary mt-3" href="/trade">
                    Browse marketplace
                  </Link>
                </section>
              )}
            </div>

            {/* Right sticky card */}
            <ListingSummaryCard
              sellerContact={sellerContact}
              isActing={isActing}
              isSaved={isSaved}
              isSeller={isSeller}
              listing={listing}
              user={user}
              onFavorite={handleFavorite}
              onReportListing={handleReportListing}
              onReportSeller={handleReportSeller}
              onStatus={handleListingStatus}
            />

            {/* Mobile sticky bottom CTA */}
            {!isSeller && user && ["available", "reserved"].includes(listing.status) ? (
              <div className="fixed inset-x-0 bottom-[calc(74px+env(safe-area-inset-bottom))] z-40 px-4 md:hidden">
                <DirectContactAction state={sellerContact} />
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <ListingMissingState />
      )}
    </TradeShell>
  );
}

function ListingDetailLoading() {
  return (
    <section aria-busy="true" aria-label="Loading listing detail" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]" role="status">
      <span className="sr-only">Loading listing...</span>
      <div className="grid gap-5">
        <div className="trade-card overflow-hidden">
          <div className="trade-loading-block aspect-[4/3] rounded-none" />
          <div className="grid gap-3 border-t border-slate-100 p-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="trade-loading-block aspect-square" key={index} />
            ))}
          </div>
        </div>
        <div className="trade-card space-y-4 p-5">
          <div className="trade-loading-block h-4 w-28 rounded-full" />
          <div className="trade-loading-block h-7 w-2/3 rounded-full" />
          <div className="trade-loading-block h-24 w-full" />
        </div>
      </div>
      <aside className="trade-card h-fit p-5 lg:sticky lg:top-24">
        <div className="trade-loading-block h-6 w-36 rounded-full" />
        <div className="trade-loading-block mt-4 h-10 w-32" />
        <div className="trade-loading-block mt-5 h-28 w-full" />
        <div className="trade-loading-block mt-5 h-12 w-full" />
      </aside>
    </section>
  );
}

function ListingMissingState() {
  return (
    <section className="trade-empty-panel">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm">
        <ImageIcon aria-hidden="true" className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-950">Listing unavailable</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        This listing may have been removed, hidden, or is no longer available.
      </p>
      <Link className="trade-button-primary mt-5" href="/trade">
        Back to marketplace
      </Link>
    </section>
  );
}

// ─── ImageGallery ────────────────────────────────────────────────────────────

function ImageGallery({ listing }: Readonly<{ listing: Listing }>) {
  const primaryImage = listing.images.find((image) => image.is_primary) ?? listing.images[0] ?? null;
  const galleryImages = listing.images.filter((image) => image.id !== primaryImage?.id);

  return (
    <section className="trade-card overflow-hidden">
      <div className="relative flex aspect-[4/3] items-center justify-center bg-slate-100">
        {primaryImage?.public_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={listing.title} className="h-full w-full object-cover" src={primaryImage.public_url} />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-50 text-slate-400">
            <span className="flex h-14 w-14 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
              <ImageIcon aria-hidden="true" className="h-7 w-7" />
            </span>
            <span className="text-sm font-semibold">No photo yet</span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <StatusPill className="bg-white/95 shadow-sm ring-1 ring-white/70" tone={statusTone(listing.status)}>
            {listing.status.replaceAll("_", " ")}
          </StatusPill>
          <StatusPill className="bg-white/95 shadow-sm ring-1 ring-white/70">
            {formatCategory(listing.category)}
          </StatusPill>
        </div>
        <div className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-white/70">
          {formatMoney(listing.price, listing.currency)}
        </div>
      </div>
      {galleryImages.length > 0 ? (
        <div className="grid gap-3 border-t border-slate-100 bg-white p-3 sm:grid-cols-4">
          {galleryImages.map((image) => (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100" key={image.id}>
              {image.public_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={listing.title} className="aspect-square w-full object-cover" src={image.public_url} />
              ) : (
                <div className="flex aspect-square flex-col items-center justify-center gap-1 bg-slate-50 text-slate-400">
                  <ImageIcon aria-hidden="true" className="h-6 w-6" />
                  <span className="text-xs">No photo</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

// ─── ListingSummaryCard ───────────────────────────────────────────────────────

function ListingSummaryCard({
  sellerContact,
  isActing,
  isSaved,
  isSeller,
  listing,
  user,
  onFavorite,
  onReportListing,
  onReportSeller,
  onStatus,
}: Readonly<{
  sellerContact: SellerContactState;
  isActing: boolean;
  isSaved: boolean;
  isSeller: boolean;
  listing: Listing;
  user: ReturnType<typeof useAuth>["user"];
  onFavorite: () => Promise<void>;
  onReportListing: () => Promise<void>;
  onReportSeller: () => Promise<void>;
  onStatus: (status: "available" | "reserved" | "sold" | "hidden" | "deleted") => Promise<void>;
}>) {
  return (
    <aside className="trade-card h-fit overflow-hidden lg:sticky lg:top-24">
      {/* Section 1: Status + price + title */}
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone={statusTone(listing.status)}>{listing.status.replaceAll("_", " ")}</StatusPill>
          <StatusPill>{formatCategory(listing.category)}</StatusPill>
        </div>
        <div className="mt-3">
          <PriceText currency={listing.currency} size="lg" value={listing.price} />
        </div>
        <h2 className="mt-2 text-lg font-semibold leading-snug text-slate-950">{listing.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Contact the seller when you are ready to arrange a safe campus pickup.
        </p>
      </div>

      {/* Section 2: Metadata */}
      <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 p-5 text-sm text-slate-600">
        <div className="grid grid-cols-[96px_1fr] gap-3">
          <span className="font-semibold text-slate-500">Condition</span>
          <span className="font-semibold text-slate-900">
            {(listing.condition ?? listing.condition_label ?? "Not specified").replaceAll("_", " ")}
          </span>
          <span className="font-semibold text-slate-500">Pickup</span>
          <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-900">
            <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-700" />
            <span className="truncate">{formatPickupLocation(listing.pickup_location ?? listing.pickup_area)}</span>
          </span>
          <span className="font-semibold text-slate-500">Posted</span>
          <span className="font-semibold text-slate-900">{formatRelativeTime(listing.created_at)}</span>
        </div>
      </div>

      {/* Section 3: Contact / seller actions */}
      <div className="border-b border-slate-100 p-5">
        {user ? (
          isSeller ? (
            <SellerActions isActing={isActing} listing={listing} onStatus={onStatus} />
          ) : (
            <DirectSellerContact state={sellerContact} available={["available", "reserved"].includes(listing.status)} />
          )
        ) : (
          <RequireAuthCard
            description="Sign in with your UM account to contact this seller directly."
            intent="contact_listing"
            listingId={listing.id}
            returnTo={`/trade/${listing.id}`}
          />
        )}
      </div>

      {/* Section 4: Save + report actions */}
      <div className="grid gap-2 p-5">
        <button className="trade-button-secondary w-full" disabled={isActing} onClick={() => void onFavorite()} type="button">
          <Heart aria-hidden="true" className={`h-4 w-4 ${isSaved ? "fill-current text-rose-600" : ""}`} />
          {isSaved ? "Saved" : "Save listing"}
        </button>
        <button
          className="trade-button-danger w-full bg-white"
          disabled={isActing}
          onClick={() => void onReportListing()}
          type="button"
        >
          <Flag aria-hidden="true" className="h-4 w-4" />
          Report listing
        </button>
        <button
          className="trade-button-danger w-full bg-white"
          disabled={isActing}
          onClick={() => void onReportSeller()}
          type="button"
        >
          <Flag aria-hidden="true" className="h-4 w-4" />
          Report seller
        </button>
      </div>
    </aside>
  );
}

function SellerActions({
  isActing,
  listing,
  onStatus,
}: Readonly<{
  isActing: boolean;
  listing: Listing;
  onStatus: (status: "available" | "reserved" | "sold" | "hidden" | "deleted") => Promise<void>;
}>) {
  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <div>
        <p className="font-semibold text-slate-950">Seller controls</p>
        <p className="mt-1 leading-6">This is your listing. Manage its status and seller contact method from My Trade.</p>
      </div>
      <Link className="trade-button-primary w-full" href={`/trade/${listing.id}/edit`}>
        <Pencil aria-hidden="true" className="h-4 w-4" />
        Edit Listing
      </Link>
      <div className="grid grid-cols-2 gap-2">
        <button className="trade-button-secondary" disabled={isActing || listing.status === "available"} onClick={() => void onStatus("available")} type="button">
          <Pencil aria-hidden="true" className="h-4 w-4" />
          Available
        </button>
        <button className="trade-button-secondary" disabled={isActing || listing.status === "reserved"} onClick={() => void onStatus("reserved")} type="button">
          <BellRing aria-hidden="true" className="h-4 w-4" />
          Reserved
        </button>
        <button className="trade-button-secondary" disabled={isActing || listing.status === "sold"} onClick={() => void onStatus("sold")} type="button">
          <ShieldCheck aria-hidden="true" className="h-4 w-4" />
          Sold
        </button>
        <button className="trade-button-secondary" disabled={isActing || listing.status === "hidden"} onClick={() => void onStatus("hidden")} type="button">
          Hide
        </button>
      </div>
      <button
        className="trade-button-secondary border-rose-200 text-rose-700 hover:bg-rose-50"
        disabled={isActing || listing.status === "deleted"}
        onClick={() => void onStatus("deleted")}
        type="button"
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
        Delete
      </button>
    </div>
  );
}

// ─── SellerCard ───────────────────────────────────────────────────────────────

function SellerCard({ listing }: Readonly<{ listing: Listing }>) {
  const isVerified = listing.seller?.profile?.verified_um_email === true;

  return (
    <section className="trade-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="trade-kicker">Seller</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-950">{getSellerDisplayName(listing)}</h2>
            {isVerified ? (
              <span className="trade-chip-success">
                <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
                Verified UM
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {listing.seller?.profile?.faculty ?? "University of Malaya student"} ·{" "}
            {listing.seller?.profile?.college_or_location ?? listing.seller?.profile?.residential_college ?? "Campus pickup"}
          </p>
        </div>
        <span className="trade-icon-frame">
          <ShieldCheck aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
        Signed-in UM buyers can contact the seller directly using the contact method selected for this listing.
      </p>
    </section>
  );
}

// ─── SellerIntelligencePanel ──────────────────────────────────────────────────

function SellerIntelligencePanel({
  isActing,
  isEnriching,
  listing,
  matches,
  resultStatus,
  simulation,
  simulationPrice,
  onApplyPrice,
  onContactTopMatch,
  onEnrich,
  onFeedback,
  onSimulate,
  onSimulationPriceChange,
}: Readonly<{
  isActing: boolean;
  isEnriching: boolean;
  listing: Listing;
  matches: TradeMatch[];
  resultStatus: TradeResultStatus | null;
  simulation: PriceSimulation | null;
  simulationPrice: string;
  onApplyPrice: () => Promise<void>;
  onContactTopMatch: () => Promise<void>;
  onEnrich: () => Promise<void>;
  onFeedback: (feedbackType: "accepted_price" | "rejected_price" | "changed_price" | "ignored_recommendation") => Promise<void>;
  onSimulate: () => Promise<void>;
  onSimulationPriceChange: (value: string) => void;
}>) {
  return (
    <section className="grid gap-5">
      <div className="trade-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Seller tools</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Optional AI assistant</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Refresh pricing, demand, and risk guidance after the listing is published. Manual selling still works without AI.
            </p>
          </div>
          <StatusPill tone={resultStatus?.status === "completed" ? "good" : "pending"}>
            {resultStatus?.status?.replaceAll("_", " ") ?? "not started"}
          </StatusPill>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="trade-button-primary"
            disabled={isEnriching || resultStatus?.status === "pending" || resultStatus?.status === "running"}
            onClick={() => void onEnrich()}
            type="button"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            {isEnriching ? "Enqueueing..." : "Enrich Listing"}
          </button>
          <button className="trade-button-secondary" disabled={isActing || !resultStatus?.result} onClick={() => void onApplyPrice()} type="button">
            Apply suggested price
          </button>
          <button className="trade-button-secondary" disabled={isActing || matches.length === 0} onClick={() => void onContactTopMatch()} type="button">
            Contact top wanted match
          </button>
        </div>
      </div>

      <TradeResultCard
        currency={listing.currency}
        errorMessage={resultStatus?.error_message}
        result={resultStatus?.result ?? null}
        status={resultStatus?.status}
      />

      <section className="trade-card p-5">
        <h2 className="text-lg font-semibold text-slate-950">Price what-if</h2>
        <div className="mt-3 flex gap-2">
          <input
            className="trade-input min-w-0 flex-1"
            inputMode="decimal"
            min="1"
            onChange={(event) => onSimulationPriceChange(event.target.value)}
            type="number"
            value={simulationPrice}
          />
          <button className="trade-button-primary" disabled={isActing} onClick={() => void onSimulate()} type="button">
            Test
          </button>
        </div>
        {simulation ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-950">
              {formatMoney(simulation.proposed_price, listing.currency)} · {simulation.action_type.replaceAll("_", " ")}
            </p>
            <p className="mt-1 leading-5 text-slate-600">{simulation.price_competitiveness}</p>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="trade-button-secondary" disabled={isActing || !resultStatus?.result} onClick={() => void onFeedback("accepted_price")} type="button">
            Recommendation useful
          </button>
          <button className="trade-button-secondary" disabled={isActing || !resultStatus?.result} onClick={() => void onFeedback("changed_price")} type="button">
            I changed the price
          </button>
          <button className="trade-button-secondary" disabled={isActing || !resultStatus?.result} onClick={() => void onFeedback("rejected_price")} type="button">
            Not useful
          </button>
        </div>
      </section>

      <MatchSuggestions matches={matches} />
    </section>
  );
}

// ─── RiskWarning ──────────────────────────────────────────────────────────────

function RiskWarning({ listing }: Readonly<{ listing: Listing }>) {
  const items = riskEvidenceItems(listing);
  const riskTitle = listing.risk_level === "high" ? "Under review" : "Needs review";

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-amber-950">{riskTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            Trust signals should be checked before a fast transaction.
          </p>
        </div>
        <StatusPill tone={listing.risk_level === "high" ? "danger" : "warning"}>
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
