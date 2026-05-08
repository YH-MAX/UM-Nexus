"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Inbox,
  Megaphone,
  PackageCheck,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { StatusPill } from "@/components/trade/status-pill";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  formatRelativeTime,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type TradeNotification,
} from "@/lib/trade/api";

export default function TradeNotificationsPage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [notifications, setNotifications] = useState<TradeNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadNotifications() {
    setNotifications(await getNotifications());
  }

  function notifyAlertStateChanged() {
    window.dispatchEvent(new Event("trade:notifications-changed"));
  }

  useEffect(() => {
    if (isAuthLoading || !user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    void loadNotifications()
      .catch((nextError) => {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load notifications.");
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

  async function readOne(notification: TradeNotification) {
    setIsUpdating(true);
    setError(null);
    try {
      await markNotificationRead(notification.id);
      await loadNotifications();
      notifyAlertStateChanged();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update notification.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function markOpened(notification: TradeNotification) {
    if (notification.is_read) {
      return;
    }
    try {
      await markNotificationRead(notification.id);
      notifyAlertStateChanged();
    } catch {
      // Opening the related item should not be blocked by read-state sync.
    }
  }

  async function readAll() {
    setIsUpdating(true);
    setError(null);
    try {
      await markAllNotificationsRead();
      await loadNotifications();
      notifyAlertStateChanged();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update notifications.");
    } finally {
      setIsUpdating(false);
    }
  }

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  const groupedNotifications = useMemo(() => groupNotificationsByDate(notifications), [notifications]);

  return (
    <TradeShell title="Trade alerts" description="Contact requests, moderation updates, and listing activity.">
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
      ) : null}

      {!user ? <RequireAuthCard description="Sign in with your UM account to view trade alerts." /> : null}

      {user && isLoading ? (
        <div className="trade-card p-5 text-sm text-slate-600">Loading alerts...</div>
      ) : user ? (
        <section className="trade-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Bell aria-hidden="true" className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-950">Inbox</h2>
              <StatusPill tone={unreadCount > 0 ? "warn" : "good"}>{unreadCount} unread</StatusPill>
            </div>
            <button
              className="trade-button-secondary"
              disabled={isUpdating || unreadCount === 0}
              onClick={() => void readAll()}
              type="button"
            >
              <CheckCheck aria-hidden="true" className="h-4 w-4" />
              Mark all read
            </button>
          </div>

          {notifications.length > 0 && unreadCount === 0 ? (
            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
              You&apos;re all caught up.
            </div>
          ) : null}

          <div className="mt-5 grid gap-3">
            {notifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                  <Inbox aria-hidden="true" className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-slate-950">No alerts yet</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  Contact requests, seller replies, moderation updates, and wanted matches will appear here.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link className="trade-button-primary" href="/trade">
                    Browse Listings
                  </Link>
                  <Link className="trade-button-secondary bg-white" href="/trade/dashboard">
                    Open My Trade
                  </Link>
                </div>
              </div>
            ) : (
              groupedNotifications.map((group) => (
                <section className="grid gap-3" key={group.label}>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{group.label}</h3>
                  {group.notifications.map((notification) => {
                    const meta = notificationMeta(notification.type);
                    const Icon = meta.icon;
                    return (
                      <article
                        className={`rounded-2xl border p-4 ${priorityClass(notification.priority)} ${
                          notification.is_read ? "border-slate-200 bg-white" : "border-emerald-200 bg-emerald-50"
                        }`}
                        key={notification.id}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 gap-3">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.iconClass}`}>
                              <Icon aria-hidden="true" className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {!notification.is_read ? (
                                  <span aria-label="Unread alert" className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                                ) : null}
                                <StatusPill tone={notification.is_read ? "neutral" : "good"}>
                                  {notification.is_read ? "read" : "new"}
                                </StatusPill>
                                <StatusPill tone={meta.tone}>{meta.group}</StatusPill>
                                {notification.priority === "high" || notification.priority === "urgent" ? (
                                  <StatusPill tone={notification.priority === "urgent" ? "danger" : "warn"}>
                                    {notification.priority}
                                  </StatusPill>
                                ) : null}
                              </div>
                              <h4 className={`mt-3 text-slate-950 ${notification.is_read ? "font-semibold" : "font-bold"}`}>
                                {notification.title}
                              </h4>
                              <p className="mt-1 text-sm leading-6 text-slate-600">{notification.body}</p>
                              <p className="mt-2 text-xs font-semibold text-slate-500">
                                {formatRelativeTime(notification.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            {notification.action_url ? (
                              <Link
                                className="trade-button-primary bg-slate-950 hover:bg-slate-800"
                                href={notification.action_url}
                                onClick={() => void markOpened(notification)}
                              >
                                <ExternalLink aria-hidden="true" className="h-4 w-4" />
                                Open
                              </Link>
                            ) : null}
                            <button
                              className="trade-button-secondary"
                              disabled={isUpdating || notification.is_read}
                              onClick={() => void readOne(notification)}
                              type="button"
                            >
                              <CheckCheck aria-hidden="true" className="h-4 w-4" />
                              Mark read
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </section>
              ))
            )}
                      </div>
        </section>
      ) : null}
    </TradeShell>
  );
}

function notificationMeta(type: string): {
  group: string;
  icon: LucideIcon;
  iconClass: string;
  tone: "good" | "warn" | "danger" | "neutral";
} {
  if (type.startsWith("contact_request")) {
    if (type.includes("accepted")) {
      return { group: "Request", icon: CheckCircle2, iconClass: "bg-emerald-100 text-emerald-700", tone: "good" };
    }
    if (type.includes("rejected") || type.includes("cancelled") || type.includes("expired")) {
      return { group: "Request", icon: XCircle, iconClass: "bg-rose-100 text-rose-700", tone: "danger" };
    }
    return { group: "Request", icon: Inbox, iconClass: "bg-sky-100 text-sky-700", tone: "neutral" };
  }
  if (type === "buyer_no_response") {
    return { group: "Request", icon: Clock, iconClass: "bg-amber-100 text-amber-700", tone: "warn" };
  }
  if (type.startsWith("listing_marked") || type === "trade_marked_completed") {
    return { group: "Listing", icon: PackageCheck, iconClass: "bg-emerald-100 text-emerald-700", tone: "good" };
  }
  if (type.includes("moderation") || type.includes("reported") || type.includes("report")) {
    return { group: "Safety", icon: ShieldAlert, iconClass: "bg-amber-100 text-amber-700", tone: "warn" };
  }
  if (type.includes("wanted")) {
    return { group: "Wanted", icon: Megaphone, iconClass: "bg-cyan-100 text-cyan-700", tone: "neutral" };
  }
  return { group: "Alert", icon: Bell, iconClass: "bg-slate-100 text-slate-700", tone: "neutral" };
}

function groupNotificationsByDate(notifications: TradeNotification[]): Array<{
  label: "Today" | "Yesterday" | "Earlier";
  notifications: TradeNotification[];
}> {
  const groups = new Map<"Today" | "Yesterday" | "Earlier", TradeNotification[]>();
  for (const notification of notifications) {
    const label = notificationDateLabel(notification.created_at);
    groups.set(label, [...(groups.get(label) ?? []), notification]);
  }
  return Array.from(groups, ([label, groupNotifications]) => ({ label, notifications: groupNotifications }));
}

function notificationDateLabel(value: string): "Today" | "Yesterday" | "Earlier" {
  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) {
    return "Earlier";
  }
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (createdAt.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (createdAt.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return "Earlier";
}

function priorityClass(priority: TradeNotification["priority"]): string {
  if (priority === "urgent") {
    return "shadow-[inset_4px_0_0_rgb(225,29,72)]";
  }
  if (priority === "high") {
    return "shadow-[inset_4px_0_0_rgb(245,158,11)]";
  }
  return "";
}
