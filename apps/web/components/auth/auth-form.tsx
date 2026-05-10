"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
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

function formatAuthErrorMessage(message: string | undefined): string {
  if (!message) {
    return "Authentication failed. Please try again.";
  }

  if (message.toLowerCase().includes("failed to fetch")) {
    return "Cannot reach Supabase Auth. Check the Supabase project URL/public key and make sure the project is active, then restart the web app.";
  }

  return message;
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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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
  const title = isSignup ? "Create your account" : "Welcome back";
  const subtitle = isSignup
    ? "Join the UM marketplace with your student or staff email."
    : "Sign in to save listings, contact sellers, and manage your Trade activity.";
  const submitLabel = isSignup ? "Create account" : "Sign in";
  const pendingLabel = isSignup ? "Creating account..." : "Signing in...";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatusMessage(null);

    if (isSignup) {
      const domainError = getAllowedEmailDomainError(email, allowedDomains);
      if (domainError) {
        setError(domainError);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          setError(formatAuthErrorMessage(signUpError.message));
          return;
        }

        if (!data.session) {
          setStatusMessage(
            "Account created. Check your email if confirmation is enabled in Supabase Auth.",
          );
        } else {
          router.push(nextPath);
          router.refresh();
        }

        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(formatAuthErrorMessage(signInError.message));
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
    <div className="w-full">
      <div className="mb-7">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-slate-950" href="/">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
          </span>
          UM Nexus Trade
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          {isSignup ? "Verified UM access" : "Secure sign in"}
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {subtitle}
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2" htmlFor={`${mode}-email`}>
          <span className="text-sm font-semibold text-slate-800">UM email</span>
          <div className="relative">
            <Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-describedby={emailHelpId}
              autoComplete="email"
              className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              id={`${mode}-email`}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@siswa.um.edu.my"
              required
            />
          </div>
          <span className="block text-xs leading-5 text-slate-500" id={emailHelpId}>
            Use @siswa.um.edu.my or @um.edu.my.
          </span>
        </label>

        <label className="block space-y-2" htmlFor={`${mode}-password`}>
          <span className="text-sm font-semibold text-slate-800">Password</span>
          <div className="relative">
            <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-describedby={passwordHelpId}
              autoComplete={isSignup ? "new-password" : "current-password"}
              className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
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
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-emerald-100"
              onClick={() => setIsPasswordVisible((current) => !current)}
              type="button"
            >
              {isPasswordVisible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
            </button>
          </div>
          <span className="block text-xs leading-5 text-slate-500" id={passwordHelpId}>
            Password must be at least 8 characters.
          </span>
        </label>

        {error ? (
          <div
            aria-live="polite"
            className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800"
            role="alert"
          >
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {statusMessage ? (
          <div
            aria-live="polite"
            className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800"
            role="status"
          >
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{statusMessage}</p>
          </div>
        ) : null}

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isSubmitting}
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

      <p className="mt-6 text-center text-sm text-slate-600">
        {isSignup ? "Already have an account?" : "Need an account?"}{" "}
        <Link
          className="font-semibold text-emerald-800 underline underline-offset-4 transition hover:text-emerald-900"
          href={oppositeHref}
        >
          {isSignup ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </div>
  );
}
