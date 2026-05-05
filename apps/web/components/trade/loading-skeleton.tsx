type LoadingSkeletonProps = Readonly<{
  label?: string;
  rows?: number;
}>;

export function LoadingSkeleton({ label = "Loading...", rows = 3 }: LoadingSkeletonProps) {
  return (
    <div className="trade-card p-5" role="status">
      <span className="sr-only">{label}</span>
      <div className="h-4 w-36 animate-pulse rounded-full bg-slate-100" />
      <div className="mt-4 grid gap-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div className="h-14 animate-pulse rounded-xl bg-slate-100" key={index} />
        ))}
      </div>
    </div>
  );
}
