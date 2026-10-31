"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Expand, PlusCircle, X } from "lucide-react";

import { TradeShell } from "@/components/trade/trade-shell";
import { formatCategory, formatMoney } from "@/lib/trade/api";
import { describeListingExample, type ListingExample } from "@/lib/trade/listing-examples";
import photoData from "@/lib/trade/example-photos.json";
import { exampleImages } from "@/lib/trade/example-images";

const photos: Record<string, (typeof photoData)[keyof typeof photoData]> = photoData;

export function ExampleListingDetail({ item, related }: Readonly<{ item: ListingExample; related: ListingExample[] }>) {
  const photo = photos[item.id];
  const image = exampleImages[item.id];
  const [photoOpen, setPhotoOpen] = useState(false);
  const photoDialog = useRef<HTMLDialogElement>(null);
  const price = item.price === 0 ? "Free" : formatMoney(item.price);

  return (
    <TradeShell hideHero title={item.title} description="Explore this example listing and get inspiration for your own campus post.">
      <Link className="trade-button-ghost hidden w-fit md:inline-flex" href="/trade"><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to marketplace</Link>
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-950" role="note">
        <strong>Demo · not for sale.</strong> This is a fictional example, with no seller or pickup available. The photo and price are illustrative.
      </div>
      <div className="nexus-example-detail-grid">
        <div className="contents">
          <section aria-label="Item photo" className="nexus-example-media trade-card overflow-hidden">
            <button aria-label={`Enlarge photo of ${item.title}`} className="relative flex aspect-[4/3] w-full items-center justify-center bg-[#f1ede7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600" onClick={() => { setPhotoOpen(true); photoDialog.current?.showModal(); }} type="button">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={photo.alt} className="h-full w-full object-contain" decoding="async" height={image.full.height} sizes="(min-width: 1024px) 60vw, calc(100vw - 32px)" src={image.full.src} srcSet={image.detailSrcSet} width={image.full.width} />
              <span className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-medium shadow-sm"><Expand aria-hidden="true" className="h-4 w-4" /> View photo</span>
            </button>
            <div className="p-3 text-[10px] leading-5 text-slate-500" id="photo-credit">
              {photo.kind === "ai" ? <p>AI-generated reference photo, not a seller&apos;s item photo.</p> : <p>
                Reference photo: <a className="underline" href={photo.sourceUrl} rel="noopener noreferrer" target="_blank">{photo.sourceTitle}</a>{" · "}{photo.author}{" · "}<a className="underline" href={photo.licenseUrl} rel="noopener noreferrer" target="_blank">{photo.license}</a>{" · "}{photo.changes}
              </p>}
            </div>
          </section>
          <section aria-labelledby="example-description" className="nexus-example-description trade-card p-4 sm:p-6">
            <h2 className="text-xl font-semibold" id="example-description">About this item</h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">{describeListingExample(item)}</p>
          </section>
        </div>
        <section aria-label="Example item details" className="nexus-example-summary trade-card min-w-0 p-4 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Example listing</p>
          <h1 className="mt-2 text-xl font-semibold leading-tight text-slate-950">{item.title}</h1>
          <p className="mt-4 text-3xl font-bold text-emerald-800">{price}</p>
          <p className="mt-1 text-xs text-stone-500">Illustrative price · not a live offer</p>
          <dl className="my-6 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 border-y border-stone-100 py-5 text-sm">
            <dt className="text-stone-500">Category</dt><dd className="font-medium">{formatCategory(item.category)}</dd>
            <dt className="text-stone-500">Listing type</dt><dd className="font-medium">{item.price === 0 ? "Free item example" : "Resale example"}</dd>
            <dt className="text-stone-500">Availability</dt><dd className="font-medium">Demo only</dd>
          </dl>
          <p className="mb-4 text-sm leading-6 text-stone-600">Have something like this? Publish your own item with your photos, price and preferred contact method.</p>
          <Link className="trade-button-primary w-full" href="/trade/sell"><PlusCircle aria-hidden="true" className="h-4 w-4" /> Post a similar item</Link>
          <Link className="trade-button-secondary mt-3 w-full" href="/trade">Browse marketplace <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
        </section>
      </div>
      <section aria-labelledby="related-examples" className="mt-8">
        <h2 className="text-xl font-semibold" id="related-examples">More examples in {formatCategory(item.category)}</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {related.map((other) => <Link className="trade-card overflow-hidden transition hover:border-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600" href={`/trade/${other.id}`} key={other.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={photos[other.id].alt} className="aspect-[4/3] w-full bg-[#f1ede7] object-contain" decoding="async" height={exampleImages[other.id].card.height} loading="lazy" sizes="(min-width: 1024px) 33vw, 50vw" src={exampleImages[other.id].card.src} srcSet={exampleImages[other.id].cardSrcSet} width={exampleImages[other.id].card.width} />
            <div className="p-3"><p className="text-[11px] font-medium text-amber-800">Demo · not for sale</p><h3 className="mt-2 text-sm font-semibold">{other.title}</h3><p className="mt-2 text-sm text-emerald-800">{other.price === 0 ? "Free" : formatMoney(other.price)}</p></div>
          </Link>)}
        </div>
      </section>
      <dialog aria-label={`Photo of ${item.title}`} className="m-auto w-[calc(100%-2rem)] max-w-4xl rounded-2xl bg-[#fffdf8] p-4 backdrop:bg-black/70" onClose={() => setPhotoOpen(false)} ref={photoDialog}>
        <form className="flex justify-end" method="dialog"><button aria-label="Close photo" className="trade-button-ghost" type="submit"><X aria-hidden="true" className="h-5 w-5" /></button></form>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photoOpen ? <img alt={photo.alt} className="max-h-[70dvh] w-full object-contain" height={image.full.height} src={image.full.src} width={image.full.width} /> : null}
        <p className="mt-3 text-center text-xs text-stone-500">Reference photo · fictional example</p>
      </dialog>
    </TradeShell>
  );
}
