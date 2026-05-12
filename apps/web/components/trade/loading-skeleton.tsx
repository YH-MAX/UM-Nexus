export function LoadingSkeleton() {
  return (
    <section
      aria-label="Loading marketplace listings"
      aria-busy="true"
      className="grid gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-3"
      role="status"
    >
      <span className="sr-only">Loading listings...</span>
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          className="trade-card overflow-hidden"
          key={index}
        >
          <div className="trade-loading-block aspect-[4/3] rounded-none" />
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="trade-loading-block h-5 w-20 rounded-full" />
              <div className="trade-loading-block h-8 w-8 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="trade-loading-block h-4 w-3/4 rounded-full" />
              <div className="trade-loading-block h-4 w-1/2 rounded-full" />
            </div>
            <div className="trade-loading-block h-8 w-1/3 rounded-lg" />
            <div className="space-y-2">
              <div className="trade-loading-block h-9 w-full" />
              <div className="trade-loading-block h-3 w-1/2 rounded-full" />
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="trade-loading-block h-3 w-1/3 rounded-full" />
              <div className="trade-loading-block h-5 w-1/4 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
