"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { ListingFilters } from "./marketplace-filter-panel";
import { findListingExamples } from "@/lib/trade/listing-examples";

const Examples = dynamic(() => import("./listing-examples").then((module) => module.ListingExamples), { ssr: false });

export function DeferredListingExamples(props: Readonly<{ filters: ListingFilters; viewMode: "grid" | "list" }>) {
  const anchor = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const hasExamples = findListingExamples(props.filters).length > 0;
  useEffect(() => {
    if (ready || !anchor.current) return;
    if (!("IntersectionObserver" in window)) { setReady(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setReady(true); observer.disconnect(); }
    }, { rootMargin: "150px" });
    observer.observe(anchor.current);
    return () => observer.disconnect();
  }, [ready, hasExamples]);
  if (!hasExamples) return null;
  return <div aria-label="Have something like this?" ref={anchor} role="region">{ready ? <Examples {...props} /> : <div className="min-h-40 border-t border-slate-100 pt-5"><h2 className="text-lg font-semibold">Have something like this?</h2><p className="mt-2 text-xs text-slate-500">Browse 120 demo examples for posting inspiration.</p><button className="trade-button-secondary mt-3" onClick={() => setReady(true)} type="button">Show demo items</button></div>}</div>;
}
