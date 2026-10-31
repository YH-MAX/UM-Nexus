# Direct listing contact

Sellers choose WhatsApp, Telegram or email when creating or editing a listing. Signed-in UM buyers see a direct link to the selected channel, without a contact-request form or seller approval. The desktop panel and mobile fixed action use the same authenticated contact response. Opening a contact link does not send a message automatically.

`GET /api/v1/listings/{id}/contact` requires an active, confirmed UM account. Buyer profile completion and the historical request-approval state are not prerequisites. Contact values remain absent from the public listing/feed schemas. Responses are `private, no-store`; contact values are not added to the PWA offline cache.

Buyers can contact available/reserved listings with an eligible moderation status and active seller. Sold, hidden, deleted and draft listings do not expose contact to buyers. Sellers can read their own saved contact settings while editing drafts and other owned listings.

WhatsApp numbers are normalized to international digits for `wa.me`. Telegram usernames are converted to `t.me` links. Email uses the listing-specific address; a blank email uses the seller's verified account email. Publishing and contact-setting updates reject invalid destinations and unsupported URL schemes.

The old `in_app` option has no direct messaging implementation and is omitted from seller forms. Legacy listings using it need their seller to select a supported method and save once. No third-party contact information is substituted silently. Existing request tables/APIs, historical notifications and wanted-response workflows are retained for compatibility; the active listing flow does not create a pending request or a fictitious transaction.

No database migration is needed. Deploy the API endpoint before the frontend when releasing this change. This implementation was prepared locally; it does not itself deploy or change production data.
