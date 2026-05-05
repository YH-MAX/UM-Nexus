"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  BellRing,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { MatchSuggestions } from "@/components/trade/match-suggestions";
import { PriceText } from "@/components/trade/price-text";
import { SafetyNotice } from "@/components/trade/safety-notice";
import { StatusPill, statusTone } from "@/components/trade/status-pill";
import { TradeResultCard } from "@/components/trade/trade-result-card";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  addFavorite,
  applyRecommendedPrice,
  contactMatch,
  contactMethods,
  createContactRequest,
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
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [resultStatus, setResultStatus] = useState<TradeResultStatus | null>(null);
  const [matches, setMatches] = useState<TradeMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [simulationPrice, setSimulationPrice] = useState("");
  const [simulation, setSimulation] = useState<PriceSimulation | null>(null);
  const [contactDraft, setContactDraft] = useState({
    message: "I am interested in this item. Is it still available?",
    buyer_contact_method: "telegram" as "telegram" | "whatsapp",
    buyer_contact_value: "",
  });
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (user) {
      const favorites = await getFavorites().catch(() => []);
      setIsSaved(favorites.some((favorite) => favorite.listing_id === listingId));
    } else {
      setIsSaved(false);
    }
  }, [listingId, user]);

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
      void loadData().catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Unable to refresh enrichment status.");
      });
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [loadData, resultStatus?.status]);

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
      setActionNotice("Sign in with your UM account to save listings.");
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
    await runAction(async () => {
      await reportUser(listing.seller_id, {
        report_type: "unsafe_transaction",
        reason: "Reported from listing detail for admin review.",
      });
      setActionNotice("Seller report submitted for admin review.");
    }, "Unable to report this seller.");
  }

  async function handleListingStatus(status: "available" | "reserved" | "sold" | "hidden" | "deleted") {
    if (!listing) {
      return;
    }
    await runAction(async () => {
      const updated =
        status === "available" && listing.status === "draft"
          ? await publishListing(listing.id)
          : status === "deleted"
            ? await deleteListing(listing.id)
            : await updateListingStatus(listing.id, { status, reason: `Seller marked listing ${status}.` });
      setListing(updated);
      setActionNotice(`Listing marked ${updated.status}.`);
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

  async function handleContactRequest() {
    if (!listing) {
      return;
    }
    if (!contactDraft.buyer_contact_value.trim()) {
      setError("Enter your Telegram or WhatsApp contact before sending the request.");
      return;
    }
    await runAction(async () => {
      await createContactRequest(listing.id, {
        message: contactDraft.message.trim() || undefined,
        buyer_contact_method: contactDraft.buyer_contact_method,
        buyer_contact_value: contactDraft.buyer_contact_value.trim(),
      });
      void trackProductEvent({
        event_type: "contact_request_sent",
        entity_type: "listing",
        entity_id: listing.id,
      });
      setActionNotice("Contact request sent. The seller can accept or reject it from My Trade.");
    }, "Unable to send contact request.");
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

  const isSeller = Boolean(user && listing && user.id === listing.seller_id);

  return (
    <TradeShell
      title={listing?.title ?? "Listing detail"}
      description="Review the item, seller, pickup location, and safety details before requesting contact."
    >
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {actionNotice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {actionNotice}
        </div>
      ) : null}

      {isLoading ? (
        <div className="trade-card p-5 text-sm text-slate-600">Loading listing...</div>
      ) : listing ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid gap-5">
            <ImageGallery listing={listing} />
            <section className="trade-card p-5">
              <h2 className="text-xl font-semibold text-slate-950">Description</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                {listing.description ?? "No description provided."}
              </p>
            </section>
            {listing.risk_level && listing.risk_level !== "low" ? <RiskWarning listing={listing} /> : null}
            <SellerCard listing={listing} />
            <SafetyNotice />
            {isSeller ? (
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
            ) : (
              <MatchSuggestions matches={matches} />
            )}
          </div>

          <ListingSummaryCard
            contactDraft={contactDraft}
            isActing={isActing}
            isSaved={isSaved}
            isSeller={isSeller}
            listing={listing}
            user={user}
            onContactDraftChange={setContactDraft}
            onContactRequest={handleContactRequest}
            onFavorite={handleFavorite}
            onReportListing={handleReportListing}
            onReportSeller={handleReportSeller}
            onStatus={handleListingStatus}
          />

          {!isSeller && user && ["available", "reserved"].includes(listing.status) ? (
            <div className="fixed inset-x-0 bottom-[74px] z-40 px-4 md:hidden">
              <button
                className="trade-button-primary w-full py-3 shadow-lg"
                disabled={isActing}
                onClick={() => void handleContactRequest()}
                type="button"
              >
                <MessageCircle aria-hidden="true" className="h-4 w-4" />
                I&apos;m interested
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </TradeShell>
  );
}

function ImageGallery({ listing }: Readonly<{ listing: Listing }>) {
  const primaryImage = listing.images.find((image) => image.is_primary) ?? listing.images[0] ?? null;
  const galleryImages = listing.images.filter((image) => image.id !== primaryImage?.id);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex aspect-[4/3] items-center justify-center bg-slate-100">
        {primaryImage?.public_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={listing.title} className="h-full w-full object-cover" src={primaryImage.public_url} />
        ) : (
          <span className="px-5 text-center text-sm font-semibold text-slate-500">
            {primaryImage?.storage_path ?? "Photo coming soon"}
          </span>
        )}
      </div>
      {galleryImages.length > 0 ? (
        <div className="grid gap-3 border-t border-slate-100 p-3 sm:grid-cols-4">
          {galleryImages.map((image) => (
            <div className="overflow-hidden rounded-xl bg-slate-100" key={image.id}>
              {image.public_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={listing.title} className="aspect-square w-full object-cover" src={image.public_url} />
              ) : (
                <div className="flex aspect-square items-center justify-center px-3 text-center text-xs text-slate-500">
                  {image.storage_path}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ListingSummaryCard({
  contactDraft,
  isActing,
  isSaved,
  isSeller,
  listing,
  user,
  onContactDraftChange,
  onContactRequest,
  onFavorite,
  onReportListing,
  onReportSeller,
  onStatus,
}: Readonly<{
  contactDraft: {
    message: string;
    buyer_contact_method: "telegram" | "whatsapp";
    buyer_contact_value: string;
  };
  isActing: boolean;
  isSaved: boolean;
  isSeller: boolean;
  listing: Listing;
  user: ReturnType<typeof useAuth>["user"];
  onContactDraftChange: React.Dispatch<React.SetStateAction<{
    message: string;
    buyer_contact_method: "telegram" | "whatsapp";
    buyer_contact_value: string;
  }>>;
  onContactRequest: () => Promise<void>;
  onFavorite: () => Promise<void>;
  onReportListing: () => Promise<void>;
  onReportSeller: () => Promise<void>;
  onStatus: (status: "available" | "reserved" | "sold" | "hidden" | "deleted") => Promise<void>;
}>) {
  const condition = listing.condition ?? listing.condition_label ?? "Unknown";

  return (
    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
      <div className="flex flex-wrap gap-2">
        <StatusPill tone={statusTone(listing.status)}>{listing.status.replaceAll("_", " ")}</StatusPill>
        <StatusPill>{formatCategory(listing.category)}</StatusPill>
      </div>
      <h2 className="mt-4 text-2xl font-semibold leading-tight text-slate-950">{listing.title}</h2>
      <div className="mt-4">
        <PriceText currency={listing.currency} size="lg" value={listing.price} />
      </div>
      <div className="mt-5 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
        <p>{formatCategory(listing.category)} · {condition.replaceAll("_", " ")}</p>
        <p className="flex items-center gap-2">
          <MapPin aria-hidden="true" className="h-4 w-4 text-emerald-700" />
          {formatPickupLocation(listing.pickup_location ?? listing.pickup_area)}
        </p>
        <p>Posted {formatRelativeTime(listing.created_at)}</p>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-100 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Seller</p>
        <p className="mt-1 text-sm font-semibold text-slate-950">{getSellerDisplayName(listing)}</p>
        <p className="mt-1 text-xs text-slate-500">
          {listing.seller?.profile?.faculty ?? "UM student"} · {listing.seller?.status ?? "active"}
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        {user ? (
          isSeller ? (
            <SellerActions isActing={isActing} listing={listing} onStatus={onStatus} />
          ) : (
            <BuyerRequestForm
              contactDraft={contactDraft}
              disabled={isActing || !["available", "reserved"].includes(listing.status)}
              listingStatus={listing.status}
              onContactDraftChange={onContactDraftChange}
              onContactRequest={onContactRequest}
            />
          )
        ) : (
          <RequireAuthCard description="Sign in with your UM account to request seller contact details." />
        )}

        <button className="trade-button-secondary w-full" disabled={isActing} onClick={() => void onFavorite()} type="button">
          <Heart aria-hidden="true" className={`h-4 w-4 ${isSaved ? "fill-current text-rose-600" : ""}`} />
          {isSaved ? "Saved" : "Save listing"}
        </button>
        <button className="trade-button-secondary w-full border-rose-200 text-rose-700 hover:bg-rose-50" disabled={!user || isActing} onClick={() => void onReportListing()} type="button">
          <Flag aria-hidden="true" className="h-4 w-4" />
          Report listing
        </button>
        <button className="trade-button-secondary w-full border-rose-200 text-rose-700 hover:bg-rose-50" disabled={!user || isActing} onClick={() => void onReportSeller()} type="button">
          <Flag aria-hidden="true" className="h-4 w-4" />
          Report seller
        </button>
      </div>
    </aside>
  );
}

function BuyerRequestForm({
  contactDraft,
  disabled,
  listingStatus,
  onContactDraftChange,
  onContactRequest,
}: Readonly<{
  contactDraft: {
    message: string;
    buyer_contact_method: "telegram" | "whatsapp";
    buyer_contact_value: string;
  };
  disabled: boolean;
  listingStatus: string;
  onContactDraftChange: React.Dispatch<React.SetStateAction<{
    message: string;
    buyer_contact_method: "telegram" | "whatsapp";
    buyer_contact_value: string;
  }>>;
  onContactRequest: () => Promise<void>;
}>) {
  return (
    <div className="grid gap-3">
      <p className="text-sm leading-6 text-slate-600">
        Send an interest request. Contact details stay hidden until the seller accepts.
      </p>
      {listingStatus === "reserved" ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          This item is currently reserved. You can still request backup interest, but the seller may already be
          discussing it with another buyer.
        </p>
      ) : null}
      <textarea
        className="trade-input min-h-24 resize-none"
        value={contactDraft.message}
        onChange={(event) => onContactDraftChange((current) => ({ ...current, message: event.target.value }))}
      />
      <select
        className="trade-input"
        value={contactDraft.buyer_contact_method}
        onChange={(event) =>
          onContactDraftChange((current) => ({
            ...current,
            buyer_contact_method: event.target.value as "telegram" | "whatsapp",
          }))
        }
      >
        {contactMethods.map((method) => (
          <option key={method.value} value={method.value}>
            {method.label}
          </option>
        ))}
      </select>
      <input
        className="trade-input"
        placeholder={contactDraft.buyer_contact_method === "telegram" ? "@username" : "+60..."}
        value={contactDraft.buyer_contact_value}
        onChange={(event) => onContactDraftChange((current) => ({ ...current, buyer_contact_value: event.target.value }))}
      />
      <button className="trade-button-primary w-full" disabled={disabled} onClick={() => void onContactRequest()} type="button">
        <MessageCircle aria-hidden="true" className="h-4 w-4" />
        I&apos;m interested
      </button>
    </div>
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
    <div className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
      <p>This is your listing. Manage status or review buyer requests from My Trade.</p>
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
      <button className="trade-button-secondary border-rose-200 text-rose-700 hover:bg-rose-50" disabled={isActing || listing.status === "deleted"} onClick={() => void onStatus("deleted")} type="button">
        <Trash2 aria-hidden="true" className="h-4 w-4" />
        Delete
      </button>
    </div>
  );
}

function SellerCard({ listing }: Readonly<{ listing: Listing }>) {
  return (
    <section className="trade-card p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Seller</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-950">{getSellerDisplayName(listing)}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {listing.seller?.profile?.faculty ?? "University of Malaya student"} ·{" "}
        {listing.seller?.profile?.college_or_location ?? listing.seller?.profile?.residential_college ?? "Campus pickup"}
      </p>
      <p className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
        Contact details are shared only after the seller accepts a buyer request.
      </p>
    </section>
  );
}

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
          <button className="trade-button-primary" disabled={isEnriching || resultStatus?.status === "pending" || resultStatus?.status === "running"} onClick={() => void onEnrich()} type="button">
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
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
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

function RiskWarning({ listing }: Readonly<{ listing: Listing }>) {
  const items = riskEvidenceItems(listing);
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-amber-950">{listing.risk_level} risk listing</h2>
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
            <div className="rounded-xl border border-amber-200 bg-white p-3 text-sm text-amber-950" key={item}>
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
