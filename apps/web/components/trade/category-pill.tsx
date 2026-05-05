import { formatCategory } from "@/lib/trade/api";

type CategoryPillProps = Readonly<{
  category: string;
  active?: boolean;
  onClick?: () => void;
}>;

export function CategoryPill({ category, active = false, onClick }: CategoryPillProps) {
  const className = active
    ? "border-slate-950 bg-slate-950 text-white"
    : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800";

  if (onClick) {
    return (
      <button
        className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${className}`}
        onClick={onClick}
        type="button"
      >
        {category === "" ? "All" : formatCategory(category)}
      </button>
    );
  }

  return (
    <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${className}`}>
      {category === "" ? "All" : formatCategory(category)}
    </span>
  );
}
