"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

type GlobalErrorProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>;

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-950">
          <section className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
              <AlertTriangle aria-hidden="true" className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold">Something went wrong</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              UM Nexus Trade could not finish loading this screen. Try again, or return to Browse while the issue is
              checked.
            </p>
            {error.digest ? <p className="mt-3 text-xs font-semibold text-slate-400">Error ID: {error.digest}</p> : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="trade-button-primary" onClick={reset} type="button">
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Try again
              </button>
              <Link className="trade-button-secondary" href="/trade">
                Browse listings
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
