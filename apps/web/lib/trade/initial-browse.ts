import { getCachedListings, getListings, type ListingsPage } from "./api";
import { publicCacheGeneration, rememberPublicListingsPage } from "./public-listing-cache";

declare global {
  interface Window {
    __umNexusPublicBrowse?: { startedAt: number; promise: Promise<ListingsPage | null> };
  }
}

let initialPending: { generation: number; promise: Promise<ListingsPage> } | undefined;

export async function getInitialBrowsePage(filters: Record<string, string>): Promise<ListingsPage> {
  const pagination = { limit: 24, offset: 0 };
  const cached = getCachedListings(filters, pagination);
  if (cached) return cached;
  const isDefault = filters.sort === "latest" && Object.keys(filters).every((key) => key === "sort" || !filters[key]);
  const generation = publicCacheGeneration();
  if (isDefault && initialPending?.generation === generation) return initialPending.promise;
  const bootstrap = window.__umNexusPublicBrowse;
  if (bootstrap && isDefault) {
    delete window.__umNexusPublicBrowse;
    if (generation === 0 && Date.now() - bootstrap.startedAt < 30_000) {
      const promise = bootstrap.promise.then((page) => {
        if (page && Array.isArray(page.items) && publicCacheGeneration() === generation) {
          rememberPublicListingsPage("limit=24&sort=latest", page, generation);
          return page;
        }
        return getListings(filters, pagination);
      }).finally(() => { if (initialPending?.promise === promise) initialPending = undefined; });
      initialPending = { generation, promise };
      return promise;
    }
  }
  return getListings(filters, pagination);
}
