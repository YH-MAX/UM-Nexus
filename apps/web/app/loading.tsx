export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-5">
        <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-48 animate-pulse rounded-lg bg-white shadow-sm" />
          <div className="h-48 animate-pulse rounded-lg bg-white shadow-sm" />
          <div className="h-48 animate-pulse rounded-lg bg-white shadow-sm" />
        </div>
      </div>
    </main>
  );
}
