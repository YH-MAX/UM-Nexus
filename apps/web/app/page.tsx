import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Heart,
  MapPin,
  Megaphone,
  Search,
  ShieldCheck,
  Store,
} from "lucide-react";

const productPillars = [
  {
    title: "Verified UM community",
    body: "Campus-only access keeps browsing, saving, and contact requests focused on University of Malaya students.",
    icon: ShieldCheck,
  },
  {
    title: "Built for quick decisions",
    body: "Clear prices, conditions, pickup areas, and seller details make listings easy to compare on mobile.",
    icon: Search,
  },
  {
    title: "Safer contact flow",
    body: "Contact details stay private until a seller accepts, with safety prompts before meetups.",
    icon: BadgeCheck,
  },
];

const categories = ["Textbooks", "Electronics", "Dorm & Room", "Kitchen", "Furniture", "Free Items"];

const sampleListings = [
  ["Casio Scientific Calculator", "RM 30", "Electronics · Good", "FSKTM"],
  ["WIA2005 Textbook", "RM 45", "Textbooks · Like new", "Main Library"],
  ["Mini Rice Cooker", "RM 55", "Kitchen · Good", "KK12"],
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Students walking across a university campus"
            className="h-full w-full object-cover opacity-34"
            src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1800&q=80"
          />
          <div className="absolute inset-0 bg-slate-950/62" />
        </div>
        <div className="relative mx-auto grid min-h-[86vh] max-w-7xl content-between gap-10 px-4 py-5 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-md">
            <Link className="flex items-center gap-2 rounded-lg pr-2 text-base font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300" href="/">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-950">
                <Store aria-hidden="true" className="h-4 w-4" />
              </span>
              UM Nexus Trade
            </Link>
            <div className="flex flex-wrap gap-1 text-sm font-semibold">
              <NavLink href="/trade">Browse</NavLink>
              <NavLink href="/trade/sell">Sell</NavLink>
              <NavLink href="/trade/want">Wanted</NavLink>
              <NavLink href="/safety">Safety</NavLink>
              <NavLink href="/login">Sign in</NavLink>
            </div>
          </nav>

          <div className="grid items-end gap-8 pb-8 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                University of Malaya Campus Marketplace
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
                Buy smarter. Sell safer. Trade within UM.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
                A polished UM-only marketplace for textbooks, electronics, dorm items, and campus essentials.
              </p>

              <div className="mt-6 max-w-2xl rounded-lg border border-white/15 bg-white p-2 shadow-2xl shadow-slate-950/25">
                <Link
                  className="flex min-h-12 items-center justify-between gap-3 rounded-lg px-3 text-left text-slate-500 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                  href="/trade"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-700" />
                    <span className="truncate text-sm sm:text-base">Search calculators, books, fans, monitors...</span>
                  </span>
                  <span className="hidden rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white sm:inline-flex">
                    Browse
                  </span>
                </Link>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link className="trade-button-primary px-5 py-3" href="/trade/sell">
                  Sell an Item
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
                <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/45 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" href="/trade/want">
                  <Megaphone aria-hidden="true" className="h-4 w-4" />
                  Post Wanted Request
                </Link>
              </div>

              <div className="mt-7 grid max-w-2xl gap-2 text-sm text-slate-200 sm:grid-cols-3">
                <TrustBadge icon={BadgeCheck} label="UM-only access" />
                <TrustBadge icon={MapPin} label="Campus pickup" />
                <TrustBadge icon={BookOpen} label="Student essentials" />
              </div>
            </div>

            <MarketplacePreview />
          </div>
        </div>
      </section>

      <section className="trade-container grid gap-4 py-8 md:grid-cols-3">
        {productPillars.map((item) => {
          const Icon = item.icon;
          return (
            <article className="trade-card p-5" key={item.title}>
              <span className="trade-icon-frame">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
            </article>
          );
        })}
      </section>

      <section className="trade-container pb-8">
        <div className="trade-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="trade-kicker">Popular categories</p>
              <h2 className="mt-2 text-xl font-semibold">Start with what UM students trade most</h2>
            </div>
            <Link className="trade-button-secondary" href="/trade">
              Browse marketplace
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <span className="trade-chip" key={category}>
                {category}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="trade-container grid gap-5 pb-12 lg:grid-cols-[1fr_1fr]" id="safety">
        <div className="trade-card p-5">
          <p className="trade-kicker">Core workflows</p>
          <h2 className="mt-2 text-xl font-semibold">Trade without hunting through menus</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Action href="/trade" label="Browse listings" />
            <Action href="/trade/sell" label="Sell an item" />
            <Action href="/trade/want" label="Post wanted item" />
            <Action href="/trade/dashboard" label="My trade dashboard" />
          </div>
        </div>
        <div className="trade-card p-5">
          <p className="trade-kicker">Safety model</p>
          <h2 className="mt-2 text-xl font-semibold">Trust cues stay visible</h2>
          <div className="mt-4 grid gap-3">
            <TrustLine label="Verified access" body="Campus-only signup keeps meaningful actions inside the UM community." />
            <TrustLine label="Private contact" body="Contact details are hidden until a seller accepts the request." />
            <TrustLine label="Public campus pickup" body="Meet in public areas, inspect the item, and avoid paying before seeing it." />
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-slate-700">UM Nexus Trade</p>
          <div className="flex flex-wrap gap-3">
            <Link className="hover:text-slate-950" href="/safety">Safety</Link>
            <Link className="hover:text-slate-950" href="/terms">Terms</Link>
            <Link className="hover:text-slate-950" href="/privacy">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function MarketplacePreview() {
  return (
    <div className="trade-card-elevated overflow-hidden bg-white/95 p-4 text-slate-950">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Live preview</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">UM marketplace feed</p>
        </div>
        <span className="trade-chip-success">Verified UM</span>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <Search aria-hidden="true" className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-500">Search calculators, books, monitors...</span>
      </div>
      <div className="mt-3 grid gap-3">
        {sampleListings.map(([title, price, meta, pickup]) => (
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm" key={title}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">{title}</p>
                <p className="mt-1 text-lg font-bold text-emerald-800">{price}</p>
                <p className="mt-1 text-xs text-slate-500">{meta}</p>
              </div>
              <Heart aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-emerald-700" />
              Pickup: {pickup}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NavLink({ href, children }: Readonly<{ href: string; children: ReactNode }>) {
  return (
    <Link className="rounded-lg px-3 py-2 text-white/90 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300" href={href}>
      {children}
    </Link>
  );
}

function TrustBadge({ icon: Icon, label }: Readonly<{ icon: LucideIcon; label: string }>) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 backdrop-blur">
      <Icon aria-hidden="true" className="h-4 w-4 text-emerald-200" />
      <span className="font-semibold">{label}</span>
    </div>
  );
}

function Action({ href, label }: Readonly<{ href: string; label: string }>) {
  return (
    <Link
      className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
      href={href}
    >
      {label}
    </Link>
  );
}

function TrustLine({ label, body }: Readonly<{ label: string; body: string }>) {
  return (
    <div className="border-l-4 border-emerald-200 pl-3">
      <p className="text-sm font-semibold text-slate-950">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}
