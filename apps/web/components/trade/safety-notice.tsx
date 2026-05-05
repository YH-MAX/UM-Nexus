import { ShieldCheck } from "lucide-react";

import { tradeSafetyMessage } from "@/lib/trade/api";

type SafetyNoticeProps = Readonly<{
  compact?: boolean;
}>;

export function SafetyNotice({ compact = false }: SafetyNoticeProps) {
  return (
    <section className={`rounded-2xl border border-amber-200 bg-amber-50 ${compact ? "p-3" : "p-5"}`}>
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm">
          <ShieldCheck aria-hidden="true" className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-amber-950">Trade safely on campus</h2>
          <p className="mt-1 text-sm leading-6 text-amber-950">{tradeSafetyMessage}</p>
        </div>
      </div>
    </section>
  );
}
