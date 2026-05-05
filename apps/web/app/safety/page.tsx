import Link from "next/link";
import { Flag, ShieldCheck, Store } from "lucide-react";

const safetyRules = [
  "Meet in public campus areas such as FSKTM, Main Library, UM Sentral, faculty spaces, or residential-college common areas.",
  "Check the item before payment and do not transfer money before seeing the item.",
  "Keep contact details private until a seller accepts a contact request.",
  "Report suspicious listings, unsafe transaction requests, fake photos, or prohibited items.",
];

const prohibitedItems = [
  "Weapons",
  "Vapes, cigarettes, or alcohol",
  "Medicine or prescription drugs",
  "Exam papers or leaked materials",
  "Counterfeit goods",
  "Adult items",
  "Illegal software",
  "Stolen items",
  "Dangerous chemicals",
];

export default function SafetyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Header />
      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="trade-card p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Trust and safety</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl">Trade safely within UM.</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            UM Nexus Trade is a campus resale product for verified University of Malaya users. We do not hold payments
            in this version, so safe pickup behavior matters.
          </p>
          <div className="mt-6 grid gap-3">
            {safetyRules.map((rule) => (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950" key={rule}>
                {rule}
              </div>
            ))}
          </div>
        </div>

        <aside className="grid h-fit gap-5">
          <section className="trade-card p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
              <Flag aria-hidden="true" className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">Prohibited items</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {prohibitedItems.map((item) => (
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </section>
          <section className="trade-card p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ShieldCheck aria-hidden="true" className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">Contact privacy</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Phone numbers and handles are not public by default. Buyer and seller contact details are shown only after
              the seller accepts a request.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}

function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link className="flex items-center gap-2 font-semibold text-slate-950" href="/trade">
          <Store aria-hidden="true" className="h-5 w-5 text-emerald-700" />
          UM Nexus Trade
        </Link>
        <nav className="flex gap-2 text-sm font-semibold">
          <Link className="rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100" href="/trade">
            Browse
          </Link>
          <Link className="rounded-xl bg-emerald-700 px-3 py-2 text-white hover:bg-emerald-800" href="/trade/sell">
            Sell
          </Link>
        </nav>
      </div>
    </header>
  );
}
