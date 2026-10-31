# PWA reference UI

The supplied mobile mockup guides this update. Its white surfaces, deep teal actions, compact sans-serif typography, two-column product grid and raised create action take precedence over the UI skill's general palette suggestions.

## Screens and navigation

- `/trade`: campus banner, search, colored category shortcuts and latest listings.
- `/trade/explore`: all items, horizontally scrollable categories, quick mobile filters and the existing full filter sheet. Desktop filters wrap within the available width.
- `/trade/{id}`: photo first, then price, seller, description and direct contact. Real listings support previous/next photos and an accessible native zoom dialog with thumbnails. Existing save/report and seller management actions remain functional.
- `/trade/sell`: compact photo strip with the current five-photo limit, category selection, native condition radio choices, item fields and the seller's preferred contact method. Review, drafts and the optional AI assistant remain available.
- `/trade/profile`: actual account identity, verified-email status, listing/saved/view counts from the authenticated dashboard, and working links to listings, saved items, settings, safety and terms. Editing opens the existing profile form; counts display a dash while loading rather than invented values.

Mobile navigation exposes Home, Explore, Sell, Saved and Profile. Alerts remain available in the app bar, and the wanted board remains reachable from the homepage and desktop navigation. Safe-area spacing, keyboard focus states and reduced-motion support remain in place.

## Data and performance

The current single preferred contact method (WhatsApp, Telegram or email) remains the source of buyer contact actions. No approval step or fictional contact information is added. Example items remain clearly disclosed and do not acquire fake sellers, verified badges or transaction actions.

Responsive card image sizes now match the two-column mobile grid. Existing public-data caching, hashed photo assets and restricted seller-photo optimization remain in use. The campus photograph is a bundled, hashed WebP; its source, attribution, license and resizing/cropping notes are recorded in `apps/web/lib/trade/campus-photo.json` and available through the visible photo-credit control. The adapted photograph is distributed under CC BY-SA 4.0. The UM Nexus diamond brand is retained rather than inventing an official university crest.

## Validation

Workflow coverage includes posting, photo selection, direct contact, saving, editing, moderation, notifications, wanted offers, gallery navigation, profile settings and mobile grid layout. Visual checks cover Home, Explore, detail, posting and profile screens on phone and desktop viewports. Production checks retain the PWA install/offline and image caching/security coverage.
