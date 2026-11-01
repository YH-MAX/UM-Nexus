# Mobile PWA UX validation

## Scope

The marketplace home header, banner and category shortcuts are compressed only on phones. Product cards, browsing context, the wanted board, authentication, favorites, seller contact methods, moderation and existing API contracts remain available. Details and authenticated posting use dedicated mobile action bars, while browsing keeps its five tabs. All mobile bars use the existing 1024px desktop breakpoint and reserve bottom safe-area space.

The final posting review starts with the item photo, title, price and pickup location. Description/contact information can be expanded. Optional quality advice and safety guidance remain available in a disclosure. Validation errors are connected to fields with `aria-describedby`, and invalid submissions focus the first field needing attention. Draft saving and optional AI publishing keep their existing endpoints and payloads.

## Automated checks

Run from `apps/web`:

```powershell
npm run lint
npm run test:e2e -- --reporter=list
npx playwright install webkit
npm run test:mobile -- --reporter=list
npm run build
npm run test:pwa -- --reporter=list
```

`playwright.mobile.config.ts` uses WebKit with the iPhone 13 profile and Chromium with the Pixel 5 profile. The home checks cover 375×667, 390×844 and 430×932, verify that both cards in the first row finish above the navigation, and capture screenshots. Tablet checks cover 768, 820, 1023 and 1024px. Detail checks cover working favorites and the seller-selected contact URL, and verify that the action bar replaces tabs below 1024px.

Keyboard checks cover a simulated separate visual viewport, actual layout viewport resizing, field/action visibility, inline validation, filter sheets, restoration after dismissal, toolbar resize and pinch-zoom false positives. Standalone launch is simulated using the iOS standalone flag. Existing production PWA tests separately verify install metadata, standalone routing, offline retry and cache behavior. The Next.js development badge is disabled only when the E2E authentication flag is set, so it cannot intercept bottom action buttons.

## Physical-device checks

Browser automation does not exercise a physical OS keyboard, camera, home indicator or installed iOS runtime. These remain device acceptance checks:

- iPhone Safari and Add to Home Screen: open search, title, description, price and contact fields; switch fields with the keyboard open; submit invalid details; dismiss the keyboard; confirm fields, errors and buttons remain reachable.
- Android Chrome and installed PWA: repeat the keyboard flow, including numeric price entry, and confirm there is one bottom action surface.
- On a notched iPhone, confirm the bottom controls clear the home indicator in portrait and landscape.
- Select or capture photos, move between all three posting steps, save a draft and publish. Confirm the cover photo and entered values survive step changes.
- Open a buyer listing, save it and open the seller-selected WhatsApp, Telegram or email destination. Return to the item and then the feed; verify the previous search, filters and scroll position remain.

These checks do not require changes to backend contracts.
