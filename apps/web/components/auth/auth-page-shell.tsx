import Link from "next/link";
import type { ReactNode } from "react";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import { ArrowLeft, Diamond } from "lucide-react";

const luxuryDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-luxury-display",
  display: "swap",
});

const luxuryBody = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-luxury-body",
  display: "swap",
});

type AuthPageShellProps = Readonly<{
  children: ReactNode;
}>;

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <div
      className={`${luxuryDisplay.variable} ${luxuryBody.variable} luxury-font-body relative min-h-screen overflow-hidden`}
      style={{ background: "#0B0B0C", color: "#F5F5F4" }}
    >
      {/* Cinematic backdrop — visible on every breakpoint, dimmed on the auth side via gradient. */}
      <div aria-hidden="true" className="absolute inset-0 -z-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className="h-full w-full object-cover opacity-[0.5]"
          src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=2400&q=85"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 22% 30%, rgba(214, 179, 106, 0.18), transparent 38%), linear-gradient(100deg, rgba(11,11,12,0.78) 0%, rgba(11,11,12,0.85) 48%, rgba(11,11,12,0.94) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="luxury-blob absolute -left-32 top-1/3 -z-10 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(197,154,67,0.20), transparent 70%)" }}
      />

      <header className="absolute inset-x-0 top-0 z-20 px-4 pt-5 sm:px-8 sm:pt-7">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link
            aria-label="UM Nexus Trade — home"
            className="group flex items-center gap-3 rounded-full pr-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200"
            href="/"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-stone-950/70">
              <Diamond aria-hidden="true" className="luxury-gold h-4 w-4" />
            </span>
            <span className="luxury-font-display text-xl font-medium leading-none text-stone-50 sm:text-2xl">
              UM Nexus<span className="luxury-gold px-1">·</span>Trade
            </span>
          </Link>

          <Link
            className="hidden cursor-pointer items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[11px] font-medium uppercase text-stone-200 transition hover:border-white/25 hover:text-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200 sm:inline-flex"
            href="/"
            style={{ letterSpacing: "0.22em" }}
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Back to landing
          </Link>
        </div>
      </header>

      <main className="relative mx-auto grid min-h-screen w-full max-w-7xl items-stretch gap-12 px-4 pb-12 pt-28 sm:px-8 sm:pt-32 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,460px)] lg:gap-16 lg:pb-16">
        <section
          aria-label="UM Nexus Trade — campus marketplace"
          className="relative flex items-end pb-4 sm:items-center sm:pb-0"
        >
          <div className="max-w-xl">
            <p
              className="luxury-eyebrow"
              style={{ color: "rgba(214, 179, 106, 0.85)" }}
            >
              University of Malaya · Verified Access
            </p>
            <h2
              className="luxury-font-display mt-5 text-[clamp(2.5rem,6vw,5rem)] font-light leading-[0.98]"
              style={{ color: "#F5F5F4" }}
            >
              Enter the <em className="luxury-gold not-italic">UM-only</em>
              <br />
              marketplace.
            </h2>
            <p
              className="mt-6 max-w-md text-[15px] leading-8"
              style={{ color: "rgba(245, 245, 244, 0.72)" }}
            >
              Verified students. Safer campus trading. Smarter discovery.
            </p>

            <div className="luxury-rule mt-10 hidden max-w-md sm:block" />

            <dl className="mt-10 hidden grid-cols-3 gap-x-6 gap-y-2 sm:grid sm:max-w-md">
              <Stat value="UM·only" label="Verified students" />
              <Stat value="3 taps" label="To request seller" />
              <Stat value="24h" label="Fresh listings" />
            </dl>
          </div>
        </section>

        <section
          aria-label="Sign in or create an account"
          className="flex items-center"
        >
          <div className="w-full">{children}</div>
        </section>
      </main>
    </div>
  );
}

function Stat({ value, label }: Readonly<{ value: string; label: string }>) {
  return (
    <div>
      <dt
        className="luxury-font-display text-2xl font-medium"
        style={{ color: "#F5F5F4" }}
      >
        {value}
      </dt>
      <dd
        className="luxury-eyebrow mt-1"
        style={{ color: "rgba(245, 245, 244, 0.55)" }}
      >
        {label}
      </dd>
    </div>
  );
}
