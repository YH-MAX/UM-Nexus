"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { StatusPill } from "@/components/trade/status-pill";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  formatCategory,
  formatMoney,
  getWantedPost,
  type WantedPost,
} from "@/lib/trade/api";

type WantedPostDetailPageProps = Readonly<{
  params: {
    id: string;
  };
}>;

export default function WantedPostDetailPage({
  params,
}: WantedPostDetailPageProps) {
  const [wantedPost, setWantedPost] = useState<WantedPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void getWantedPost(params.id)
      .then((post) => {
        if (isMounted) {
          setWantedPost(post);
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
  }, [params.id]);

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
            <Fact label="Preferred pickup" value={wantedPost.preferred_pickup_area ?? "Any"} />
            <Fact label="College" value={wantedPost.residential_college ?? "TBD"} />
            <Fact label="Currency" value={wantedPost.currency} />
          </div>

          <Link
            className="mt-6 inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-500"
            href="/trade"
          >
            Back to listings
          </Link>
        </section>
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
