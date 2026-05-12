import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";

type EmptyStateProps = Readonly<{
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
}>;

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  onAction,
  icon: Icon = Search,
}: EmptyStateProps) {
  return (
    <section className="trade-empty-panel">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm">
        <Icon aria-hidden="true" className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      {actionHref && actionLabel ? (
        <Link className="trade-button-primary mt-5 w-full sm:w-auto" href={actionHref}>
          {actionLabel}
        </Link>
      ) : onAction && actionLabel ? (
        <button className="trade-button-secondary mt-5 w-full sm:w-auto" onClick={onAction} type="button">
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
