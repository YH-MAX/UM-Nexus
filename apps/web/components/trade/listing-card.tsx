"use client";

import Link from "next/link";
import { BadgeCheck, Heart, Image as ImageIcon, MapPin, ShieldAlert, UserRound } from "lucide-react";

import { buildAuthHref } from "@/lib/auth/return-intent";
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

const RISK_LABELS: Record<string, string> = {
  high: "Under review",
  medium: "Needs review",
};

export function ListingCard({
  listing,
  isSaved = false,
  onToggleFavorite,
  showFavorite = true,
}: ListingCardProps) {
  const primaryImage = listing.images.find((image) => image.is_primary) ?? listing.images[0];
  const condition = listing.condition ?? listing.condition_label;
  const href = `/trade/${listing.id}`;
  const favoriteSignInHref = buildAuthHref("login", {
    returnTo: href,
    intent: "save_listing",
    listingId: listing.id,
  });
  const sellerName = getSellerDisplayName(listing);
  const isVerified = listing.seller?.profile?.verified_um_email === true;
  const riskLabel = listing.risk_level ? (RISK_LABELS[listing.risk_level] ?? `${listing.risk_level} risk`) : null;

  async function handleFavorite(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    await onToggleFavorite?.(listing.id, !isSaved);
  }

  return (
    <article className="trade-card trade-card-hover group relative overflow-hidden">
      <Link aria-label={`Open ${listing.title}`} className="block" href={href}>
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-slate-100">
          {primaryImage?.public_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={listing.title}
              className="h-full w-full object-cover transition duration-300 ease-out group-hover:scale-[1.03]"
              src={primaryImage.public_url}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-50 text-slate-400">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
                <ImageIcon aria-hidden="true" className="h-6 w-6" />
              </span>
              <span className="text-xs font-semibold">No photo yet</span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/45 to-transparent opacity-80" />
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-4.5rem)] flex-wrap gap-2">
            <StatusPill className="bg-white/95 shadow-sm ring-1 ring-white/70" tone={statusTone(listing.status)}>
              {listing.status.replaceAll("_", " ")}
            </StatusPill>
          </div>
          {riskLabel && listing.risk_level !== "low" ? (
            <div className="absolute bottom-3 left-3">
              <StatusPill className="shadow-sm" tone={listing.risk_level === "high" ? "danger" : "warning"}>
                <ShieldAlert aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
                {riskLabel}
              </StatusPill>
            </div>
          ) : null}
        </div>

        <div className="space-y-3 p-4">
          {listing.status === "reserved" ? (
            <p className="trade-chip border-amber-200 bg-amber-50 text-amber-800">
              Reserved · backup interest welcome
            </p>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h2 className="line-clamp-2 min-h-[2.75rem] text-base font-semibold leading-snug text-slate-950 transition group-hover:text-emerald-800">
                {listing.title}
              </h2>
              <p className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1 text-right text-base font-bold text-emerald-900">
                {formatMoney(listing.price, listing.currency)}
              </p>
            </div>
            <p className="line-clamp-1 text-sm text-slate-600">
              <span className="font-medium text-slate-800">{formatCategory(listing.category)}</span>
              {condition ? <span> · {condition.replaceAll("_", " ")}</span> : null}
            </p>
          </div>

          <p className="flex min-w-0 items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-700" />
            <span className="truncate">
              Pickup: {formatPickupLocation(listing.pickup_location ?? listing.pickup_area)}
            </span>
          </p>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">
            <span className="flex min-w-0 items-center gap-1.5">
              <UserRound aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{sellerName}</span>
            </span>
            {isVerified ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
                UM verified
              </span>
            ) : (
              <span className="shrink-0">{formatRelativeTime(listing.created_at)}</span>
            )}
          </div>
          {isVerified ? (
            <p className="text-xs font-medium text-slate-400">{formatRelativeTime(listing.created_at)}</p>
          ) : null}
        </div>
      </Link>

      {showFavorite ? (
        onToggleFavorite ? (
          <button
            aria-label={isSaved ? "Remove saved listing" : "Save listing"}
            className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border bg-white/95 shadow-sm transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
              isSaved ? "border-rose-200 text-rose-600" : "border-white/80 text-slate-700 hover:text-rose-600"
            }`}
            onClick={(event) => void handleFavorite(event)}
            type="button"
          >
            <Heart aria-hidden="true" className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
          </button>
        ) : (
          <Link
            aria-label="Sign in to save listing"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/95 text-slate-700 shadow-sm transition hover:scale-105 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            href={favoriteSignInHref}
          >
            <Heart aria-hidden="true" className="h-4 w-4" />
          </Link>
        )
      ) : null}
    </article>
  );
}
