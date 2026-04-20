type StatusPillProps = Readonly<{
  tone?: "neutral" | "good" | "warn" | "danger";
  children: React.ReactNode;
}>;

const tones = {
  neutral: "border-slate-200 bg-white text-slate-700",
  good: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
};

export function StatusPill({ tone = "neutral", children }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold text-slate-900 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
