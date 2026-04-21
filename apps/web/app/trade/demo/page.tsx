"use client";

import { useEffect, useState } from "react";

import { TradeShell } from "@/components/trade/trade-shell";
import {
  formatCategory,
  formatMoney,
  getTradeEvaluationCases,
  runTradeEvaluation,
  type BenchmarkCaseDetail,
} from "@/lib/trade/api";

export default function TradeDemoPage() {
  const [cases, setCases] = useState<BenchmarkCaseDetail[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void getTradeEvaluationCases()
      .then((items) => {
        if (isMounted) {
          setCases(items);
        }
      })
      .catch((nextError) => {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load demo cases.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleRunDemo() {
    setIsRunning(true);
    setError(null);
    try {
      const summary = await runTradeEvaluation();
      setCases(summary.cases);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to run demo benchmark.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <TradeShell
      eyebrow="UM Nexus Judge Demo"
      title="Decision engine evidence"
      description="Labelled simulation scenarios showing how GLM-centered recommendations compare with a simple campus resale baseline."
    >
      <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Hero demo cases</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pricing, matching, and risk decisions are scored against expected labels.
            </p>
          </div>
          <button
            className="rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isRunning}
            onClick={() => void handleRunDemo()}
            type="button"
          >
            {isRunning ? "Running..." : "Run demo evidence"}
          </button>
        </div>
        {error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </p>
        ) : null}
      </section>

      <section className="space-y-5">
        {cases.slice(0, 5).map((item) => (
          <DemoCase key={item.case.id} detail={item} />
        ))}
      </section>
    </TradeShell>
  );
}

function DemoCase({ detail }: Readonly<{ detail: BenchmarkCaseDetail }>) {
  const item = detail.case;
  const ai = detail.latest_ai_result;
  const baseline = detail.latest_baseline_result;
  const result = ai?.raw_result;
  const imageUrl = item.image_urls[0];

  return (
    <article className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
      <div className="grid lg:grid-cols-[300px_1fr]">
        <div className="flex min-h-64 items-center justify-center bg-slate-100">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={item.listing_title} className="h-full min-h-64 w-full object-cover" src={imageUrl} />
          ) : (
            <div className="px-6 text-center text-sm font-medium text-slate-500">No image supplied</div>
          )}
        </div>
        <div className="grid gap-5 p-5">
          <div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
              <span>{formatCategory(item.category)}</span>
              <span>{item.pickup_area ?? "Pickup TBD"}</span>
              <span>Risk label {item.expected_risk_level}</span>
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.listing_title}</p>
            <p className="mt-1 text-sm text-slate-500">
              Demo asking price {formatMoney(item.listing_price_used)} · Fair band {formatMoney(item.expected_price_min)} -{" "}
              {formatMoney(item.expected_price_max)}
            </p>
          </div>

          {result ? (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <Metric label="AI price" value={formatMoney(result.recommendation.suggested_listing_price)} />
                <Metric label="Minimum" value={formatMoney(result.recommendation.minimum_acceptable_price)} />
                <Metric label="Risk" value={result.recommendation.risk_level} />
                <Metric label="Action" value={result.action.action_type.replaceAll("_", " ")} />
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                <div className="space-y-3">
                  <Reason title="Why" body={result.why.similar_item_pattern} />
                  <Reason title="Condition" body={result.why.condition_estimate} />
                  <Reason title="Expected outcome" body={`${result.expected_outcome.expected_time_to_sell}, ${result.expected_outcome.expected_buyer_interest} interest`} />
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Baseline</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Price {formatMoney(baseline?.predicted_price)} · risk {baseline?.predicted_risk_level ?? "not run"} · action{" "}
                    {baseline?.predicted_action_type?.replaceAll("_", " ") ?? "not run"}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-emerald-800">{detail.why_ai_is_better}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Run demo evidence to generate AI recommendation, baseline result, and impact comparison.
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Reason({ title, body }: Readonly<{ title: string; body: string }>) {
  return (
    <div className="border-l-4 border-slate-300 pl-3">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}
