"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Filter, ImageOff, PlusCircle, Search, SlidersHorizontal, X } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { CategoryPill } from "@/components/trade/category-pill";
import { EmptyState } from "@/components/trade/empty-state";
import { ListingCard } from "@/components/trade/listing-card";
import { LoadingSkeleton } from "@/components/trade/loading-skeleton";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  addFavorite,
  conditionOptions,
  formatCategory,
  formatPickupLocation,
  getFavorites,
  getListings,
  listingStatusOptions,
  pickupAreas,
  removeFavorite,
  tradeCategories,
  type Listing,
  type ListingsPage,
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

const CHIP_LABELS: Record<string, string> = {
  textbooks_notes: "Textbooks",
  kitchen_appliances: "Kitchen",
  sports_hobby: "Sports",
  tickets_events: "Tickets & Events",
  free_items: "Free Items",
  dorm_room: "Dorm & Room",
};

const categoryChips = [
  { value: "", label: "All" },
  ...tradeCategories.map((category) => ({
    value: category.value,
    label: CHIP_LABELS[category.value] ?? category.label,
  })),
];

const PAGE_SIZE = 24;

const emptyPage: ListingsPage = { items: [], total: 0, limit: PAGE_SIZE, offset: 0, has_more: false };

export default function TradePage() {
  const { user } = useAuth();
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [page, setPage] = useState<ListingsPage>(emptyPage);
  const [filters, setFilters] = useState<ListingFilters>(initialFilters);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search: 500ms delay before updating debouncedSearch
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 500);
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [filters.search]);

  // Reset and fetch when filters change (use debouncedSearch for text search)
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const activeFilters = buildQueryFilters({
      search: debouncedSearch,
      category: filters.category,
      condition: filters.condition,
      pickup_location: filters.pickup_location,
      status: filters.status,
      min_price: filters.min_price,
      max_price: filters.max_price,
      sort: filters.sort,
    });

    void getListings(activeFilters, { limit: PAGE_SIZE, offset: 0 })
      .then((result) => {
        if (isMounted) {
          setPage(result);
          setAllListings(result.items);
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
  }, [
    debouncedSearch,
    filters.category,
    filters.condition,
    filters.pickup_location,
    filters.status,
    filters.min_price,
    filters.max_price,
    filters.sort,
  ]);

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

  const priceError = useMemo(() => {
    const min = parseFloat(filters.min_price);
    const max = parseFloat(filters.max_price);
    return filters.min_price && filters.max_price && min > max;
  }, [filters.min_price, filters.max_price]);

  async function loadMore() {
    if (!page.has_more || isLoadingMore) return;
    setIsLoadingMore(true);
    const nextOffset = page.offset + page.limit;
    const activeFilters = buildQueryFilters({
      search: debouncedSearch,
      category: filters.category,
      condition: filters.condition,
      pickup_location: filters.pickup_location,
      status: filters.status,
      min_price: filters.min_price,
      max_price: filters.max_price,
      sort: filters.sort,
    });
    try {
      const result = await getListings(activeFilters, { limit: PAGE_SIZE, offset: nextOffset });
      setPage(result);
      setAllListings((prev) => [...prev, ...result.items]);
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load more listings.");
    } finally {
      setIsLoadingMore(false);
    }
  }

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
          <FilterPanel
            filters={filters}
            hasFilters={hasFilters}
            priceError={!!priceError}
            onClear={() => setFilters(initialFilters)}
            onUpdate={updateFilter}
          />
        </div>
      </section>

      {/* Result count + active filter summary */}
      {!isLoading ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">
              {page.total} {page.total === 1 ? "listing" : "listings"} found
            </span>
            {filters.search ? (
              <span className="text-sm text-slate-500">for &ldquo;{filters.search}&rdquo;</span>
            ) : null}
            {filters.category ? <CategoryPill active category={filters.category} /> : null}
            {filters.condition ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {filters.condition.replaceAll("_", " ")}
              </span>
            ) : null}
            {filters.pickup_location ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {formatPickupLocation(filters.pickup_location)}
              </span>
            ) : null}
          </div>
          {hasFilters ? (
            <button
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
              onClick={() => setFilters(initialFilters)}
              type="button"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
              Clear all filters
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Guest sign-in nudge when listings exist */}
      {!user && !isLoading && page.total > 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <Link className="font-semibold underline underline-offset-2" href="/login">Sign in with your UM email</Link>
          {" "}to save listings or contact sellers.
        </div>
      ) : null}

      {isLoading ? (
        <LoadingSkeleton />
      ) : allListings.length === 0 ? (
        hasFilters ? (
          <EmptyState
            actionLabel="Clear filters"
            description="No matching listings found. Try changing your filters or clearing your search."
            icon={Filter}
            title="No matching listings"
            onAction={() => setFilters(initialFilters)}
          />
        ) : (
          <EmptyState
            actionHref="/trade/sell"
            actionLabel="Sell an item"
            description="No listings yet. Be the first to sell something on UM Nexus Trade."
            icon={ImageOff}
            title="No listings yet"
          />
        )
      ) : (
        <>
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {allListings.map((listing) => (
              <ListingCard
                isSaved={savedIds.has(listing.id)}
                key={listing.id}
                listing={listing}
                onToggleFavorite={user ? toggleFavorite : undefined}
              />
            ))}
          </section>

          {page.has_more ? (
            <div className="flex justify-center pt-2">
              <button
                className="trade-button-secondary min-w-[160px]"
                disabled={isLoadingMore}
                onClick={() => void loadMore()}
                type="button"
              >
                {isLoadingMore ? "Loading..." : `Load more (${page.total - allListings.length} remaining)`}
              </button>
            </div>
          ) : allListings.length > PAGE_SIZE ? (
            <p className="text-center text-sm text-slate-400">All {page.total} listings loaded.</p>
          ) : null}
        </>
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
              <FilterPanel
                filters={filters}
                hasFilters={hasFilters}
                priceError={!!priceError}
                onClear={() => setFilters(initialFilters)}
                onUpdate={updateFilter}
              />
            </div>
          </div>
        </div>
      ) : null}
    </TradeShell>
  );
}

function buildQueryFilters(filters: ListingFilters): Record<string, string> {
  const out: Record<string, string> = {};
  const min = parseFloat(filters.min_price);
  const max = parseFloat(filters.max_price);
  const priceInvalid = filters.min_price && filters.max_price && min > max;

  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue;
    if ((key === "min_price" || key === "max_price") && priceInvalid) continue;
    out[key] = value;
  }
  return out;
}

function FilterPanel({
  filters,
  hasFilters,
  priceError,
  onClear,
  onUpdate,
}: Readonly<{
  filters: ListingFilters;
  hasFilters: boolean;
  priceError: boolean;
  onClear: () => void;
  onUpdate: <K extends keyof ListingFilters>(key: K, value: ListingFilters[K]) => void;
}>) {
  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-6">
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
      <div className="grid min-w-0 gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Min RM</span>
        <input
          className={`trade-input ${priceError ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : ""}`}
          min="0"
          placeholder="Min RM"
          type="number"
          value={filters.min_price}
          onChange={(event) => onUpdate("min_price", event.target.value)}
        />
      </div>
      <div className="grid min-w-0 gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Max RM</span>
        <input
          className={`trade-input ${priceError ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : ""}`}
          min="0"
          placeholder="Max RM"
          type="number"
          value={filters.max_price}
          onChange={(event) => onUpdate("max_price", event.target.value)}
        />
      </div>
      <SelectField label="Sort" value={filters.sort} onChange={(value) => onUpdate("sort", value)}>
        <option value="latest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="price_low_high">Price: Low to High</option>
        <option value="price_high_low">Price: High to Low</option>
      </SelectField>
      {priceError ? (
        <p className="col-span-full text-xs text-rose-600">
          Minimum price cannot be higher than maximum price.
        </p>
      ) : null}
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
    <label className="grid min-w-0 gap-1.5">
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
