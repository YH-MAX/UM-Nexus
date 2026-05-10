"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Megaphone, Search, Send, X } from "lucide-react";

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
  getCurrentUser,
  getTradeDashboard,
  isProfileComplete,
  listWantedPosts,
  pickupAreas,
  tradeCategories,
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
  const [sellerListings, setSellerListings] = useState<Listing[]>([]);
  const [responseForm, setResponseForm] = useState({
    message: "",
    seller_contact_method: "in_app",
    seller_contact_value: "",
    listing_id: "",
  });
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

  async function changeWantedStatus(post: WantedPost, status: "active" | "closed") {
    setIsUpdatingPost(post.id);
    setError(null);
    setNotice(null);
    try {
      await updateWantedPostStatus(post.id, status);
      setPosts((current) => current.map((item) => (item.id === post.id ? { ...item, status } : item)));
      setNotice(status === "closed" ? "Wanted post closed." : "Wanted post reopened.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update wanted post.");
    } finally {
      setIsUpdatingPost(null);
    }
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

  return (
    <TradeShell
      title="Wanted board"
      description="Browse buyer demand, post what you need, or respond safely when you have the right item."
    >
      {!user ? (
        <RequireAuthCard description="Sign in with your UM account to browse and post wanted requests." intent="post_wanted" returnTo="/trade/want" />
      ) : null}

      {user ? (
        <div className="grid gap-5">
          <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${mode === "browse" ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                onClick={() => setMode("browse")}
                type="button"
              >
                Browse Wanted
              </button>
              <button
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${mode === "post" ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                onClick={() => setMode("post")}
                type="button"
              >
                Post Wanted
              </button>
            </div>
            <p className="px-3 text-sm text-slate-500">
              {total} active request{total === 1 ? "" : "s"} · {ownActiveCount} yours
            </p>
          </section>

          {notice ? (
            <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{notice}</p>
            </div>
          ) : null}
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          {mode === "browse" ? (
            <section className="grid gap-5">
              <div className="trade-card grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-6">
                <label className="relative block min-w-0 md:col-span-2 xl:col-span-2">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="trade-input pl-10"
                    placeholder="Search monitors, books, rice cookers..."
                    value={filters.search}
                    onChange={(event) => updateFilter("search", event.target.value)}
                  />
                </label>
                <SelectField label="Category" value={filters.category} options={[{ value: "", label: "All categories" }, ...tradeCategories]} onChange={(value) => updateFilter("category", value)} />
                <SelectField label="Pickup" value={filters.pickup_area} options={[{ value: "", label: "Any pickup" }, ...pickupAreas]} onChange={(value) => updateFilter("pickup_area", value)} />
                <TextField label="Max budget" type="number" value={filters.max_budget} onChange={(value) => updateFilter("max_budget", value)} />
                <SelectField
                  label="Sort"
                  value={filters.sort}
                  options={[
                    { value: "latest", label: "Newest" },
                    { value: "budget_high", label: "Highest budget" },
                    { value: "budget_low", label: "Lowest budget" },
                  ]}
                  onChange={(value) => updateFilter("sort", value)}
                />
                {hasFilters ? (
                  <button className="trade-button-secondary md:col-span-2 xl:col-span-6" onClick={() => setFilters(initialFilters)} type="button">
                    <X aria-hidden="true" className="h-4 w-4" />
                    Clear wanted filters
                  </button>
                ) : null}
              </div>

              {isLoadingBoard ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Loading wanted board...</div>
              ) : posts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <h2 className="text-lg font-semibold text-slate-950">No wanted requests found</h2>
                  <p className="mt-2 text-sm text-slate-600">Try clearing filters or post the first request for this category.</p>
                  <button className="trade-button-primary mt-5" onClick={() => setMode("post")} type="button">
                    <Megaphone aria-hidden="true" className="h-4 w-4" />
                    Post wanted request
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {posts.map((post) => (
                    <WantedCard
                      isMine={post.buyer_id === myUserId}
                      isUpdating={isUpdatingPost === post.id}
                      key={post.id}
                      post={post}
                      onRespond={() => setResponsePost(post)}
                      onStatusChange={changeWantedStatus}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              {!profileReady ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950 lg:col-span-2">
                  Complete your profile before posting wanted requests. You can keep browsing and responding to demand now.
                </div>
              ) : null}
              <form className="trade-card grid gap-5 p-5" onSubmit={handleSubmit}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Wanted request</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">Tell sellers what you need</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Title" required value={form.title} onChange={(value) => updateField("title", value)} />
                  <TextField label="Desired item or model" value={form.desired_item_name} onChange={(value) => updateField("desired_item_name", value)} />
                  <SelectField label="Category" value={form.category} options={tradeCategories} onChange={(value) => updateField("category", value)} />
                  <TextField label="Maximum budget (MYR)" type="number" value={form.max_budget} onChange={(value) => updateField("max_budget", value)} />
                  <SelectField label="Preferred pickup area" value={form.preferred_pickup_area} options={pickupAreas} onChange={(value) => updateField("preferred_pickup_area", value)} />
                  <TextField label="Residential college / KK" value={form.residential_college} onChange={(value) => updateField("residential_college", value)} />
                </div>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-800">Need details, urgency, and acceptable alternatives</span>
                  <textarea className="trade-input min-h-32" value={form.description} onChange={(event) => updateField("description", event.target.value)} />
                </label>
                <button className="trade-button-primary w-full md:w-fit" disabled={isSubmitting || !profileReady} type="submit">
                  <Megaphone aria-hidden="true" className="h-4 w-4" />
                  {isSubmitting ? "Creating..." : "Create wanted post"}
                </button>
              </form>

              <aside className="trade-card h-fit p-5">
                <h2 className="text-lg font-semibold text-slate-950">What sellers see</h2>
                <div className="mt-4 grid gap-3 text-sm text-slate-700">
                  {["Your request appears on the signed-in Wanted board.", "Sellers can create a listing from your request.", "Direct offers hide seller contact until you accept."].map((example) => (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 p-3" key={example}>{example}</p>
                  ))}
                </div>
              </aside>
            </section>
          )}

          {responsePost ? (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <button aria-label="Close response form" className="absolute inset-0 bg-slate-950/40" onClick={() => setResponsePost(null)} type="button" />
              <form className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onSubmit={sendWantedResponse}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Direct offer</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">{responsePost.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Your contact stays hidden until the buyer accepts this response.</p>
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
                  <TextField label="Contact value" value={responseForm.seller_contact_value} onChange={(value) => setResponseForm((current) => ({ ...current, seller_contact_value: value }))} />
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
                <button className="trade-button-primary mt-5 w-full" disabled={isSubmitting} type="submit">
                  <Send aria-hidden="true" className="h-4 w-4" />
                  {isSubmitting ? "Sending..." : "Send offer"}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
    </TradeShell>
  );
}

function WantedCard({
  isMine,
  isUpdating,
  post,
  onRespond,
  onStatusChange,
}: Readonly<{
  isMine: boolean;
  isUpdating: boolean;
  post: WantedPost;
  onRespond: () => void;
  onStatusChange: (post: WantedPost, status: "active" | "closed") => Promise<void>;
}>) {
  return (
    <article className="trade-card grid gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusPill>{formatCategory(post.category)}</StatusPill>
            <StatusPill tone={post.status === "active" ? "good" : "warn"}>{post.status}</StatusPill>
            {isMine ? <StatusPill>yours</StatusPill> : null}
          </div>
          <Link className="mt-3 block text-lg font-semibold text-slate-950 transition hover:text-emerald-800" href={`/wanted-posts/${post.id}`}>
            {post.title}
          </Link>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{post.description ?? "No description provided."}</p>
        </div>
        <div className="shrink-0 rounded-2xl bg-emerald-50 px-3 py-2 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700">Budget</p>
          <p className="text-base font-bold text-emerald-900">{formatMoney(post.max_budget, post.currency)}</p>
        </div>
      </div>
      <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
        <span>Item: {post.desired_item_name ?? "Flexible"}</span>
        <span>Pickup: {formatPickupLocation(post.preferred_pickup_area)}</span>
        <span>College: {post.residential_college ?? "TBD"}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link className="trade-button-primary" href={`/trade/sell?wanted_id=${post.id}`}>
          I have this item
        </Link>
        {!isMine ? (
          <button className="trade-button-secondary" onClick={onRespond} type="button">
            <Send aria-hidden="true" className="h-4 w-4" />
            Send direct offer
          </button>
        ) : (
          <button className="trade-button-secondary" disabled={isUpdating} onClick={() => void onStatusChange(post, post.status === "active" ? "closed" : "active")} type="button">
            {post.status === "active" ? "Close request" : "Reopen request"}
          </button>
        )}
      </div>
    </article>
  );
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
