import Link from "next/link";

import {
  formatCategory,
  formatMoney,
  type Listing,
} from "@/lib/trade/api";

import { StatusPill } from "./status-pill";

type ListingCardProps = Readonly<{
  listing: Listing;
}>;

export function ListingCard({ listing }: ListingCardProps) {
  const primaryImage = listing.images.find((image) => image.is_primary) ?? listing.images[0];

  return (
    <Link
      className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
      href={`/trade/${listing.id}`}
    >
      <div className="flex aspect-[4/3] items-center justify-center bg-slate-100">
        {primaryImage?.public_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={listing.title}
            className="h-full w-full object-cover"
            src={primaryImage.public_url}
          />
        ) : (
          <div className="px-5 text-center text-sm font-medium text-slate-500">
            {primaryImage ? primaryImage.storage_path : "No image metadata"}
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          <StatusPill>{formatCategory(listing.category)}</StatusPill>
          <StatusPill tone={listing.status === "available" ? "good" : listing.status === "reserved" ? "warn" : "neutral"}>
            {listing.status}
          </StatusPill>
          {listing.condition_label ? (
            <StatusPill>{listing.condition_label.replaceAll("_", " ")}</StatusPill>
          ) : null}
          <StatusPill tone={listing.is_ai_enriched ? "good" : "warn"}>
            {listing.is_ai_enriched ? "AI enriched" : "Not enriched"}
          </StatusPill>
          {listing.risk_level ? (
            <StatusPill tone={listing.risk_level === "high" ? "danger" : listing.risk_level === "medium" ? "warn" : "good"}>
              {listing.risk_level} risk
            </StatusPill>
          ) : null}
          {listing.moderation_status !== "approved" ? (
            <StatusPill tone="warn">{listing.moderation_status.replaceAll("_", " ")}</StatusPill>
          ) : null}
        </div>
        <div>
          <h2 className="line-clamp-2 text-lg font-semibold text-slate-950">
            {listing.title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {listing.pickup_area ?? "Pickup TBD"}
            {listing.residential_college ? ` · ${listing.residential_college}` : ""}
          </p>
          {listing.contact_method ? (
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              Contact by request · {listing.contact_method}
            </p>
          ) : null}
        </div>
        <p className="text-xl font-semibold text-emerald-800">
          {formatMoney(listing.price, listing.currency)}
        </p>
      </div>
    </Link>
  );
}
