"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState } from "@/components/trade/empty-state";
import { ListingCard } from "@/components/trade/listing-card";
import { LoadingSkeleton } from "@/components/trade/loading-skeleton";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  getFavorites,
  removeFavorite,
  type ListingFavorite,
} from "@/lib/trade/api";

export default function SavedListingsPage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [favorites, setFavorites] = useState<ListingFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadFavorites() {
    setFavorites(await getFavorites());
  }

  useEffect(() => {
    if (isAuthLoading || !user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    void loadFavorites()
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

  async function toggleFavorite(listingId: string, nextSaved: boolean) {
    if (nextSaved) {
      return;
    }
    try {
      await removeFavorite(listingId);
      await loadFavorites();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update saved listing.");
    }
  }

  const availableFavorites = favorites.filter((favorite) => favorite.listing !== null);

  return (
    <TradeShell
      title="Saved listings"
      description="Compare items you are interested in by price, condition, pickup location, and seller response."
    >
      {error ? (
        <div className="trade-alert trade-alert-danger">
          {error}
        </div>
      ) : null}

      {!user ? (
        <RequireAuthCard description="Sign in with your UM account to save and review listings." returnTo="/trade/saved" />
      ) : null}

      {user && isLoading ? (
        <LoadingSkeleton />
      ) : user && availableFavorites.length === 0 ? (
        <EmptyState
          actionHref="/trade"
          actionLabel="Browse Listings"
          description="You have not saved any listings yet. Browse listings and tap the heart icon to save items here."
          icon={Heart}
          title="No saved listings yet"
        />
      ) : user ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-3">
          {availableFavorites.map((favorite) => (
            favorite.listing ? (
              <ListingCard
                isSaved
                key={favorite.id}
                listing={favorite.listing}
                onToggleFavorite={toggleFavorite}
              />
            ) : null
          ))}
        </section>
      ) : null}
    </TradeShell>
  );
}
