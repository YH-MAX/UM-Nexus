"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-950">
      <section className="w-full max-w-xl rounded-lg border border-rose-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
          Something went wrong
        </p>
        <h1 className="mt-3 text-3xl font-semibold">We could not load this view</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Retry the request. If it keeps failing, check the API service and Supabase
          environment variables.
        </p>
        <button
          className="mt-5 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
