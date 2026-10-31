# Mobile browse performance

The public default feed starts from a small inline script during HTML parsing on
`/trade` and `/trade/explore`. It sends no credentials and never fetches account
records or contact details. Hydration consumes the same promise and seeds the
existing 30-second public memory cache. Expired, failed or mutation-invalidated
bootstrap responses fall back to the normal public fetch. Account pages do not
start this request. No API responses enter the service-worker cache.

The first two product photos load eagerly at high priority. Demo metadata and
photo components load near their viewport position, initially showing eight
items; the existing button exposes all 120. Offscreen demo cards use browser
content visibility. Product links and unopened account destinations no longer
prefetch route bundles; Home and Explore retain navigation prefetching.

Mobile navigation uses opaque white surfaces without backdrop blur. The loading
grid matches the two-column product layout and uses fewer static placeholders.

Production Playwright coverage checks loading before application scripts,
reuse after hydration/navigation, retry after an early API failure, account-route
exclusion, the mobile loading grid, deferred demos, photo caching, install/offline
behavior and existing workflows. Real-device Safari testing remains useful;
Chromium CPU throttling is a diagnostic approximation. Render free-service cold
starts remain an infrastructure limitation and are not removed by this change.
