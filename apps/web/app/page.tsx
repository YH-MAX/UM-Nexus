import Link from "next/link";
import type { ReactNode } from "react";

const productPillars = [
  {
    title: "Price With Confidence",
    body: "Suggested price bands, negotiation floors, and sell-fast guidance from campus resale evidence.",
  },
  {
    title: "Reach Nearby Demand",
    body: "Buyer and seller ranking by item fit, budget overlap, pickup convenience, and urgency.",
  },
  {
    title: "Keep Trust Visible",
    body: "Risk signals, report handling, and moderation review for suspicious or incomplete listings.",
  },
];

const metrics = [
  ["UM-only marketplace", "Verified campus access"],
  ["AI price guide", "Campus sale evidence"],
  ["Demand matching", "Wanted posts"],
  ["Trust workflow", "Risk review"],
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="relative min-h-[88vh] overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Students trading second-hand campus items"
            className="h-full w-full object-cover opacity-35"
            src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1800&q=80"
          />
        </div>
        <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-between px-6 py-8">
          <nav className="flex flex-wrap items-center justify-between gap-4">
            <Link className="text-lg font-semibold" href="/">
              UM Nexus Trade
            </Link>
            <div className="flex flex-wrap gap-2 text-sm font-semibold">
              <NavLink href="/trade">Marketplace</NavLink>
              <NavLink href="/trade/sell">Sell</NavLink>
              <NavLink href="/trade/want">Wanted</NavLink>
              <NavLink href="/login">Sign in</NavLink>
            </div>
          </nav>

          <div className="max-w-4xl pb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
              University Of Malaya Campus Marketplace
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight sm:text-6xl">
              UM Nexus Trade
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
              Buy and sell second-hand textbooks, dorm essentials, electronics, and campus gear
              with AI price guidance, demand matching, and trust review built into the trade flow.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                href="/trade"
              >
                Browse marketplace
              </Link>
              <Link
                className="rounded-lg border border-white/45 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                href="/trade/sell"
              >
                Sell an item
              </Link>
              <Link
                className="rounded-lg border border-white/45 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                href="/trade/want"
              >
                Post a request
              </Link>
            </div>
          </div>

          <div className="grid gap-3 pb-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map(([label, value]) => (
              <div className="border border-white/20 bg-white/10 p-4 backdrop-blur" key={label}>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100">
                  {label}
                </p>
                <p className="mt-1 text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-8 md:grid-cols-3">
        {productPillars.map((item) => (
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={item.title}>
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 pb-12 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Trade Workflows</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Action href="/trade" label="Browse listings" />
            <Action href="/trade/sell" label="Sell with AI" />
            <Action href="/trade/want" label="Post wanted item" />
            <Action href="/trade/dashboard" label="My trade dashboard" />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Launch Trust Model</h2>
          <div className="mt-4 grid gap-3">
            <TrustLine label="Verified access" body="Campus-only signup keeps trading inside the UM community." />
            <TrustLine label="Decision support" body="Sellers can apply, adjust, or reject price guidance and record the outcome." />
            <TrustLine label="Review queue" body="High-risk listings and user reports stay visible to moderators." />
          </div>
        </div>
      </section>
    </main>
  );
}

function NavLink({ href, children }: Readonly<{ href: string; children: ReactNode }>) {
  return (
    <Link className="rounded-lg px-3 py-2 text-white/90 transition hover:bg-white/10 hover:text-white" href={href}>
      {children}
    </Link>
  );
}

function Action({ href, label }: Readonly<{ href: string; label: string }>) {
  return (
    <Link
      className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-emerald-300 hover:bg-emerald-50"
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
