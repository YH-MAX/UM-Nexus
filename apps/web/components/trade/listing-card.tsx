"use client";

import Link from "next/link";
import { Heart, MapPin, ShieldAlert, UserRound } from "lucide-react";

import {
  formatCategory,
  formatMoney,
  formatPickupLocation,
  formatRelativeTime,
  getSellerDisplayName,
  type Listing,
} from "@/lib/trade/api";

import { StatusPill, statusTone } from "./status-pill";

type ListingCardProps = Readonly<{
  listing: Listing;
  isSaved?: boolean;
  onToggleFavorite?: (listingId: string, nextSaved: boolean) => void | Promise<void>;
  showFavorite?: boolean;
}>;

export function ListingCard({
  listing,
  isSaved = false,
  onToggleFavorite,
  showFavorite = true,
}: ListingCardProps) {
  const primaryImage = listing.images.find((image) => image.is_primary) ?? listing.images[0];
  const condition = listing.condition ?? listing.condition_label;
  const href = `/trade/${listing.id}`;
  const sellerName = getSellerDisplayName(listing);

  async function handleFavorite(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    await onToggleFavorite?.(listing.id, !isSaved);
  }

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
      <Link aria-label={`Open ${listing.title}`} className="block" href={href}>
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-slate-100">
          {primaryImage?.public_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={listing.title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              src={primaryImage.public_url}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-emerald-50 px-5 text-center text-sm font-semibold text-slate-500">
              {primaryImage ? primaryImage.storage_path : "Photo coming soon"}
            </div>
          )}
          <div className="absolute left-3 top-3">
            <StatusPill className="bg-white/95 shadow-sm" tone={statusTone(listing.status)}>
              {listing.status.replaceAll("_", " ")}
            </StatusPill>
          </div>
          {listing.risk_level && listing.risk_level !== "low" ? (
            <div className="absolute bottom-3 left-3">
              <StatusPill tone={listing.risk_level === "high" ? "danger" : "warning"}>
                <ShieldAlert aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
                {listing.risk_level} risk
              </StatusPill>
            </div>
          ) : null}
        </div>

        <div className="space-y-3 p-4">
          <div>
            <h2 className="line-clamp-2 min-h-[2.75rem] text-base font-semibold leading-snug text-slate-950">
              {listing.title}
            </h2>
            <p className="mt-2 text-xl font-bold text-emerald-800">
              {formatMoney(listing.price, listing.currency)}
            </p>
          </div>

          <div className="space-y-2 text-sm text-slate-600">
            <p className="line-clamp-1">
              <span className="font-medium text-slate-700">{formatCategory(listing.category)}</span>
              {condition ? <span> · {condition.replaceAll("_", " ")}</span> : null}
            </p>
            <p className="flex items-center gap-1.5 text-slate-500">
              <MapPin aria-hidden="true" className="h-4 w-4 text-emerald-700" />
              Pickup: {formatPickupLocation(listing.pickup_location ?? listing.pickup_area)}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">
            <span className="flex min-w-0 items-center gap-1.5">
              <UserRound aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{sellerName}</span>
            </span>
            <span className="shrink-0">{formatRelativeTime(listing.created_at)}</span>
          </div>
        </div>
      </Link>

      {showFavorite ? (
        onToggleFavorite ? (
          <button
            aria-label={isSaved ? "Remove saved listing" : "Save listing"}
            className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border bg-white/95 shadow-sm transition hover:scale-105 ${
              isSaved ? "border-rose-200 text-rose-600" : "border-white/80 text-slate-700"
            }`}
            onClick={(event) => void handleFavorite(event)}
            type="button"
          >
            <Heart aria-hidden="true" className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
          </button>
        ) : (
          <Link
            aria-label="Sign in to save listing"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/95 text-slate-700 shadow-sm transition hover:scale-105"
            href="/login"
          >
            <Heart aria-hidden="true" className="h-4 w-4" />
          </Link>
        )
      ) : null}
    </article>
  );
}
