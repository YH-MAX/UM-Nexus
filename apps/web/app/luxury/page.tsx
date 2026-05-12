import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  GraduationCap,
  Heart,
  Laptop,
  LockKeyhole,
  MapPin,
  Megaphone,
  PackageCheck,
  PlusCircle,
  Search,
  ShieldCheck,
  Store,
} from "lucide-react";

const featuredListings = [
  {
    name: "WIA2005 Algorithm Textbook",
    category: "Textbooks · Like new",
    price: "RM 45",
    pickup: "Main Library",
    image:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1100&q=85",
  },
  {
    name: "Logitech Keyboard + Mouse",
    category: "Electronics · Good",
    price: "RM 80",
    pickup: "FSKTM",
    image:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1100&q=85",
  },
  {
    name: "Mini Rice Cooker",
    category: "Dorm & Kitchen · Good",
    price: "RM 55",
    pickup: "KK12",
    image:
      "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=1100&q=85",
  },
];

const values = [
  {
    title: "UM-only access",
    body: "Keep browsing, saving, selling, and contact requests focused on University of Malaya students.",
    icon: GraduationCap,
  },
  {
    title: "Safer contact flow",
    body: "Contact details stay private until sellers accept, with clear safety prompts for campus meetups.",
    icon: ShieldCheck,
  },
  {
    title: "Campus pickup clarity",
    body: "Every listing highlights price, condition, pickup area, and seller context for faster decisions.",
    icon: MapPin,
  },
];

const categories = [
  { label: "Textbooks", icon: BookOpen },
  { label: "Electronics", icon: Laptop },
  { label: "Dorm & Room", icon: Store },
  { label: "Wanted", icon: Megaphone },
];

const moments = ["Search", "Save", "Request", "Meet on campus"];

export const metadata = {
  title: "UM Nexus Trade | Premium Campus Marketplace",
  description:
    "A polished UM-only marketplace landing page with liquid glass effects, student item showcases, safety storytelling, and verified campus access.",
};

export default function LuxuryLandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Hero />
      <MarketplaceShowcase />
      <CampusStory />
      <ValuesSection />
      <VerifiedAccessCTA />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative isolate min-h-[92svh] overflow-hidden">
      <div className="absolute inset-0 -z-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="University students walking through a campus walkway"
          className="h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=2200&q=90"
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_24%,rgba(16,185,129,0.30),transparent_30%),radial-gradient(circle_at_20%_82%,rgba(245,158,11,0.20),transparent_26%),linear-gradient(90deg,rgba(2,6,23,0.96)_0%,rgba(15,23,42,0.82)_48%,rgba(15,23,42,0.35)_100%)]" />

      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <Link
          className="group inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-2xl shadow-slate-950/25 backdrop-blur-xl transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"
          href="/luxury"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-slate-950">
            <Store aria-hidden="true" className="h-4 w-4" />
          </span>
          <span>
            UM Nexus Trade
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">
              UM-only marketplace
            </span>
          </span>
        </Link>
        <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/10 p-1 text-sm font-medium text-slate-200 backdrop-blur-xl md:flex">
          <a className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white" href="#market">
            Marketplace
          </a>
          <a className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white" href="#safety">
            Safety
          </a>
          <a className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white" href="#access">
            UM Access
          </a>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-200"
          href="/trade/sell"
        >
          Sell Item
          <PlusCircle aria-hidden="true" className="h-4 w-4" />
        </Link>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-24 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-200">
            University of Malaya Campus Marketplace
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[0.98] tracking-normal text-white sm:text-7xl lg:text-8xl">
            Trade campus essentials with confidence.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
            A polished, student-only marketplace for textbooks, electronics, dorm items, tickets, and wanted
            requests across UM.
          </p>

          <div className="mt-8 max-w-2xl rounded-full border border-white/20 bg-white/12 p-2 shadow-2xl shadow-slate-950/30 backdrop-blur-2xl">
            <Link
              className="flex min-h-14 items-center justify-between gap-3 rounded-full bg-white px-4 text-left text-slate-500 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"
              href="/trade"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-700" />
                <span className="truncate text-sm sm:text-base">Search calculators, books, fans, monitors...</span>
              </span>
              <span className="hidden rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white sm:inline-flex">
                Browse
              </span>
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Link
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur-xl transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                  href={category.label === "Wanted" ? "/trade/want" : "/trade"}
                  key={category.label}
                >
                  <Icon aria-hidden="true" className="h-4 w-4 text-emerald-200" />
                  {category.label}
                </Link>
              );
            })}
          </div>
        </div>

        <GlassPreview />
      </div>

      <div className="absolute bottom-4 left-1/2 w-[min(92vw,760px)] -translate-x-1/2 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-slate-100 shadow-2xl shadow-slate-950/30 backdrop-blur-2xl">
        <div className="grid grid-cols-2 gap-3 text-center text-xs font-semibold uppercase tracking-[0.14em] sm:grid-cols-4">
          {moments.map((moment) => (
            <span key={moment}>{moment}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function GlassPreview() {
  return (
    <aside className="rounded-lg border border-white/20 bg-white/12 p-4 text-slate-950 shadow-2xl shadow-slate-950/30 backdrop-blur-2xl">
      <div className="rounded-lg bg-white p-4">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Live campus feed</p>
            <h2 className="mt-1 text-lg font-semibold">Newest UM listings</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
            <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
            Verified
          </span>
        </div>
        <div className="mt-4 grid gap-3">
          {featuredListings.slice(0, 2).map((listing) => (
            <div className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3" key={listing.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="h-20 w-20 rounded-lg object-cover" src={listing.image} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-950">{listing.name}</p>
                <p className="mt-1 text-lg font-bold text-emerald-800">{listing.price}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-emerald-700" />
                  {listing.pickup}
                </p>
              </div>
              <Heart aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function MarketplaceShowcase() {
  return (
    <section className="relative overflow-hidden bg-slate-50 px-4 py-16 text-slate-950 sm:px-6 lg:px-8" id="market">
      <div className="absolute left-1/2 top-8 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Campus Finds</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-5xl">
              Marketplace cards that feel trustworthy at a glance.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-slate-600">
            Built around quick comparison: price, condition, pickup point, and seller confidence without clutter.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {featuredListings.map((product) => (
            <article
              className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-2xl hover:shadow-slate-200/80"
              key={product.name}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={product.name}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  src={product.image}
                />
                <div className="absolute inset-x-4 top-4 flex items-center justify-between">
                  <span className="rounded-full border border-white/40 bg-white/75 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-800 shadow-lg backdrop-blur-xl">
                    Available
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/75 text-emerald-700 backdrop-blur-xl">
                    <Heart aria-hidden="true" className="h-4 w-4" />
                  </span>
                </div>
              </div>
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{product.category}</p>
                <div className="mt-2 flex items-start justify-between gap-4">
                  <h3 className="text-xl font-semibold">{product.name}</h3>
                  <p className="shrink-0 text-lg font-bold text-emerald-800">{product.price}</p>
                </div>
                <p className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-600">
                  <MapPin aria-hidden="true" className="h-4 w-4 text-emerald-700" />
                  Pickup at {product.pickup}
                </p>
                <Link
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                  href="/trade"
                >
                  View Marketplace
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CampusStory() {
  return (
    <section className="relative overflow-hidden bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8" id="safety">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.22),transparent_28%),radial-gradient(circle_at_80%_78%,rgba(245,158,11,0.12),transparent_24%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.08] p-2 shadow-2xl shadow-slate-950/30 backdrop-blur-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Students studying together with laptops and notebooks"
            className="aspect-[4/5] w-full rounded-md object-cover"
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1300&q=85"
          />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-200">Designed for UM routines</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">
            Less marketplace noise. More campus context.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            UM Nexus Trade turns second-hand buying into a focused campus workflow: find what you need, request
            contact safely, meet in familiar public places, and keep everything inside the student community.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Metric value="UM" label="student-first access model" />
            <Metric value="3" label="tap path to request seller contact" />
            <Metric value="24h" label="fresh listing rhythm for campus needs" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ValuesSection() {
  return (
    <section className="bg-slate-50 px-4 py-16 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Marketplace Principles</p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-5xl">Premium does not mean fancy. It means clear.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {values.map((value) => (
            <ValueCard key={value.title} {...value} />
          ))}
        </div>
      </div>
    </section>
  );
}

function VerifiedAccessCTA() {
  return (
    <section className="relative isolate overflow-hidden bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8" id="access">
      <div className="absolute inset-0 -z-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="University campus building and outdoor study area"
          className="h-full w-full object-cover opacity-[0.42]"
          src="https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?auto=format&fit=crop&w=2200&q=90"
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-slate-950/75" />
      <div className="mx-auto max-w-5xl rounded-lg border border-white/20 bg-white/10 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-2xl sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-200">Verified UM Access</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl">
              Join the campus marketplace built for students, not strangers.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200">
              Browse live listings, save items, post wanted requests, and sell unused essentials to the UM community.
            </p>
          </div>
          <div className="rounded-lg border border-white/20 bg-slate-950/60 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400 text-slate-950">
                <LockKeyhole aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold">UM-only marketplace</p>
                <p className="text-xs text-slate-300">Sign in to save, sell, and request contact</p>
              </div>
            </div>
            <div className="mt-5 grid gap-2">
              <Link
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-200"
                href="/signup"
              >
                Get UM Access
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-200"
                href="/trade"
              >
                Browse First
                <Search aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ value, label }: Readonly<{ value: string; label: string }>) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.08] p-4 backdrop-blur-xl">
      <p className="text-3xl font-semibold text-emerald-200">{value}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.13em] text-slate-300">{label}</p>
    </div>
  );
}

function ValueCard({ title, body, icon: Icon }: Readonly<{ title: string; body: string; icon: LucideIcon }>) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-slate-200/80">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-emerald-300">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <h3 className="mt-5 text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
      <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
        <PackageCheck aria-hidden="true" className="h-4 w-4" />
        Campus ready
      </div>
    </article>
  );
}
