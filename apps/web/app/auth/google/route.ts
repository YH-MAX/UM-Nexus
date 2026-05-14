import { type NextRequest, NextResponse } from "next/server";

import { buildGoogleOAuthCallbackUrl } from "@/lib/auth/google-oauth-redirect";
import { buildAuthHref, sanitizeIntent, sanitizeReturnTo } from "@/lib/auth/return-intent";
import { createRouteSupabaseClient } from "@/lib/supabase/route-client";

function getRequestOrigin(request: NextRequest): string {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || request.nextUrl.host;
  const protocol = forwardedProtocol || request.nextUrl.protocol.replace(":", "");
  return `${protocol}://${host}`;
}

function getAuthReturnUrl(request: NextRequest, message: string): URL {
  const from = request.nextUrl.searchParams.get("from") === "signup" ? "signup" : "login";
  const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const intent = sanitizeIntent(request.nextUrl.searchParams.get("intent"));
  const listingId = request.nextUrl.searchParams.get("listingId") ?? undefined;
  const url = new URL(
    buildAuthHref(from, {
      returnTo,
      intent: intent ?? undefined,
      listingId,
    }),
    getRequestOrigin(request),
  );
  url.searchParams.set("authError", message);
  return url;
}

export async function GET(request: NextRequest) {
  const { applyCookies, supabase } = createRouteSupabaseClient(request);
  const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const intent = sanitizeIntent(request.nextUrl.searchParams.get("intent"));
  const listingId = request.nextUrl.searchParams.get("listingId");
  const from = request.nextUrl.searchParams.get("from") === "signup" ? "signup" : "login";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildGoogleOAuthCallbackUrl({
        origin: getRequestOrigin(request),
        returnTo,
        intent,
        listingId,
        from,
      }),
      queryParams: { prompt: "select_account" },
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return applyCookies(
      NextResponse.redirect(
        getAuthReturnUrl(
          request,
          error?.message || "Could not start Google sign-in. Please try again.",
        ),
      ),
    );
  }

  return applyCookies(NextResponse.redirect(data.url));
}
