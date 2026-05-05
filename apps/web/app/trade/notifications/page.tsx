"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { StatusPill } from "@/components/trade/status-pill";
import { TradeShell } from "@/components/trade/trade-shell";
import {
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
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update notification.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function readAll() {
    setIsUpdating(true);
    setError(null);
    try {
      await markAllNotificationsRead();
      await loadNotifications();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update notifications.");
    } finally {
      setIsUpdating(false);
    }
  }

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

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

          <div className="mt-5 grid gap-3">
            {notifications.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                No alerts yet.
              </p>
            ) : (
              notifications.map((notification) => (
                <article
                  className={`rounded-2xl border p-4 ${
                    notification.is_read ? "border-slate-200 bg-white" : "border-emerald-200 bg-emerald-50"
                  }`}
                  key={notification.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <StatusPill tone={notification.is_read ? "neutral" : "good"}>
                          {notification.is_read ? "read" : "new"}
                        </StatusPill>
                        <StatusPill>{notification.type.replaceAll("_", " ")}</StatusPill>
                      </div>
                      <h3 className="mt-3 font-semibold text-slate-950">{notification.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{notification.body}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {notification.action_url ? (
                        <Link
                          className="trade-button-primary bg-slate-950 hover:bg-slate-800"
                          href={notification.action_url}
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
              ))
            )}
          </div>
        </section>
      ) : null}
    </TradeShell>
  );
}
