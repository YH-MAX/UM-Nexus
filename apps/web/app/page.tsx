import Link from "next/link";
import type { ReactNode } from "react";
import { Heart, MapPin, Search, ShieldCheck, Store } from "lucide-react";

const productPillars = [
  {
    title: "UM-only trust",
    body: "Verified campus access and contact requests keep trading inside the University of Malaya community.",
  },
  {
    title: "Marketplace first",
    body: "Browse real listings, save items, ask sellers for contact, and meet safely on campus.",
  },
  {
    title: "Optional seller help",
    body: "AI can suggest a title, category, description, and price range, but sellers always decide.",
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
            alt="Students on a university campus"
            className="h-full w-full object-cover opacity-30"
            src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1800&q=80"
          />
        </div>
        <div className="relative mx-auto grid min-h-[88vh] max-w-7xl content-between gap-10 px-6 py-8">
          <nav className="flex flex-wrap items-center justify-between gap-4">
            <Link className="flex items-center gap-2 text-lg font-semibold" href="/">
              <Store aria-hidden="true" className="h-5 w-5 text-emerald-300" />
              UM Nexus Trade
            </Link>
            <div className="flex flex-wrap gap-2 text-sm font-semibold">
              <NavLink href="/trade">Browse</NavLink>
              <NavLink href="/trade/sell">Sell</NavLink>
              <NavLink href="/trade/want">Wanted</NavLink>
              <NavLink href="/safety">Safety</NavLink>
              <NavLink href="/login">Sign in</NavLink>
            </div>
          </nav>

          <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="max-w-4xl pb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">
                University of Malaya Campus Marketplace
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
                Buy smarter. Sell safer. Trade within UM.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
                A trusted UM-only resale platform for textbooks, electronics, dorm items, and campus essentials.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link className="trade-button-primary px-5 py-3" href="/trade">
                  Browse Listings
                </Link>
                <Link className="rounded-xl border border-white/45 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10" href="/trade/sell">
                  Sell an Item
                </Link>
                <Link className="rounded-xl border border-white/45 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10" href="/trade/want">
                  Post a Wanted Request
                </Link>
              </div>
            </div>

            <MarketplacePreview />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-8 md:grid-cols-3">
        {productPillars.map((item) => (
          <article className="trade-card p-5" key={item.title}>
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-8">
        <div className="trade-card p-5">
          <h2 className="text-xl font-semibold">Popular categories</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700" key={category}>
                {category}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-12 lg:grid-cols-[1fr_1fr]" id="safety">
        <div className="trade-card p-5">
          <h2 className="text-xl font-semibold">Trade Workflows</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Action href="/trade" label="Browse listings" />
            <Action href="/trade/sell" label="Sell an item" />
            <Action href="/trade/want" label="Post wanted item" />
            <Action href="/trade/dashboard" label="My trade dashboard" />
          </div>
        </div>
        <div className="trade-card p-5">
          <h2 className="text-xl font-semibold">Safety model</h2>
          <div className="mt-4 grid gap-3">
            <TrustLine label="Verified access" body="Campus-only signup keeps meaningful actions inside the UM community." />
            <TrustLine label="Private contact" body="Contact details are hidden until a seller accepts the request." />
            <TrustLine label="Public campus pickup" body="Meet in public areas, inspect the item, and avoid paying before seeing it." />
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-6 text-sm text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>UM Nexus Trade</p>
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
    <div className="rounded-3xl border border-white/20 bg-white/95 p-4 text-slate-950 shadow-2xl">
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <Search aria-hidden="true" className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-500">Search calculators, books, monitors...</span>
      </div>
      <div className="mt-3 grid gap-3">
        {sampleListings.map(([title, price, meta, pickup]) => (
          <div className="rounded-2xl border border-slate-200 bg-white p-3" key={title}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">{title}</p>
                <p className="mt-1 text-lg font-bold text-emerald-800">{price}</p>
                <p className="mt-1 text-xs text-slate-500">{meta}</p>
              </div>
              <Heart aria-hidden="true" className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-emerald-700" />
              Pickup: {pickup}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
        <ShieldCheck aria-hidden="true" className="h-4 w-4" />
        Verified UM community
      </div>
    </div>
  );
}

function NavLink({ href, children }: Readonly<{ href: string; children: ReactNode }>) {
  return (
    <Link className="rounded-xl px-3 py-2 text-white/90 transition hover:bg-white/10 hover:text-white" href={href}>
      {children}
    </Link>
  );
}

function Action({ href, label }: Readonly<{ href: string; label: string }>) {
  return (
    <Link
      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-emerald-300 hover:bg-emerald-50"
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
