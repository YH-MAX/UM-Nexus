"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LockKeyhole } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { type AuthIntent, buildAuthHref } from "@/lib/auth/return-intent";

type RequireAuthCardProps = Readonly<{
  title?: string;
  description?: string;
  intent?: AuthIntent;
  listingId?: string;
  returnTo?: string;
}>;

export function RequireAuthCard({
  title = "Sign in required",
  description = "Use your UM account to access this trade workflow.",
  intent,
  listingId,
  returnTo,
}: RequireAuthCardProps) {
  const { isLoading, user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const currentPath = `${pathname}${query ? `?${query}` : ""}`;
  const safeReturnTo = returnTo ?? currentPath;
  const loginHref = buildAuthHref("login", { returnTo: safeReturnTo, intent, listingId });
  const signupHref = buildAuthHref("signup", { returnTo: safeReturnTo, intent, listingId });

  if (isLoading) {
    return (
      <section className="trade-card p-5" aria-busy="true" role="status">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          <span className="trade-loading-block h-10 w-10 shrink-0" />
          Checking your session...
        </div>
      </section>
    );
  }

  if (user) {
    return null;
  }

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-white text-amber-700 shadow-sm">
            <LockKeyhole aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-amber-950">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-900">{description}</p>
          </div>
        </div>
      </div>
      <div className="trade-action-row mt-4">
        <Link
          className="trade-button-primary bg-slate-950 hover:bg-slate-800"
          href={loginHref}
        >
          Sign in
        </Link>
        <Link
          className="trade-button-secondary border-amber-300 text-amber-950 hover:border-amber-500 hover:bg-white"
          href={signupHref}
        >
          Create account
        </Link>
      </div>
    </section>
  );
}
