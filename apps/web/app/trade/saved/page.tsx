"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { ListingCard } from "@/components/trade/listing-card";
import { TradeShell } from "@/components/trade/trade-shell";
import { getFavorites, type ListingFavorite } from "@/lib/trade/api";

export default function SavedListingsPage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [favorites, setFavorites] = useState<ListingFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading || !user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    void getFavorites()
      .then((items) => {
        if (isMounted) {
          setFavorites(items);
        }
      })
      .catch((nextError) => {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load saved listings.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, user]);

  const availableFavorites = favorites.filter((favorite) => favorite.listing !== null);

  return (
    <TradeShell
      title="Saved listings"
      description="Keep interesting UM marketplace items in one place while you compare price, condition, pickup fit, and seller response."
    >
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {!user ? (
        <RequireAuthCard description="Sign in with your UM account to save and review listings." />
      ) : null}

      {user && isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Loading saved listings...
        </div>
      ) : user && availableFavorites.length === 0 ? (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-950">No saved listings yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Save items from listing detail pages when you want to compare them later.
          </p>
          <Link
            className="mt-4 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
            href="/trade"
          >
            Browse marketplace
          </Link>
        </section>
      ) : user ? (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {availableFavorites.map((favorite) => (
            favorite.listing ? <ListingCard key={favorite.id} listing={favorite.listing} /> : null
          ))}
        </section>
      ) : null}
    </TradeShell>
  );
}
