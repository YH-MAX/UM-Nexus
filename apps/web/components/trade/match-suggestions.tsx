import Link from "next/link";

import { formatMoney, formatPickupLocation, type TradeMatch } from "@/lib/trade/api";

type MatchSuggestionsProps = Readonly<{
  matches: TradeMatch[];
}>;

export function MatchSuggestions({ matches }: MatchSuggestionsProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Potential buyers</h2>
      {matches.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">
          No potential buyers yet. Enrich this listing after buyers create wanted posts in the same category.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-slate-100">
          {matches.map((match) => (
            <Link
              className="block py-4 transition hover:bg-slate-50"
              href={`/wanted-posts/${match.wanted_post_id}`}
              key={match.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-950">
                    {match.wanted_post.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {match.explanation}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-lg font-semibold text-emerald-800">
                    {Math.round(match.match_score)}%
                  </p>
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                    {match.status}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                <span>Budget {formatMoney(match.wanted_post.max_budget)}</span>
                <span>Pickup {formatPickupLocation(match.wanted_post.preferred_pickup_area)}</span>
                <span>Budget fit {Math.round(match.price_fit_score ?? 0)}%</span>
                <span>Pickup fit {Math.round(match.location_fit_score ?? 0)}%</span>
                <span>Need fit {Math.round(match.semantic_fit_score ?? 0)}%</span>
                {match.contacted_at ? <span>Contacted {new Date(match.contacted_at).toLocaleDateString()}</span> : null}
                {!match.contacted_at ? <span>Open buyer request</span> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
