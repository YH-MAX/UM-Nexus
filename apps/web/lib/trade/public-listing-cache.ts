import type { Listing, ListingsPage } from "@/lib/trade/api";

// Public browse data only. Never persist accounts, contact destinations or tokens.
const TTL_MS = 30_000;
const MAX_ENTRIES = 100;
type Entry = { value: unknown; expires: number };
const entries = new Map<string, Entry>();
let generation = 0;

function read<T>(key: string): T | undefined {
  const entry = entries.get(key);
  if (!entry) return undefined;
  if (entry.expires <= Date.now()) {
    entries.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function write(key: string, value: unknown) {
  entries.delete(key);
  entries.set(key, { value, expires: Date.now() + TTL_MS });
  while (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!);
}

export function publicCacheGeneration() { return generation; }

export function invalidatePublicListings() {
  generation++;
  entries.clear();
}

export function getPublicListingSnapshot(id: string): Listing | undefined {
  return read<Listing>(`item:${id}`);
}

export function getPublicListingsPage(query: string): ListingsPage | undefined {
  return read<ListingsPage>(`page:${query}`);
}

export function rememberPublicListing(item: Listing, requestGeneration: number) {
  if (requestGeneration === generation && ["available", "reserved", "sold"].includes(item.status)) write(`item:${item.id}`, item);
}

export function rememberPublicListingsPage(query: string, page: ListingsPage, requestGeneration: number) {
  // A mutation may have occurred while this request was in flight.
  if (requestGeneration !== generation) return;
  for (const item of page.items) {
    rememberPublicListing(item, requestGeneration);
  }
  write(`page:${query}`, page);
}
