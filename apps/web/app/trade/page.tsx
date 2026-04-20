"use client";

import { useEffect, useState } from "react";

import { ListingCard } from "@/components/trade/listing-card";
import { TradeShell } from "@/components/trade/trade-shell";
import { getListings, type Listing } from "@/lib/trade/api";

export default function TradePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void getListings()
      .then((items) => {
        if (isMounted) {
          setListings(items);
          setError(null);
        }
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load listings.");
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
  }, []);

  return (
    <TradeShell
      title="Campus resale decision engine"
      description="Demo mode is active. Create listings and wanted posts, then run mock Trade Intelligence to generate pricing, trust, and match recommendations."
    >
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Loading listings...
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-950">
            No active listings yet
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Seed demo data or create a listing to start the vertical slice.
          </p>
        </div>
      ) : (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </section>
      )}
    </TradeShell>
  );
}
