"use client";

import Link from "next/link";

import { useAuth } from "@/components/auth/auth-provider";

type RequireAuthCardProps = Readonly<{
  title?: string;
  description?: string;
}>;

export function RequireAuthCard({
  title = "Sign in required",
  description = "Use your UM account to access this trade workflow.",
}: RequireAuthCardProps) {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        Checking your session...
      </section>
    );
  }

  if (user) {
    return null;
  }

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-amber-950">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-900">{description}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          href="/login"
        >
          Sign in
        </Link>
        <Link
          className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-950 transition hover:border-amber-500"
          href="/signup"
        >
          Create account
        </Link>
      </div>
    </section>
  );
}
