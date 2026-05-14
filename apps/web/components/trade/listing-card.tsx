"use client";

import Link from "next/link";
import { BadgeCheck, Heart, Image as ImageIcon, MapPin, ShieldAlert } from "lucide-react";

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
  /** Visual layout only; links and actions unchanged. */
  viewMode?: "grid" | "list";
}>;

const RISK_LABELS: Record<string, string> = {
  high: "Under review",
  medium: "Needs review",
};

function formatListingStatus(status: string): string {
  return status.replaceAll("_", " ");
}

function sellerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "UM";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase() || "UM";
}

export function ListingCard({
  listing,
  isSaved = false,
  onToggleFavorite,
  showFavorite = true,
  viewMode = "grid",
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
  const facultyLabel =
    listing.seller?.profile?.faculty?.trim() ||
    listing.seller?.profile?.residential_college?.trim() ||
    listing.seller?.profile?.college_or_location?.trim() ||
    null;
  const isList = viewMode === "list";

  async function handleFavorite(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    await onToggleFavorite?.(listing.id, !isSaved);
  }

  const imageBlock = (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-amber-100/40 via-stone-100 to-amber-50/30 ${
        isList ? "aspect-[4/3] w-full sm:aspect-square sm:w-44 sm:max-w-[11rem] sm:shrink-0" : "aspect-[4/3] w-full"
      }`}
    >
      {primaryImage?.public_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={listing.title}
          className="h-full w-full object-cover transition duration-200 ease-out group-hover:scale-[1.04]"
          src={primaryImage.public_url}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#f4e9d8] via-[#ebe4dc] to-[#e8dfd4] text-stone-500">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200/60 bg-white/90 shadow-sm">
            <ImageIcon aria-hidden="true" className="h-6 w-6 text-amber-700/70" />
          </span>
          <span className="text-xs font-semibold tracking-wide text-stone-600">No photo yet</span>
        </div>
      )}

      {!isList ? <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-stone-950/35 to-transparent opacity-90" /> : null}

      <div className="absolute left-3 top-3 flex max-w-[calc(100%-4.5rem)] flex-wrap gap-2">
        <StatusPill
          className="rounded-full border-0 bg-white/95 px-2.5 py-0.5 text-[11px] capitalize shadow-sm ring-1 ring-stone-200/80"
          tone={statusTone(listing.status)}
        >
          {formatListingStatus(listing.status)}
        </StatusPill>
      </div>
      {riskLabel && listing.risk_level !== "low" ? (
        <div className={`absolute left-3 ${isList ? "bottom-3 sm:bottom-auto sm:left-3 sm:top-12" : "bottom-3"}`}>
          <StatusPill className="shadow-sm" tone={listing.risk_level === "high" ? "danger" : "warning"}>
            <ShieldAlert aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
            {riskLabel}
          </StatusPill>
        </div>
      ) : null}
    </div>
  );

  const body = (
    <div className={`flex min-w-0 flex-1 flex-col ${isList ? "justify-center p-4 sm:py-4" : "p-4"}`}>
      {listing.status === "reserved" && !isList ? (
        <p className="trade-chip mb-2 border-amber-200 bg-amber-50 text-amber-900">Reserved · backup interest welcome</p>
      ) : null}
      {listing.status === "reserved" && isList ? (
        <p className="mb-2 inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
          Reserved · backup interest welcome
        </p>
      ) : null}

      <div className={isList ? "space-y-2" : "space-y-3"}>
        <div className={`flex gap-3 ${isList ? "items-start" : "items-start justify-between"}`}>
          <h2
            className={`min-w-0 font-semibold leading-snug text-stone-950 transition group-hover:text-amber-900/90 ${
              isList ? "line-clamp-2 text-base sm:text-[17px]" : "line-clamp-1 text-base"
            }`}
          >
            {listing.title}
          </h2>
          {!isList ? (
            <p className="shrink-0 text-right text-base font-bold leading-tight text-amber-700">
              {formatMoney(listing.price, listing.currency)}
            </p>
          ) : null}
        </div>
        {isList ? (
          <p className="text-lg font-bold text-amber-700">{formatMoney(listing.price, listing.currency)}</p>
        ) : null}

        <p className="line-clamp-1 text-sm text-stone-600">
          <span className="font-medium text-stone-800">{formatCategory(listing.category)}</span>
          {condition ? (
            <span>
              {" "}
              · <span className="capitalize">{condition.replaceAll("_", " ")}</span>
            </span>
          ) : null}
        </p>
      </div>

      <p className="mt-3 flex min-w-0 items-center gap-1.5 rounded-xl border border-stone-100 bg-stone-50/80 px-3 py-2 text-sm text-stone-600">
        <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-amber-700/90" />
        <span className="truncate">Pickup: {formatPickupLocation(listing.pickup_location ?? listing.pickup_area)}</span>
      </p>

      <div
        className={`mt-3 flex items-center gap-3 border-t border-stone-100 pt-3 text-xs font-medium text-stone-500 ${
          isList ? "flex-wrap sm:flex-nowrap" : "justify-between"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-stone-200 text-[11px] font-bold text-stone-800 ring-1 ring-stone-200/80">
            {sellerInitials(sellerName)}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="flex min-w-0 items-center gap-1.5 truncate text-stone-800">
              <span className="truncate">{sellerName}</span>
            </span>
            {facultyLabel ? <span className="truncate text-[11px] text-stone-500">{facultyLabel}</span> : null}
          </span>
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {isVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
              <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
              UM verified
            </span>
          ) : null}
          <span className="text-[11px] text-stone-400">{formatRelativeTime(listing.created_at)}</span>
        </span>
      </div>
    </div>
  );

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-stone-200 bg-[#fffdf8] shadow-sm transition duration-200 ease-out hover:-translate-y-1 hover:border-stone-300/90 hover:shadow-md ${
        isList ? "sm:flex sm:items-stretch" : ""
      }`}
    >
      <Link
        aria-label={`Open ${listing.title}`}
        className={`min-w-0 text-left ${isList ? "flex w-full flex-1 flex-col sm:flex-row" : "block"}`}
        href={href}
      >
        {imageBlock}
        {body}
      </Link>

      {showFavorite ? (
        onToggleFavorite ? (
          <button
            aria-label={isSaved ? "Remove saved listing" : "Save listing"}
            className={`absolute flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/90 bg-white text-stone-600 shadow-md transition duration-200 hover:scale-105 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
              isList ? "right-3 top-3" : "right-3 top-3"
            } ${isSaved ? "border-rose-200 text-rose-600" : ""}`}
            onClick={(event) => void handleFavorite(event)}
            type="button"
          >
            <Heart aria-hidden="true" className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
          </button>
        ) : (
          <Link
            aria-label="Sign in to save listing"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/90 bg-white text-stone-600 shadow-md transition duration-200 hover:scale-105 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            href={favoriteSignInHref}
          >
            <Heart aria-hidden="true" className="h-4 w-4" />
          </Link>
        )
      ) : null}
    </article>
  );
}
