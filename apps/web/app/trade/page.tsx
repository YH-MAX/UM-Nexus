"use client";

import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Filter,
  Grid3x3,
  ImageOff,
  Info,
  LayoutList,
  PlusCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { CategoryPill } from "@/components/trade/category-pill";
import { EmptyState } from "@/components/trade/empty-state";
import { ListingCard } from "@/components/trade/listing-card";
import { LoadingSkeleton } from "@/components/trade/loading-skeleton";
import { MarketplaceBrowseSidebar } from "@/components/trade/marketplace-browse-sidebar";
import {
  categoryChips,
  MarketplaceFilterPanel,
  type ListingFilters,
} from "@/components/trade/marketplace-filter-panel";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  addFavorite,
  formatPickupLocation,
  formatRelativeTime,
  getFavorites,
  getListings,
  removeFavorite,
  type Listing,
  type ListingsPage,
} from "@/lib/trade/api";

const displaySerif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-marketplace-display",
  display: "swap",
});

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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          setLastSyncedAt(new Date().toISOString());
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

  const updatedLabel = lastSyncedAt ? formatRelativeTime(lastSyncedAt) : "Just now";

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
      setLastSyncedAt(new Date().toISOString());
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

  const showingFrom = allListings.length === 0 ? 0 : 1;
  const showingTo = allListings.length;
  const resultsSummary =
    allListings.length === 0
      ? "Showing 0 listings"
      : `Showing ${showingFrom}–${showingTo} of ${page.total} listing${page.total === 1 ? "" : "s"}`;

  const filterPanelProps = {
    filters,
    hasFilters,
    priceError: !!priceError,
    onClear: () => setFilters(initialFilters),
    onUpdate: updateFilter,
  } as const;

  return (
    <div className={displaySerif.variable}>
      <TradeShell hideHero title="Browse UM Listings">
        {error ? (
          <div className="trade-alert trade-alert-danger flex gap-3 rounded-2xl">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}
        {notice ? (
          <div className="trade-alert trade-alert-warning flex gap-3 rounded-2xl">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{notice}</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          <MarketplaceBrowseSidebar
            activeCategory={filters.category}
            filterSlot={<MarketplaceFilterPanel {...filterPanelProps} layout="sidebar" />}
            onSelectCategory={(value) => updateFilter("category", value)}
          />

          <div className="min-w-0 flex-1 space-y-6">
            <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">UM Nexus Trade</p>
                <h1
                  className={`${displaySerif.className} mt-2 text-4xl font-semibold leading-[1.1] text-stone-950 sm:text-5xl`}
                >
                  Browse UM Listings
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
                  Find textbooks, electronics, dorm items, and campus essentials from UM students.
                </p>
              </div>
              <div className="flex w-full shrink-0 flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:justify-end lg:w-auto lg:flex-col lg:items-end">
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-stone-950 px-6 text-sm font-semibold text-white shadow-md transition duration-200 hover:bg-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                  href="/trade/sell"
                >
                  <PlusCircle aria-hidden="true" className="h-4 w-4" />
                  Sell an item
                </Link>
                <div className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-right shadow-sm backdrop-blur-sm">
                  <p className="text-sm font-semibold text-stone-900">
                    {isLoading ? "Loading listings…" : `${page.total} live result${page.total === 1 ? "" : "s"}`}
                  </p>
                  <p className="mt-1 flex items-center justify-end gap-2 text-xs text-stone-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]" />
                    Updated {updatedLabel}
                  </p>
                </div>
              </div>
            </header>

            <div className="space-y-4">
              <label className="relative block min-w-0">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
                />
                <input
                  className="trade-input min-h-[56px] rounded-2xl border-stone-200 bg-white pl-14 pr-4 text-base shadow-sm focus-visible:ring-amber-200"
                  placeholder="Search textbooks, calculators, fans, monitors..."
                  value={filters.search}
                  onChange={(event) => updateFilter("search", event.target.value)}
                />
              </label>

              <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {categoryChips.map((category) => {
                  const active = filters.category === category.value;
                  return (
                    <button
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
                        active
                          ? "border-stone-950 bg-stone-950 text-white shadow-md"
                          : "border-stone-200 bg-white text-stone-700 hover:border-amber-200 hover:bg-amber-50"
                      }`}
                      key={category.value || "all"}
                      onClick={() => updateFilter("category", category.value)}
                      type="button"
                    >
                      {active ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                      ) : null}
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="hidden lg:block">
              <MarketplaceFilterPanel {...filterPanelProps} layout="bar" />
            </div>

            <div className="flex items-center justify-between gap-3 lg:hidden">
              <button
                className="trade-button-secondary min-h-12 w-full justify-between rounded-2xl border-stone-200 bg-white"
                onClick={() => setIsFilterOpen(true)}
                type="button"
              >
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
                  Filters
                </span>
                {hasFilters ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                    Active
                  </span>
                ) : null}
              </button>
            </div>

            {!isLoading ? (
              <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {filters.search ? (
                    <span className="trade-chip border-stone-200 bg-stone-50 text-stone-700">
                      Search: &ldquo;{filters.search}&rdquo;
                    </span>
                  ) : null}
                  {filters.category ? <CategoryPill active category={filters.category} /> : null}
                  {filters.condition ? (
                    <span className="trade-chip border-stone-200 bg-stone-50 text-stone-700">
                      {filters.condition.replaceAll("_", " ")}
                    </span>
                  ) : null}
                  {filters.pickup_location ? (
                    <span className="trade-chip border-stone-200 bg-stone-50 text-stone-700">
                      {formatPickupLocation(filters.pickup_location)}
                    </span>
                  ) : null}
                  {!hasFilters ? (
                    <span className="text-sm text-stone-500">Newest UM marketplace listings</span>
                  ) : null}
                </div>
                {hasFilters ? (
                  <button
                    className="inline-flex min-h-8 items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                    onClick={() => setFilters(initialFilters)}
                    type="button"
                  >
                    <X aria-hidden="true" className="h-3.5 w-3.5" />
                    Clear all filters
                  </button>
                ) : null}
              </section>
            ) : null}

            {!user && !isLoading && page.total > 0 ? (
              <div className="trade-alert trade-alert-success rounded-2xl border-emerald-200/80">
                <Link className="font-semibold text-emerald-900 underline underline-offset-2" href="/login">
                  Sign in with your UM email
                </Link>{" "}
                to save listings or contact sellers.
              </div>
            ) : null}

            {!isLoading && allListings.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-medium text-stone-700">
                  <Sparkles aria-hidden="true" className="h-4 w-4 text-amber-600" />
                  {resultsSummary}
                </p>
                <div
                  className="inline-flex rounded-xl border border-stone-200 bg-white p-1 shadow-sm"
                  role="group"
                  aria-label="Listing view"
                >
                  <button
                    aria-label="Grid view"
                    aria-pressed={viewMode === "grid"}
                    className={`inline-flex h-9 w-10 items-center justify-center rounded-lg transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
                      viewMode === "grid"
                        ? "bg-[#f5f0e6] text-amber-900 shadow-sm"
                        : "text-stone-500 hover:bg-stone-50"
                    }`}
                    onClick={() => setViewMode("grid")}
                    type="button"
                  >
                    <Grid3x3 aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="List view"
                    aria-pressed={viewMode === "list"}
                    className={`inline-flex h-9 w-10 items-center justify-center rounded-lg transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
                      viewMode === "list"
                        ? "bg-[#f5f0e6] text-amber-900 shadow-sm"
                        : "text-stone-500 hover:bg-stone-50"
                    }`}
                    onClick={() => setViewMode("list")}
                    type="button"
                  >
                    <LayoutList aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
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
                <section
                  className={
                    viewMode === "grid"
                      ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                      : "flex flex-col gap-4"
                  }
                >
                  {allListings.map((listing) => (
                    <ListingCard
                      isSaved={savedIds.has(listing.id)}
                      key={listing.id}
                      listing={listing}
                      viewMode={viewMode}
                      onToggleFavorite={user ? toggleFavorite : undefined}
                    />
                  ))}
                </section>

                {page.has_more ? (
                  <div className="flex justify-center pt-2">
                    <button
                      className="trade-button-secondary min-h-12 min-w-[200px] rounded-2xl border-stone-200"
                      disabled={isLoadingMore}
                      onClick={() => void loadMore()}
                      type="button"
                    >
                      {isLoadingMore ? "Loading..." : `Load more (${page.total - allListings.length} remaining)`}
                    </button>
                  </div>
                ) : allListings.length > PAGE_SIZE ? (
                  <p className="rounded-2xl border border-stone-200 bg-white/90 px-4 py-3 text-center text-sm font-medium text-stone-500 shadow-sm">
                    All {page.total} listings loaded.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>

        {isFilterOpen ? (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <button
              aria-label="Close filters"
              className="absolute inset-0 bg-stone-950/50 backdrop-blur-sm"
              onClick={() => setIsFilterOpen(false)}
              type="button"
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-3xl border border-stone-200 bg-[#fffdf8] p-5 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Marketplace</p>
                  <h2 className="text-lg font-semibold text-stone-950">Filters</h2>
                </div>
                <button
                  aria-label="Close filters"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 transition hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                  onClick={() => setIsFilterOpen(false)}
                  type="button"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-5">
                <MarketplaceFilterPanel {...filterPanelProps} layout="sidebar" />
              </div>
            </div>
          </div>
        ) : null}
      </TradeShell>
    </div>
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
