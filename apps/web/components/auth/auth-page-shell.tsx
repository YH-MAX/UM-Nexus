import Link from "next/link";
import type { ReactNode } from "react";
import { BadgeCheck, BookOpen, MapPin, ShieldCheck, Store } from "lucide-react";

type AuthPageShellProps = Readonly<{
  children: ReactNode;
}>;

const trustPoints = [
  {
    icon: ShieldCheck,
    label: "UM-only access",
    body: "Student and staff email domains keep marketplace actions inside the campus community.",
  },
  {
    icon: BadgeCheck,
    label: "Private contact",
    body: "Seller details stay hidden until a request is accepted.",
  },
  {
    icon: MapPin,
    label: "Campus meetup first",
    body: "Trade around familiar UM pickup spots and inspect items before paying.",
  },
];

const previewItems = [
  { title: "WIA2005 Textbook", price: "RM 45", meta: "Like new", pickup: "Main Library" },
  { title: "Scientific Calculator", price: "RM 30", meta: "Good", pickup: "FSKTM" },
];

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,1fr)]">
        <section className="flex min-w-0 items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-md">{children}</div>
        </section>

        <aside className="min-w-0 border-t border-slate-200 bg-slate-950 p-5 text-white sm:p-8 lg:border-l lg:border-t-0">
          <div className="flex h-full flex-col justify-between gap-8">
            <div>
              <Link className="inline-flex items-center gap-2 text-sm font-semibold text-white" href="/">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950">
                  <Store aria-hidden="true" className="h-4 w-4" />
                </span>
                UM Nexus Trade
              </Link>

              <div className="mt-10 max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  Campus marketplace access
                </p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                  Buy, sell, and meet through a UM-first trust layer.
                </h2>
                <p className="mt-4 text-sm leading-6 text-slate-300">
                  Sign in once to save listings, contact sellers, post wanted items, and manage your trade activity.
                </p>
              </div>

              <div className="mt-8 grid gap-3">
                {trustPoints.map((point) => {
                  const Icon = point.icon;
                  return (
                    <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4" key={point.label}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-200">
                        <Icon aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{point.label}</p>
                        <p className="mt-1 text-sm leading-5 text-slate-300">{point.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">Live preview</p>
                  <p className="mt-1 text-sm font-semibold text-white">Popular campus listings</p>
                </div>
                <BookOpen aria-hidden="true" className="h-5 w-5 text-emerald-200" />
              </div>
              <div className="mt-4 grid gap-3">
                {previewItems.map((item) => (
                  <div className="rounded-2xl bg-white p-3 text-slate-950" key={item.title}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-emerald-800">{item.price}</p>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-emerald-700" />
                      {item.pickup}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
