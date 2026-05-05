type StatusPillProps = Readonly<{
  tone?:
    | "neutral"
    | "good"
    | "warn"
    | "danger"
    | "available"
    | "reserved"
    | "sold"
    | "draft"
    | "hidden"
    | "deleted"
    | "pending"
    | "accepted"
    | "rejected"
    | "expired"
    | "warning";
  children: React.ReactNode;
  className?: string;
}>;

const tones = {
  neutral: "border-slate-200 bg-white text-slate-700",
  good: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  available: "border-emerald-200 bg-emerald-50 text-emerald-800",
  reserved: "border-amber-200 bg-amber-50 text-amber-800",
  sold: "border-slate-200 bg-slate-100 text-slate-700",
  draft: "border-slate-300 bg-white text-slate-600",
  hidden: "border-rose-100 bg-rose-50 text-rose-700",
  deleted: "border-slate-700 bg-slate-900 text-white",
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-rose-200 bg-rose-50 text-rose-800",
  expired: "border-slate-200 bg-slate-100 text-slate-600",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};

export function StatusPill({ tone = "neutral", children, className = "" }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string | null | undefined): StatusPillProps["tone"] {
  if (!status) {
    return "neutral";
  }
  const normalized = status.toLowerCase();
  if (normalized in tones) {
    return normalized as StatusPillProps["tone"];
  }
  return "neutral";
}
