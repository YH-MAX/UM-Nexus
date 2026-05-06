export type AuthIntent =
  | "save_listing"
  | "contact_listing"
  | "report_listing"
  | "sell_item"
  | "post_wanted"
  | "dashboard";

const allowedIntents = new Set<AuthIntent>([
  "save_listing",
  "contact_listing",
  "report_listing",
  "sell_item",
  "post_wanted",
  "dashboard",
]);

export function sanitizeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }
  return value;
}

export function sanitizeIntent(value: string | null | undefined): AuthIntent | null {
  return value && allowedIntents.has(value as AuthIntent) ? (value as AuthIntent) : null;
}

export function buildAuthHref(
  mode: "login" | "signup",
  options: {
    returnTo: string;
    intent?: AuthIntent;
    listingId?: string;
  },
): string {
  const params = new URLSearchParams();
  params.set("returnTo", sanitizeReturnTo(options.returnTo));
  if (options.intent) {
    params.set("intent", options.intent);
  }
  if (options.listingId) {
    params.set("listingId", options.listingId);
  }
  return `/${mode}?${params.toString()}`;
}

export function applyIntentToReturnTo(returnTo: string, intent: AuthIntent | null, listingId?: string | null): string {
  const safeReturnTo = sanitizeReturnTo(returnTo);
  if (!intent) {
    return safeReturnTo;
  }

  const [path, query = ""] = safeReturnTo.split("?");
  const params = new URLSearchParams(query);
  params.set("intent", intent);
  if (listingId) {
    params.set("listingId", listingId);
  }
  const nextQuery = params.toString();
  return nextQuery ? `${path}?${nextQuery}` : path;
}
