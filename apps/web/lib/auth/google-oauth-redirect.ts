import { sanitizeReturnTo, type AuthIntent } from "@/lib/auth/return-intent";

export type GoogleOAuthFromPage = "login" | "signup";

export type BuildGoogleOAuthCallbackUrlInput = Readonly<{
  origin: string;
  returnTo: string;
  intent: AuthIntent | null;
  listingId: string | null | undefined;
  from: GoogleOAuthFromPage;
}>;

/**
 * Supabase redirects here after Google; query params are preserved when Supabase appends `code` / `state`.
 * Add this exact path to Supabase Auth → URL configuration → Redirect URLs (prod + localhost).
 */
export function buildGoogleOAuthCallbackUrl(input: BuildGoogleOAuthCallbackUrlInput): string {
  const params = new URLSearchParams();
  params.set("returnTo", sanitizeReturnTo(input.returnTo));
  if (input.intent) {
    params.set("intent", input.intent);
  }
  if (input.listingId) {
    params.set("listingId", input.listingId);
  }
  params.set("from", input.from);

  const base = input.origin.replace(/\/$/, "");
  return `${base}/auth/callback?${params.toString()}`;
}
