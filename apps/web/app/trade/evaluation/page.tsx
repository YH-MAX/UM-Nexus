"use client";

import { useState } from "react";

import { TradeShell } from "@/components/trade/trade-shell";
import { runTradeEvaluation, type EvaluationSummary } from "@/lib/trade/api";

export default function TradeEvaluationPage() {
  const [summary, setSummary] = useState<EvaluationSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRunEvaluation() {
    setIsRunning(true);
    setError(null);
    try {
      setSummary(await runTradeEvaluation());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to run evaluation.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <TradeShell
      eyebrow="UM Nexus Evaluation"
      title="Trade Intelligence benchmark"
      description="Run internal demo benchmark cases for pricing, risk, matching, and action agreement."
    >
      <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Benchmark cases</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The runner compares decision outputs against expected price bands,
              risk levels, match presence, and action type.
            </p>
          </div>
          <button
            className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isRunning}
            onClick={() => void handleRunEvaluation()}
            type="button"
          >
            {isRunning ? "Running..." : "Run evaluation"}
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </p>
        ) : null}
      </section>

      {summary ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Cases" value={String(summary.case_count)} />
            <Metric label="Avg price error" value={`RM${summary.average_pricing_error}`} />
            <Metric label="Risk agreement" value={`${Math.round(summary.risk_agreement_rate * 100)}%`} />
            <Metric label="Action agreement" value={`${Math.round(summary.action_agreement_rate * 100)}%`} />
            <Metric label="Match quality" value={`${Math.round(summary.match_ranking_quality * 100)}%`} />
          </section>

          <section className="rounded-lg border border-slate-300 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-semibold text-slate-950">Case results</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {summary.cases.map((item) => (
                <div className="grid gap-3 p-5 lg:grid-cols-[1fr_140px_140px_160px]" key={item.case_id}>
                  <div>
                    <p className="font-semibold text-slate-950">{item.case_id.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Expected RM{item.expected_price_band[0]}-RM{item.expected_price_band[1]}, got RM
                      {item.suggested_listing_price}
                    </p>
                  </div>
                  <Badge ok={item.pricing_error === 0}>Error RM{item.pricing_error}</Badge>
                  <Badge ok={item.risk_agreement}>Risk {item.risk_level}</Badge>
                  <Badge ok={item.action_agreement}>{item.action_type.replaceAll("_", " ")}</Badge>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </TradeShell>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Badge({ ok, children }: Readonly<{ ok: boolean; children: React.ReactNode }>) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      {children}
    </div>
  );
}
