"use client";

import { useEffect, useState } from "react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  formatCategory,
  formatMoney,
  getTradeEvaluationSummary,
  getTradeProviderStatus,
  runTradeEvaluation,
  type BenchmarkCaseDetail,
  type BenchmarkSummary,
  type TradeProviderStatus,
} from "@/lib/trade/api";

export default function TradeEvaluationPage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [summary, setSummary] = useState<BenchmarkSummary | null>(null);
  const [providerStatus, setProviderStatus] = useState<TradeProviderStatus | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }
    if (!user) {
      setIsLoadingSummary(false);
      return;
    }

    let isMounted = true;
    setIsLoadingSummary(true);

    void Promise.all([getTradeEvaluationSummary(), getTradeProviderStatus()])
      .then(([nextSummary, status]) => {
        if (isMounted) {
          setSummary(nextSummary);
          setProviderStatus(status);
        }
      })
      .catch((nextError) => {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load evaluation summary.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSummary(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, user]);

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
      eyebrow="UM Nexus Operations"
      title="Release quality controls"
      description="Operator-only checks for pricing, matching, trust, and action quality before marketplace changes go live."
    >
      {!isAuthLoading && !user ? (
        <RequireAuthCard description="Sign in with an admin UM account to run release quality checks." />
      ) : null}

      {user ? (
      <>
      <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Quality gate run</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Compare the AI decision engine against simple manual heuristics before changing prompts, data, or provider settings.
            </p>
          </div>
          <button
            className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isRunning}
            onClick={() => void handleRunEvaluation()}
            type="button"
          >
            {isRunning ? "Running..." : "Run quality gate"}
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </p>
        ) : null}
      </section>

      {isLoadingSummary ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Loading quality controls...
        </div>
      ) : null}

      {summary ? (
        <>
          <section className="grid gap-4 lg:grid-cols-[1fr_2fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">GLM status</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {providerStatus?.provider ?? "loading"} · {providerStatus?.status ?? ""}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Model {providerStatus?.model ?? "unknown"} with {providerStatus?.fallback_mode ?? "deterministic"} fallback.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Methodology</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Manual heuristics use category averages, budget overlap, and simple risk keywords. AI uses GLM output
                plus item text, public image URLs when available, historical comparables, candidate demand,
                location context, and risk signals. These checks stay internal until completed transactions
                provide enough live marketplace evidence.
              </p>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="AI score" value={`${summary.ai_overall_score}/100`} detail={`Heuristic ${summary.baseline_overall_score}/100`} />
            <Metric label="Pricing lift" value={formatDelta(summary.price_accuracy_delta)} detail={`${percent(summary.ai_pricing_accuracy_rate)} AI accuracy`} />
            <Metric label="Risk lift" value={formatDelta(summary.risk_detection_delta)} detail={`${percent(summary.ai_risk_detection_rate)} risk agreement`} />
            <Metric label="Time proxy saved" value={`${summary.time_to_sale_delta_days} days`} detail="Scenario average" />
          </section>

          <section className="grid gap-4 lg:grid-cols-4">
            <ComparisonMetric label="Pricing accuracy" ai={summary.ai_pricing_accuracy_rate} baseline={summary.baseline_pricing_accuracy_rate} />
            <ComparisonMetric label="Risk detection" ai={summary.ai_risk_detection_rate} baseline={summary.baseline_risk_detection_rate} />
            <ComparisonMetric label="Match quality" ai={summary.ai_match_quality_rate} baseline={summary.baseline_match_quality_rate} />
            <ComparisonMetric label="Action agreement" ai={summary.ai_action_agreement_rate} baseline={summary.baseline_action_agreement_rate} />
          </section>

          <section className="rounded-lg border border-slate-300 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-semibold text-slate-950">Quality cases</h2>
              <p className="mt-2 text-sm text-slate-600">{summary.metrics_note}</p>
            </div>
            <div className="divide-y divide-slate-100">
              {summary.cases.map((item) => (
                <CaseRow detail={item} key={item.case.id} />
              ))}
            </div>
          </section>
        </>
      ) : null}
      </>
      ) : null}
    </TradeShell>
  );
}

function CaseRow({ detail }: Readonly<{ detail: BenchmarkCaseDetail }>) {
  const item = detail.case;
  const ai = detail.latest_ai_result;
  const baseline = detail.latest_baseline_result;

  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[1fr_170px_170px_180px]">
      <div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
          <span>{formatCategory(item.category)}</span>
          <span>Expected {item.expected_action_type?.replaceAll("_", " ")}</span>
        </div>
        <h3 className="mt-2 font-semibold text-slate-950">{item.title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{item.listing_title}</p>
        <p className="mt-1 text-xs text-slate-500">
          Fair band {formatMoney(item.expected_price_min)} - {formatMoney(item.expected_price_max)}
        </p>
      </div>
      <ScoreBox label="AI" score={ai?.overall_score} price={ai?.predicted_price} action={ai?.predicted_action_type} />
      <ScoreBox
        label="Heuristic"
        score={baseline?.overall_score}
        price={baseline?.predicted_price}
        action={baseline?.predicted_action_type}
      />
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Evidence</p>
        <p className="mt-2 text-sm leading-5 text-slate-700">{detail.why_ai_is_better}</p>
      </div>
    </div>
  );
}

function ScoreBox({
  label,
  score,
  price,
  action,
}: Readonly<{
  label: string;
  score?: number | null;
  price?: number | null;
  action?: string | null;
}>) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{score ?? "-"} </p>
      <p className="mt-1 text-sm text-slate-600">{formatMoney(price)}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{action?.replaceAll("_", " ") ?? "not run"}</p>
    </div>
  );
}

function ComparisonMetric({ label, ai, baseline }: Readonly<{ label: string; ai: number; baseline: number }>) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="text-sm font-semibold text-emerald-800">{formatDelta(ai - baseline)}</p>
      </div>
      <div className="mt-3 space-y-2">
        <Bar label="AI" value={ai} tone="emerald" />
        <Bar label="Heuristic" value={baseline} tone="slate" />
      </div>
    </div>
  );
}

function Bar({ label, value, tone }: Readonly<{ label: string; value: number; tone: "emerald" | "slate" }>) {
  const color = tone === "emerald" ? "bg-emerald-600" : "bg-slate-500";
  return (
    <div>
      <div className="flex justify-between text-xs font-medium text-slate-600">
        <span>{label}</span>
        <span>{percent(value)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
      </div>
    </div>
  );
}

function Metric({ label, value, detail }: Readonly<{ label: string; value: string; detail: string }>) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDelta(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value * 100)}%`;
}
