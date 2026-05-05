"use client";

import { useEffect, useState } from "react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { StatusPill } from "@/components/trade/status-pill";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  createAdminCategory,
  formatCategory,
  formatMoney,
  formatPickupLocation,
  getAdminDashboard,
  getModerationListings,
  getModerationSummary,
  reviewModerationListing,
  updateAdminAISettings,
  updateAdminCategory,
  updateAdminListing,
  updateAdminUserRole,
  updateAdminUserStatus,
  type AdminDashboard,
  type ModerationListing,
  type ModerationSummary,
} from "@/lib/trade/api";

type ModerationTab = "reports" | "high_risk" | "hidden" | "recent_actions";

const moderationTabs: Array<{ id: ModerationTab; label: string }> = [
  { id: "reports", label: "Reports" },
  { id: "high_risk", label: "High-risk listings" },
  { id: "hidden", label: "Hidden listings" },
  { id: "recent_actions", label: "Recent actions" },
];

export default function TradeModerationPage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [items, setItems] = useState<ModerationListing[]>([]);
  const [summary, setSummary] = useState<ModerationSummary | null>(null);
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboard | null>(null);
  const [activeTab, setActiveTab] = useState<ModerationTab>("reports");
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadQueue() {
    const [nextItems, nextSummary, nextAdminDashboard] = await Promise.all([
      getModerationListings(),
      getModerationSummary(),
      getAdminDashboard().catch(() => null),
    ]);
    setItems(nextItems);
    setSummary(nextSummary);
    setAdminDashboard(nextAdminDashboard);
  }

  useEffect(() => {
    if (isAuthLoading || !user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    void loadQueue()
      .catch((nextError) => {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load moderation queue.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, user]);

  async function review(id: string, moderationStatus: "approved" | "rejected") {
    setReviewingId(id);
    setError(null);
    try {
      await reviewModerationListing(id, {
        status: moderationStatus === "approved" ? "reviewed" : "action_taken",
        moderation_status: moderationStatus,
        resolution: moderationStatus === "approved" ? "Listing reviewed and approved." : "Listing rejected by moderator.",
      });
      await loadQueue();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to review listing.");
    } finally {
      setReviewingId(null);
    }
  }

  async function setListingStatus(id: string, status: "available" | "hidden" | "deleted") {
    setReviewingId(id);
    setError(null);
    try {
      await updateAdminListing(id, {
        status,
        moderation_status: status === "deleted" ? "rejected" : status === "available" ? "approved" : undefined,
        resolution: `Admin changed listing status to ${status}.`,
        reason: `Admin changed listing status to ${status}.`,
      });
      await loadQueue();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update listing status.");
    } finally {
      setReviewingId(null);
    }
  }

  async function setUserStatus(id: string, status: "active" | "suspended" | "banned") {
    setReviewingId(id);
    setError(null);
    try {
      await updateAdminUserStatus(id, { status, reason: `Admin changed user status to ${status}.` });
      await loadQueue();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update user status.");
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <TradeShell
      title="Trust review queue"
      description="Review high-risk listings and user reports before suspicious items reduce marketplace trust."
    >
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {!user ? (
        <RequireAuthCard description="Sign in with a moderator or admin UM account to review high-risk listings and reports." />
      ) : null}

      {user && isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Loading moderation queue...
        </div>
      ) : user && !adminDashboard && items.length === 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">No listings need review</h2>
          <p className="mt-2 text-sm text-slate-600">High-risk decisions and open reports will appear here.</p>
        </section>
      ) : user ? (
        <section className="grid gap-5">
          <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {moderationTabs.map((tab) => (
              <button
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeTab === "recent_actions" && adminDashboard ? (
            <LogPanel
              title="Recent actions"
              rows={adminDashboard.admin_actions.slice(0, 12).map((action) => ({
                id: action.id,
                primary: `${action.action_type} · ${action.target_type}`,
                secondary: action.reason ?? action.target_id,
              }))}
            />
          ) : null}
          {activeTab === "hidden" && adminDashboard ? (
            <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Hidden listings</h2>
              <div className="mt-4 grid gap-3">
                {adminDashboard.listings.filter((listing) => listing.status === "hidden").length === 0 ? (
                  <p className="text-sm text-slate-600">No hidden listings.</p>
                ) : (
                  adminDashboard.listings
                    .filter((listing) => listing.status === "hidden")
                    .map((listing) => (
                      <div className="rounded-lg border border-slate-200 p-4" key={listing.id}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <StatusPill tone="hidden">hidden</StatusPill>
                            <p className="mt-2 font-semibold text-slate-950">{listing.title}</p>
                            <p className="mt-1 text-sm text-slate-600">{formatMoney(listing.price, listing.currency)}</p>
                          </div>
                          <button
                            className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 disabled:cursor-not-allowed disabled:text-slate-400"
                            disabled={reviewingId === listing.id}
                            onClick={() => void setListingStatus(listing.id, "available")}
                            type="button"
                          >
                            Restore
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          ) : null}
          {activeTab !== "recent_actions" && activeTab !== "hidden" ? (
          <>
          {adminDashboard ? (
            <AdminOverview
              dashboard={adminDashboard}
              disabledId={reviewingId}
              onListingStatus={setListingStatus}
              onReload={loadQueue}
              onUserStatus={setUserStatus}
            />
          ) : null}
          {summary ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="High risk" value={summary.high_risk_count} />
              <Metric label="Pending review" value={summary.pending_review_count} />
              <Metric label="Rejected" value={summary.rejected_count} />
              <Metric label="Approved" value={summary.approved_count} />
            </div>
          ) : null}
          {items.map(({ listing, reports }) => (
            <article className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm" key={listing.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill>{formatCategory(listing.category)}</StatusPill>
                    <StatusPill tone={listing.risk_level === "high" ? "danger" : "warn"}>
                      {listing.risk_level ?? "unscored"} risk
                    </StatusPill>
                    <StatusPill tone="warn">{listing.moderation_status.replaceAll("_", " ")}</StatusPill>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-950">{listing.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    {listing.description ?? "No description provided."}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatMoney(listing.price, listing.currency)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    disabled={reviewingId === listing.id}
                    onClick={() => void review(listing.id, "approved")}
                    type="button"
                  >
                    Approve
                  </button>
                  <button
                    className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    disabled={reviewingId === listing.id}
                    onClick={() => void review(listing.id, "rejected")}
                    type="button"
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-950">Risk evidence</h3>
                  <RiskCards evidence={listing.risk_evidence} />
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-950">Reports</h3>
                  {reports.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">No user reports; queued by risk score.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {reports.map((report) => (
                        <div className="rounded-lg bg-white p-3 text-sm text-slate-700" key={report.id}>
                          <p className="font-semibold text-slate-950">{report.report_type}</p>
                          <p className="mt-1">{report.reason ?? "No reason provided."}</p>
                          <p className="mt-1 text-xs text-slate-500">{report.status}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
          </>
          ) : null}
        </section>
      ) : null}
    </TradeShell>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function AdminOverview({
  dashboard,
  disabledId,
  onListingStatus,
  onReload,
  onUserStatus,
}: Readonly<{
  dashboard: AdminDashboard;
  disabledId: string | null;
  onListingStatus: (id: string, status: "available" | "hidden" | "deleted") => Promise<void>;
  onReload: () => Promise<void>;
  onUserStatus: (id: string, status: "active" | "suspended" | "banned") => Promise<void>;
}>) {
  const stats = dashboard.statistics;
  return (
    <div className="grid gap-5">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Total users" value={stats.total_users} />
        <Metric label="Active listings" value={stats.active_listings} />
        <Metric label="Sold listings" value={stats.sold_listings} />
        <Metric label="Reported listings" value={stats.reported_listings} />
        <Metric label="New this week" value={stats.new_listings_this_week} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">All listings</h2>
          <div className="mt-4 grid gap-3">
            {dashboard.listings.slice(0, 10).map((listing) => (
              <div className="rounded-lg border border-slate-200 p-4" key={listing.id}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill>{listing.status}</StatusPill>
                      <StatusPill tone={listing.moderation_status === "approved" ? "good" : "warn"}>
                        {listing.moderation_status.replaceAll("_", " ")}
                      </StatusPill>
                      <StatusPill>{formatCategory(listing.category)}</StatusPill>
                    </div>
                    <p className="mt-2 font-semibold text-slate-950">{listing.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{formatMoney(listing.price, listing.currency)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 disabled:cursor-not-allowed disabled:text-slate-400"
                      disabled={disabledId === listing.id}
                      onClick={() => void onListingStatus(listing.id, "available")}
                      type="button"
                    >
                      Restore
                    </button>
                    <button
                      className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 disabled:cursor-not-allowed disabled:text-slate-400"
                      disabled={disabledId === listing.id}
                      onClick={() => void onListingStatus(listing.id, "hidden")}
                      type="button"
                    >
                      Hide
                    </button>
                    <button
                      className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-800 disabled:cursor-not-allowed disabled:text-slate-400"
                      disabled={disabledId === listing.id}
                      onClick={() => void onListingStatus(listing.id, "deleted")}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5">
          <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">User reports</h2>
            <div className="mt-4 grid gap-3">
              {dashboard.user_reports.length === 0 ? (
                <p className="text-sm text-slate-600">No user reports.</p>
              ) : (
                dashboard.user_reports.slice(0, 6).map((report) => (
                  <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700" key={report.id}>
                    <p className="font-semibold text-slate-950">{report.report_type}</p>
                    <p className="mt-1">{report.reason ?? "No reason provided."}</p>
                    <p className="mt-1 text-xs text-slate-500">{report.status}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Users</h2>
            <div className="mt-4 grid gap-3">
              {dashboard.users.slice(0, 8).map((user) => (
                <div className="rounded-lg border border-slate-200 p-3" key={user.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{user.full_name ?? user.email}</p>
                      <p className="mt-1 text-xs text-slate-500">{user.status} · {user.app_role ?? "student"}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {(["active", "suspended", "banned"] as const).map((status) => (
                        <button
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
                          disabled={disabledId === user.id || user.status === status}
                          key={status}
                          onClick={() => void onUserStatus(user.id, status)}
                          type="button"
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <AdminLaunchOps dashboard={dashboard} disabledId={disabledId} onReload={onReload} />
    </div>
  );
}

function AdminLaunchOps({
  dashboard,
  disabledId,
  onReload,
}: Readonly<{
  dashboard: AdminDashboard;
  disabledId: string | null;
  onReload: () => Promise<void>;
}>) {
  const [categoryDraft, setCategoryDraft] = useState({ slug: "", label: "" });
  const [aiDraft, setAiDraft] = useState({
    ai_trade_enabled: dashboard.ai_settings?.ai_trade_enabled ?? true,
    ai_student_daily_limit: String(dashboard.ai_settings?.ai_student_daily_limit ?? 3),
    ai_staff_daily_limit: String(dashboard.ai_settings?.ai_staff_daily_limit ?? 50),
    ai_global_daily_limit: String(dashboard.ai_settings?.ai_global_daily_limit ?? 200),
  });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setAiDraft({
      ai_trade_enabled: dashboard.ai_settings?.ai_trade_enabled ?? true,
      ai_student_daily_limit: String(dashboard.ai_settings?.ai_student_daily_limit ?? 3),
      ai_staff_daily_limit: String(dashboard.ai_settings?.ai_staff_daily_limit ?? 50),
      ai_global_daily_limit: String(dashboard.ai_settings?.ai_global_daily_limit ?? 200),
    });
  }, [
    dashboard.ai_settings?.ai_global_daily_limit,
    dashboard.ai_settings?.ai_staff_daily_limit,
    dashboard.ai_settings?.ai_student_daily_limit,
    dashboard.ai_settings?.ai_trade_enabled,
  ]);

  async function createCategory() {
    setBusyKey("category-create");
    setLocalError(null);
    try {
      await createAdminCategory({
        slug: categoryDraft.slug,
        label: categoryDraft.label,
        sort_order: dashboard.categories.length * 10 + 10,
        is_active: true,
      });
      setCategoryDraft({ slug: "", label: "" });
      await onReload();
    } catch (nextError) {
      setLocalError(nextError instanceof Error ? nextError.message : "Unable to create category.");
    } finally {
      setBusyKey(null);
    }
  }

  async function toggleCategory(category: AdminDashboard["categories"][number]) {
    setBusyKey(category.id);
    setLocalError(null);
    try {
      await updateAdminCategory(category.id, { is_active: !category.is_active });
      await onReload();
    } catch (nextError) {
      setLocalError(nextError instanceof Error ? nextError.message : "Unable to update category.");
    } finally {
      setBusyKey(null);
    }
  }

  async function saveAISettings() {
    setBusyKey("ai-settings");
    setLocalError(null);
    try {
      await updateAdminAISettings({
        ai_trade_enabled: aiDraft.ai_trade_enabled,
        ai_student_daily_limit: Number(aiDraft.ai_student_daily_limit),
        ai_staff_daily_limit: Number(aiDraft.ai_staff_daily_limit),
        ai_global_daily_limit: Number(aiDraft.ai_global_daily_limit),
      });
      await onReload();
    } catch (nextError) {
      setLocalError(nextError instanceof Error ? nextError.message : "Unable to update AI settings.");
    } finally {
      setBusyKey(null);
    }
  }

  async function setUserRole(id: string, appRole: "student" | "organizer" | "moderator" | "admin") {
    setBusyKey(`${id}-${appRole}`);
    setLocalError(null);
    try {
      await updateAdminUserRole(id, {
        app_role: appRole,
        reason: `Admin changed user role to ${appRole}.`,
      });
      await onReload();
    } catch (nextError) {
      setLocalError(nextError instanceof Error ? nextError.message : "Unable to update user role.");
    } finally {
      setBusyKey(null);
    }
  }

  const stats = dashboard.statistics;

  return (
    <section className="grid gap-5">
      {localError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{localError}</div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Categories</h2>
          <div className="mt-4 grid gap-2">
            {dashboard.categories.map((category) => (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3" key={category.id}>
                <div>
                  <p className="text-sm font-semibold text-slate-950">{category.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{category.slug}</p>
                </div>
                <button
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400"
                  disabled={busyKey === category.id}
                  onClick={() => void toggleCategory(category)}
                  type="button"
                >
                  {category.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="category_slug"
              value={categoryDraft.slug}
              onChange={(event) => setCategoryDraft((current) => ({ ...current, slug: event.target.value }))}
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Category label"
              value={categoryDraft.label}
              onChange={(event) => setCategoryDraft((current) => ({ ...current, label: event.target.value }))}
            />
            <button
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={busyKey === "category-create" || !categoryDraft.slug.trim() || !categoryDraft.label.trim()}
              onClick={() => void createCategory()}
              type="button"
            >
              Add
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">AI controls</h2>
          <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-slate-800">
            <input
              checked={aiDraft.ai_trade_enabled}
              onChange={(event) => setAiDraft((current) => ({ ...current, ai_trade_enabled: event.target.checked }))}
              type="checkbox"
            />
            AI Trade enabled
          </label>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <NumberField
              label="Student daily"
              value={aiDraft.ai_student_daily_limit}
              onChange={(value) => setAiDraft((current) => ({ ...current, ai_student_daily_limit: value }))}
            />
            <NumberField
              label="Staff daily"
              value={aiDraft.ai_staff_daily_limit}
              onChange={(value) => setAiDraft((current) => ({ ...current, ai_staff_daily_limit: value }))}
            />
            <NumberField
              label="Global daily"
              value={aiDraft.ai_global_daily_limit}
              onChange={(value) => setAiDraft((current) => ({ ...current, ai_global_daily_limit: value }))}
            />
          </div>
          <button
            className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={busyKey === "ai-settings"}
            onClick={() => void saveAISettings()}
            type="button"
          >
            Save AI settings
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <StatList title="Popular categories" items={stats.most_popular_categories.map((item) => `${formatCategory(String(item.category))}: ${item.count}`)} />
        <StatList title="Pickup locations" items={stats.most_popular_pickup_locations.map((item) => `${formatPickupLocation(String(item.pickup_location))}: ${item.count}`)} />
        <StatList
          title="AI usage"
          items={[
            `${stats.ai_generations_used} generation(s)`,
            `${Math.round(stats.ai_failure_rate * 100)}% failure/denial rate`,
            `${stats.contact_requests_accepted}/${stats.contact_requests_sent} contact requests accepted`,
          ]}
        />
      </div>

      <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Role management</h2>
        <div className="mt-4 grid gap-3">
          {dashboard.users.slice(0, 10).map((user) => (
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between" key={user.id}>
              <div>
                <p className="text-sm font-semibold text-slate-950">{user.display_name ?? user.full_name ?? user.email}</p>
                <p className="mt-1 text-xs text-slate-500">{user.status} · {user.app_role ?? "student"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["student", "moderator", "admin"] as const).map((role) => (
                  <button
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400"
                    disabled={disabledId === user.id || busyKey === `${user.id}-${role}` || user.app_role === role}
                    key={role}
                    onClick={() => void setUserRole(user.id, role)}
                    type="button"
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <LogPanel
          title="AI usage logs"
          rows={dashboard.ai_usage_logs.slice(0, 8).map((log) => ({
            id: log.id,
            primary: `${log.feature} · ${log.request_status}`,
            secondary: log.error_message ?? `${log.provider ?? "provider"} ${log.model ?? ""}`,
          }))}
        />
        <LogPanel
          title="Admin actions"
          rows={dashboard.admin_actions.slice(0, 8).map((action) => ({
            id: action.id,
            primary: `${action.action_type} · ${action.target_type}`,
            secondary: action.reason ?? action.target_id,
          }))}
        />
      </div>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}>) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <input
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        min="0"
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function StatList({ items, title }: Readonly<{ title: string; items: string[] }>) {
  return (
    <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 grid gap-2">
        {items.length === 0 ? (
          <p className="text-sm text-slate-600">No data yet.</p>
        ) : (
          items.map((item) => (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" key={item}>
              {item}
            </p>
          ))
        )}
      </div>
    </div>
  );
}

function LogPanel({
  rows,
  title,
}: Readonly<{
  title: string;
  rows: Array<{ id: string; primary: string; secondary: string }>;
}>) {
  return (
    <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 grid gap-2">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-600">No records.</p>
        ) : (
          rows.map((row) => (
            <div className="rounded-lg border border-slate-200 p-3 text-sm" key={row.id}>
              <p className="font-semibold text-slate-950">{row.primary}</p>
              <p className="mt-1 text-slate-600">{row.secondary}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RiskCards({ evidence }: Readonly<{ evidence: Record<string, unknown> | null }>) {
  const cards = riskCards(evidence);
  if (cards.length === 0) {
    return <p className="mt-2 text-sm text-slate-600">No structured evidence recorded yet.</p>;
  }
  return (
    <div className="mt-3 grid gap-2">
      {cards.map((card) => (
        <div className="rounded-lg bg-white p-3 text-sm text-slate-700" key={card.title}>
          <p className="font-semibold text-slate-950">{card.title}</p>
          <p className="mt-1 leading-5">{card.body}</p>
        </div>
      ))}
    </div>
  );
}

function riskCards(evidence: Record<string, unknown> | null): Array<{ title: string; body: string }> {
  if (!evidence) {
    return [];
  }
  const cards: Array<{ title: string; body: string }> = [];
  const rawEvidence = evidence.evidence;
  if (Array.isArray(rawEvidence)) {
    for (const item of rawEvidence.slice(0, 5)) {
      const text = String(item);
      const lowered = text.toLowerCase();
      let title = "Decision evidence";
      if (lowered.includes("price")) {
        title = "Abnormal pricing";
      } else if (lowered.includes("image")) {
        title = "Image trust signal";
      } else if (lowered.includes("report")) {
        title = "User report";
      } else if (lowered.includes("risk")) {
        title = "Risk score";
      } else if (lowered.includes("suspicious") || lowered.includes("counterfeit")) {
        title = "Suspicious wording";
      }
      cards.push({ title, body: text });
    }
  }
  const duplicateCount = Number(evidence.duplicate_image_count ?? 0);
  if (duplicateCount > 0) {
    cards.push({
      title: "Duplicated image",
      body: `${duplicateCount} duplicate image signal(s) were found across listing media.`,
    });
  }
  const action = evidence.recommended_action;
  if (typeof action === "string") {
    cards.push({
      title: "Recommended moderation action",
      body: action.replaceAll("_", " "),
    });
  }
  return cards;
}
