"use client";

import { useEffect, useState } from "react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  getCurrentUser,
  getLaunchChecklist,
  type LaunchChecklist,
  type LaunchChecklistItem,
} from "@/lib/trade/api";

const OPERATOR_ROLES = ["admin", "moderator"];

const SECTION_ORDER = ["Content", "Users", "Safety", "AI", "Engagement"];

export default function LaunchChecklistPage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [checklist, setChecklist] = useState<LaunchChecklist | null>(null);
  const [appRole, setAppRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    void Promise.all([getLaunchChecklist(), getCurrentUser()])
      .then(([data, currentUser]) => {
        if (isMounted) {
          setChecklist(data);
          setAppRole(currentUser.profile.app_role);
        }
      })
      .catch((nextError) => {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load launch checklist.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, user]);

  const isAuthorized = appRole ? OPERATOR_ROLES.includes(appRole) : false;

  const greenCount = checklist?.items.filter((i) => i.status === "green").length ?? 0;
  const totalCount = checklist?.items.length ?? 0;
  const allGreen = totalCount > 0 && greenCount === totalCount;

  return (
    <TradeShell
      eyebrow="UM Nexus Operations"
      title="Launch readiness"
      description="Pre-launch health check — verify content, safety, AI, and engagement signals before going live."
    >
      {!isAuthLoading && !user ? (
        <RequireAuthCard description="Sign in with an operator UM account to view the launch checklist." />
      ) : null}

      {user && !isLoading && !isAuthorized ? (
        <section className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mx-auto max-w-sm text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-6 w-6 text-slate-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-950">Access restricted</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This page is restricted to UM Nexus operators. Sign in with an authorized account.
            </p>
          </div>
        </section>
      ) : null}

      {user && (isLoading || isAuthorized) ? (
        <>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Internal · Operator-only · Not visible to students</span>
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
          ) : null}

          {isLoading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
              Loading launch checklist...
            </div>
          ) : null}

          {checklist ? (
            <>
              <div className={`rounded-lg border p-5 shadow-sm ${allGreen ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                      {allGreen ? "Ready to launch" : "Action needed before launch"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {greenCount} of {totalCount} checks passing
                    </p>
                  </div>
                  <ReadinessScore green={greenCount} total={totalCount} />
                </div>
              </div>

              {SECTION_ORDER.map((section) => {
                const sectionItems = checklist.items.filter((i) => i.section === section);
                if (sectionItems.length === 0) return null;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white shadow-sm" key={section}>
                    <div className="border-b border-slate-100 px-5 py-3">
                      <h3 className="text-sm font-semibold text-slate-950">{section}</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {sectionItems.map((item) => (
                        <ChecklistRow item={item} key={item.key} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          ) : null}
        </>
      ) : null}
    </TradeShell>
  );
}

function ReadinessScore({ green, total }: Readonly<{ green: number; total: number }>) {
  const pct = total > 0 ? Math.round((green / total) * 100) : 0;
  const color = pct === 100 ? "text-emerald-800" : pct >= 60 ? "text-amber-800" : "text-rose-800";
  return (
    <div className="flex flex-col items-end">
      <span className={`text-3xl font-bold ${color}`}>{pct}%</span>
      <span className="text-xs text-slate-500">readiness</span>
    </div>
  );
}

function ChecklistRow({ item }: Readonly<{ item: LaunchChecklistItem }>) {
  const icons = {
    green: (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path d="M4.5 12.75l6 6 9-13.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    ),
    amber: (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    ),
    red: (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    ),
  };

  const valuePill = {
    green: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
    amber: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
    red: "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
  }[item.status];

  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      {icons[item.status]}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{item.label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{item.detail}</p>
      </div>
      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${valuePill}`}>
        {item.value}
      </span>
    </div>
  );
}
