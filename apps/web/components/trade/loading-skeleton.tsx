export function LoadingSkeleton() {
  return (
    <section
      aria-label="Loading marketplace listings"
      aria-busy="true"
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      role="status"
    >
      <span className="sr-only">Loading listings...</span>
      {Array.from({ length: 8 }).map((_, index) => (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-[#fffdf8] shadow-sm" key={index}>
          <div className="trade-loading-block aspect-[4/3] rounded-none bg-stone-200/60" />
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="trade-loading-block h-5 w-24 rounded-full bg-stone-200/70" />
              <div className="trade-loading-block h-6 w-16 rounded-lg bg-stone-200/70" />
            </div>
            <div className="space-y-2">
              <div className="trade-loading-block h-4 w-full rounded-full bg-stone-200/60" />
              <div className="trade-loading-block h-4 w-2/3 rounded-full bg-stone-200/50" />
            </div>
            <div className="trade-loading-block h-9 w-full rounded-xl bg-stone-200/50" />
            <div className="flex items-center justify-between border-t border-stone-100 pt-3">
              <div className="trade-loading-block h-8 w-28 rounded-full bg-stone-200/50" />
              <div className="trade-loading-block h-4 w-16 rounded-full bg-stone-200/50" />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
