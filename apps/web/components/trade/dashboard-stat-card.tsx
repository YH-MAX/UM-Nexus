import type { LucideIcon } from "lucide-react";

type DashboardStatCardProps = Readonly<{
  label: string;
  value: number | string;
  detail?: string;
  icon?: LucideIcon;
}>;

export function DashboardStatCard({ label, value, detail, icon: Icon }: DashboardStatCardProps) {
  return (
    <div className="trade-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        {Icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Icon aria-hidden="true" className="h-5 w-5" />
          </div>
        ) : null}
      </div>
      {detail ? <p className="mt-2 text-sm text-slate-600">{detail}</p> : null}
    </div>
  );
}
