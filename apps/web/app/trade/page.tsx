"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Filter, PlusCircle, Search, SlidersHorizontal, X } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { CategoryPill } from "@/components/trade/category-pill";
import { EmptyState } from "@/components/trade/empty-state";
import { ListingCard } from "@/components/trade/listing-card";
import { LoadingSkeleton } from "@/components/trade/loading-skeleton";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  addFavorite,
  conditionOptions,
  getFavorites,
  getListings,
  listingStatusOptions,
  pickupAreas,
  removeFavorite,
  tradeCategories,
  type Listing,
} from "@/lib/trade/api";

type ListingFilters = {
  search: string;
  category: string;
  condition: string;
  pickup_location: string;
  status: string;
  min_price: string;
  max_price: string;
  sort: string;
};

const initialFilters: ListingFilters = {
  search: "",
  category: "",
  condition: "",
  pickup_location: "",
  status: "",
  min_price: "",
  max_price: "",
  sort: "latest",
};

const categoryChips = [
  { value: "", label: "All" },
  ...tradeCategories.map((category) => ({
    value: category.value,
    label: category.label
      .replace("Textbooks & Notes", "Textbooks")
      .replace("Kitchen Appliances", "Kitchen")
      .replace("Sports & Hobby", "Sports"),
  })),
];

export default function TradePage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [filters, setFilters] = useState<ListingFilters>(initialFilters);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  useEffect(() => {
    if (!user) {
      setSavedIds(new Set());
      return;
    }
    let isMounted = true;
    void getFavorites()
      .then((favorites) => {
        if (isMounted) {
          setSavedIds(new Set(favorites.map((favorite) => favorite.listing_id)));
        }
      })
      .catch(() => {
        if (isMounted) {
          setSavedIds(new Set());
        }
      });
    return () => {
      isMounted = false;
    };
  }, [user]);

  const hasFilters = useMemo(
    () =>
      (Object.keys(initialFilters) as Array<keyof ListingFilters>).some(
        (key) => filters[key] !== initialFilters[key],
      ),
    [filters],
  );

  async function toggleFavorite(listingId: string, nextSaved: boolean) {
    if (!user) {
      setNotice("Sign in with your UM account to save listings.");
      return;
    }
    setNotice(null);
    try {
      if (nextSaved) {
        await addFavorite(listingId);
      } else {
        await removeFavorite(listingId);
      }
      setSavedIds((current) => {
        const next = new Set(current);
        if (nextSaved) {
          next.add(listingId);
        } else {
          next.delete(listingId);
        }
        return next;
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update saved listing.");
    }
  }

  function updateFilter<K extends keyof ListingFilters>(key: K, value: ListingFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <TradeShell
      title="Browse UM Listings"
      description="Find textbooks, electronics, dorm items, and campus essentials from UM students."
      action={
        <Link className="trade-button-primary" href="/trade/sell">
          <PlusCircle aria-hidden="true" className="h-4 w-4" />
          Sell an Item
        </Link>
      }
    >
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {notice}
        </div>
      ) : null}

      <section className="trade-card min-w-0 p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <label className="relative block min-w-0">
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-2xl border border-slate-300 bg-white py-4 pl-12 pr-4 text-base outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              placeholder="Search textbooks, calculators, fans, monitors..."
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
            />
          </label>
          <button
            className="trade-button-secondary lg:hidden"
            onClick={() => setIsFilterOpen(true)}
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            Filters
          </button>
        </div>

        <div className="mt-4 flex min-w-0 gap-2 overflow-x-auto pb-1">
          {categoryChips.map((category) => (
            <button
              className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                filters.category === category.value
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
              }`}
              key={category.value || "all"}
              onClick={() => updateFilter("category", category.value)}
              type="button"
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="mt-4 hidden lg:block">
          <FilterPanel filters={filters} hasFilters={hasFilters} onClear={() => setFilters(initialFilters)} onUpdate={updateFilter} />
        </div>
      </section>

      {hasFilters ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-500">Active filters:</span>
          {filters.category ? <CategoryPill active category={filters.category} /> : null}
          {filters.condition ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{filters.condition.replaceAll("_", " ")}</span> : null}
          {filters.pickup_location ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{filters.pickup_location.replaceAll("_", " ")}</span> : null}
        </div>
      ) : null}

      {isLoading ? (
        <LoadingSkeleton label="Loading marketplace listings" rows={4} />
      ) : listings.length === 0 ? (
        <EmptyState
          actionHref="/trade/sell"
          actionLabel="Create listing"
          description={hasFilters ? "No matching listings found. Try changing your filters." : "No listings yet. Be the first to sell something on UM Nexus Trade."}
          icon={Filter}
          title={hasFilters ? "No matching listings found" : "No listings yet"}
        />
      ) : (
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard
              isSaved={savedIds.has(listing.id)}
              key={listing.id}
              listing={listing}
              onToggleFavorite={user ? toggleFavorite : undefined}
            />
          ))}
        </section>
      )}

      {isFilterOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            aria-label="Close filters"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setIsFilterOpen(false)}
            type="button"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Marketplace</p>
                <h2 className="text-lg font-semibold text-slate-950">Filters</h2>
              </div>
              <button
                aria-label="Close filters"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600"
                onClick={() => setIsFilterOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5">
              <FilterPanel filters={filters} hasFilters={hasFilters} onClear={() => setFilters(initialFilters)} onUpdate={updateFilter} />
            </div>
          </div>
        </div>
      ) : null}
    </TradeShell>
  );
}

function FilterPanel({
  filters,
  hasFilters,
  onClear,
  onUpdate,
}: Readonly<{
  filters: ListingFilters;
  hasFilters: boolean;
  onClear: () => void;
  onUpdate: <K extends keyof ListingFilters>(key: K, value: ListingFilters[K]) => void;
}>) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
      <SelectField label="Condition" value={filters.condition} onChange={(value) => onUpdate("condition", value)}>
        <option value="">Any condition</option>
        {conditionOptions.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </SelectField>
      <SelectField label="Pickup" value={filters.pickup_location} onChange={(value) => onUpdate("pickup_location", value)}>
        <option value="">Any pickup</option>
        {pickupAreas.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </SelectField>
      <SelectField label="Status" value={filters.status} onChange={(value) => onUpdate("status", value)}>
        {listingStatusOptions.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </SelectField>
      <input
        className="trade-input"
        min="0"
        placeholder="Min RM"
        type="number"
        value={filters.min_price}
        onChange={(event) => onUpdate("min_price", event.target.value)}
      />
      <input
        className="trade-input"
        min="0"
        placeholder="Max RM"
        type="number"
        value={filters.max_price}
        onChange={(event) => onUpdate("max_price", event.target.value)}
      />
      <SelectField label="Sort" value={filters.sort} onChange={(value) => onUpdate("sort", value)}>
        <option value="latest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="price_low_high">Lowest price</option>
        <option value="price_high_low">Highest price</option>
      </SelectField>
      {hasFilters ? (
        <button
          className="trade-button-secondary md:col-span-2 lg:col-span-6"
          onClick={onClear}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

function SelectField({
  children,
  label,
  value,
  onChange,
}: Readonly<{
  children: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
}>) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <select
        className="trade-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}
