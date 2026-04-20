import { formatMoney, type TradeResult, type TradeResultStatus } from "@/lib/trade/api";

import { StatusPill } from "./status-pill";

type TradeResultCardProps = Readonly<{
  result: TradeResult | null;
  status?: TradeResultStatus["status"];
  errorMessage?: string | null;
  currency?: string;
}>;

function riskTone(risk: TradeResult["recommendation"]["risk_level"]) {
  if (risk === "high") {
    return "danger";
  }
  if (risk === "medium") {
    return "warn";
  }
  return "good";
}

function actionLabel(actionType: string) {
  return actionType.replaceAll("_", " ");
}

export function TradeResultCard({
  result,
  status = "not_started",
  errorMessage,
  currency = "MYR",
}: TradeResultCardProps) {
  if (!result) {
    const isPending = status === "pending" || status === "running";
    const isFailed = status === "failed";

    return (
      <section className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-950 px-5 py-4 text-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                Trade Intelligence
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Decision engine idle</h2>
            </div>
            <StatusPill tone={isFailed ? "danger" : isPending ? "warn" : "neutral"}>
              {status.replaceAll("_", " ")}
            </StatusPill>
          </div>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-[1fr_220px]">
          <p className="text-sm leading-6 text-slate-600">
            {isFailed
              ? errorMessage ?? "The enrichment job failed. Try running it again."
              : isPending
                ? "The enrichment job is comparing historical sales, trust signals, local demand, and buyer fit."
                : "Run enrichment to generate a pricing decision, trust score, buyer matches, and sell-faster action."}
          </p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Pipeline
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              Pricing plus matching plus risk
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
      <div className="bg-slate-950 px-5 py-5 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Trade Intelligence
            </p>
            <h2 className="mt-2 text-3xl font-semibold">
              {actionLabel(result.action.action_type)}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              {result.action.action_reason}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={riskTone(result.recommendation.risk_level)}>
              {result.recommendation.risk_level} risk
            </StatusPill>
            <StatusPill tone="good">
              {result.expected_outcome.confidence_level} confidence
            </StatusPill>
          </div>
        </div>
      </div>

      <div className="grid border-b border-slate-200 md:grid-cols-4">
        <DecisionMetric
          accent="emerald"
          label="Suggested listing price"
          value={formatMoney(result.recommendation.suggested_listing_price, currency)}
          detail="Best balance of speed and fairness"
        />
        <DecisionMetric
          accent="cyan"
          label="Minimum acceptable"
          value={formatMoney(result.recommendation.minimum_acceptable_price, currency)}
          detail="Negotiation floor"
        />
        <DecisionMetric
          accent="amber"
          label="Fair comparable range"
          value={`${formatMoney(result.recommendation.fair_price_range.low, currency)} - ${formatMoney(result.recommendation.fair_price_range.high, currency)}`}
          detail="Historical campus band"
        />
        <DecisionMetric
          accent="indigo"
          label="Expected time to sell"
          value={result.expected_outcome.expected_time_to_sell}
          detail={`${result.expected_outcome.expected_buyer_interest} buyer interest`}
        />
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
          <h3 className="text-lg font-semibold text-slate-950">Why this decision</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Reason title="Comparable pattern" body={result.why.similar_item_pattern} />
            <Reason title="Condition estimate" body={result.why.condition_estimate} />
            <Reason title="Local demand" body={result.why.local_demand_context} />
            <Reason title="Price competitiveness" body={result.why.price_competitiveness} />
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-950">Top matches</h3>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Best 3
            </span>
          </div>
          {result.recommendation.best_match_candidates.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              No strong buyer match yet. The engine recommends improving price or listing quality first.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {result.recommendation.best_match_candidates.map((candidate, index) => (
                <div
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  key={candidate.wanted_post_id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Match {index + 1}
                      </p>
                      <p className="mt-1 font-semibold text-slate-950">{candidate.title}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-700 px-3 py-2 text-right text-white">
                      <p className="text-lg font-semibold">{Math.round(candidate.match_score)}%</p>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-emerald-100">
                        {candidate.final_match_confidence}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 text-sm leading-5 text-slate-600">
                    <p>{candidate.item_fit_summary}</p>
                    <p>{candidate.price_fit_summary}</p>
                    <p>{candidate.location_fit_summary}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DecisionMetric({
  accent,
  label,
  value,
  detail,
}: Readonly<{
  accent: "emerald" | "cyan" | "amber" | "indigo";
  label: string;
  value: string;
  detail: string;
}>) {
  const accentClasses = {
    emerald: "border-t-emerald-500 bg-emerald-50/50",
    cyan: "border-t-cyan-500 bg-cyan-50/60",
    amber: "border-t-amber-500 bg-amber-50/60",
    indigo: "border-t-indigo-500 bg-indigo-50/50",
  };

  return (
    <div className={`border-t-4 p-5 ${accentClasses[accent]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

function Reason({ title, body }: Readonly<{ title: string; body: string }>) {
  return (
    <div className="border-l-4 border-slate-300 pl-3">
      <h4 className="text-sm font-semibold text-slate-950">{title}</h4>
      <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}
