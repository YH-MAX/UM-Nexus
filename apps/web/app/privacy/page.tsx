import Link from "next/link";
import { Lock, Store } from "lucide-react";

const privacyPoints = [
  {
    title: "Account data",
    body: "We use your UM email identity, display name, faculty, campus location, and account status to keep marketplace access trusted.",
  },
  {
    title: "Listing data",
    body: "Listings, images, reports, contact requests, favorites, view counts, and moderation actions are stored to operate the marketplace safely.",
  },
  {
    title: "Contact privacy",
    body: "Seller and buyer contact values are hidden from the public feed and shown only after the seller accepts a contact request.",
  },
  {
    title: "AI usage",
    body: "Optional AI requests may store input notes, image URLs, generated suggestions, status, and usage logs for debugging and cost control.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link className="flex items-center gap-2 font-semibold text-slate-950" href="/trade">
            <Store aria-hidden="true" className="h-5 w-5 text-emerald-700" />
            UM Nexus Trade
          </Link>
          <Link className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" href="/terms">
            Terms
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="trade-card p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Lock aria-hidden="true" className="h-6 w-6" />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Privacy</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">UM Nexus Trade Privacy</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            The V1 privacy model is simple: collect what is needed for trusted UM trading, keep contact details private
            by default, and preserve moderation records for safety.
          </p>
          <div className="mt-8 grid gap-4">
            {privacyPoints.map((point) => (
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={point.title}>
                <h2 className="text-lg font-semibold">{point.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{point.body}</p>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
