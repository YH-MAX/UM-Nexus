export function LoadingSkeleton() {
  return (
    <section
      aria-label="Loading marketplace listings"
      aria-busy="true"
      className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4"
      role="status"
    >
      <span className="sr-only">Loading listings...</span>
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white" key={index}>
          <div className="aspect-[4/3] bg-slate-100" />
          <div className="space-y-2 p-2.5 sm:p-3">
            <div className="h-4 w-full rounded bg-slate-100" />
            <div className="h-4 w-2/3 rounded bg-slate-100" />
            <div className="h-4 w-16 rounded bg-slate-100" />
            <div className="h-3 w-20 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </section>
  );
}
