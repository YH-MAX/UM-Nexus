"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  getAllowedEmailDomainsFromEnv,
  isAllowedEmailDomain,
} from "@/lib/auth/allowed-email-domains";
import { AUTH_DOMAIN_REJECTED_KEY, AUTH_OAUTH_ERROR_KEY } from "@/lib/auth/auth-storage-keys";
import { formatOAuthRedirectError } from "@/lib/auth/oauth-redirect-error";
import { applyIntentToReturnTo, buildAuthHref, sanitizeIntent, sanitizeReturnTo } from "@/lib/auth/return-intent";

const allowedDomains = getAllowedEmailDomainsFromEnv();

function isEmailConfirmed(user: { email_confirmed_at?: string | null } | null): boolean {
  return Boolean(user?.email_confirmed_at);
}

function readOAuthErrorFromUrl(): { code: string | null; description: string | null } {
  if (typeof window === "undefined") {
    return { code: null, description: null };
  }
  const url = new URL(window.location.href);
  const fromQuery = (key: string) => url.searchParams.get(key);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const code = fromQuery("error") ?? hash.get("error");
  const description = fromQuery("error_description") ?? hash.get("error_description");
  return { code, description };
}

export function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase } = useAuth();
  const [status, setStatus] = useState("Signing you in…");

  useEffect(() => {
    const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));
    const intent = sanitizeIntent(searchParams.get("intent"));
    const listingId = searchParams.get("listingId");
    const from = searchParams.get("from") === "signup" ? "signup" : "login";
    const nextPath = applyIntentToReturnTo(returnTo, intent, listingId);
    const authReturnHref = buildAuthHref(from, {
      returnTo,
      intent: intent ?? undefined,
      listingId: listingId ?? undefined,
    });

    let cancelled = false;

    void (async () => {
      const { code: oauthErrorCode, description: oauthErrorDescription } = readOAuthErrorFromUrl();
      if (oauthErrorCode) {
        const message = formatOAuthRedirectError(oauthErrorCode, oauthErrorDescription);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(AUTH_OAUTH_ERROR_KEY, message);
        }
        if (!cancelled) {
          router.replace(authReturnHref);
        }
        return;
      }

      try {
        const href = typeof window !== "undefined" ? window.location.href : "";
        const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
        const hasPkceCode = Boolean(url?.searchParams.get("code"));

        if (hasPkceCode && href && url) {
          const pkceCode = url.searchParams.get("code");
          const pkceGuardKey = pkceCode ? `um_nexus_pkce_exchanged_${pkceCode}` : null;
          const alreadyExchanged = pkceGuardKey ? Boolean(sessionStorage.getItem(pkceGuardKey)) : false;

          if (!alreadyExchanged) {
            setStatus("Completing sign-in…");
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(href);
            if (exchangeError) {
              if (typeof window !== "undefined") {
                window.sessionStorage.setItem(
                  AUTH_OAUTH_ERROR_KEY,
                  exchangeError.message || "Could not complete Google sign-in.",
                );
              }
              if (!cancelled) {
                router.replace(authReturnHref);
              }
              return;
            }
            if (pkceGuardKey) {
              sessionStorage.setItem(pkceGuardKey, "1");
            }
          }
        }

        setStatus("Signing you in…");
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(
              AUTH_OAUTH_ERROR_KEY,
              sessionError.message || "Could not load your session.",
            );
          }
          if (!cancelled) {
            router.replace(authReturnHref);
          }
          return;
        }

        if (!session?.user) {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(
              AUTH_OAUTH_ERROR_KEY,
              "Google sign-in did not return a session. Please try again.",
            );
          }
          if (!cancelled) {
            router.replace(authReturnHref);
          }
          return;
        }

        const email = session.user.email;
        if (!email || !isAllowedEmailDomain(email, allowedDomains)) {
          await supabase.auth.signOut();
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(AUTH_DOMAIN_REJECTED_KEY, email ? "domain" : "email");
          }
          if (!cancelled) {
            router.replace(authReturnHref);
          }
          return;
        }

        if (!isEmailConfirmed(session.user)) {
          await supabase.auth.signOut();
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(
              AUTH_OAUTH_ERROR_KEY,
              "Confirm your UM email address before signing in.",
            );
          }
          if (!cancelled) {
            router.replace(authReturnHref);
          }
          return;
        }

        if (!cancelled) {
          router.replace(nextPath);
          router.refresh();
        }
      } catch {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            AUTH_OAUTH_ERROR_KEY,
            "Something went wrong during Google sign-in. Please try again.",
          );
        }
        if (!cancelled) {
          router.replace(authReturnHref);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams, supabase]);

  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ color: "rgba(245, 245, 244, 0.85)" }}
    >
      <Loader2 aria-hidden className="h-8 w-8 animate-spin" style={{ color: "#D6B36A" }} />
      <p className="text-sm leading-6" style={{ color: "rgba(245, 245, 244, 0.65)" }}>
        {status}
      </p>
    </div>
  );
}
