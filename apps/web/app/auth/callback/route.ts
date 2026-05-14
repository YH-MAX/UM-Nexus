import { type NextRequest, NextResponse } from "next/server";

import {
  getAllowedEmailDomainsFromEnv,
  isAllowedEmailDomain,
} from "@/lib/auth/allowed-email-domains";
import { formatOAuthRedirectError } from "@/lib/auth/oauth-redirect-error";
import {
  applyIntentToReturnTo,
  buildAuthHref,
  sanitizeIntent,
  sanitizeReturnTo,
} from "@/lib/auth/return-intent";
import { createRouteSupabaseClient } from "@/lib/supabase/route-client";

const allowedDomains = getAllowedEmailDomainsFromEnv();

function isEmailConfirmed(user: { email_confirmed_at?: string | null } | null): boolean {
  return Boolean(user?.email_confirmed_at);
}

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

function getSuccessUrl(request: NextRequest): URL {
  const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const intent = sanitizeIntent(request.nextUrl.searchParams.get("intent"));
  const listingId = request.nextUrl.searchParams.get("listingId");
  return new URL(
    applyIntentToReturnTo(returnTo, intent, listingId),
    getRequestOrigin(request),
  );
}

export async function GET(request: NextRequest) {
  const { applyCookies, supabase } = createRouteSupabaseClient(request);
  const errorCode = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");

  if (errorCode) {
    return NextResponse.redirect(
      getAuthReturnUrl(request, formatOAuthRedirectError(errorCode, errorDescription)),
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      getAuthReturnUrl(request, "Google sign-in did not return a code. Please try again."),
    );
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !session?.user) {
    return applyCookies(
      NextResponse.redirect(
        getAuthReturnUrl(
          request,
          error?.message || "Could not complete Google sign-in. Please try again.",
        ),
      ),
    );
  }

  const email = session.user.email;
  if (!email || !isAllowedEmailDomain(email, allowedDomains)) {
    await supabase.auth.signOut();
    return applyCookies(
      NextResponse.redirect(
        getAuthReturnUrl(
          request,
          "Your account must have a University of Malaya email address to use UM Nexus Trade.",
        ),
      ),
    );
  }

  if (!isEmailConfirmed(session.user)) {
    await supabase.auth.signOut();
    return applyCookies(
      NextResponse.redirect(
        getAuthReturnUrl(request, "Confirm your UM email address before signing in."),
      ),
    );
  }

  return applyCookies(NextResponse.redirect(getSuccessUrl(request)));
}
