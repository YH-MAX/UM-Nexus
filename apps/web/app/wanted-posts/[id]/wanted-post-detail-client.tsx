"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Send, X } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { StatusPill, statusTone } from "@/components/trade/status-pill";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  cancelWantedResponse,
  createWantedResponse,
  formatCategory,
  formatMoney,
  formatPickupLocation,
  formatRelativeTime,
  getTradeDashboard,
  getWantedPost,
  getWantedPostRecommendations,
  updateWantedResponse,
  updateWantedPostStatus,
  type Listing,
  type WantedResponse,
  type WantedListingRecommendation,
  type WantedPost,
} from "@/lib/trade/api";

type WantedPostDetailPageProps = Readonly<{
  wantedPostId: string;
}>;

export function WantedPostDetailClient({
  wantedPostId,
}: WantedPostDetailPageProps) {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [wantedPost, setWantedPost] = useState<WantedPost | null>(null);
  const [recommendations, setRecommendations] = useState<WantedListingRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResponseOpen, setIsResponseOpen] = useState(false);
  const [viewerResponses, setViewerResponses] = useState<WantedResponse[]>([]);
  const [sellerListings, setSellerListings] = useState<Listing[]>([]);
  const [responseForm, setResponseForm] = useState({
    message: "",
    seller_contact_method: "in_app",
    seller_contact_value: "",
    listing_id: "",
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isOwner = Boolean(user && wantedPost && user.id === wantedPost.buyer_id);

  useEffect(() => {
    let isMounted = true;

    void Promise.all([getWantedPost(wantedPostId), getWantedPostRecommendations(wantedPostId, { limit: 12, minScore: 58 })])
      .then(([post, items]) => {
        if (isMounted) {
          setWantedPost(post);
          setRecommendations(items);
          setError(null);
        }
      })
      .catch((nextError) => {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load wanted post.");
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
  }, [wantedPostId]);

  useEffect(() => {
    if (!user) {
      setViewerResponses([]);
      setSellerListings([]);
      return;
    }
    let isMounted = true;
    void getTradeDashboard()
      .then((dashboard) => {
        if (!isMounted) {
          return;
        }
        setViewerResponses(
          [...dashboard.wanted_responses_received, ...dashboard.wanted_responses_sent].filter(
            (response) => response.wanted_post_id === wantedPostId,
          ),
        );
        setSellerListings(dashboard.listings.filter((listing) => ["available", "reserved"].includes(listing.status)));
      })
      .catch(() => {
        if (isMounted) {
          setViewerResponses([]);
          setSellerListings([]);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [user, wantedPostId]);

  async function changeWantedStatus(status: "active" | "closed") {
    if (!wantedPost) return;
    setIsUpdating(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateWantedPostStatus(wantedPost.id, status);
      setWantedPost(updated);
      setNotice(status === "closed" ? "Wanted post closed." : "Wanted post reopened.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update wanted post.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function sendWantedResponse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!wantedPost) return;
    setIsUpdating(true);
    setError(null);
    setNotice(null);
    try {
      const created = await createWantedResponse(wantedPost.id, {
        message: responseForm.message || undefined,
        seller_contact_method: responseForm.seller_contact_method,
        seller_contact_value: responseForm.seller_contact_value || undefined,
        listing_id: responseForm.listing_id || undefined,
      });
      setIsResponseOpen(false);
      setViewerResponses((current) => [created, ...current.filter((response) => response.id !== created.id)]);
      setResponseForm({ message: "", seller_contact_method: "in_app", seller_contact_value: "", listing_id: "" });
      setNotice("Direct offer sent. The buyer can accept before your contact details are revealed.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to send wanted response.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function answerWantedResponse(response: WantedResponse, status: "accepted" | "rejected") {
    setIsUpdating(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateWantedResponse(response.id, {
        status,
        buyer_response: status === "accepted" ? "Accepted. Contact details are now visible." : "Rejected by buyer.",
      });
      setViewerResponses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setNotice(status === "accepted" ? "Offer accepted. Seller contact is visible now." : "Offer rejected. The seller has been notified.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update wanted response.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function cancelSentWantedResponse(response: WantedResponse) {
    setIsUpdating(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await cancelWantedResponse(response.id);
      setViewerResponses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setNotice("Offer cancelled. The buyer has been notified.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to cancel wanted response.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <TradeShell
      eyebrow="UM Nexus Wanted Post"
      title={wantedPost?.title ?? "Wanted post detail"}
      description="Post what you need, review seller offers, and find possible matches from UM students."
    >
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Loading wanted post...
        </div>
      ) : wantedPost ? (
        <div className="grid gap-5">
        {searchParams.get("posted") === "1" ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
            <h2 className="text-lg font-semibold">You posted this wanted request.</h2>
            <p className="mt-2 text-sm leading-6">
              Possible matching listings are shown below. Sellers can also create a listing directly from this demand.
            </p>
          </section>
        ) : null}
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <StatusPill>{formatCategory(wantedPost.category)}</StatusPill>
                <StatusPill tone={wantedPost.status === "active" ? "good" : "warn"}>{wantedStatusLabel(wantedPost.status)}</StatusPill>
              </div>
              <h2 className="mt-4 text-3xl font-semibold text-slate-950">
                {wantedPost.title}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                {wantedPost.description ?? "No description provided."}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-4 text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">
                Max budget
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-900">
                {formatMoney(wantedPost.max_budget, wantedPost.currency)}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Desired item" value={wantedPost.desired_item_name ?? "Not specified"} />
            <Fact label="Preferred pickup" value={formatPickupLocation(wantedPost.preferred_pickup_area)} />
            <Fact label="College" value={wantedPost.residential_college ?? "TBD"} />
            <Fact label="Currency" value={wantedPost.currency} />
          </div>
          <p className={`mt-5 rounded-lg border px-3 py-2 text-sm ${wantedPost.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
            {wantedPost.status === "active" ? "Active · sellers can send offers" : "Closed · no new offers"}
          </p>
          {isOwner && wantedPost.status === "active" && isWantedStale(wantedPost.created_at) ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="font-semibold">This request has been active for 14+ days.</p>
              <p className="mt-1">Close this request when you no longer need the item.</p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-500"
              href="/trade"
            >
              Back to listings
            </Link>
            <Link
              className="inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
              href={`/trade/sell?wanted_id=${wantedPost.id}`}
            >
              I Have This Item
            </Link>
            {!isOwner ? (
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                onClick={() => setIsResponseOpen(true)}
                type="button"
              >
                <Send aria-hidden="true" className="h-4 w-4" />
                Send Offer
              </button>
            ) : (
              <button
                className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-500"
                disabled={isUpdating}
                onClick={() => void changeWantedStatus(wantedPost.status === "active" ? "closed" : "active")}
                type="button"
              >
                {wantedPost.status === "active" ? "Close Request" : "Reopen Request"}
              </button>
            )}
          </div>
        </section>
        {user && viewerResponses.length > 0 ? (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{isOwner ? "Seller responses" : "Your response status"}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  {isOwner
                    ? "Review direct seller offers. Contact details unlock only after you accept."
                    : "Track the offer you sent for this wanted request."}
                </p>
              </div>
              <StatusPill tone="pending">{viewerResponses.length} response{viewerResponses.length === 1 ? "" : "s"}</StatusPill>
            </div>
            <div className="mt-4 grid gap-3">
              {viewerResponses.map((response) => (
                <WantedResponseStatusCard
                  isOwner={isOwner}
                  isUpdating={isUpdating}
                  key={response.id}
                  response={response}
                  onAnswer={answerWantedResponse}
                  onCancel={cancelSentWantedResponse}
                />
              ))}
            </div>
          </section>
        ) : null}
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Possible matches</h2>
              <p className="mt-2 text-sm text-slate-600">
                These listings may match what you are looking for.
              </p>
            </div>
            <StatusPill tone={recommendations.length > 0 ? "good" : "warn"}>
              {recommendations.length} recommendation(s)
            </StatusPill>
          </div>
          {recommendations.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              No strong matches yet. Check back later as new UM listings are posted.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {recommendations.map((item) => (
                <Link
                  className="rounded-lg border border-slate-200 p-4 transition hover:border-emerald-300"
                  href={`/trade/${item.listing.id}`}
                  key={item.listing.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{item.listing.title}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatMoney(item.listing.price, item.listing.currency)} · {formatPickupLocation(item.listing.pickup_location ?? item.listing.pickup_area)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-emerald-700 px-3 py-2 text-right text-white">
                      <p className="text-lg font-semibold">{Math.round(item.match_score)}%</p>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-emerald-100">
                        {item.final_match_confidence}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm leading-5 text-slate-600 md:grid-cols-2">
                    <p>{item.item_fit_summary}</p>
                    <p>{item.price_fit_summary}</p>
                    <p>{item.location_fit_summary}</p>
                    <p>{item.risk_note}</p>
                  </div>
                  <span className="mt-3 inline-flex rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800">
                    View Listing
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
        </div>
      ) : null}

      {isResponseOpen && wantedPost ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button aria-label="Close response form" className="absolute inset-0 bg-slate-950/40" onClick={() => setIsResponseOpen(false)} type="button" />
          <form className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onSubmit={sendWantedResponse}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Send Offer</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">{wantedPost.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Your message and selected contact method will be shown to the buyer. Your contact details are only revealed if the buyer accepts your offer.
                </p>
              </div>
              <button aria-label="Close" className="rounded-full p-2 text-slate-500 hover:bg-slate-100" onClick={() => setIsResponseOpen(false)} type="button">
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <label className="mt-4 grid gap-2">
              <span className="text-sm font-semibold text-slate-800">Offer message</span>
              <textarea className="trade-input min-h-28" value={responseForm.message} onChange={(event) => setResponseForm((current) => ({ ...current, message: event.target.value }))} />
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-800">Contact method</span>
                <select className="trade-input" value={responseForm.seller_contact_method} onChange={(event) => setResponseForm((current) => ({ ...current, seller_contact_method: event.target.value }))}>
                  <option value="in_app">In-app first</option>
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </label>
              {responseForm.seller_contact_method === "in_app" ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  You can start in-app first. No contact value is needed.
                </div>
              ) : (
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-800">{responseForm.seller_contact_method === "email" ? "Contact value (optional)" : "Contact value"}</span>
                  <input className="trade-input" value={responseForm.seller_contact_value} onChange={(event) => setResponseForm((current) => ({ ...current, seller_contact_value: event.target.value }))} />
                </label>
              )}
            </div>
            {sellerListings.length > 0 ? (
              <label className="mt-4 grid gap-2">
                <span className="text-sm font-semibold text-slate-800">Attach one of your listings</span>
                <select className="trade-input" value={responseForm.listing_id} onChange={(event) => setResponseForm((current) => ({ ...current, listing_id: event.target.value }))}>
                  <option value="">No attached listing</option>
                  {sellerListings.map((listing) => (
                    <option key={listing.id} value={listing.id}>
                      {listing.title} · {formatMoney(listing.price, listing.currency)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {sellerListings.length === 0 ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                You can also create a listing from this wanted request.
                <Link className="ml-1 font-semibold text-emerald-800 underline underline-offset-2" href={`/trade/sell?wanted_id=${wantedPost.id}`}>
                  Start a listing
                </Link>
              </div>
            ) : null}
            <button className="trade-button-primary mt-5 w-full" disabled={isUpdating} type="submit">
              <Send aria-hidden="true" className="h-4 w-4" />
              {isUpdating ? "Sending..." : "Send Offer"}
            </button>
          </form>
        </div>
      ) : null}
    </TradeShell>
  );
}

function WantedResponseStatusCard({
  isOwner,
  isUpdating,
  response,
  onAnswer,
  onCancel,
}: Readonly<{
  isOwner: boolean;
  isUpdating: boolean;
  response: WantedResponse;
  onAnswer: (response: WantedResponse, status: "accepted" | "rejected") => Promise<void>;
  onCancel: (response: WantedResponse) => Promise<void>;
}>) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm leading-6 text-slate-700">{response.message ?? "No offer message provided."}</p>
          <p className="mt-2 text-xs text-slate-500">{formatRelativeTime(response.created_at)}</p>
        </div>
        <StatusPill tone={statusTone(response.status)}>{response.status}</StatusPill>
      </div>
      <OfferStatusTimeline status={response.status} />
      {response.listing ? (
        <Link className="mt-3 block rounded-lg border border-slate-200 bg-white p-3 text-sm transition hover:border-emerald-200 hover:bg-emerald-50" href={`/trade/${response.listing.id}`}>
          <span className="font-semibold text-slate-950">{response.listing.title}</span>
          <span className="mt-1 block text-slate-600">
            {formatMoney(response.listing.price, response.listing.currency)} · {formatPickupLocation(response.listing.pickup_location ?? response.listing.pickup_area)}
          </span>
        </Link>
      ) : null}
      {response.status === "accepted" ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
          Seller contact: {formatContactLine(response.seller_contact_method, response.seller_contact_value)}
          {response.contact_reveal_blocked_reason ? <p className="mt-1 text-xs font-semibold">{response.contact_reveal_blocked_reason}</p> : null}
        </div>
      ) : null}
      {response.buyer_response ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">Buyer note: {response.buyer_response}</p>
      ) : null}
      {isOwner && response.status === "pending" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="trade-button-primary" disabled={isUpdating} onClick={() => void onAnswer(response, "accepted")} type="button">
            Accept offer
          </button>
          <button className="trade-button-secondary border-rose-200 text-rose-700 hover:bg-rose-50" disabled={isUpdating} onClick={() => void onAnswer(response, "rejected")} type="button">
            Reject
          </button>
        </div>
      ) : null}
      {!isOwner && response.status === "pending" ? (
        <button className="trade-button-secondary mt-3" disabled={isUpdating} onClick={() => void onCancel(response)} type="button">
          Cancel offer
        </button>
      ) : null}
    </article>
  );
}

function OfferStatusTimeline({ status }: Readonly<{ status: string }>) {
  const terminalLabel =
    status === "accepted"
      ? "Accepted"
      : status === "rejected"
        ? "Rejected"
        : status === "cancelled"
          ? "Cancelled"
          : "Accepted / Rejected / Cancelled";
  const steps = ["Offer sent", "Buyer reviewing", terminalLabel];
  const activeIndex = status === "pending" ? 1 : 2;

  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-3">
      {steps.map((step, index) => (
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600" key={step}>
          <span className={`h-2.5 w-2.5 rounded-full ${index <= activeIndex ? "bg-emerald-600" : "bg-slate-300"}`} />
          <span className={index <= activeIndex ? "text-slate-950" : ""}>{step}</span>
        </div>
      ))}
    </div>
  );
}

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
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

function wantedStatusLabel(status: string): string {
  if (status === "active") {
    return "Active";
  }
  if (status === "closed") {
    return "Closed";
  }
  return status;
}

function isWantedStale(createdAt: string): boolean {
  const age = Date.now() - new Date(createdAt).getTime();
  return age >= 14 * 24 * 60 * 60 * 1000;
}
