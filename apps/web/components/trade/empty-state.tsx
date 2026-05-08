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
    <section className="trade-card border-dashed p-6 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      {actionHref && actionLabel ? (
        <Link className="trade-button-primary mt-5" href={actionHref}>
          {actionLabel}
        </Link>
      ) : onAction && actionLabel ? (
        <button className="trade-button-secondary mt-5" onClick={onAction} type="button">
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
