"use client";

import { useEffect, useState } from "react";

import { ListingCard } from "@/components/trade/listing-card";
import { TradeShell } from "@/components/trade/trade-shell";
import { getListings, pickupAreas, tradeCategories, type Listing } from "@/lib/trade/api";

export default function TradePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filters, setFilters] = useState({ search: "", category: "", pickup_area: "", risk_level: "", sort: "newest" });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void getListings(filters)
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
  }, [filters]);

  return (
    <TradeShell
      title="Campus resale decision engine"
      description="Find fair campus deals, compare AI price guidance, and connect with stronger buyer-seller matches."
    >
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 md:col-span-2"
          placeholder="Search item, brand, or description"
          value={filters.search}
          onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
        />
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          value={filters.category}
          onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
        >
          <option value="">All categories</option>
          {tradeCategories.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          value={filters.pickup_area}
          onChange={(event) => setFilters((current) => ({ ...current, pickup_area: event.target.value }))}
        >
          <option value="">Any pickup</option>
          {pickupAreas.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          value={filters.sort}
          onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Lowest price</option>
          <option value="price_desc">Highest price</option>
          <option value="risk">Risk first</option>
        </select>
      </section>

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
