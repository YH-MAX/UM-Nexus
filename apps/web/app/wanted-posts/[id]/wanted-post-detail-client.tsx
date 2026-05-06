"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { StatusPill } from "@/components/trade/status-pill";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  formatCategory,
  formatMoney,
  formatPickupLocation,
  getWantedPost,
  getWantedPostRecommendations,
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
  const [wantedPost, setWantedPost] = useState<WantedPost | null>(null);
  const [recommendations, setRecommendations] = useState<WantedListingRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <TradeShell
      eyebrow="UM Nexus Wanted Post"
      title={wantedPost?.title ?? "Wanted post detail"}
      description="Wanted posts act as demand signals for the Trade Intelligence match engine."
    >
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
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
                <StatusPill tone="good">{wantedPost.status}</StatusPill>
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
              I have this item
            </Link>
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Recommended products</h2>
              <p className="mt-2 text-sm text-slate-600">
                Ranked by buyer need fit, budget compatibility, pickup convenience, risk, and listing quality.
              </p>
            </div>
            <StatusPill tone={recommendations.length > 0 ? "good" : "warn"}>
              {recommendations.length} recommendation(s)
            </StatusPill>
          </div>
          {recommendations.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              No strong product recommendation yet. The engine suppresses weak matches so buyers do not waste time.
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
                    <p>Need fit: {item.item_fit_summary}</p>
                    <p>Budget fit: {item.price_fit_summary}</p>
                    <p>Pickup fit: {item.location_fit_summary}</p>
                    <p>{item.risk_note}</p>
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Next action: {item.recommended_action.replaceAll("_", " ")}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
        </div>
      ) : null}
    </TradeShell>
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
