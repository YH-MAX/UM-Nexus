# PWA reference UI

The supplied mobile mockup guides this update. Its white surfaces, deep teal actions, compact sans-serif typography, two-column product grid and raised create action take precedence over the UI skill's general palette suggestions.

## Screens and navigation

- `/trade`: compact mobile brand header, search, short campus banner, horizontal category shortcuts and latest listings. At 375×667, 390×844 and 430×932, the first row of live cards fits above the browsing navigation.
- `/trade/explore`: live items only, horizontally scrollable categories, quick mobile filters and an accessible full filter dialog. Desktop filters wrap within the available width. Posting examples retain their existing detail routes but are not appended to either browse feed.
- `/trade/{id}`: photo first, then price, seller, description and direct contact. Below 1024px, a single Favorite/Contact action bar replaces browsing tabs; guests retain sign-in return intents, unavailable listings disable contact and owners get My Trade/Edit actions. Real listings support previous/next photos and an accessible native zoom dialog with thumbnails. Existing save/report and seller management actions remain functional.
- `/trade/sell`: three stages (Photos & details, Price & pickup, Review & publish), with the current five-photo limit, native condition radio choices and the seller's preferred contact method. Authenticated mobile posting uses one Back/Continue action bar, changing to Publish at review. Review starts with a compact photo/title/price/pickup summary, displays required errors only and collapses optional quality guidance. Edits and selected photos survive movement between stages. Save draft remains available, and the AI assistant opens on demand. Publishing still uses the existing manual and AI API contracts.
- `/trade/profile`: actual account identity, verified-email status, listing/saved/view counts from the authenticated dashboard, and working links to listings, saved items, settings, safety and terms. Editing opens the existing profile form; counts display a dash while loading rather than invented values.

Browsing navigation exposes Home, Explore, Sell, Saved and Profile below 1024px; desktop navigation starts at 1024px. Detail and authenticated posting screens use dedicated action bars at the same breakpoint. Alerts remain available in the app bar, and the wanted board remains reachable from the homepage and desktop navigation. Safe-area spacing, keyboard focus states and reduced-motion support remain in place. Mobile listing cards use at least 14px titles, 20px prices and visible pickup locations.

The shell tracks the visual viewport during text editing so Safari keyboard resizing can raise action bars and keep fields clear of them. Chrome can resize the layout viewport through `interactive-widget=resizes-content`. Browsing tabs hide while a keyboard is open, input text remains at least 16px on phones, and filter sheets fit the remaining visible height. Pinch zoom and small toolbar resizes do not count as a keyboard. See [mobile UX validation](mobile-ux-validation.md) for automation coverage and physical-device checks.

Search, filters and grid/list preference are encoded in the browse URL. Session storage keeps only the scroll position, loaded-item count and last browse URL; it does not persist marketplace responses or account data. Returning through browser history or the item page's mobile back link reloads the necessary result pages before restoring the scroll position. The filter dialog uses native modal focus containment and Escape handling, returns focus to its trigger, locks background scrolling and provides a persistent Show results action. Invalid price ranges disable that action.

## Data and performance

The current single preferred contact method (WhatsApp, Telegram or email) remains the source of buyer contact actions. No approval step or fictional contact information is added. Example items remain clearly disclosed and do not acquire fake sellers, verified badges or transaction actions.

Responsive card image sizes now match the two-column mobile grid. Existing public-data caching, hashed photo assets and restricted seller-photo optimization remain in use. The campus photograph is a bundled, hashed WebP; its source, attribution, license and resizing/cropping notes are recorded in `apps/web/lib/trade/campus-photo.json` and available through the visible photo-credit control. The adapted photograph is distributed under CC BY-SA 4.0. The UM Nexus diamond brand is retained rather than inventing an official university crest.

## Validation

Workflow coverage includes posting, photo selection, direct contact, saving, editing, moderation, notifications, wanted offers, gallery navigation, profile settings and mobile grid layout. Visual checks cover Home, Explore, detail, posting and profile screens on phone and desktop viewports. Production checks retain the PWA install/offline and image caching/security coverage.
