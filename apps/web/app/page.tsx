import Link from "next/link";
import type { ReactNode } from "react";

const decisions = [
  {
    title: "Pricing Decision",
    body: "Fair price, negotiation floor, sell-fast guidance, and price competitiveness from campus comparables.",
  },
  {
    title: "Matching Decision",
    body: "Buyer and seller ranking by item fit, budget overlap, pickup convenience, and urgency.",
  },
  {
    title: "Trust Decision",
    body: "Risk level, evidence, moderation queue, and next action for suspicious or incomplete listings.",
  },
];

const metrics = [
  ["Pricing lift", "AI vs baseline"],
  ["Risk detection", "Labelled cases"],
  ["Match quality", "Campus demand"],
  ["Time-to-sale", "Scenario proxy"],
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
              UM Nexus Trade Intelligence
            </Link>
            <div className="flex flex-wrap gap-2 text-sm font-semibold">
              <NavLink href="/trade">Marketplace</NavLink>
              <NavLink href="/trade/sell">Sell</NavLink>
              <NavLink href="/trade/demo">Demo</NavLink>
              <NavLink href="/trade/evaluation">Evaluation</NavLink>
            </div>
          </nav>

          <div className="max-w-4xl pb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Campus Resale Decision Engine
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight sm:text-6xl">
              UM Nexus Trade Intelligence
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
              AI-powered resale decisions for University of Malaya students: fair pricing,
              smarter buyer matching, safer trust checks, and judge-ready impact evidence.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                href="/trade/sell"
              >
                Create listing
              </Link>
              <Link
                className="rounded-lg border border-white/45 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                href="/trade/demo"
              >
                Open judge demo
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
        {decisions.map((item) => (
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={item.title}>
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 pb-12 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Judge flow</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Action href="/trade/demo" label="Demo evidence" />
            <Action href="/trade/evaluation" label="AI vs baseline" />
            <Action href="/trade/dashboard" label="Outcome dashboard" />
            <Action href="/trade/moderation" label="Trust review" />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Live product flow</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Create a listing, upload images, run GLM enrichment, inspect the normalized
            decision result, contact a recommended match, and complete the transaction
            to feed real sale evidence back into future recommendations.
          </p>
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
