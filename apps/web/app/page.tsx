import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Compass,
  Diamond,
  GraduationCap,
  KeyRound,
  Leaf,
  LogIn,
  MapPin,
  Quote,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";

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

export const metadata = {
  title: "UM Nexus Trade · The Campus Marketplace",
  description:
    "A University of Malaya-only marketplace for textbooks, electronics, and dorm essentials. Verified UM students, private contact, public campus pickup, and AI-assisted fair pricing.",
};

const featuredListings: ReadonlyArray<{
  edition: string;
  collection: string;
  name: string;
  price: string;
  image: string;
  story: string;
}> = [
  {
    edition: "Like new · I of I",
    collection: "Textbooks",
    name: "WIA2005 Algorithm Design Manual",
    price: "RM 45",
    image:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1400&q=85",
    story:
      "Faculty of Computer Science & IT · pickup at Main Library. Highlighted by previous owner, otherwise pristine.",
  },
  {
    edition: "Excellent · I of I",
    collection: "Electronics",
    name: "Casio FX-991EX Scientific Calculator",
    price: "RM 60",
    image:
      "https://images.unsplash.com/photo-1564466809058-bf4114d55352?auto=format&fit=crop&w=1400&q=85",
    story:
      "FSKTM · pickup at KK12 plaza. Boxed with original sleeve. Cleared every exam it sat for.",
  },
  {
    edition: "Good · I of I",
    collection: "Dorm & Kitchen",
    name: "Tefal Mini Rice Cooker",
    price: "RM 55",
    image:
      "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=1400&q=85",
    story:
      "Move-out essentials · pickup at KK13. One semester of careful use, fed many late-night study sessions.",
  },
];

const tradeSteps: ReadonlyArray<{
  numeral: string;
  title: string;
  body: string;
  icon: LucideIcon;
}> = [
  {
    numeral: "I",
    title: "Browse",
    body: "Explore listings filtered by faculty, residential college, and budget — built for fast decisions on mobile.",
    icon: Search,
  },
  {
    numeral: "II",
    title: "Request",
    body: "Send a private contact request. The seller decides if and when their details are revealed.",
    icon: Send,
  },
  {
    numeral: "III",
    title: "Meet",
    body: "Pick up at Main Library, KK plazas, or faculty foyers. Always public, always on campus, always inspect first.",
    icon: MapPin,
  },
  {
    numeral: "IV",
    title: "Close",
    body: "Record the outcome. Your fair trade quietly improves pricing guidance for the next student.",
    icon: CheckCircle2,
  },
];

const trustPillars: ReadonlyArray<{
  title: string;
  body: string;
  icon: LucideIcon;
}> = [
  {
    title: "Verified UM",
    body: "Sign-up requires a UM email. Only University of Malaya students can browse, save, or contact.",
    icon: GraduationCap,
  },
  {
    title: "Private Contact",
    body: "Contact details stay hidden until the seller accepts your request. No exposure to strangers.",
    icon: KeyRound,
  },
  {
    title: "Campus Pickup",
    body: "Meet at Main Library, KK plazas, faculty foyers, or campus cafés. Public spaces, always.",
    icon: MapPin,
  },
  {
    title: "Fair Pricing",
    body: "Each listing is checked against real UM trades. AI-assisted guidance keeps prices honest.",
    icon: Sparkles,
  },
];

const accessBenefits = [
  "Sign in once with your UM email — no second password to remember",
  "Save listings and receive new-match alerts on items you want",
  "Post wanted requests for items not yet listed on campus",
  "Sell unused essentials to verified UM students only",
  "Access AI-assisted pricing built on historical campus trades",
];

const campusBadges = [
  "Main Library",
  "FSKTM",
  "Faculty of Engineering",
  "Faculty of Business",
  "KK12 Plaza",
  "KK13 Plaza",
  "KK10 Plaza",
  "Faculty of Arts",
  "Faculty of Science",
  "Faculty of Law",
];

export default function HomePage() {
  return (
    <div
      className={`${luxuryDisplay.variable} ${luxuryBody.variable} luxury-surface luxury-font-body`}
    >
      <FloatingNav />

      <main>
        <Hero />
        <CampusBand />
        <FeaturedListings />
        <CampusStory />
        <TradeProcess />
        <TrustPillars />
        <AccessCTA />
      </main>

      <UmNexusFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Nav                                                                 */
/* ------------------------------------------------------------------ */

function FloatingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 sm:pt-6">
      <nav className="luxury-glass-dark mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-full px-4 py-2.5 sm:px-6 sm:py-3">
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

        <div className="hidden items-center gap-1 text-[11px] font-medium uppercase text-stone-200 md:flex">
          <NavLink href="#collection">Marketplace</NavLink>
          <NavLink href="#heritage">Story</NavLink>
          <NavLink href="#atelier">How it works</NavLink>
          <NavLink href="#codes">Trust</NavLink>
        </div>

        <div className="flex items-center gap-2">
          <Link
            className="hidden cursor-pointer rounded-full px-3 py-2 text-[11px] font-medium uppercase text-stone-200 transition hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200 sm:inline-flex"
            href="/login"
            style={{ letterSpacing: "0.22em" }}
          >
            Sign in
          </Link>
          <Link
            className="luxury-gold-edge inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase"
            href="/trade"
            style={{ letterSpacing: "0.22em" }}
          >
            Marketplace
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

function NavLink({ href, children }: Readonly<{ href: string; children: React.ReactNode }>) {
  return (
    <a
      className="cursor-pointer rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200"
      href={href}
      style={{ letterSpacing: "0.22em" }}
    >
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
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
            "radial-gradient(circle at 76% 22%, rgba(212, 175, 106, 0.28), transparent 36%), radial-gradient(circle at 18% 84%, rgba(212, 175, 106, 0.16), transparent 30%), linear-gradient(90deg, rgba(8,6,5,0.96) 0%, rgba(8,6,5,0.78) 40%, rgba(8,6,5,0.42) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="luxury-blob absolute -right-32 top-40 -z-10 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(212,175,106,0.28), transparent 70%)" }}
      />

      <div className="mx-auto grid min-h-[100svh] max-w-7xl content-end gap-14 px-4 pb-24 pt-40 sm:px-6 sm:pt-44 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end lg:gap-20 lg:px-8">
        <div className="max-w-3xl">
          <p className="luxury-eyebrow">University of Malaya · Campus Marketplace</p>

          <h1 className="luxury-font-display mt-6 text-[clamp(3rem,8vw,7rem)] font-light leading-[0.96] text-stone-50">
            Where students
            <br />
            trade with <em className="luxury-gold not-italic">care</em>.
          </h1>

          <p className="mt-8 max-w-xl text-[15px] leading-8 text-stone-300">
            A UM-only marketplace for textbooks, electronics, dorm essentials, and wanted requests.
            Verified students, private contact, public campus pickup — built with student trust at the centre.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              className="luxury-gold-edge luxury-sheen inline-flex min-h-12 items-center gap-2 rounded-full px-6 py-3 text-[12px] font-semibold uppercase"
              href="/trade"
              style={{ letterSpacing: "0.24em" }}
            >
              Browse Marketplace
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              className="luxury-ghost min-h-12"
              href="/signup"
              style={{ letterSpacing: "0.24em" }}
            >
              Sign up with UM email
            </Link>
            <Link
              className="hidden cursor-pointer items-center gap-2 rounded-full px-3 py-3 text-[11px] font-medium uppercase text-stone-300 transition hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200 sm:inline-flex"
              href="/login"
              style={{ letterSpacing: "0.22em" }}
            >
              <LogIn aria-hidden="true" className="h-3.5 w-3.5" />
              Already a student? Sign in
            </Link>
          </div>

          <div className="mt-14 grid max-w-xl gap-x-8 gap-y-2 sm:grid-cols-3">
            <HeroFact value="UM·only" label="Verified student access" />
            <HeroFact value="≤ 03" label="Tap path to seller contact" />
            <HeroFact value="24h" label="Fresh listings rhythm" />
          </div>
        </div>

        <HeroAside />
      </div>
    </section>
  );
}

function HeroFact({ value, label }: Readonly<{ value: string; label: string }>) {
  return (
    <div>
      <p className="luxury-font-display text-2xl font-medium text-stone-50">{value}</p>
      <p className="luxury-eyebrow mt-1">{label}</p>
    </div>
  );
}

function HeroAside() {
  return (
    <aside
      aria-label="Featured campus listing"
      className="luxury-glass-dark relative w-full max-w-md justify-self-end overflow-hidden rounded-[28px] p-5 sm:p-6 lg:sticky lg:bottom-10"
    >
      <div className="flex items-center justify-between">
        <p className="luxury-eyebrow text-stone-300">Live · Verified Listing</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5 text-amber-200">
          <Sparkles aria-hidden="true" className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="An open algorithm textbook on a study desk under warm lamplight."
          className="h-64 w-full object-cover"
          src="https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=900&q=85"
        />
      </div>

      <div className="mt-5">
        <p className="luxury-eyebrow text-stone-400">Textbooks · Like new · I of I</p>
        <h2 className="luxury-font-display mt-2 text-3xl font-medium text-stone-50">
          WIA2005 Algorithm Manual
        </h2>
        <div className="luxury-rule my-4" />
        <div className="flex items-end justify-between">
          <p className="text-[11px] uppercase text-stone-400" style={{ letterSpacing: "0.24em" }}>
            Pickup · Main Library
          </p>
          <p className="luxury-font-display text-2xl text-amber-200">RM 45</p>
        </div>

        <Link
          className="luxury-eyebrow mt-5 inline-flex cursor-pointer items-center gap-2 text-amber-200 transition hover:text-amber-100"
          href="/trade"
        >
          View in marketplace
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Campus marquee                                                      */
/* ------------------------------------------------------------------ */

function CampusBand() {
  const items = [...campusBadges, ...campusBadges];
  return (
    <section
      aria-label="Active campus pickup spots"
      className="relative overflow-hidden border-y border-white/5 bg-stone-950/60 py-7"
    >
      <p className="luxury-eyebrow mb-5 text-center text-stone-500">
        Trusted trades across the University of Malaya
      </p>
      <div className="luxury-marquee-track flex w-[200%] gap-12 whitespace-nowrap">
        {items.map((item, index) => (
          <span
            className="luxury-font-display flex shrink-0 items-center gap-12 text-2xl italic text-stone-300 sm:text-3xl"
            key={`${item}-${index}`}
          >
            {item}
            <span aria-hidden="true" className="luxury-gold text-base not-italic">
              ◆
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Featured listings                                                   */
/* ------------------------------------------------------------------ */

function FeaturedListings() {
  return (
    <section
      aria-labelledby="collection-heading"
      className="relative px-4 py-28 sm:px-6 lg:px-8"
      id="collection"
    >
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="luxury-eyebrow text-amber-200/80">This Week on Campus</p>
            <h2
              className="luxury-font-display mt-4 text-[clamp(2.25rem,4.6vw,3.75rem)] font-light leading-[1.04] text-stone-50"
              id="collection-heading"
            >
              Three pieces from your campus, this week.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-7 text-stone-400">
            Each is listed by a verified UM student. Prices reflect real campus value, with AI-assisted
            guidance from historical trades.
          </p>
        </header>

        <div className="luxury-rule mt-10" />

        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {featuredListings.map((listing, index) => (
            <ListingCardLuxury {...listing} index={index} key={listing.name} />
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
          <Link
            className="luxury-gold-edge luxury-sheen inline-flex min-h-12 items-center gap-2 rounded-full px-6 py-3 text-[12px] font-semibold uppercase"
            href="/trade"
            style={{ letterSpacing: "0.24em" }}
          >
            Open the full marketplace
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link
            className="luxury-ghost min-h-12"
            href="/trade/want"
            style={{ letterSpacing: "0.24em" }}
          >
            Post a wanted item
          </Link>
        </div>
      </div>
    </section>
  );
}

function ListingCardLuxury({
  edition,
  collection,
  name,
  price,
  image,
  story,
  index,
}: Readonly<{
  edition: string;
  collection: string;
  name: string;
  price: string;
  image: string;
  story: string;
  index: number;
}>) {
  return (
    <article className="group relative flex flex-col">
      <div className="luxury-sheen relative overflow-hidden rounded-[20px] border border-white/8 bg-stone-900/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={`${name} — ${collection}`}
          className="aspect-[4/5] w-full object-cover transition duration-[1200ms] ease-out group-hover:scale-[1.04]"
          src={image}
        />
        <div className="absolute inset-x-5 top-5 flex items-center justify-between">
          <span
            className="luxury-glass-dark rounded-full px-3 py-1 text-[10px] font-semibold uppercase text-stone-100"
            style={{ letterSpacing: "0.24em" }}
          >
            № {String(index + 1).padStart(2, "0")} · {edition}
          </span>
          <span className="luxury-glass-dark flex h-9 w-9 items-center justify-center rounded-full text-amber-200">
            <BookOpen aria-hidden="true" className="h-4 w-4" />
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <p className="luxury-eyebrow text-stone-400">{collection}</p>
        <div className="flex items-start justify-between gap-4">
          <h3 className="luxury-font-display text-2xl font-medium leading-tight text-stone-50">
            {name}
          </h3>
          <p className="luxury-font-display shrink-0 text-xl text-amber-200">{price}</p>
        </div>
        <p className="text-sm leading-7 text-stone-400">{story}</p>
        <Link
          aria-label={`View ${name} in the marketplace`}
          className="luxury-eyebrow group/link mt-2 inline-flex w-fit cursor-pointer items-center gap-2 text-amber-200 transition hover:text-amber-100"
          href="/trade"
        >
          View in marketplace
          <ArrowUpRight
            aria-hidden="true"
            className="h-3.5 w-3.5 transition group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
          />
        </Link>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Campus story                                                        */
/* ------------------------------------------------------------------ */

function CampusStory() {
  return (
    <section
      aria-labelledby="heritage-heading"
      className="relative overflow-hidden px-4 py-28 sm:px-6 lg:px-8"
      id="heritage"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 80% 30%, rgba(212,175,106,0.10), transparent 40%), linear-gradient(180deg, rgba(8,6,5,0) 0%, rgba(20,15,12,0.6) 50%, rgba(8,6,5,0) 100%)",
        }}
      />

      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
        <div className="luxury-glass-dark relative overflow-hidden rounded-[28px] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="UM students collaborating with laptops and notebooks in the campus library."
            className="aspect-[4/5] w-full rounded-[18px] object-cover"
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1300&q=85"
          />
          <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
            <span
              className="luxury-glass-dark rounded-full px-3 py-1 text-[10px] font-semibold uppercase text-stone-100"
              style={{ letterSpacing: "0.24em" }}
            >
              Verified · UM
            </span>
            <span
              className="luxury-glass-dark rounded-full px-3 py-1 text-[10px] font-semibold uppercase text-stone-100"
              style={{ letterSpacing: "0.24em" }}
            >
              Est. MMXXVI
            </span>
          </div>
        </div>

        <div>
          <p className="luxury-eyebrow text-amber-200/80">Since MMXXVI · Kuala Lumpur</p>
          <h2
            className="luxury-font-display mt-4 text-[clamp(2.25rem,4.4vw,3.5rem)] font-light leading-[1.05] text-stone-50"
            id="heritage-heading"
          >
            A marketplace for the few
            <br />
            thousand, not the few million.
          </h2>

          <div className="luxury-rule mt-8" />

          <p className="mt-8 max-w-xl text-[15px] leading-8 text-stone-300">
            UM Nexus Trade was created by University of Malaya students who were tired of unverified
            sellers, contact details exposed to strangers, and items that never matched their pictures.
            We kept everything inside the campus: verified emails, private contact flow, public pickup
            spots, and AI-assisted pricing built on real student trades.
          </p>

          <figure className="mt-10 max-w-xl">
            <Quote aria-hidden="true" className="luxury-gold h-6 w-6" />
            <blockquote className="luxury-font-display mt-4 text-2xl font-light italic leading-snug text-stone-100 sm:text-3xl">
              &ldquo;We do not run a marketplace. We hold space for students to trust each other again.&rdquo;
            </blockquote>
            <figcaption className="luxury-eyebrow mt-4 text-stone-400">
              — UM Nexus, Founding Note
            </figcaption>
          </figure>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              className="luxury-gold-edge inline-flex min-h-12 items-center gap-2 rounded-full px-6 py-3 text-[12px] font-semibold uppercase"
              href="/trade"
              style={{ letterSpacing: "0.24em" }}
            >
              Browse the marketplace
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              className="luxury-eyebrow inline-flex cursor-pointer items-center gap-2 text-amber-200 transition hover:text-amber-100"
              href="/safety"
            >
              Read our safety story
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Trade process                                                       */
/* ------------------------------------------------------------------ */

function TradeProcess() {
  return (
    <section
      aria-labelledby="atelier-heading"
      className="relative px-4 py-28 sm:px-6 lg:px-8"
      id="atelier"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="luxury-eyebrow text-amber-200/80">How a Trade Happens</p>
          <h2
            className="luxury-font-display mt-4 text-[clamp(2.25rem,4.4vw,3.5rem)] font-light leading-[1.04] text-stone-50"
            id="atelier-heading"
          >
            Four moments. One trade. No strangers.
          </h2>
        </div>

        <div className="luxury-rule mt-10" />

        <ol className="mt-14 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {tradeSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <li className="relative flex flex-col" key={step.numeral}>
                <div className="flex items-baseline gap-5">
                  <span aria-hidden="true" className="luxury-numeral text-7xl leading-none">
                    {step.numeral}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-200/30 bg-stone-950/50 text-amber-200">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                </div>
                <h3 className="luxury-font-display mt-4 text-2xl font-medium text-stone-50">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-stone-400">{step.body}</p>
                {idx < tradeSteps.length - 1 ? (
                  <div
                    aria-hidden="true"
                    className="luxury-rule mt-8 hidden h-px lg:block"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Trust pillars                                                       */
/* ------------------------------------------------------------------ */

function TrustPillars() {
  return (
    <section
      aria-labelledby="codes-heading"
      className="relative overflow-hidden px-4 py-28 sm:px-6 lg:px-8"
      id="codes"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20"
        style={{
          background:
            "linear-gradient(180deg, #0a0807 0%, #100c0a 50%, #0a0807 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="luxury-blob absolute -left-40 top-1/2 -z-10 h-[520px] w-[520px] -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(212,175,106,0.18), transparent 70%)" }}
      />

      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="luxury-eyebrow text-amber-200/80">Trust Codes</p>
            <h2
              className="luxury-font-display mt-4 text-[clamp(2.25rem,4.4vw,3.5rem)] font-light leading-[1.04] text-stone-50"
              id="codes-heading"
            >
              Four conditions, quietly enforced.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-7 text-stone-400">
            These are not promises. They are conditions of entry — to the marketplace, and to the trust
            we hold for one another as UM students.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {trustPillars.map((pillar) => (
            <TrustCard key={pillar.title} {...pillar} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustCard({
  title,
  body,
  icon: Icon,
}: Readonly<{ title: string; body: string; icon: LucideIcon }>) {
  return (
    <article className="luxury-glass-dark luxury-sheen group flex h-full flex-col rounded-[20px] p-7 transition duration-500 hover:-translate-y-1">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-200/30 bg-stone-950/50 text-amber-200">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <h3 className="luxury-font-display mt-7 text-2xl font-medium leading-tight text-stone-50">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-stone-300">{body}</p>
      <div className="luxury-rule mt-7" />
      <span aria-hidden="true" className="luxury-eyebrow mt-5 text-stone-500">
        Code · {title.slice(0, 1)}
      </span>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* UM Access CTA                                                       */
/* ------------------------------------------------------------------ */

function AccessCTA() {
  return (
    <section
      aria-labelledby="cercle-heading"
      className="relative isolate overflow-hidden px-4 py-28 sm:px-6 lg:px-8"
      id="cercle"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className="h-full w-full object-cover opacity-50"
          src="https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?auto=format&fit=crop&w=2200&q=85"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(212,175,106,0.22), transparent 40%), linear-gradient(180deg, rgba(8,6,5,0.78), rgba(8,6,5,0.92))",
        }}
      />

      <div className="luxury-glass-dark mx-auto max-w-5xl overflow-hidden rounded-[32px] p-6 sm:p-10 lg:p-14">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <span className="luxury-glass-dark flex h-10 w-10 items-center justify-center rounded-full text-amber-200">
                <GraduationCap aria-hidden="true" className="h-4 w-4" />
              </span>
              <p className="luxury-eyebrow text-amber-200/80">UM Access</p>
            </div>

            <h2
              className="luxury-font-display mt-6 text-[clamp(2.5rem,5vw,4.25rem)] font-light leading-[0.98] text-stone-50"
              id="cercle-heading"
            >
              Reserved <em className="luxury-gold not-italic">for UM students</em>.
            </h2>

            <p className="mt-6 max-w-xl text-[15px] leading-8 text-stone-300">
              Browse the marketplace, save listings, post wanted requests, and meet with verified
              students. UM email required — no exceptions, no strangers.
            </p>

            <ul className="mt-10 grid gap-3">
              {accessBenefits.map((benefit) => (
                <li className="flex items-start gap-3 text-[14px] leading-7 text-stone-200" key={benefit}>
                  <span
                    aria-hidden="true"
                    className="luxury-gold mt-2.5 inline-block h-1.5 w-1.5 shrink-0 rotate-45 bg-amber-300"
                  />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div className="luxury-glass-dark rounded-[24px] border border-amber-200/15 p-6 sm:p-8">
            <p className="luxury-eyebrow text-stone-400">Sign up</p>
            <h3 className="luxury-font-display mt-3 text-3xl font-medium text-stone-50">
              Join with your UM email
            </h3>
            <p className="mt-3 text-sm leading-6 text-stone-400">
              Use <span className="text-stone-200">@siswa.um.edu.my</span> or{" "}
              <span className="text-stone-200">@um.edu.my</span>. Confirmation is required before
              your first trade.
            </p>

            <div className="mt-8 grid gap-3">
              <Link
                className="luxury-gold-edge luxury-sheen inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-[12px] font-semibold uppercase"
                href="/signup"
                style={{ letterSpacing: "0.24em" }}
              >
                Sign up with UM email
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                className="luxury-ghost min-h-12"
                href="/login"
                style={{ letterSpacing: "0.24em" }}
              >
                <LogIn aria-hidden="true" className="h-3.5 w-3.5" />
                Already a student? Sign in
              </Link>
              <Link
                className="luxury-eyebrow mx-auto mt-1 inline-flex cursor-pointer items-center gap-2 text-amber-200 transition hover:text-amber-100"
                href="/trade"
              >
                Browse the marketplace first
                <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="luxury-rule my-8" />

            <ul className="grid gap-3 text-[12px] text-stone-400">
              <li className="flex items-center gap-2">
                <ShieldCheck aria-hidden="true" className="luxury-gold h-3.5 w-3.5" />
                Verified UM email only
              </li>
              <li className="flex items-center gap-2">
                <Compass aria-hidden="true" className="luxury-gold h-3.5 w-3.5" />
                Private contact, public pickup
              </li>
              <li className="flex items-center gap-2">
                <Leaf aria-hidden="true" className="luxury-gold h-3.5 w-3.5" />
                Free for every UM student, always
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

function UmNexusFooter() {
  return (
    <footer className="relative border-t border-white/8 bg-stone-950/80 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-stone-950/70">
                <Store aria-hidden="true" className="luxury-gold h-4 w-4" />
              </span>
              <span className="luxury-font-display text-2xl font-medium text-stone-50">
                UM Nexus<span className="luxury-gold px-1">·</span>Trade
              </span>
            </div>
            <p className="mt-5 text-sm leading-7 text-stone-400">
              The University of Malaya student marketplace. Verified students. Private contact. Public
              pickup. Built in Kuala Lumpur.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                className="luxury-gold-edge inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase"
                href="/trade"
                style={{ letterSpacing: "0.22em" }}
              >
                Open marketplace
                <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
              <Link
                className="luxury-ghost"
                href="/signup"
                style={{ letterSpacing: "0.22em" }}
              >
                Sign up
              </Link>
              <Link
                className="cursor-pointer rounded-full px-3 py-2 text-[11px] font-medium uppercase text-stone-300 transition hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200"
                href="/login"
                style={{ letterSpacing: "0.22em" }}
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="grid w-full max-w-2xl gap-10 sm:grid-cols-3 lg:max-w-xl">
            <FooterColumn title="Marketplace">
              <FooterLink href="/trade">Browse</FooterLink>
              <FooterLink href="/trade/sell">Sell an item</FooterLink>
              <FooterLink href="/trade/want">Post wanted</FooterLink>
              <FooterLink href="/trade/dashboard">My dashboard</FooterLink>
            </FooterColumn>
            <FooterColumn title="Campus">
              <FooterAddress city="Main Library" street="Pickup hub" />
              <FooterAddress city="KK12 / KK13" street="Residential plazas" />
              <FooterAddress city="Faculty Foyers" street="FSKTM · FBE · FoE" />
            </FooterColumn>
            <FooterColumn title="House">
              <FooterLink href="/safety">Safety</FooterLink>
              <FooterLink href="/terms">Terms</FooterLink>
              <FooterLink href="/privacy">Privacy</FooterLink>
              <FooterLink href="/safety">Safety &amp; help</FooterLink>
            </FooterColumn>
          </div>
        </div>

        <div className="luxury-rule mt-14" />

        <div className="mt-8 flex flex-col gap-3 text-[11px] uppercase text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p style={{ letterSpacing: "0.24em" }}>
            © MMXXVI UM Nexus Trade · University of Malaya
          </p>
          <p className="flex items-center gap-2" style={{ letterSpacing: "0.24em" }}>
            <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-amber-200" />
            Kuala Lumpur · Malaysia
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div>
      <p className="luxury-eyebrow text-amber-200/70">{title}</p>
      <ul className="mt-5 flex flex-col gap-3 text-sm text-stone-300">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: Readonly<{ href: string; children: React.ReactNode }>) {
  return (
    <li>
      <Link
        className="cursor-pointer transition hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200"
        href={href}
      >
        {children}
      </Link>
    </li>
  );
}

function FooterAddress({ city, street }: Readonly<{ city: string; street: string }>) {
  return (
    <li className="text-sm text-stone-300">
      <p className="luxury-font-display text-base text-stone-50">{city}</p>
      <p className="mt-1 text-[12px] text-stone-500">{street}</p>
    </li>
  );
}
