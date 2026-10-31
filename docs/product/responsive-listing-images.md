# Responsive listing images

The marketplace keeps its existing layout and photo credits. Cards use smaller image candidates; detail pages retain larger images.

## Bundled example photos

Run `npm run images:build` in `apps/web` after changing an original photo or its entry in `lib/trade/example-photos.json`. The pinned Sharp dependency generates 240, 400 and 480 pixel WebP thumbnails when smaller than the source. Full-size versions preserve the original bytes. The generated manifest and assets are committed, so Render serves them without runtime resizing.

Each generated filename contains a SHA-256 content digest. Only `/example-photos/optimized/` receives `public, max-age=31536000, immutable`. Mutable original paths remain available with their existing policy for compatibility. Generation retains older hashed files to avoid breaking previously opened pages; remove obsolete assets only as a deliberate release-retention decision.

Cards expose thumbnail-only `srcset` candidates and responsive `sizes`. Detail photos include the full-size candidate. The zoom photo is mounted only while the dialog is open. Original source/provenance records and visible photo credits are unchanged.

For the current 120 photos, original full-size bytes total 3,049,184. The largest card candidates total 1,355,180 bytes, a 56% reduction. Actual transferred bytes depend on viewport, pixel density, lazy loading and browser cache.

## Seller uploads

`ListingPhoto` uses Next.js image optimization for the configured Supabase project's public `listing-images` bucket. Upload objects already use UUID paths; the image's content hash (or image id for legacy records) also versions the source URL. Source replacements therefore receive a different optimized cache key.

The browser selects widths using responsive `sizes`. The main detail photo loads eagerly; cards and additional gallery photos load lazily. Generated derivatives use a minimum 24-hour cache lifetime. First-time resizing consumes the existing web service's CPU; no separate or paid image service is introduced. The server's derivative cache is ephemeral on free Render instances, while the browser cache remains useful across server restarts.

The optimizer accepts only this project's public storage path and the bundled hashed-photo directory. Other hosts, private/API routes and arbitrary local files are not approved image sources. Data/blob previews, development uploads and legacy external URLs retain ordinary image rendering rather than being proxied through the optimizer.

This does not change account/contact caching, storage permissions, the service worker or hosting plans. Image caching reduces repeat image work; it cannot remove origin wake-up delays after idle.

## Build reliability

The first Render build of this release exposed a Google Fonts loader failure on the sell and wanted routes. The same Cormorant Garamond, Montserrat and Geist Latin font families are now bundled in `apps/web/fonts`, with their SIL OFL licenses and source/digest records. `next/font/local` retains the existing weights, CSS variables and swap behavior, while removing the Google font download dependency from builds. Next.js emits hashed font assets with its standard static-asset cache policy.
