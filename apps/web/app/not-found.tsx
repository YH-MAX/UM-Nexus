import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-950">
      <section className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
          UM Nexus
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The marketplace view you opened is unavailable or has moved.
        </p>
        <Link
          className="mt-5 inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          href="/trade"
        >
          Back to marketplace
        </Link>
      </section>
    </main>
  );
}
