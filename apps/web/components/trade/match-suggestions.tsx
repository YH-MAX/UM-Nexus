import Link from "next/link";

import { formatMoney, type TradeMatch } from "@/lib/trade/api";

type MatchSuggestionsProps = Readonly<{
  matches: TradeMatch[];
}>;

export function MatchSuggestions({ matches }: MatchSuggestionsProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Match suggestions</h2>
      {matches.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">
          No match suggestions yet. Enrich this listing after creating at least
          one wanted post in the same category.
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
                    match
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                <span>Budget {formatMoney(match.wanted_post.max_budget)}</span>
                <span>Pickup {match.wanted_post.preferred_pickup_area ?? "any"}</span>
                <span>Price fit {Math.round(match.price_fit_score ?? 0)}%</span>
                <span>Location fit {Math.round(match.location_fit_score ?? 0)}%</span>
                <span>Item fit {Math.round(match.semantic_fit_score ?? 0)}%</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
