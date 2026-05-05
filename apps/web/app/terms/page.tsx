import Link from "next/link";
import { Store } from "lucide-react";

const sections = [
  {
    title: "UM-only marketplace",
    body: "UM Nexus Trade is intended for University of Malaya students and staff using verified UM email access. Guests may browse limited marketplace information, but meaningful actions require sign in.",
  },
  {
    title: "No payment holding",
    body: "UM Nexus does not provide escrow, payment holding, delivery, or dispute arbitration in this version. Buyers and sellers are responsible for checking items and agreeing on payment safely.",
  },
  {
    title: "Seller responsibility",
    body: "Sellers must provide truthful listing information, use permitted categories, avoid prohibited items, and review any AI-generated suggestions before publishing.",
  },
  {
    title: "Moderation",
    body: "Moderators and admins may hide listings, review reports, suspend unsafe users, and keep audit records for trust and safety operations.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <SimpleHeader />
      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="trade-card p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Launch terms</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">UM Nexus Trade Terms</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            These product terms are written for the controlled UM beta. They keep the marketplace clear, safe, and
            manual-first while the product grows.
          </p>
          <div className="mt-8 grid gap-4">
            {sections.map((section) => (
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={section.title}>
                <h2 className="text-lg font-semibold">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function SimpleHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
        <Link className="flex items-center gap-2 font-semibold text-slate-950" href="/trade">
          <Store aria-hidden="true" className="h-5 w-5 text-emerald-700" />
          UM Nexus Trade
        </Link>
        <Link className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" href="/safety">
          Safety
        </Link>
      </div>
    </header>
  );
}
