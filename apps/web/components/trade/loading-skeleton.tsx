export function LoadingSkeleton() {
  return (
    <section
      aria-label="Loading marketplace listings"
      aria-busy="true"
      className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
      role="status"
    >
      <span className="sr-only">Loading listings...</span>
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          key={index}
        >
          <div className="aspect-[4/3] animate-pulse bg-slate-100" />
          <div className="space-y-3 p-4">
            <div className="space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-100" />
              <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-100" />
            </div>
            <div className="h-6 w-1/3 animate-pulse rounded-full bg-slate-100" />
            <div className="space-y-2">
              <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-100" />
              <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-100" />
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="h-3 w-1/3 animate-pulse rounded-full bg-slate-100" />
              <div className="h-3 w-1/5 animate-pulse rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
