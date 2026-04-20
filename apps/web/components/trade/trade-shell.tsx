import Link from "next/link";

type TradeShellProps = Readonly<{
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
}>;

export function TradeShell({
  children,
  eyebrow = "UM Nexus Trade Intelligence",
  title,
  description,
}: TradeShellProps) {
  return (
    <main className="min-h-screen bg-[#f7f8f3] text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                {description}
              </p>
            ) : null}
          </div>
          <nav className="flex flex-wrap gap-2">
            <Link
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-500"
              href="/trade"
            >
              Listings
            </Link>
            <Link
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              href="/trade/sell"
            >
              Sell
            </Link>
            <Link
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
              href="/trade/want"
            >
              Want
            </Link>
            <Link
              className="rounded-lg border border-cyan-700 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-900 shadow-sm transition hover:bg-cyan-100"
              href="/trade/evaluation"
            >
              Evaluate
            </Link>
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
