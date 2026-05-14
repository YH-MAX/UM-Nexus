"use client";

import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
  ClipboardCheck,
  Heart,
  Lightbulb,
  Scale,
  Search,
  Shield,
  Sparkles,
  Store,
  Tag,
  X,
} from "lucide-react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { ListingCard } from "@/components/trade/listing-card";
import { LoadingSkeleton } from "@/components/trade/loading-skeleton";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  conditionOptions,
  formatRelativeTime,
  getFavorites,
  getSellerDisplayName,
  removeFavorite,
  tradeCategories,
  tradeSafetyMessage,
  type Listing,
  type ListingFavorite,
} from "@/lib/trade/api";

const savedDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-saved-display",
});

type SavedListFilters = {
  search: string;
  category: string;
  condition: string;
  max_budget: string;
  sort: "saved_desc" | "price_asc" | "price_desc" | "listing_newest";
};

const initialFilters: SavedListFilters = {
  search: "",
  category: "",
  condition: "",
  max_budget: "",
  sort: "saved_desc",
};

const popularCategories = [
  { value: "electronics", label: "Electronics" },
  { value: "textbooks_notes", label: "Books" },
  { value: "dorm_room", label: "Dorm" },
  { value: "kitchen_appliances", label: "Kitchen" },
  { value: "furniture", label: "Furniture" },
] as const;

function SavedPageHero({
  displayClass,
  savedCount,
}: Readonly<{
  displayClass: string;
  savedCount: number;
}>) {
  return (
    <header className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C98A1D]">UM Nexus Trade</p>
        <h1
          className={`${displayClass} mt-2 text-4xl font-semibold leading-tight text-[#111111] sm:text-[2.75rem] sm:leading-[1.08]`}
        >
          Saved listings
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#6B6257] sm:text-[17px]">
          Compare items you are interested in by price, condition, pickup location, and seller response.
        </p>
      </div>
      <div className="grid w-full shrink-0 grid-cols-1 gap-3 sm:grid-cols-3 lg:max-w-[38rem] xl:max-w-[42rem]">
        <div className="flex min-h-[112px] items-center gap-3 rounded-2xl border border-[#E8DED0] bg-white p-4 shadow-[0_1px_3px_rgba(17,16,14,0.06)]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E7F7EF] text-[#07875D]">
            <Heart aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-2xl font-bold tabular-nums text-[#111111]">{savedCount}</p>
            <p className="text-xs font-semibold text-[#111111]">Saved items</p>
            <p className="mt-0.5 text-[11px] font-medium leading-snug text-[#6B6257]">
              {savedCount === 0 ? "You haven’t saved any items yet." : "Tap the heart on a listing to remove it from here."}
            </p>
          </div>
        </div>
        <div className="flex min-h-[112px] items-center gap-3 rounded-2xl border border-[#E8DED0] bg-white p-4 shadow-[0_1px_3px_rgba(17,16,14,0.06)]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFF8EA] text-[#C98A1D]">
            <Scale aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-sm font-bold text-[#111111]">Quick compare</p>
            <p className="mt-0.5 text-xs font-semibold leading-snug text-[#6B6257]">Easily compare items side by side.</p>
          </div>
        </div>
        <div className="flex min-h-[112px] items-center gap-3 rounded-2xl border border-[#E8DED0] bg-white p-4 shadow-[0_1px_3px_rgba(17,16,14,0.06)]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFF8EA] text-[#C98A1D]">
            <Bell aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-sm font-bold text-[#111111]">Price watch</p>
            <p className="mt-0.5 text-xs font-semibold leading-snug text-[#6B6257]">Get notified when prices go down.</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function SidebarCheckList({
  title,
  icon: Icon,
  items,
}: Readonly<{
  title: string;
  icon: typeof Lightbulb;
  items: readonly string[];
}>) {
  return (
    <section className="rounded-2xl border border-[#E8DED0] bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF8EA] text-[#C98A1D]">
          <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[#111111]">{title}</h2>
          <ul className="mt-3 space-y-2.5">
            {items.map((line) => (
              <li className="flex gap-2 text-sm text-[#6B6257]" key={line}>
                <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#D99A2B]" strokeWidth={2.5} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function SavedSidebar({
  onPickCategory,
}: Readonly<{
  onPickCategory: (value: string) => void;
}>) {
  return (
    <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24">
      <SidebarCheckList
        icon={Lightbulb}
        items={[
          "Compare price and condition",
          "Check pickup location",
          "Message sellers early",
          "Remove items you no longer need",
        ]}
        title="Tips for saved items"
      />
      <SidebarCheckList
        icon={ClipboardCheck}
        items={["Price", "Condition", "Pickup distance", "Seller response"]}
        title="Compare checklist"
      />
      <section className="rounded-2xl border border-[#D99A2B]/30 bg-gradient-to-br from-[#FFFBF2] to-[#FFF8EA] p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-[#C98A1D] shadow-sm ring-1 ring-[#E8DED0]">
            <Shield aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[#111111]">Trade safely on campus</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#6B6257]">{tradeSafetyMessage}</p>
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-[#E8DED0] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF8EA] text-[#C98A1D]">
            <Tag aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-[#111111]">Popular categories</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {popularCategories.map((cat) => (
                <button
                  className="rounded-full border border-[#E8DED0] bg-[#FFFBF2] px-3 py-1.5 text-xs font-semibold text-[#111111] transition hover:border-[#D99A2B]/45 hover:bg-amber-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                  key={cat.value}
                  onClick={() => onPickCategory(cat.value)}
                  type="button"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
}

function listingMatchesSearch(listing: Listing, q: string): boolean {
  if (!q.trim()) {
    return true;
  }
  const needle = q.trim().toLowerCase();
  const hay = [listing.title, listing.description, listing.item_name, listing.brand, listing.model]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

export default function SavedListingsPage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [favorites, setFavorites] = useState<ListingFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SavedListFilters>(initialFilters);

  async function loadFavorites() {
    setFavorites(await getFavorites());
  }

  useEffect(() => {
    if (isAuthLoading || !user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    void loadFavorites()
      .catch((nextError) => {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load saved listings.");
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
  }, [isAuthLoading, user]);

  async function toggleFavorite(listingId: string, nextSaved: boolean) {
    if (nextSaved) {
      return;
    }
    try {
      await removeFavorite(listingId);
      await loadFavorites();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update saved listing.");
    }
  }

  const availableFavorites = useMemo(
    () => favorites.filter((favorite) => favorite.listing !== null) as Array<ListingFavorite & { listing: Listing }>,
    [favorites],
  );

  const hasFilterValues =
    Boolean(filters.search.trim()) ||
    Boolean(filters.category) ||
    Boolean(filters.condition) ||
    Boolean(filters.max_budget.trim());

  const filteredFavorites = useMemo(() => {
    const max = filters.max_budget.trim() === "" ? null : Number(filters.max_budget);
    const maxOk = max !== null && Number.isFinite(max) && max >= 0;

    return availableFavorites.filter((favorite) => {
      const listing = favorite.listing;
      if (!listingMatchesSearch(listing, filters.search)) {
        return false;
      }
      if (filters.category && listing.category !== filters.category) {
        return false;
      }
      const cond = listing.condition ?? listing.condition_label ?? "";
      if (filters.condition && cond !== filters.condition) {
        return false;
      }
      if (maxOk && listing.price > max!) {
        return false;
      }
      return true;
    });
  }, [availableFavorites, filters]);

  const sortedFavorites = useMemo(() => {
    const copy = [...filteredFavorites];
    if (filters.sort === "price_asc") {
      copy.sort((a, b) => a.listing.price - b.listing.price);
    } else if (filters.sort === "price_desc") {
      copy.sort((a, b) => b.listing.price - a.listing.price);
    } else if (filters.sort === "listing_newest") {
      copy.sort((a, b) => (a.listing.created_at < b.listing.created_at ? 1 : -1));
    } else {
      copy.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    }
    return copy;
  }, [filteredFavorites, filters.sort]);

  function updateFilter<K extends keyof SavedListFilters>(key: K, value: SavedListFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className={user ? savedDisplay.variable : undefined}>
      <TradeShell
        description="Compare items you are interested in by price, condition, pickup location, and seller response."
        hideHero={Boolean(user)}
        title="Saved listings"
      >
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-900 shadow-sm" role="alert">
            {error}
          </div>
        ) : null}

        {!user ? (
          <RequireAuthCard description="Sign in with your UM account to save and review listings." returnTo="/trade/saved" />
        ) : null}

        {user ? (
          <div className="mx-auto w-full max-w-[90rem] space-y-7 pb-6">
            <SavedPageHero displayClass={savedDisplay.className} savedCount={isLoading ? 0 : availableFavorites.length} />

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start lg:gap-8 xl:gap-9">
              <div className="min-w-0 space-y-5">
                <section className="rounded-2xl border border-[#E8DED0] bg-white p-5 shadow-sm sm:p-6">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
                    <label className="grid min-w-0 gap-1.5 xl:col-span-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6B6257]">Search</span>
                      <div className="relative">
                        <Search
                          aria-hidden="true"
                          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                        />
                        <input
                          className="trade-input min-h-[46px] rounded-xl border-[#E8DED0] bg-white pl-11 text-[#111111] focus:border-[#D99A2B] focus:ring-amber-100"
                          placeholder="Search saved items"
                          value={filters.search}
                          onChange={(event) => updateFilter("search", event.target.value)}
                        />
                      </div>
                    </label>
                    <label className="grid min-w-0 gap-1.5 xl:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6B6257]">Category</span>
                      <select
                        className="trade-input min-h-[46px] cursor-pointer rounded-xl border-[#E8DED0] bg-white text-[#111111] focus:border-[#D99A2B] focus:ring-amber-100"
                        value={filters.category}
                        onChange={(event) => updateFilter("category", event.target.value)}
                      >
                        <option value="">All categories</option>
                        {tradeCategories.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid min-w-0 gap-1.5 xl:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6B6257]">Condition</span>
                      <select
                        className="trade-input min-h-[46px] cursor-pointer rounded-xl border-[#E8DED0] bg-white text-[#111111] focus:border-[#D99A2B] focus:ring-amber-100"
                        value={filters.condition}
                        onChange={(event) => updateFilter("condition", event.target.value)}
                      >
                        <option value="">All conditions</option>
                        {conditionOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid min-w-0 gap-1.5 xl:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6B6257]">Max budget</span>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-500">
                          RM
                        </span>
                        <input
                          className="trade-input min-h-[46px] rounded-xl border-[#E8DED0] bg-white pl-12 text-[#111111] focus:border-[#D99A2B] focus:ring-amber-100"
                          inputMode="decimal"
                          min={0}
                          placeholder="No limit"
                          type="number"
                          value={filters.max_budget}
                          onChange={(event) => updateFilter("max_budget", event.target.value)}
                        />
                      </div>
                    </div>
                    <label className="grid min-w-0 gap-1.5 xl:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6B6257]">Sort by</span>
                      <select
                        className="trade-input min-h-[46px] cursor-pointer rounded-xl border-[#E8DED0] bg-white text-[#111111] focus:border-[#D99A2B] focus:ring-amber-100"
                        value={filters.sort}
                        onChange={(event) => updateFilter("sort", event.target.value as SavedListFilters["sort"])}
                      >
                        <option value="saved_desc">Recently saved</option>
                        <option value="price_asc">Price: low to high</option>
                        <option value="price_desc">Price: high to low</option>
                        <option value="listing_newest">Newest listing</option>
                      </select>
                    </label>
                    {hasFilterValues ? (
                      <button
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E8DED0] bg-[#FAF7F0] px-4 text-sm font-semibold text-[#111111] transition hover:bg-amber-50 md:col-span-2 xl:col-span-12"
                        onClick={() => setFilters({ ...initialFilters })}
                        type="button"
                      >
                        <X aria-hidden="true" className="h-4 w-4" />
                        Clear filters
                      </button>
                    ) : null}
                  </div>
                </section>

                {isLoading ? (
                  <LoadingSkeleton />
                ) : availableFavorites.length === 0 ? (
                  <div className="relative overflow-hidden rounded-2xl border border-dashed border-[#D99A2B]/35 bg-gradient-to-b from-[#FFFBF2]/90 to-[#FAF7F0] px-6 py-16 text-center shadow-sm sm:py-20">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full border border-[#E8DED0]/80 opacity-40"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-6 bottom-4 h-20 w-20 rounded-3xl border border-[#E8DED0]/80 opacity-35"
                    />
                    <div className="relative mx-auto inline-flex">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#E7F7EF] text-[#07875D] shadow-inner ring-4 ring-white/80">
                        <Heart aria-hidden="true" className="h-9 w-9" strokeWidth={1.5} />
                      </div>
                      <Sparkles
                        aria-hidden="true"
                        className="absolute -right-1 -top-1 h-5 w-5 text-[#D99A2B]"
                        strokeWidth={2}
                      />
                    </div>
                    <h2 className="relative mt-6 text-xl font-bold text-[#111111]">No saved listings yet</h2>
                    <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#6B6257]">
                      Save items you like and compare them here before contacting sellers.
                    </p>
                    <p className="relative mt-3 text-sm font-medium text-[#6B6257]">
                      Tap the heart icon on any listing to save it here.
                    </p>
                    <Link
                      className="relative mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-8 text-sm font-semibold text-white shadow-md transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                      href="/trade"
                    >
                      <Store aria-hidden="true" className="h-4 w-4" />
                      Browse Listings
                    </Link>
                  </div>
                ) : sortedFavorites.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#E8DED0] bg-white px-6 py-12 text-center shadow-sm">
                    <p className="text-sm font-semibold text-[#111111]">No saved items match your filters.</p>
                    <p className="mt-2 text-sm text-[#6B6257]">Try clearing filters or broadening your search.</p>
                    <button
                      className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E8DED0] bg-[#FAF7F0] px-5 text-sm font-semibold text-[#111111] transition hover:bg-amber-50"
                      onClick={() => setFilters({ ...initialFilters })}
                      type="button"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {sortedFavorites.map((favorite) => (
                      <div className="relative min-w-0" key={favorite.id}>
                        <div className="[&_article]:border-[#E8DED0] [&_article]:bg-white [&_article]:shadow-[0_1px_3px_rgba(17,16,14,0.06)] [&_article]:transition [&_article]:hover:border-[#D99A2B]/30 [&_article]:hover:shadow-md">
                          <ListingCard isSaved listing={favorite.listing} onToggleFavorite={toggleFavorite} />
                        </div>
                        <p className="mt-2 px-1 text-center text-[11px] font-medium text-[#6B6257]">
                          Saved {formatRelativeTime(favorite.created_at)} · {getSellerDisplayName(favorite.listing)}
                        </p>
                        <div className="mt-2 flex flex-wrap justify-center gap-2">
                          <Link
                            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-stone-950 px-4 text-xs font-semibold text-[#F5E6C8] shadow-sm transition hover:bg-stone-900"
                            href={`/trade/${favorite.listing.id}`}
                          >
                            View listing
                          </Link>
                          <Link
                            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E8DED0] bg-white px-4 text-xs font-semibold text-[#111111] transition hover:bg-[#FAF7F0]"
                            href={`/trade/${favorite.listing.id}`}
                          >
                            Contact seller
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <SavedSidebar onPickCategory={(value) => updateFilter("category", value)} />
            </div>
          </div>
        ) : null}
      </TradeShell>
    </div>
  );
}
