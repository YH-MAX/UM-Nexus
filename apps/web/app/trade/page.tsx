"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import campusPhoto from "@/lib/trade/campus-photo.json";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  House,
  Shirt,
  Monitor,
  Megaphone,
  ArrowRight,
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
import { ListingExamples } from "@/components/trade/listing-examples";
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
  conditionOptions,
  pickupAreas,
  getCachedListings,
  getListings,
  removeFavorite,
  type Listing,
  type ListingsPage,
} from "@/lib/trade/api";


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
  const explore = usePathname() === "/trade/explore";
  const [allListings, setAllListings] = useState<Listing[]>(() => getCachedListings({ sort: "latest" }, { limit: PAGE_SIZE, offset: 0 })?.items ?? []);
  const [page, setPage] = useState<ListingsPage>(() => getCachedListings({ sort: "latest" }, { limit: PAGE_SIZE, offset: 0 }) ?? emptyPage);
  const [filters, setFilters] = useState<ListingFilters>(initialFilters);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(() => !getCachedListings({ sort: "latest" }, { limit: PAGE_SIZE, offset: 0 }));
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

    const cached = getCachedListings(activeFilters, { limit: PAGE_SIZE, offset: 0 });
    setIsLoading(!cached);
    if (cached) {
      setPage(cached);
      setAllListings(cached.items);
      setError(null);
    }

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
    <div className="nexus-marketplace">
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

          <div className="min-w-0 flex-1 space-y-4">
            {explore ? <h1 className="hidden text-2xl font-semibold md:block">All Items</h1> : <h1 className="sr-only">Browse UM Listings</h1>}

            <div className="space-y-3">
              <div className="flex items-center gap-2"><label className="relative block min-w-0 flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                />
                <input
                  className="trade-input min-h-[42px] rounded-xl border-slate-200 bg-slate-50 pl-10 pr-3 text-sm shadow-none"
                  placeholder="Search textbooks, calculators, fans, monitors..."
                  value={filters.search}
                  onChange={(event) => updateFilter("search", event.target.value)}
                />
              </label><button aria-label="Filters" className="nexus-icon-button shrink-0 border border-slate-200" onClick={() => setIsFilterOpen(true)} type="button"><SlidersHorizontal aria-hidden="true" className="h-4 w-4" /></button></div>
              {!explore && !hasFilters ? <section aria-label="Campus marketplace" className="nexus-campus-banner relative isolate overflow-hidden rounded-xl bg-[#105651] text-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={campusPhoto.alt} className="absolute inset-0 -z-20 h-full w-full object-cover" height={480} src={campusPhoto.src} width={1200} />
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#063f4c]/90 via-[#075b64]/60 to-transparent" />
                <div className="p-5 py-5 sm:p-8"><p className="text-xl font-semibold tracking-tight sm:text-3xl">Buy · Sell · Connect</p><p className="mt-1.5 text-xs text-white/95 sm:text-sm">For a better UM campus life.</p><Link className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white underline underline-offset-4" href="/trade/explore">Explore the marketplace <ArrowRight aria-hidden="true" className="h-3 w-3" /></Link></div>
                <details className="absolute bottom-1 right-2 max-w-[70%] text-right text-[9px] leading-4 text-white"><summary className="cursor-pointer">Photo credit</summary><p className="rounded bg-black/70 p-2"><a className="underline" href={campusPhoto.source} target="_blank" rel="noreferrer">Campus photo by {campusPhoto.author}</a> · <a className="underline" href={campusPhoto.licenseUrl} target="_blank" rel="noreferrer">{campusPhoto.license}</a> · {campusPhoto.changes}</p></details>
              </section> : null}
              {!explore ? <div aria-label="Campus categories" className="nexus-category-tiles flex gap-3 overflow-x-auto pb-1">
                {[{ value: "", label: "All", icon: Grid3x3, color: "bg-blue-50 text-blue-600" }, { value: "electronics", label: "Electronics", icon: Monitor, color: "bg-indigo-50 text-indigo-600" }, { value: "textbooks_notes", label: "Books", icon: BookOpen, color: "bg-orange-50 text-orange-600" }, { value: "dorm_room", label: "Home & Living", icon: House, color: "bg-emerald-50 text-emerald-700" }, { value: "clothing", label: "Fashion", icon: Shirt, color: "bg-rose-50 text-rose-600" }].map(({ value, label, icon: Icon, color }) => <button aria-pressed={filters.category === value} className="flex min-w-[60px] flex-1 shrink-0 flex-col items-center gap-1.5 whitespace-nowrap text-[9px] font-medium text-slate-700" key={value} onClick={() => updateFilter("category", value)} type="button"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${color} ${filters.category === value ? "ring-1 ring-current" : ""}`}><Icon aria-hidden="true" className="h-5 w-5" /></span>{label}</button>)}
                <Link aria-label="Wanted" className="flex min-w-[60px] shrink-0 flex-col items-center gap-1.5 text-[9px] font-medium text-slate-700" href="/trade/want"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Megaphone aria-hidden="true" className="h-5 w-5" /></span>Wanted</Link>
              </div> : null}
              <div className={`${explore ? "flex" : "hidden"} min-w-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
                {categoryChips.map((category) => {
                  const active = filters.category === category.value;
                  return (
                    <button
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
                        active
                          ? "border-stone-950 bg-[#105651] text-white"
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

            {explore ? <div aria-label="Quick filters" className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
              <select aria-label="Sort items" className="nexus-quick-select" value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}><option value="latest">Sort: Latest</option><option value="price_low_high">Price: Low to high</option><option value="price_high_low">Price: High to low</option></select>
              <select aria-label="Item condition" className="nexus-quick-select" value={filters.condition} onChange={(event) => updateFilter("condition", event.target.value)}><option value="">Condition</option>{conditionOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
              <button className="nexus-quick-select" onClick={() => setIsFilterOpen(true)} type="button">Price</button>
              <select aria-label="Meetup location" className="nexus-quick-select max-w-32" value={filters.pickup_location} onChange={(event) => updateFilter("pickup_location", event.target.value)}><option value="">Location</option>{pickupAreas.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            </div> : null}
            {explore ? <div className="hidden lg:block"><MarketplaceFilterPanel {...filterPanelProps} layout="bar" /></div> : null}


            {!isLoading ? (
              <section className={`${hasFilters ? "flex" : "hidden md:flex"} flex-wrap items-center justify-between gap-3 text-xs`}>
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


            {!explore ? <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Latest listings</h2><Link className="flex items-center text-xs font-medium text-teal-800" href="/trade/explore">See all <ArrowRight aria-hidden="true" className="ml-1 h-3 w-3" /></Link></div> : null}
            <div className={`${explore ? "flex" : "hidden"} items-center justify-between gap-2`}><Link className="text-xs font-medium text-teal-800" href="/trade/want">Looking for something? Wanted board</Link><span className="hidden text-[10px] text-slate-500 sm:block">Updated {updatedLabel}</span></div>
            {explore && !isLoading && allListings.length > 0 ? (
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
                      ? "nexus-listing-grid grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4"
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
            <ListingExamples filters={{ ...filters, search: debouncedSearch }} viewMode={viewMode} />
          </div>
        </div>

        {isFilterOpen ? (
          <div className="fixed inset-0 z-[60]">
            <button
              aria-label="Close filters"
              className="absolute inset-0 bg-stone-950/50 backdrop-blur-sm"
              onClick={() => setIsFilterOpen(false)}
              type="button"
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-3xl lg:bottom-10 lg:left-1/2 lg:right-auto lg:w-[520px] lg:-translate-x-1/2 lg:rounded-3xl border border-stone-200 bg-[#fffdf8] p-5 shadow-2xl">
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
