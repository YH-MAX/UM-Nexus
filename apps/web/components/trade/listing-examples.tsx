"use client";

import Link from "next/link";
import { useState } from "react";
import { Armchair, BookOpen, CookingPot, Gift, Laptop, Lightbulb, PlusCircle, Shirt, Trophy } from "lucide-react";

import type { ListingFilters } from "@/components/trade/marketplace-filter-panel";
import { formatCategory, formatMoney } from "@/lib/trade/api";
import { findListingExamples, listingExamples } from "@/lib/trade/listing-examples";
import photoData from "@/lib/trade/example-photos.json";
import { exampleImages, exampleCardSizes } from "@/lib/trade/example-images";

type ExamplePhoto = {
  kind?: string;
  src: string;
  alt: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  sourceTitle: string;
  changes: string;
};
const examplePhotos: Record<string, ExamplePhoto> = photoData;

const categoryIcons = {
  textbooks_notes: BookOpen,
  electronics: Laptop,
  dorm_room: Lightbulb,
  kitchen_appliances: CookingPot,
  furniture: Armchair,
  clothing: Shirt,
  sports_hobby: Trophy,
  free_items: Gift,
};

export function ListingExamples({ filters, viewMode }: Readonly<{ filters: ListingFilters; viewMode: "grid" | "list" }>) {
  // Remount on filter changes so a new search always starts with one page.
  return <ExampleCollection filters={filters} key={JSON.stringify(filters)} viewMode={viewMode} />;
}

function ExampleCollection({ filters, viewMode }: Readonly<{ filters: ListingFilters; viewMode: "grid" | "list" }>) {
  const [limit, setLimit] = useState(24);
  const examples = findListingExamples(filters);
  if (!examples.length) return null;

  return (
    <section aria-labelledby="listing-examples-heading" className="nexus-examples space-y-3 border-t border-slate-100 pt-5">
      <div className="nexus-example-intro flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">Campus inspiration · {listingExamples.length} examples</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950" id="listing-examples-heading">Have something like this?</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            Demo items for posting inspiration, not real offers. Prices and reference photos are illustrative. Share your own item and photos to start a real campus trade.
          </p>
        </div>
        <Link className="trade-button-primary shrink-0" href="/trade/sell">
          <PlusCircle aria-hidden="true" className="h-4 w-4" /> Post your own item
        </Link>
      </div>

      <p aria-live="polite" className="text-sm text-stone-500">Showing {Math.min(limit, examples.length)} of {examples.length} demo items · separate from live listings</p>
      <div className={viewMode === "grid" ? "nexus-listing-grid grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-4"}>
        {examples.slice(0, limit).map((item) => {
          const Icon = categoryIcons[item.category as keyof typeof categoryIcons];
          const photo = examplePhotos[item.id];
          const image = exampleImages[item.id];
          return (
            <article aria-label={`Demo item: ${item.title}`} className={`nexus-listing-card overflow-hidden rounded-xl border border-slate-200 bg-white ${viewMode === "list" ? "sm:flex" : ""}`} key={item.id}>
              <Link aria-label={`View ${item.title}`} href={`/trade/${item.id}`} className={`relative flex items-center justify-center overflow-hidden bg-[#f1ede7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600 ${viewMode === "list" ? "h-40 sm:h-auto sm:w-44 sm:shrink-0" : "aspect-[4/3]"}`}>
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={photo.alt} className="absolute inset-0 h-full w-full object-contain" decoding="async" height={image.card.height} loading="lazy" sizes={viewMode === "list" ? "(min-width: 640px) 176px, calc(100vw - 48px)" : exampleCardSizes} src={image.card.src} srcSet={image.cardSrcSet} width={image.card.width} />
                ) : <Icon aria-hidden="true" className="h-16 w-16 text-amber-800/70" strokeWidth={1.25} />}
                <span className="absolute left-1.5 top-1.5 rounded-full border border-amber-200 bg-white/95 px-2 py-0.5 text-[9px] font-medium text-amber-900 shadow-sm">Demo · not for sale</span>
                <span className="absolute bottom-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[9px] text-stone-600 shadow-sm">{photo?.kind === "ai" ? "AI reference photo" : photo ? "Reference photo" : "Category illustration"}</span>
              </Link>
              <div className="flex min-w-0 flex-1 flex-col p-2.5 sm:p-3">
                <p className="hidden text-xs font-medium text-slate-500 sm:block">{formatCategory(item.category)}</p>
                <h3 className="mt-1 line-clamp-2 text-[13px] font-semibold leading-snug sm:text-sm text-stone-950"><Link className="hover:underline focus-visible:underline" href={`/trade/${item.id}`}>{item.title}</Link></h3>
                <p className="mt-1 text-sm text-slate-950"><span className="font-semibold">{item.price === 0 ? "Free" : formatMoney(item.price)}</span></p>
                <p className="mt-1 text-[10px] text-slate-500">Illustrative price · demo item</p>
                <Link aria-label={`View details of ${item.title}`} className="mt-2 inline-flex min-h-8 items-center text-xs font-medium text-teal-800" href={`/trade/${item.id}`}>View item</Link>
                <Link aria-label={`Post your own item like ${item.title}`} className="mt-1 text-[10px] text-slate-500 underline underline-offset-4" href="/trade/sell">Post a similar item</Link>
                {photo ? (
                  <details className="mt-2 text-[10px] leading-5 text-slate-500">
                    <summary className="cursor-pointer rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500">{photo.kind === "ai" ? "About this photo" : "Photo credit"}</summary>
                    {photo.kind === "ai" ? <p className="mt-1">AI-generated reference image for this fictional example. Not a seller&apos;s item photo.</p> : <p className="mt-1 break-words">
                      <a className="underline underline-offset-2" href={photo.sourceUrl} rel="noopener noreferrer" target="_blank">{photo.sourceTitle}</a>
                      {" · "}{photo.author}{" · "}
                      <a className="underline underline-offset-2" href={photo.licenseUrl} rel="noopener noreferrer" target="_blank">{photo.license}</a>
                      {" · "}{photo.changes}
                    </p>}
                  </details>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      {limit < examples.length ? (
        <div className="flex justify-center">
          <button className="trade-button-secondary min-h-12 rounded-2xl" onClick={() => setLimit((value) => value + 24)} type="button">More demo items ({examples.length - limit} remaining)</button>
        </div>
      ) : null}
    </section>
  );
}
