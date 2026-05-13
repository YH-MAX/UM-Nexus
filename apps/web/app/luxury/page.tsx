import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import {
  ArrowUpRight,
  Compass,
  Crown,
  Diamond,
  Feather,
  Gem,
  HandMetal,
  KeyRound,
  Leaf,
  Mail,
  MapPin,
  Quote,
  ShieldCheck,
  Sparkles,
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
  title: "Nexus Maison · The Luxury Edit",
  description:
    "By-invitation luxury maison. Hand-finished pieces, atelier heritage from Genève, and a private member circle for the few who measure value in patience.",
};

const featuredPieces: ReadonlyArray<{
  edition: string;
  collection: string;
  name: string;
  price: string;
  image: string;
  story: string;
}> = [
  {
    edition: "I of XX",
    collection: "Haute Horlogerie",
    name: "Aurelia Tourbillon Noir",
    price: "RM 248,000",
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1400&q=85",
    story: "A skeletonised manual movement, finished by a single hand over 312 atelier hours.",
  },
  {
    edition: "VII of L",
    collection: "Maroquinerie",
    name: "Sienne Travel Trunk",
    price: "RM 78,500",
    image:
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1400&q=85",
    story: "Saddle-stitched in Florence from full-grain calfskin with patinated brass corners.",
  },
  {
    edition: "Reserve",
    collection: "Olfactif Privé",
    name: "Nuit de Sève — Parfum",
    price: "RM 4,900",
    image:
      "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1400&q=85",
    story: "Decanted in hand-blown crystal; oud Laotien, iris pallida, vetiver Haiti.",
  },
];

const atelierSteps: ReadonlyArray<{
  numeral: string;
  title: string;
  body: string;
}> = [
  {
    numeral: "I",
    title: "The Source",
    body: "Rare leathers, gold and stones are selected from house partners we have known for three generations.",
  },
  {
    numeral: "II",
    title: "The Atelier",
    body: "Each piece is hand-finished across many weeks by a single master in our Florence and Genève workshops.",
  },
  {
    numeral: "III",
    title: "The Mark",
    body: "Engraved with its edition number, the year, and the maker's signature — a quiet, lasting promise.",
  },
  {
    numeral: "IV",
    title: "The Delivery",
    body: "Couriered by hand in heritage trunks. Insured, white-glove, and accompanied by your maison concierge.",
  },
];

const houseCodes: ReadonlyArray<{
  title: string;
  body: string;
  icon: LucideIcon;
}> = [
  {
    title: "Provenance",
    body: "Every component traceable to its maker, dated and named on a hand-signed certificate.",
    icon: Compass,
  },
  {
    title: "Patience",
    body: "We release no more than four collections each year. Nothing is rushed; nothing is repeated.",
    icon: Feather,
  },
  {
    title: "Permanence",
    body: "Lifetime maintenance at any Maison salon — restoration is offered, never replacement.",
    icon: ShieldCheck,
  },
  {
    title: "Privacy",
    body: "Acquisitions, fittings, and communications are protected by maison-grade discretion.",
    icon: KeyRound,
  },
];

const cercleBenefits = [
  "Priority access to numbered editions before public release",
  "Private viewings in Genève, Florence and Kyoto salons",
  "Annual atelier visit with the maker of your piece",
  "Direct dialogue with our master craftsmen via concierge",
  "Heritage trunk delivery and bespoke commission service",
];

const pressNotes = [
  "Vogue",
  "Wallpaper*",
  "Architectural Digest",
  "Robb Report",
  "Monocle",
  "How to Spend It",
  "GQ",
  "T Magazine",
];

export default function LuxuryLandingPage() {
  return (
    <div
      className={`${luxuryDisplay.variable} ${luxuryBody.variable} luxury-surface luxury-font-body`}
    >
      <FloatingNav />

      <main>
        <Hero />
        <PressBand />
        <FeaturedPieces />
        <HeritageStory />
        <AtelierProcess />
        <HouseCodes />
        <CercleCTA />
      </main>

      <MaisonFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Nav                                                                 */
/* ------------------------------------------------------------------ */

function FloatingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 sm:pt-6">
      <nav className="luxury-glass-dark mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-full px-4 py-2.5 sm:px-6 sm:py-3">
        <Link
          aria-label="Nexus Maison — home"
          className="group flex items-center gap-3 rounded-full pr-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200"
          href="/luxury"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-stone-950/70">
            <Diamond aria-hidden="true" className="luxury-gold h-4 w-4" />
          </span>
          <span className="luxury-font-display text-xl font-medium leading-none text-stone-50 sm:text-2xl">
            Nexus<span className="luxury-gold px-1">·</span>Maison
          </span>
        </Link>

        <div className="hidden items-center gap-1 text-[11px] font-medium uppercase text-stone-200 md:flex">
          <NavLink href="#collection">Collection</NavLink>
          <NavLink href="#heritage">Heritage</NavLink>
          <NavLink href="#atelier">Atelier</NavLink>
          <NavLink href="#cercle">Cercle</NavLink>
        </div>

        <Link
          className="luxury-gold-edge inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase"
          href="#cercle"
          style={{ letterSpacing: "0.22em" }}
        >
          Reserve
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
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
          className="h-full w-full object-cover opacity-[0.55]"
          src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=2400&q=85"
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
          <p className="luxury-eyebrow">Maison Nexus · MMXXVI</p>

          <h1 className="luxury-font-display mt-6 text-[clamp(3rem,8vw,7rem)] font-light leading-[0.96] text-stone-50">
            Where time is
            <br />
            measured in <em className="luxury-gold not-italic">craft</em>.
          </h1>

          <p className="mt-8 max-w-xl text-[15px] leading-8 text-stone-300">
            A by-invitation maison of numbered editions, hand-finished in Genève and Florence.
            For the few who measure value in patience, provenance and the maker&apos;s quiet signature.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              className="luxury-gold-edge luxury-sheen inline-flex min-h-12 items-center gap-2 rounded-full px-6 py-3 text-[12px] font-semibold uppercase"
              href="#collection"
              style={{ letterSpacing: "0.24em" }}
            >
              View the Spring Edit
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              className="luxury-ghost min-h-12"
              href="#cercle"
              style={{ letterSpacing: "0.24em" }}
            >
              Request invitation
            </Link>
          </div>

          <div className="mt-14 grid max-w-xl gap-x-8 gap-y-2 sm:grid-cols-3">
            <HeroFact value="MMLXII" label="Maison founded" />
            <HeroFact value="03" label="Ateliers worldwide" />
            <HeroFact value="≤ 4" label="Editions per annum" />
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
      aria-label="Featured piece"
      className="luxury-glass-dark relative w-full max-w-md justify-self-end overflow-hidden rounded-[28px] p-5 sm:p-6 lg:sticky lg:bottom-10"
    >
      <div className="flex items-center justify-between">
        <p className="luxury-eyebrow text-stone-300">Reserved · Cercle Members</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5 text-amber-200">
          <Sparkles aria-hidden="true" className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Aurelia Tourbillon Noir — close-up of a hand-finished movement."
          className="h-64 w-full object-cover"
          src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85"
        />
      </div>

      <div className="mt-5">
        <p className="luxury-eyebrow text-stone-400">Haute Horlogerie · Edition I of XX</p>
        <h2 className="luxury-font-display mt-2 text-3xl font-medium text-stone-50">
          Aurelia Tourbillon Noir
        </h2>
        <div className="luxury-rule my-4" />
        <div className="flex items-end justify-between">
          <p className="text-[11px] uppercase text-stone-400" style={{ letterSpacing: "0.24em" }}>
            On reservation
          </p>
          <p className="luxury-font-display text-2xl text-amber-200">RM 248,000</p>
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Press marquee                                                       */
/* ------------------------------------------------------------------ */

function PressBand() {
  const items = [...pressNotes, ...pressNotes];
  return (
    <section
      aria-label="In the press"
      className="relative overflow-hidden border-y border-white/5 bg-stone-950/60 py-7"
    >
      <p className="luxury-eyebrow mb-5 text-center text-stone-500">As remarked upon in</p>
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
/* Featured pieces                                                     */
/* ------------------------------------------------------------------ */

function FeaturedPieces() {
  return (
    <section
      aria-labelledby="collection-heading"
      className="relative px-4 py-28 sm:px-6 lg:px-8"
      id="collection"
    >
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="luxury-eyebrow text-amber-200/80">The Spring Edit</p>
            <h2
              className="luxury-font-display mt-4 text-[clamp(2.25rem,4.6vw,3.75rem)] font-light leading-[1.04] text-stone-50"
              id="collection-heading"
            >
              Three pieces released to the world, this season.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-7 text-stone-400">
            Each is numbered, signed by its maker, and accompanied by a hand-written letter of provenance.
            Reserve through your concierge.
          </p>
        </header>

        <div className="luxury-rule mt-10" />

        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {featuredPieces.map((piece, index) => (
            <PieceCard {...piece} index={index} key={piece.name} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PieceCard({
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
            <Gem aria-hidden="true" className="h-4 w-4" />
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
          aria-label={`Enquire about ${name}`}
          className="luxury-eyebrow group/link mt-2 inline-flex w-fit cursor-pointer items-center gap-2 text-amber-200 transition hover:text-amber-100"
          href="#cercle"
        >
          Enquire
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
/* Heritage story                                                      */
/* ------------------------------------------------------------------ */

function HeritageStory() {
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
            alt="An artisan polishing brass fittings by lamplight inside the Florence atelier."
            className="aspect-[4/5] w-full rounded-[18px] object-cover"
            src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1300&q=85"
          />
          <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
            <span
              className="luxury-glass-dark rounded-full px-3 py-1 text-[10px] font-semibold uppercase text-stone-100"
              style={{ letterSpacing: "0.24em" }}
            >
              Atelier · Firenze
            </span>
            <span
              className="luxury-glass-dark rounded-full px-3 py-1 text-[10px] font-semibold uppercase text-stone-100"
              style={{ letterSpacing: "0.24em" }}
            >
              Est. 1962
            </span>
          </div>
        </div>

        <div>
          <p className="luxury-eyebrow text-amber-200/80">Since 1962 · Genève</p>
          <h2
            className="luxury-font-display mt-4 text-[clamp(2.25rem,4.4vw,3.5rem)] font-light leading-[1.05] text-stone-50"
            id="heritage-heading"
          >
            An atelier where
            <br />
            time refuses to hurry.
          </h2>

          <div className="luxury-rule mt-8" />

          <p className="mt-8 max-w-xl text-[15px] leading-8 text-stone-300">
            Three generations of makers have kept the same six benches in the same Genève workshop.
            We do not measure ourselves in volume, but in the weeks a single piece spends with its
            maker — and in the quiet pride of the signature that follows.
          </p>

          <figure className="mt-10 max-w-xl">
            <Quote aria-hidden="true" className="luxury-gold h-6 w-6" />
            <blockquote className="luxury-font-display mt-4 text-2xl font-light italic leading-snug text-stone-100 sm:text-3xl">
              &ldquo;Patience is not a delay. It is the work itself.&rdquo;
            </blockquote>
            <figcaption className="luxury-eyebrow mt-4 text-stone-400">
              — Henri Aurélien, Maître d&apos;atelier
            </figcaption>
          </figure>

          <Link
            className="luxury-eyebrow mt-10 inline-flex cursor-pointer items-center gap-2 text-amber-200 transition hover:text-amber-100"
            href="#atelier"
          >
            Read the Maison&apos;s heritage
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Atelier process                                                     */
/* ------------------------------------------------------------------ */

function AtelierProcess() {
  return (
    <section
      aria-labelledby="atelier-heading"
      className="relative px-4 py-28 sm:px-6 lg:px-8"
      id="atelier"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="luxury-eyebrow text-amber-200/80">The Atelier</p>
          <h2
            className="luxury-font-display mt-4 text-[clamp(2.25rem,4.4vw,3.5rem)] font-light leading-[1.04] text-stone-50"
            id="atelier-heading"
          >
            Four movements. One piece. Many quiet weeks.
          </h2>
        </div>

        <div className="luxury-rule mt-10" />

        <ol className="mt-14 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {atelierSteps.map((step, idx) => (
            <li className="relative flex flex-col" key={step.numeral}>
              <div className="flex items-baseline gap-5">
                <span aria-hidden="true" className="luxury-numeral text-7xl leading-none">
                  {step.numeral}
                </span>
                <span className="luxury-eyebrow text-stone-400">Movement</span>
              </div>
              <h3 className="luxury-font-display mt-4 text-2xl font-medium text-stone-50">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-stone-400">{step.body}</p>
              {idx < atelierSteps.length - 1 ? (
                <div
                  aria-hidden="true"
                  className="luxury-rule mt-8 hidden h-px lg:block"
                />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* House codes (brand values)                                          */
/* ------------------------------------------------------------------ */

function HouseCodes() {
  return (
    <section aria-labelledby="codes-heading" className="relative overflow-hidden px-4 py-28 sm:px-6 lg:px-8">
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
            <p className="luxury-eyebrow text-amber-200/80">The House Codes</p>
            <h2
              className="luxury-font-display mt-4 text-[clamp(2.25rem,4.4vw,3.5rem)] font-light leading-[1.04] text-stone-50"
              id="codes-heading"
            >
              Four values, quietly enforced.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-7 text-stone-400">
            These are not promises. They are conditions of entry — for the maison, and for those who
            join its circle.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {houseCodes.map((code) => (
            <HouseCodeCard key={code.title} {...code} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HouseCodeCard({
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
      <span
        aria-hidden="true"
        className="luxury-eyebrow mt-5 text-stone-500"
      >
        Code · {title.slice(0, 1)}
      </span>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Cercle CTA                                                          */
/* ------------------------------------------------------------------ */

function CercleCTA() {
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
          src="https://images.unsplash.com/photo-1604079628040-94301bb21b91?auto=format&fit=crop&w=2200&q=85"
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
                <Crown aria-hidden="true" className="h-4 w-4" />
              </span>
              <p className="luxury-eyebrow text-amber-200/80">By invitation</p>
            </div>

            <h2
              className="luxury-font-display mt-6 text-[clamp(2.5rem,5vw,4.25rem)] font-light leading-[0.98] text-stone-50"
              id="cercle-heading"
            >
              Le Cercle <em className="luxury-gold not-italic">Privé</em>.
            </h2>

            <p className="mt-6 max-w-xl text-[15px] leading-8 text-stone-300">
              A small, deliberately quiet membership for those who prefer their objects rare and
              their counsel discreet. Applications are reviewed in confidence by the Maison Council.
            </p>

            <ul className="mt-10 grid gap-3">
              {cercleBenefits.map((benefit) => (
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
            <p className="luxury-eyebrow text-stone-400">Application</p>
            <h3 className="luxury-font-display mt-3 text-3xl font-medium text-stone-50">
              Request your invitation
            </h3>
            <p className="mt-3 text-sm leading-6 text-stone-400">
              We respond within seven days, by hand. Membership is non-transferable.
            </p>

            <div className="mt-8 grid gap-3">
              <Link
                className="luxury-gold-edge luxury-sheen inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-[12px] font-semibold uppercase"
                href="mailto:cercle@nexus-maison.example"
                style={{ letterSpacing: "0.24em" }}
              >
                Submit application
                <Mail aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                className="luxury-ghost min-h-12"
                href="#collection"
                style={{ letterSpacing: "0.24em" }}
              >
                Speak with concierge
              </Link>
            </div>

            <div className="luxury-rule my-8" />

            <ul className="grid gap-3 text-[12px] text-stone-400">
              <li className="flex items-center gap-2">
                <ShieldCheck aria-hidden="true" className="luxury-gold h-3.5 w-3.5" />
                Reviewed by the Maison Council
              </li>
              <li className="flex items-center gap-2">
                <HandMetal aria-hidden="true" className="luxury-gold h-3.5 w-3.5" />
                Hand-delivered welcome trunk
              </li>
              <li className="flex items-center gap-2">
                <Leaf aria-hidden="true" className="luxury-gold h-3.5 w-3.5" />
                Lifetime maintenance, gratis
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

function MaisonFooter() {
  return (
    <footer className="relative border-t border-white/8 bg-stone-950/80 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-stone-950/70">
                <Diamond aria-hidden="true" className="luxury-gold h-4 w-4" />
              </span>
              <span className="luxury-font-display text-2xl font-medium text-stone-50">
                Nexus<span className="luxury-gold px-1">·</span>Maison
              </span>
            </div>
            <p className="mt-5 text-sm leading-7 text-stone-400">
              A by-invitation house of numbered editions and quiet craft. Genève · Firenze · Kyoto.
            </p>
          </div>

          <div className="grid w-full max-w-2xl gap-10 sm:grid-cols-3 lg:max-w-xl">
            <FooterColumn title="Maison">
              <FooterLink href="#collection">Collection</FooterLink>
              <FooterLink href="#heritage">Heritage</FooterLink>
              <FooterLink href="#atelier">Atelier</FooterLink>
              <FooterLink href="#cercle">Cercle Privé</FooterLink>
            </FooterColumn>
            <FooterColumn title="Salons">
              <FooterAddress city="Genève" street="14 Rue du Rhône" />
              <FooterAddress city="Firenze" street="Via Tornabuoni 7" />
              <FooterAddress city="Kyoto" street="Gion-Shinbashi" />
            </FooterColumn>
            <FooterColumn title="House">
              <FooterLink href="/terms">Terms</FooterLink>
              <FooterLink href="/privacy">Privacy</FooterLink>
              <FooterLink href="#cercle">Provenance</FooterLink>
              <FooterLink href="mailto:concierge@nexus-maison.example">Concierge</FooterLink>
            </FooterColumn>
          </div>
        </div>

        <div className="luxury-rule mt-14" />

        <div className="mt-8 flex flex-col gap-3 text-[11px] uppercase text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p style={{ letterSpacing: "0.24em" }}>© MMXXVI Nexus Maison · All rights reserved</p>
          <p className="flex items-center gap-2" style={{ letterSpacing: "0.24em" }}>
            <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-amber-200" />
            Atelier principal · Genève
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
