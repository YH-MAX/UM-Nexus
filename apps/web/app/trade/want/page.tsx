"use client";

import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lightbulb,
  Megaphone,
  Search,
  Send,
  Shield,
  Sparkles,
  Tag,
  X,
} from "lucide-react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { StatusPill } from "@/components/trade/status-pill";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  createWantedPost,
  createWantedResponse,
  formatCategory,
  formatMoney,
  formatPickupLocation,
  formatRelativeTime,
  getCurrentUser,
  getTradeDashboard,
  isProfileComplete,
  listWantedPosts,
  pickupAreas,
  tradeCategories,
  tradeSafetyMessage,
  updateWantedPostStatus,
  type CurrentProfile,
  type Listing,
  type WantedPost,
  type WantedPostFilters,
  type WantedPostPayload,
} from "@/lib/trade/api";

const initialForm = {
  title: "",
  description: "",
  category: "electronics",
  desired_item_name: "",
  max_budget: "",
  preferred_pickup_area: "kk1",
  residential_college: "",
};

const initialFilters = {
  search: "",
  category: "",
  pickup_area: "",
  max_budget: "",
  status: "active",
  sort: "latest",
};

const contactMethods = [
  { value: "in_app", label: "In-app first" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
] as const;

const closeReasons = [
  { value: "found_on_um_nexus", label: "I found the item on UM Nexus" },
  { value: "found_elsewhere", label: "I found it elsewhere" },
  { value: "no_longer_needed", label: "I no longer need it" },
  { value: "other", label: "Other" },
] as const;

const wantDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-want-display",
});

const suggestionPresets = [
  {
    text: "Looking for a used monitor under RM200",
    search: "monitor",
    category: "electronics",
    max_budget: "200",
    pickup_area: "",
  },
  {
    text: "Need a Data Structures textbook",
    search: "Data Structures textbook",
    category: "textbooks_notes",
    max_budget: "",
    pickup_area: "",
  },
  {
    text: "Looking for a rice cooker near KK12",
    search: "rice cooker",
    category: "kitchen_appliances",
    max_budget: "",
    pickup_area: "kk12",
  },
] as const;

const popularCategories = [
  { value: "electronics", label: "Electronics" },
  { value: "textbooks_notes", label: "Books" },
  { value: "dorm_room", label: "Dorm" },
  { value: "kitchen_appliances", label: "Kitchen" },
  { value: "furniture", label: "Furniture" },
] as const;

function WantPageHero({
  displayClass,
  totalActive,
}: Readonly<{
  displayClass: string;
  totalActive: number;
}>) {
  return (
    <header className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C98A1D]">UM Nexus Trade</p>
        <h1 className={`${displayClass} mt-2 text-4xl font-semibold leading-tight text-[#111111] sm:text-[2.75rem]`}>
          Wanted board
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B6257] sm:text-base">
          Browse buyer demand, post what you need, or respond safely when you have the right item.
        </p>
      </div>
      <div className="grid w-full shrink-0 grid-cols-1 gap-3 sm:grid-cols-3 lg:max-w-[38rem] xl:max-w-[42rem]">
        <div className="flex items-center gap-3 rounded-2xl border border-[#E8DED0] bg-white p-4 shadow-[0_1px_3px_rgba(17,16,14,0.06)]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF8EA] text-[#C98A1D]">
            <Clock aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-2xl font-bold tabular-nums text-[#111111]">{totalActive}</p>
            <p className="text-xs font-semibold text-[#6B6257]">Active requests</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#E8DED0] bg-white p-4 shadow-[0_1px_3px_rgba(17,16,14,0.06)]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-950 text-[#D99A2B]">
            <BadgeCheck aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-bold text-[#111111]">UM Verified</p>
            <p className="text-xs font-semibold text-[#6B6257]">Students only</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#E8DED0] bg-white p-4 shadow-[0_1px_3px_rgba(17,16,14,0.06)]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF8EA] text-[#C98A1D]">
            <Shield aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-sm font-bold leading-snug text-[#111111]">Safe campus pickup</p>
            <p className="text-xs font-semibold text-[#6B6257]">Meet in public areas</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function WantIntroCard({
  onPost,
  onPickSuggestion,
}: Readonly<{
  onPost: () => void;
  onPickSuggestion: (preset: (typeof suggestionPresets)[number]) => void;
}>) {
  return (
    <section className="rounded-2xl border border-[#D99A2B]/35 bg-gradient-to-br from-[#FFFBF2] via-[#FFF8EA] to-amber-50/40 p-6 shadow-sm sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <div>
          <div className="flex items-center gap-2 text-[#C98A1D]">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">Looking for something?</p>
          </div>
          <h2 className="mt-3 text-xl font-bold leading-snug text-[#111111] sm:text-2xl">
            Post what you need, and UM students who have it can send you an offer.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#6B6257] sm:text-base">
            Wanted requests help sellers understand real campus demand before they create a listing.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-stone-950 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
              onClick={onPost}
              type="button"
            >
              <Megaphone aria-hidden="true" className="h-4 w-4" />
              Post a request
            </button>
            <Link
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#A85F00] underline-offset-4 hover:underline"
              href="/safety"
            >
              How it works
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="grid gap-2">
          {suggestionPresets.map((preset) => (
            <button
              className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[#E8DED0] bg-white px-4 py-3 text-left text-sm font-medium text-[#111111] shadow-sm transition hover:border-[#C98A1D]/45 hover:shadow-md"
              key={preset.text}
              onClick={() => onPickSuggestion(preset)}
              type="button"
            >
              <span className="min-w-0">{preset.text}</span>
              <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[#C98A1D] opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function WantSidebar({
  mode,
  onPickCategoryBrowse,
  onPickCategoryPost,
}: Readonly<{
  mode: "browse" | "post";
  onPickCategoryBrowse: (value: string) => void;
  onPickCategoryPost: (value: string) => void;
}>) {
  const tips = [
    "Mention your budget",
    "Add preferred pickup place",
    "Be specific about model/condition",
    "Reply through UM Nexus Trade",
  ];

  return (
    <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-24">
      <section className="rounded-2xl border border-[#E8DED0] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-[#C98A1D]">
          <Lightbulb aria-hidden="true" className="h-5 w-5" />
          <h3 className="text-base font-bold text-[#111111]">Tips for a good request</h3>
        </div>
        <ul className="mt-4 space-y-3">
          {tips.map((tip) => (
            <li className="flex items-start gap-2.5 text-sm text-[#6B6257]" key={tip}>
              <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {tip}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[#E8DED0] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-[#C98A1D]">
          <Tag aria-hidden="true" className="h-5 w-5" />
          <h3 className="text-base font-bold text-[#111111]">Popular categories</h3>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {popularCategories.map((cat) => (
            <button
              className="rounded-full border border-[#E8DED0] bg-[#FFFBF2] px-3.5 py-1.5 text-xs font-semibold text-[#111111] transition hover:border-[#C98A1D]/50 hover:bg-amber-50"
              key={cat.value}
              onClick={() => (mode === "browse" ? onPickCategoryBrowse(cat.value) : onPickCategoryPost(cat.value))}
              type="button"
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#D99A2B]/40 bg-gradient-to-br from-[#FFFBF2] to-[#FFF8EA] p-5 shadow-sm">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E8DED0] bg-white text-[#C98A1D]">
            <Shield aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-[#111111]">Trade safely on campus</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#6B6257]">{tradeSafetyMessage}</p>
          </div>
        </div>
      </section>

      {mode === "post" ? (
        <section className="rounded-2xl border border-[#E8DED0] bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-[#111111]">What sellers see</h3>
          <ul className="mt-3 space-y-2 text-sm text-[#6B6257]">
            <li className="rounded-lg border border-[#E8DED0] bg-[#FAF7F0] px-3 py-2">Your request appears on the signed-in Wanted board.</li>
            <li className="rounded-lg border border-[#E8DED0] bg-[#FAF7F0] px-3 py-2">Sellers can send you an offer or create a listing from your request.</li>
            <li className="rounded-lg border border-[#E8DED0] bg-[#FAF7F0] px-3 py-2">Seller contact details stay hidden until you accept an offer.</li>
          </ul>
        </section>
      ) : null}
    </aside>
  );
}

export default function WantPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<"browse" | "post">("browse");
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [posts, setPosts] = useState<WantedPost[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoadingBoard, setIsLoadingBoard] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingPost, setIsUpdatingPost] = useState<string | null>(null);
  const [responsePost, setResponsePost] = useState<WantedPost | null>(null);
  const [closePost, setClosePost] = useState<WantedPost | null>(null);
  const [sellerListings, setSellerListings] = useState<Listing[]>([]);
  const [responseForm, setResponseForm] = useState({
    message: "",
    seller_contact_method: "in_app",
    seller_contact_value: "",
    listing_id: "",
  });
  const [closeForm, setCloseForm] = useState({ closed_reason: "", closed_reason_note: "" });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const profileReady = isProfileComplete(profile);
  const myUserId = user?.id ?? null;
  const hasFilters = Object.values(filters).some((value, index) => value !== Object.values(initialFilters)[index]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let isMounted = true;
    void getCurrentUser()
      .then((current) => {
        if (isMounted) {
          setProfile(current.profile);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProfile(null);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSellerListings([]);
      return;
    }
    let isMounted = true;
    void getTradeDashboard()
      .then((dashboard) => {
        if (isMounted) {
          setSellerListings(dashboard.listings.filter((listing) => ["available", "reserved"].includes(listing.status)));
        }
      })
      .catch(() => {
        if (isMounted) {
          setSellerListings([]);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setPosts([]);
      setTotal(0);
      return;
    }
    let isMounted = true;
    setIsLoadingBoard(true);
    const nextFilters: WantedPostFilters = { ...filters, limit: 24, offset: 0 };
    void listWantedPosts(nextFilters)
      .then((page) => {
        if (isMounted) {
          setPosts(page.items);
          setTotal(page.total);
          setError(null);
        }
      })
      .catch((nextError) => {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load wanted board.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingBoard(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [filters, user]);

  const ownActiveCount = useMemo(
    () => posts.filter((post) => post.buyer_id === myUserId && post.status === "active").length,
    [myUserId, posts],
  );

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateFilter(field: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profileReady) {
      setError("Complete your trade profile before posting a wanted request.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const payload: WantedPostPayload = {
        title: form.title,
        description: form.description || undefined,
        category: form.category,
        desired_item_name: form.desired_item_name || undefined,
        max_budget: form.max_budget ? Number(form.max_budget) : undefined,
        currency: "MYR",
        preferred_pickup_area: form.preferred_pickup_area || undefined,
        residential_college: form.residential_college || undefined,
      };
      const wantedPost = await createWantedPost(payload);
      router.push(`/wanted-posts/${wantedPost.id}?posted=1`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create wanted post.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function changeWantedStatus(
    post: WantedPost,
    status: "active" | "closed",
    closeDetails: { closed_reason?: string; closed_reason_note?: string } = {},
  ) {
    setIsUpdatingPost(post.id);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateWantedPostStatus(post.id, status, closeDetails);
      setPosts((current) => current.map((item) => (item.id === post.id ? updated : item)));
      setClosePost(null);
      setCloseForm({ closed_reason: "", closed_reason_note: "" });
      setNotice(status === "closed" ? "Wanted post closed." : "Wanted post reopened.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update wanted post.");
    } finally {
      setIsUpdatingPost(null);
    }
  }

  async function submitCloseReason(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!closePost) return;
    await changeWantedStatus(closePost, "closed", {
      closed_reason: closeForm.closed_reason || undefined,
      closed_reason_note: closeForm.closed_reason_note || undefined,
    });
  }

  async function sendWantedResponse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!responsePost) return;
    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await createWantedResponse(responsePost.id, {
        message: responseForm.message || undefined,
        seller_contact_method: responseForm.seller_contact_method,
        seller_contact_value: responseForm.seller_contact_value || undefined,
        listing_id: responseForm.listing_id || undefined,
      });
      setResponsePost(null);
      setResponseForm({ message: "", seller_contact_method: "in_app", seller_contact_value: "", listing_id: "" });
      setNotice("Direct offer sent. The buyer can accept before your contact details are revealed.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to send wanted response.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function applySuggestion(preset: (typeof suggestionPresets)[number]) {
    setFilters((current) => ({
      ...current,
      search: preset.search,
      category: preset.category,
      max_budget: preset.max_budget,
      pickup_area: preset.pickup_area,
    }));
    setMode("browse");
  }

  return (
    <div className={user ? wantDisplay.variable : undefined}>
      <TradeShell
        description="Browse buyer demand, post what you need, or respond safely when you have the right item."
        hideHero={Boolean(user)}
        title="Wanted board"
      >
        {!user ? (
          <RequireAuthCard description="Sign in with your UM account to browse and post wanted requests." intent="post_wanted" returnTo="/trade/want" />
        ) : null}

        {user ? (
          <div className="mx-auto w-full max-w-[90rem] space-y-7 pb-6">
            <WantPageHero displayClass={wantDisplay.className} totalActive={total} />

            {notice ? (
              <div className="flex gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-4 text-emerald-950 shadow-sm">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-sm font-medium">{notice}</p>
              </div>
            ) : null}
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-900 shadow-sm" role="alert">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-4 rounded-2xl border border-[#E8DED0] bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
                    mode === "browse"
                      ? "bg-stone-950 text-white shadow-md"
                      : "border border-transparent bg-transparent text-[#111111] hover:bg-[#FAF7F0]"
                  }`}
                  onClick={() => setMode("browse")}
                  type="button"
                >
                  Browse Wanted
                </button>
                <button
                  className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
                    mode === "post"
                      ? "bg-stone-950 text-white shadow-md"
                      : "border border-transparent bg-transparent text-[#111111] hover:bg-[#FAF7F0]"
                  }`}
                  onClick={() => setMode("post")}
                  type="button"
                >
                  Post Wanted Request
                </button>
              </div>
              <p className="px-1 text-sm text-[#6B6257] sm:text-right">
                {total} active request{total === 1 ? "" : "s"} · {ownActiveCount} yours
              </p>
            </div>

            {mode === "browse" ? (
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-start lg:gap-9">
                <div className="min-w-0 space-y-6">
                  <WantIntroCard onPickSuggestion={applySuggestion} onPost={() => setMode("post")} />

                  <section className="rounded-2xl border border-[#E8DED0] bg-white p-5 shadow-sm sm:p-6">
                    <div className="grid gap-4 xl:grid-cols-6">
                      <label className="grid min-w-0 gap-1.5 xl:col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6B6257]">Search</span>
                        <div className="relative">
                          <Search
                            aria-hidden="true"
                            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                          />
                          <input
                            className="trade-input min-h-[46px] w-full rounded-xl border-[#E8DED0] bg-white pl-11"
                            placeholder="Search monitors, books, rice cookers..."
                            value={filters.search}
                            onChange={(event) => updateFilter("search", event.target.value)}
                          />
                        </div>
                      </label>
                      <SelectField
                        label="Category"
                        options={[{ value: "", label: "All categories" }, ...tradeCategories]}
                        value={filters.category}
                        onChange={(value) => updateFilter("category", value)}
                      />
                      <SelectField
                        label="Pickup"
                        options={[{ value: "", label: "Any pickup" }, ...pickupAreas]}
                        value={filters.pickup_area}
                        onChange={(value) => updateFilter("pickup_area", value)}
                      />
                      <div className="grid min-w-0 gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6B6257]">Max budget</span>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-500">
                            RM
                          </span>
                          <input
                            className="trade-input min-h-[46px] w-full rounded-xl border-[#E8DED0] bg-white pl-12"
                            inputMode="decimal"
                            min={0}
                            placeholder="Any"
                            type="number"
                            value={filters.max_budget}
                            onChange={(event) => updateFilter("max_budget", event.target.value)}
                          />
                        </div>
                      </div>
                      <SelectField
                        label="Sort"
                        options={[
                          { value: "latest", label: "Newest" },
                          { value: "budget_high", label: "Highest budget" },
                          { value: "budget_low", label: "Lowest budget" },
                        ]}
                        value={filters.sort}
                        onChange={(value) => updateFilter("sort", value)}
                      />
                      {hasFilters ? (
                        <button
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E8DED0] bg-[#FAF7F0] px-4 text-sm font-semibold text-[#111111] transition hover:bg-amber-50 xl:col-span-6"
                          onClick={() => setFilters(initialFilters)}
                          type="button"
                        >
                          <X aria-hidden="true" className="h-4 w-4" />
                          Clear filters
                        </button>
                      ) : null}
                    </div>
                  </section>

                  {isLoadingBoard ? (
                    <div className="rounded-2xl border border-[#E8DED0] bg-white p-6 shadow-sm" aria-busy="true" role="status">
                      <div className="flex items-center gap-3 text-sm font-semibold text-[#6B6257]">
                        <span className="trade-loading-block h-10 w-10 shrink-0 rounded-full" />
                        Loading wanted board…
                      </div>
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#E8DED0] bg-[#FFFBF2]/60 px-6 py-14 text-center shadow-sm">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E8DED0] bg-white text-[#C98A1D] shadow-sm">
                        <Search aria-hidden="true" className="h-7 w-7" />
                      </div>
                      <h2 className="mt-5 text-lg font-bold text-[#111111]">No wanted requests found</h2>
                      <p className="mx-auto mt-2 max-w-md text-sm text-[#6B6257]">
                        Try clearing filters or post the first request for this category.
                      </p>
                      <button
                        className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-6 text-sm font-semibold text-white shadow-md transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                        onClick={() => setMode("post")}
                        type="button"
                      >
                        <Megaphone aria-hidden="true" className="h-4 w-4" />
                        Post Wanted Request
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {posts.map((post) => (
                        <WantedCard
                          isMine={post.buyer_id === myUserId}
                          isUpdating={isUpdatingPost === post.id}
                          key={post.id}
                          post={post}
                          onRespond={() => setResponsePost(post)}
                          onRequestClose={setClosePost}
                          onStatusChange={changeWantedStatus}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <WantSidebar
                  mode="browse"
                  onPickCategoryBrowse={(value) => updateFilter("category", value)}
                  onPickCategoryPost={(value) => updateField("category", value)}
                />
              </div>
            ) : (
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-start lg:gap-9">
                <div className="min-w-0 space-y-5">
                  {!profileReady ? (
                    <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-[#FFFBF2] p-4 text-sm font-semibold text-amber-950 shadow-sm">
                      Complete your profile before posting wanted requests. You can keep browsing and responding to demand now.
                    </div>
                  ) : null}
                  <form className="rounded-2xl border border-[#E8DED0] bg-white p-6 shadow-sm sm:p-7" onSubmit={handleSubmit}>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C98A1D]">Wanted request</p>
                      <h2 className="mt-2 text-xl font-bold text-[#111111]">Tell sellers what you need</h2>
                      <p className="mt-2 text-sm leading-relaxed text-[#6B6257]">
                        Keep it concrete: item, budget, pickup area, urgency, and acceptable alternatives.
                      </p>
                    </div>
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <TextField label="Title" required value={form.title} onChange={(value) => updateField("title", value)} />
                      <TextField label="Desired item or model" value={form.desired_item_name} onChange={(value) => updateField("desired_item_name", value)} />
                      <SelectField label="Category" options={tradeCategories} value={form.category} onChange={(value) => updateField("category", value)} />
                      <TextField label="Maximum budget (MYR)" type="number" value={form.max_budget} onChange={(value) => updateField("max_budget", value)} />
                      <SelectField label="Preferred pickup area" options={pickupAreas} value={form.preferred_pickup_area} onChange={(value) => updateField("preferred_pickup_area", value)} />
                      <TextField label="Residential college / KK" value={form.residential_college} onChange={(value) => updateField("residential_college", value)} />
                    </div>
                    <label className="mt-5 grid gap-2">
                      <span className="text-sm font-semibold text-[#111111]">Need details, urgency, and acceptable alternatives</span>
                      <textarea
                        className="trade-input min-h-32 resize-y rounded-xl border-[#E8DED0] bg-white"
                        value={form.description}
                        onChange={(event) => updateField("description", event.target.value)}
                      />
                    </label>
                    <button
                      className="trade-button-primary mt-6 min-h-12 rounded-xl px-6 shadow-md"
                      disabled={isSubmitting || !profileReady}
                      type="submit"
                    >
                      <Megaphone aria-hidden="true" className="h-4 w-4" />
                      {isSubmitting ? "Posting..." : "Post Wanted Request"}
                    </button>
                  </form>
                </div>

                <WantSidebar
                  mode="post"
                  onPickCategoryBrowse={(value) => updateFilter("category", value)}
                  onPickCategoryPost={(value) => updateField("category", value)}
                />
              </div>
            )}

            {responsePost ? (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <button aria-label="Close response form" className="absolute inset-0 bg-slate-950/40" onClick={() => setResponsePost(null)} type="button" />
              <form className="trade-modal-panel max-w-lg" onSubmit={sendWantedResponse}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Send Offer</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">{responsePost.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Your message and selected contact method will be shown to the buyer. Your contact details are only revealed if the buyer accepts your offer.
                    </p>
                  </div>
                  <button aria-label="Close" className="rounded-full p-2 text-slate-500 hover:bg-slate-100" onClick={() => setResponsePost(null)} type="button">
                    <X aria-hidden="true" className="h-5 w-5" />
                  </button>
                </div>
                <label className="mt-4 grid gap-2">
                  <span className="text-sm font-semibold text-slate-800">Offer message</span>
                  <textarea className="trade-input min-h-28" placeholder="Tell the buyer what you have, condition, price, and pickup availability." value={responseForm.message} onChange={(event) => setResponseForm((current) => ({ ...current, message: event.target.value }))} />
                </label>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <SelectField label="Contact method" value={responseForm.seller_contact_method} options={contactMethods} onChange={(value) => setResponseForm((current) => ({ ...current, seller_contact_method: value }))} />
                  {responseForm.seller_contact_method === "in_app" ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      You can start in-app first. No contact value is needed.
                    </div>
                  ) : (
                    <TextField
                      label={responseForm.seller_contact_method === "email" ? "Contact value (optional)" : "Contact value"}
                      value={responseForm.seller_contact_value}
                      onChange={(value) => setResponseForm((current) => ({ ...current, seller_contact_value: value }))}
                    />
                  )}
                </div>
                {sellerListings.length > 0 ? (
                  <div className="mt-4">
                    <SelectField
                      label="Attach one of your listings"
                      value={responseForm.listing_id}
                      options={[
                        { value: "", label: "No attached listing" },
                        ...sellerListings.map((listing) => ({
                          value: listing.id,
                          label: `${listing.title} · ${formatMoney(listing.price, listing.currency)}`,
                        })),
                      ]}
                      onChange={(value) => setResponseForm((current) => ({ ...current, listing_id: value }))}
                    />
                  </div>
                ) : null}
                {sellerListings.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    You can also create a listing from this wanted request.
                    <Link className="ml-1 font-semibold text-emerald-800 underline underline-offset-2" href={`/trade/sell?wanted_id=${responsePost.id}`}>
                      Start a listing
                    </Link>
                  </div>
                ) : null}
                <button className="trade-button-primary mt-5 w-full" disabled={isSubmitting} type="submit">
                  <Send aria-hidden="true" className="h-4 w-4" />
                  {isSubmitting ? "Sending..." : "Send Offer"}
                </button>
              </form>
            </div>
          ) : null}

          {closePost ? (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <button aria-label="Close close-request form" className="absolute inset-0 bg-slate-950/40" onClick={() => setClosePost(null)} type="button" />
              <form className="trade-modal-panel max-w-lg" onSubmit={submitCloseReason}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Close Request</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">{closePost.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Why are you closing this request? This is optional, but helps UM Nexus understand whether Wanted is working.</p>
                  </div>
                  <button aria-label="Close" className="rounded-full p-2 text-slate-500 hover:bg-slate-100" onClick={() => setClosePost(null)} type="button">
                    <X aria-hidden="true" className="h-5 w-5" />
                  </button>
                </div>
                <SelectField
                  label="Close reason"
                  value={closeForm.closed_reason}
                  options={[{ value: "", label: "Prefer not to say" }, ...closeReasons]}
                  onChange={(value) => setCloseForm((current) => ({ ...current, closed_reason: value }))}
                />
                <label className="mt-4 grid gap-2">
                  <span className="text-sm font-semibold text-slate-800">Note</span>
                  <textarea className="trade-input min-h-24" value={closeForm.closed_reason_note} onChange={(event) => setCloseForm((current) => ({ ...current, closed_reason_note: event.target.value }))} />
                </label>
                <button className="trade-button-primary mt-5 w-full" disabled={isUpdatingPost === closePost.id} type="submit">
                  {isUpdatingPost === closePost.id ? "Closing..." : "Close Request"}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
    </TradeShell>
    </div>
  );
}

function WantedCard({
  isMine,
  isUpdating,
  post,
  onRespond,
  onRequestClose,
  onStatusChange,
}: Readonly<{
  isMine: boolean;
  isUpdating: boolean;
  post: WantedPost;
  onRespond: () => void;
  onRequestClose: (post: WantedPost) => void;
  onStatusChange: (post: WantedPost, status: "active" | "closed") => Promise<void>;
}>) {
  const isActive = post.status === "active";
  const isStale = isMine && isActive && isWantedStale(post.created_at);
  const responseCount = post.response_count ?? 0;

  return (
    <article className="group grid gap-4 rounded-2xl border border-[#E8DED0] bg-white p-5 shadow-sm transition hover:border-[#D99A2B]/35 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#E8DED0] bg-[#FFFBF2] px-2.5 py-0.5 text-xs font-semibold text-[#6B6257]">
              {formatCategory(post.category)}
            </span>
            <StatusPill className="border-0" tone={isActive ? "good" : "warn"}>
              {wantedStatusLabel(post.status)}
            </StatusPill>
            {isMine ? (
              <span className="rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                Yours
              </span>
            ) : null}
          </div>
          <Link
            className="mt-3 block text-lg font-bold leading-snug text-[#111111] transition group-hover:text-[#A85F00]"
            href={`/wanted-posts/${post.id}`}
          >
            {post.title}
          </Link>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#6B6257]">{post.description ?? "No description provided."}</p>
          <p className="mt-2 text-xs font-medium text-stone-500">Posted by UM student · {formatRelativeTime(post.created_at)}</p>
        </div>
        <div className="shrink-0 rounded-xl border border-[#E8DED0] bg-[#FFF8EA] px-3 py-2 text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#C98A1D]">Budget</p>
          <p className="text-lg font-bold text-[#111111]">{formatMoney(post.max_budget, post.currency)}</p>
        </div>
      </div>
      <div className="grid gap-2 text-sm text-[#6B6257] sm:grid-cols-2">
        <span>
          Item: <strong className="font-semibold text-[#111111]">{post.desired_item_name ?? "Flexible"}</strong>
        </span>
        <span>
          Pickup: <strong className="font-semibold text-[#111111]">{formatPickupLocation(post.preferred_pickup_area)}</strong>
        </span>
        <span>
          College: <strong className="font-semibold text-[#111111]">{post.residential_college ?? "TBD"}</strong>
        </span>
        <span>
          Offers: <strong className="font-semibold text-[#111111]">{responseCount}</strong>
        </span>
      </div>
      <p
        className={`rounded-xl border px-3 py-2 text-sm ${
          isActive ? "border-emerald-200/80 bg-emerald-50/80 text-emerald-900" : "border-[#E8DED0] bg-[#FAF7F0] text-[#6B6257]"
        }`}
      >
        {isActive ? "Open · sellers can send offers" : "Closed · no new offers"}
      </p>
      {isStale ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-3 text-sm text-amber-950">
          <p className="font-semibold">This request has been active for 14+ days.</p>
          <p className="mt-1">Close this request when you no longer need the item.</p>
          <button
            className="mt-3 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
            disabled={isUpdating}
            onClick={() => onRequestClose(post)}
            type="button"
          >
            Close Request
          </button>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-stone-950 px-4 text-sm font-semibold text-[#F5E6C8] shadow-sm transition hover:bg-stone-900"
          href={`/trade/sell?wanted_id=${post.id}`}
        >
          I have this item
        </Link>
        {!isMine ? (
          <button
            className="trade-button-secondary min-h-11 rounded-xl border-[#E8DED0] bg-white"
            onClick={onRespond}
            type="button"
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            Send Offer
          </button>
        ) : (
          <button
            className="trade-button-secondary min-h-11 rounded-xl border-[#E8DED0] bg-white"
            disabled={isUpdating}
            onClick={() => (post.status === "active" ? onRequestClose(post) : void onStatusChange(post, "active"))}
            type="button"
          >
            {post.status === "active" ? "Close Request" : "Reopen Request"}
          </button>
        )}
      </div>
    </article>
  );
}

function wantedStatusLabel(status: string): string {
  if (status === "active") {
    return "Active";
  }
  if (status === "closed") {
    return "Closed";
  }
  return status;
}

function isWantedStale(createdAt: string): boolean {
  const age = Date.now() - new Date(createdAt).getTime();
  return age >= 14 * 24 * 60 * 60 * 1000;
}

function TextField({
  label,
  value,
  onChange,
  required = false,
  type = "text",
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}>) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <input
        className="trade-input"
        min={type === "number" ? "1" : undefined}
        required={required}
        step={type === "number" ? "0.01" : undefined}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}>) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <select className="trade-input" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

