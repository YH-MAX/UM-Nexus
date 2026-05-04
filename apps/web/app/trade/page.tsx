"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ListingCard } from "@/components/trade/listing-card";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  conditionOptions,
  getListings,
  listingStatusOptions,
  pickupAreas,
  tradeCategories,
  type Listing,
} from "@/lib/trade/api";

type ListingFilters = {
  search: string;
  category: string;
  condition: string;
  pickup_area: string;
  status: string;
  risk_level: string;
  min_price: string;
  max_price: string;
  sort: string;
};

const initialFilters: ListingFilters = {
  search: "",
  category: "",
  condition: "",
  pickup_area: "",
  status: "available",
  risk_level: "",
  min_price: "",
  max_price: "",
  sort: "newest",
};

export default function TradePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filters, setFilters] = useState<ListingFilters>(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

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

  const marketplaceStats = useMemo(() => {
    const enrichedCount = listings.filter((listing) => listing.is_ai_enriched).length;
    const highRiskCount = listings.filter((listing) => listing.risk_level === "high").length;
    const prices = listings.map((listing) => listing.price).sort((a, b) => a - b);
    const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : null;

    return [
      { label: "Active listings", value: String(listings.length), detail: "Open campus supply" },
      { label: "AI priced", value: String(enrichedCount), detail: "Listings with guidance" },
      { label: "Median price", value: medianPrice === null ? "No data" : `RM ${Math.round(medianPrice)}`, detail: "Current result set" },
      { label: "Needs review", value: String(highRiskCount), detail: "High-risk signals" },
    ];
  }, [listings]);

  const hasFilters = (Object.keys(initialFilters) as Array<keyof ListingFilters>).some(
    (key) => filters[key] !== initialFilters[key],
  );

  return (
    <TradeShell
      title="Campus marketplace"
      description="Browse verified UM listings, compare prices, and use wanted-post demand to move items safely across campus."
    >
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Live trading workspace
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Buy and sell with campus context built in
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Sellers get price guidance and buyer matches. Buyers can post what they need and see ranked listings
            by budget, pickup fit, item fit, and trust signals.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
              href="/trade/sell"
            >
              Sell an item
            </Link>
            <Link
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-500"
              href="/trade/want"
            >
              Post wanted item
            </Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {marketplaceStats.map((item) => (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={item.label}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</p>
              <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-6">
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
          value={filters.condition}
          onChange={(event) => setFilters((current) => ({ ...current, condition: event.target.value }))}
        >
          <option value="">Any condition</option>
          {conditionOptions.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
        >
          {listingStatusOptions.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          min="1"
          placeholder="Min RM"
          type="number"
          value={filters.min_price}
          onChange={(event) => setFilters((current) => ({ ...current, min_price: event.target.value }))}
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          min="1"
          placeholder="Max RM"
          type="number"
          value={filters.max_price}
          onChange={(event) => setFilters((current) => ({ ...current, max_price: event.target.value }))}
        />
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
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          value={filters.risk_level}
          onChange={(event) => setFilters((current) => ({ ...current, risk_level: event.target.value }))}
        >
          <option value="">Any risk</option>
          <option value="low">Low risk</option>
          <option value="medium">Medium risk</option>
          <option value="high">High risk</option>
        </select>
        {hasFilters ? (
          <button
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white md:col-span-6"
            onClick={() => setFilters(initialFilters)}
            type="button"
          >
            Clear filters
          </button>
        ) : null}
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
            Start supply with a seller listing, or create a wanted post so the marketplace can surface demand.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
              href="/trade/sell"
            >
              Create listing
            </Link>
            <Link
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-500"
              href="/trade/want"
            >
              Create wanted post
            </Link>
          </div>
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
