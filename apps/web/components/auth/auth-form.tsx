"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  getAllowedEmailDomainError,
  getAllowedEmailDomainsFromEnv,
} from "@/lib/auth/allowed-email-domains";

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
  const { supabase } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignup = mode === "signup";

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
          router.push("/");
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

      router.push("/");
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
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-6 space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          UM Nexus
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-sm text-slate-600">
          {isSignup
            ? "Use your UM email to access the platform."
            : "Sign in with your University of Malaya account."}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@siswa.um.edu.my"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            minLength={8}
            required
          />
        </label>

        {error ? (
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {statusMessage ? (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {statusMessage}
          </p>
        ) : null}

        <button
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? "Please wait..."
            : isSignup
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        {isSignup ? "Already have an account?" : "Need an account?"}{" "}
        <Link
          className="font-semibold text-slate-900 underline underline-offset-4"
          href={isSignup ? "/login" : "/signup"}
        >
          {isSignup ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </div>
  );
}
