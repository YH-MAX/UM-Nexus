"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";

export function AuthStatusCard() {
  const router = useRouter();
  const { isLoading, supabase, user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setError(null);

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      return;
    }

    startTransition(() => {
      router.push("/login");
      router.refresh();
    });
  }

  if (isLoading) {
    return (
      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Checking your session...</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          You are not signed in yet. Use Supabase Auth to continue.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            href="/login"
          >
            Sign in
          </Link>
          <Link
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900"
            href="/signup"
          >
            Create account
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">Signed in as</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{user.email}</p>
      <p className="mt-2 text-sm text-slate-600">
        Supabase Auth is connected. The API can now use the bearer token for local
        user sync.
      </p>
      <div className="mt-4 flex gap-3">
        <button
          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => void handleSignOut()}
          type="button"
        >
          Sign out
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}
