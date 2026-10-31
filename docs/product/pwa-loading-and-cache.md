# PWA loading and cache assessment

Measured on the live deployment on 2026-10-31. These measurements are from the test environment, not the user's signed-in iPhone session.

## Observed before this change

- First frontend response after idle: approximately 20 seconds. Subsequent document responses: approximately 0.6–1 second.
- First API response after idle: approximately 45–46 seconds. Warm listing-feed responses: approximately 1.8–2.5 seconds.
- A real item page took approximately 4–7 seconds to finish loading in the browser. Its primary item, trade-result and match requests were all awaited before rendering. Favorites added another dependency for signed-in users.
- Both web services use free Render instances in Oregon. Application logs showed both processes starting during the measurements. Render metrics returned no usable CPU/memory series, so resource saturation was not established.
- A sample reference photo returned `Cache-Control: public, max-age=0` with an ETag. The listing-feed response had no explicit cache policy or ETag. The service worker caches only the offline page and app icons.

## Implemented

The primary item request now renders the product independently. Seller intelligence loads afterward, and each response can update its own section. Buyers do not request seller-only trade results or matching suggestions. Favorites load independently. Enrichment polling refreshes enrichment status, rather than refetching the entire item and favorites every poll.

Public listing pages and public item previews use a browser-memory cache with a 30-second lifetime and a maximum of 100 combined page/item entries. Query keys include normalized filters and pagination. Simultaneous identical feed requests share one promise. Public feed reads skip session lookups and unnecessary JSON request headers.

A feed snapshot can render an item immediately during navigation. The full detail request still revalidates it every visit. If that request fails, the preview is removed and public cache entries are cleared. Only anonymous detail responses and the anonymous public feed populate the cache; authenticated item responses do not. Private/draft items, seller contact destinations, private account/profile responses, favorites, notifications and auth responses are not cached here. The public seller display information included in public listings follows the listing's short lifetime.

Writes invalidate public data before and after their response, including image upload/removal. A cache generation prevents reads from before a mutation from repopulating the cache afterward. Other users' edits can remain in a cached feed for up to 30 seconds; detail and contact endpoints still check the current server state. The cache disappears on a full reload or app termination. It is not an offline database or an authorization decision.

## Further caching priorities

| Priority | Location | Recommendation |
| --- | --- | --- |
| Implemented | Browser public listing data | Keep the small cache and measure repeat navigation before expanding it. |
| Next | Reference images and other public static media | Introduce content-versioned filenames, then long-lived browser caching. Consider CDN delivery if image latency remains significant. Do not mark mutable filenames immutable. |
| Later, if measurements justify it | Anonymous backend listing-feed queries | Consider a short cache keyed by filters, sort and pagination, with invalidation for publish/edit/status/moderation/image changes. First profile database queries and connection latency. |
| Only when sharing between processes is needed | Redis or another shared store | No evidence currently justifies the extra service. A shared store becomes useful when multiple instances need coordinated cache entries and invalidation. |
| Keep fresh | Contact destinations, permissions, account/profile, favorites and notifications | Do not place these responses into a shared public/CDN/service-worker cache. Scope any future private query cache by account and clear it on sign-out. |

Caching cannot remove a sleeping origin's startup delay on the first uncached request. Changing the service's compute plan is a separate hosting decision; this change does not alter plans or add a paid service. The current free Render web-service plan also lacks Render edge caching.

References verified during the investigation:

- https://render.com/docs/free#spinning-down-on-idle
- https://nextjs.org/docs/app/api-reference/file-conventions/public-folder#caching
