"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  getAllowedEmailDomainError,
  getAllowedEmailDomainsFromEnv,
} from "@/lib/auth/allowed-email-domains";
import { applyIntentToReturnTo, sanitizeIntent, sanitizeReturnTo } from "@/lib/auth/return-intent";

type AuthFormProps = {
  mode: "login" | "signup";
};

const allowedDomains = getAllowedEmailDomainsFromEnv();

const AUTH_DOMAIN_REJECTED_KEY = "um_nexus_auth_domain_error";

const trustPoints = [
  { icon: ShieldCheck, label: "Verified UM identities" },
  { icon: KeyRound, label: "Private seller contact" },
  { icon: MapPin, label: "Safer campus meetups" },
];

function formatAuthErrorMessage(message: string | undefined): string {
  if (!message) {
    return "Authentication failed. Please try again.";
  }

  if (message.toLowerCase().includes("failed to fetch")) {
    return "Cannot reach Supabase Auth. Check the Supabase project URL/public key and make sure the project is active, then restart the web app.";
  }

  return message;
}

function isEmailConfirmed(user: { email_confirmed_at?: string | null } | null): boolean {
  return Boolean(user?.email_confirmed_at);
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOAuthSubmitting, setIsOAuthSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isEmailFormVisible, setIsEmailFormVisible] = useState(false);

  const isSignup = mode === "signup";
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));
  const intent = sanitizeIntent(searchParams.get("intent"));
  const listingId = searchParams.get("listingId");
  const nextPath = applyIntentToReturnTo(returnTo, intent, listingId);
  const oppositeParams = new URLSearchParams();
  oppositeParams.set("returnTo", returnTo);
  if (intent) {
    oppositeParams.set("intent", intent);
  }
  if (listingId) {
    oppositeParams.set("listingId", listingId);
  }
  const oppositeHref = `/${isSignup ? "login" : "signup"}?${oppositeParams.toString()}`;
  const emailHelpId = `${mode}-email-help`;
  const passwordHelpId = `${mode}-password-help`;
  const emailFormRegionId = `${mode}-email-form`;
  const title = isSignup ? "Create your account" : "Welcome back";
  const description = isSignup
    ? "Continue with your University of Malaya email to join UM Nexus Trade."
    : "Continue with your University of Malaya email to access UM Nexus Trade.";
  const googleLabel = isSignup ? "Continue with Google" : "Continue with Google";
  const emailToggleLabel = isSignup ? "Sign up with email" : "Sign in with email";
  const submitLabel = isSignup ? "Create account" : "Sign in";
  const pendingLabel = isSignup ? "Creating account..." : "Signing in...";
  const anyPending = isSubmitting || isOAuthSubmitting;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const reason = window.sessionStorage.getItem(AUTH_DOMAIN_REJECTED_KEY);
    if (!reason) {
      return;
    }
    window.sessionStorage.removeItem(AUTH_DOMAIN_REJECTED_KEY);
    if (reason === "email") {
      setError("Your account must have a University of Malaya email address to use UM Nexus Trade.");
    } else {
      setError(
        getAllowedEmailDomainError("not-allowed@example.com", allowedDomains) ??
          "Use a University of Malaya email address.",
      );
    }
  }, []);

  async function handleGoogle() {
    setError(null);
    setStatusMessage(null);
    setIsOAuthSubmitting(true);

    try {
      const redirectTo =
        typeof window === "undefined"
          ? undefined
          : `${window.location.origin}/login?${oppositeParams.toString()}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: redirectTo
          ? {
              redirectTo,
              queryParams: { prompt: "select_account" },
            }
          : undefined,
      });

      if (oauthError) {
        setError(formatAuthErrorMessage(oauthError.message));
        setIsOAuthSubmitting(false);
      }
      // On success the browser is redirected; no need to reset state.
    } catch (oauthError) {
      setError(
        formatAuthErrorMessage(
          oauthError instanceof Error ? oauthError.message : undefined,
        ),
      );
      setIsOAuthSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatusMessage(null);

    const domainError = getAllowedEmailDomainError(email, allowedDomains);
    if (domainError) {
      setError(domainError);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignup) {
        const emailRedirectTo =
          typeof window === "undefined"
            ? undefined
            : `${window.location.origin}/login?${oppositeParams.toString()}`;
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: emailRedirectTo ? { emailRedirectTo } : undefined,
        });

        if (signUpError) {
          setError(formatAuthErrorMessage(signUpError.message));
          return;
        }

        if (!data.session || !isEmailConfirmed(data.user)) {
          if (data.session) {
            await supabase.auth.signOut();
          }
          setStatusMessage(
            "Check your UM email and confirm your account before signing in.",
          );
        } else {
          router.push(nextPath);
          router.refresh();
        }

        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(formatAuthErrorMessage(signInError.message));
        return;
      }

      if (!isEmailConfirmed(data.user)) {
        await supabase.auth.signOut();
        setError("Confirm your UM email address before signing in.");
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch (authError) {
      setError(
        formatAuthErrorMessage(
          authError instanceof Error ? authError.message : undefined,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article
      aria-labelledby={`${mode}-card-title`}
      className="luxury-glass-dark relative w-full overflow-hidden rounded-[28px] p-6 sm:p-8"
      style={{ background: "rgba(20, 20, 20, 0.55)" }}
    >
      <header>
        <p
          className="luxury-eyebrow"
          style={{ color: "rgba(214, 179, 106, 0.85)" }}
        >
          {isSignup ? "Verified UM Access" : "Secure sign in"}
        </p>
        <h1
          className="luxury-font-display mt-3 text-3xl font-medium leading-tight sm:text-4xl"
          id={`${mode}-card-title`}
          style={{ color: "#F5F5F4" }}
        >
          {title}
        </h1>
        <p
          className="mt-3 text-sm leading-6"
          style={{ color: "rgba(245, 245, 244, 0.65)" }}
        >
          {description}
        </p>
      </header>

      <div className="mt-7 space-y-4">
        <button
          aria-busy={isOAuthSubmitting}
          className="luxury-button-gold"
          disabled={anyPending}
          onClick={handleGoogle}
          type="button"
        >
          {isOAuthSubmitting ? (
            <>
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              <GoogleMark className="h-[18px] w-[18px]" />
              {googleLabel}
            </>
          )}
        </button>

        <div aria-hidden="true" className="luxury-divider">
          or
        </div>

        <button
          aria-controls={emailFormRegionId}
          aria-expanded={isEmailFormVisible}
          className="luxury-button-glass"
          disabled={anyPending}
          onClick={() => setIsEmailFormVisible((current) => !current)}
          type="button"
        >
          <Mail aria-hidden="true" className="h-4 w-4" />
          {emailToggleLabel}
        </button>

        {/* Domain note — always visible so users see it before opening the email form */}
        <p
          className="flex items-start gap-2 text-[12px] leading-5"
          style={{ color: "rgba(245, 245, 244, 0.55)" }}
        >
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
            style={{ color: "#D6B36A" }}
          />
          Only <span style={{ color: "#F5F5F4" }}>@siswa.um.edu.my</span> and{" "}
          <span style={{ color: "#F5F5F4" }}>@um.edu.my</span> accounts are allowed.
        </p>
      </div>

      {isEmailFormVisible ? (
        <form
          className="mt-6 space-y-5"
          id={emailFormRegionId}
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <label
              className="luxury-eyebrow block"
              htmlFor={`${mode}-email`}
              style={{ color: "rgba(245, 245, 244, 0.85)", letterSpacing: "0.22em" }}
            >
              UM email
            </label>
            <div className="relative">
              <Mail
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "rgba(245, 245, 244, 0.45)" }}
              />
              <input
                aria-describedby={emailHelpId}
                autoComplete="email"
                className="luxury-input"
                id={`${mode}-email`}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@siswa.um.edu.my"
                required
              />
            </div>
            <span
              className="block text-[12px] leading-5"
              id={emailHelpId}
              style={{ color: "rgba(245, 245, 244, 0.50)" }}
            >
              Use your @siswa.um.edu.my or @um.edu.my account.
            </span>
          </div>

          <div className="space-y-2">
            <label
              className="luxury-eyebrow block"
              htmlFor={`${mode}-password`}
              style={{ color: "rgba(245, 245, 244, 0.85)", letterSpacing: "0.22em" }}
            >
              Password
            </label>
            <div className="relative">
              <LockKeyhole
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "rgba(245, 245, 244, 0.45)" }}
              />
              <input
                aria-describedby={passwordHelpId}
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="luxury-input pr-12"
                id={`${mode}-password`}
                type={isPasswordVisible ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isSignup ? "Create a password" : "Enter your password"}
                minLength={8}
                required
              />
              <button
                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-stone-300 transition hover:bg-white/10 hover:text-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
                onClick={() => setIsPasswordVisible((current) => !current)}
                type="button"
              >
                {isPasswordVisible ? (
                  <EyeOff aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Eye aria-hidden="true" className="h-4 w-4" />
                )}
              </button>
            </div>
            <span
              className="block text-[12px] leading-5"
              id={passwordHelpId}
              style={{ color: "rgba(245, 245, 244, 0.50)" }}
            >
              Minimum 8 characters.
            </span>
          </div>

          <button
            aria-busy={isSubmitting}
            className="luxury-button-gold"
            disabled={anyPending}
            type="submit"
          >
            {isSubmitting ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                {pendingLabel}
              </>
            ) : (
              submitLabel
            )}
          </button>
        </form>
      ) : null}

      {error ? (
        <div
          aria-live="polite"
          className="mt-5 flex gap-3 rounded-2xl border px-4 py-3 text-sm leading-6"
          role="alert"
          style={{
            background: "rgba(244, 63, 94, 0.10)",
            borderColor: "rgba(244, 63, 94, 0.35)",
            color: "#fecdd3",
          }}
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {statusMessage ? (
        <div
          aria-live="polite"
          className="mt-5 flex gap-3 rounded-2xl border px-4 py-3 text-sm leading-6"
          role="status"
          style={{
            background: "rgba(214, 179, 106, 0.10)",
            borderColor: "rgba(214, 179, 106, 0.35)",
            color: "#f5e7c4",
          }}
        >
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{statusMessage}</p>
        </div>
      ) : null}

      <ul className="mt-7 grid gap-2">
        {trustPoints.map(({ icon: Icon, label }) => (
          <li
            className="flex items-center gap-3 text-[13px]"
            key={label}
            style={{ color: "rgba(245, 245, 244, 0.78)" }}
          >
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"
              style={{
                borderColor: "rgba(214, 179, 106, 0.30)",
                background: "rgba(20, 20, 20, 0.55)",
                color: "#D6B36A",
              }}
            >
              <Icon aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
            {label}
          </li>
        ))}
      </ul>

      <div className="luxury-rule my-7" />

      <p
        className="text-center text-sm"
        style={{ color: "rgba(245, 245, 244, 0.65)" }}
      >
        {isSignup ? "Already have an account?" : "Need an account?"}{" "}
        <Link
          className="font-medium underline underline-offset-4 transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200"
          href={oppositeHref}
          style={{ color: "#D6B36A" }}
        >
          {isSignup ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </article>
  );
}

/**
 * Official Google "G" mark. Inlined because lucide-react does not ship brand icons.
 */
function GoogleMark({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M43.611 20.083H42V20H24v8h11.303C33.717 32.65 29.262 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.65-.389-3.917z"
        fill="#FFC107"
      />
      <path
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
        fill="#FF3D00"
      />
      <path
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.231 0-9.671-3.33-11.282-7.965l-6.522 5.024C9.505 39.556 16.227 44 24 44z"
        fill="#4CAF50"
      />
      <path
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.094 5.571l.001-.001 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
        fill="#1976D2"
      />
    </svg>
  );
}
