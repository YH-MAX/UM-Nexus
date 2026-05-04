"use client";

import { useEffect, useState } from "react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { StatusPill } from "@/components/trade/status-pill";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  contactMethods,
  getCurrentUser,
  isProfileComplete,
  pickupAreas,
  updateMyProfile,
  type CurrentProfile,
} from "@/lib/trade/api";

type ProfileForm = {
  display_name: string;
  faculty: string;
  college_or_location: string;
  bio: string;
  contact_preference: string;
  contact_value: string;
};

const initialForm: ProfileForm = {
  display_name: "",
  faculty: "",
  college_or_location: "",
  bio: "",
  contact_preference: "telegram",
  contact_value: "",
};

export default function TradeProfilePage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadProfile() {
    const current = await getCurrentUser();
    setProfile(current.profile);
    setForm({
      display_name: current.profile.display_name ?? current.profile.full_name ?? "",
      faculty: current.profile.faculty ?? "",
      college_or_location: current.profile.college_or_location ?? current.profile.residential_college ?? "",
      bio: current.profile.bio ?? "",
      contact_preference: current.profile.contact_preference ?? "telegram",
      contact_value: current.profile.contact_value ?? "",
    });
  }

  useEffect(() => {
    if (isAuthLoading || !user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    void loadProfile()
      .catch((nextError) => {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load profile.");
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

  async function saveProfile() {
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateMyProfile({
        display_name: form.display_name.trim() || null,
        full_name: form.display_name.trim() || null,
        faculty: form.faculty.trim() || null,
        college_or_location: form.college_or_location || null,
        residential_college: form.college_or_location || null,
        bio: form.bio.trim() || null,
        contact_preference: form.contact_preference || null,
        contact_value: form.contact_value.trim() || null,
      });
      setProfile(updated);
      setNotice("Profile saved.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <TradeShell title="Trade profile" description="UM identity, campus location, and preferred contact for marketplace actions.">
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
      ) : null}
      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div>
      ) : null}

      {!user ? <RequireAuthCard description="Sign in with your UM account to manage your trade profile." /> : null}

      {user && isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">Loading profile...</div>
      ) : user ? (
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Display name"
                value={form.display_name}
                onChange={(value) => setForm((current) => ({ ...current, display_name: value }))}
              />
              <TextField
                label="Faculty"
                value={form.faculty}
                onChange={(value) => setForm((current) => ({ ...current, faculty: value }))}
              />
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-800">Campus location</span>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  value={form.college_or_location}
                  onChange={(event) => setForm((current) => ({ ...current, college_or_location: event.target.value }))}
                >
                  <option value="">Choose one</option>
                  {pickupAreas.map((area) => (
                    <option key={area.value} value={area.value}>
                      {area.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-800">Preferred contact</span>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  value={form.contact_preference}
                  onChange={(event) => setForm((current) => ({ ...current, contact_preference: event.target.value }))}
                >
                  {contactMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </label>
              <TextField
                label="Contact value"
                value={form.contact_value}
                onChange={(value) => setForm((current) => ({ ...current, contact_value: value }))}
              />
              <label className="grid gap-2 sm:col-span-2">
                <span className="text-sm font-semibold text-slate-800">Bio</span>
                <textarea
                  className="min-h-28 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  value={form.bio}
                  onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                />
              </label>
            </div>
            <button
              className="mt-5 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSaving}
              onClick={() => void saveProfile()}
              type="button"
            >
              {isSaving ? "Saving..." : "Save profile"}
            </button>
          </div>

          <aside className="h-fit rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">Launch readiness</h2>
              <StatusPill tone={isProfileComplete(profile) ? "good" : "warn"}>
                {isProfileComplete(profile) ? "ready" : "incomplete"}
              </StatusPill>
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <CheckRow label="UM email" done={Boolean(profile?.verified_um_email)} />
              <CheckRow label="Display name" done={Boolean((profile?.display_name || profile?.full_name)?.trim())} />
              <CheckRow label="Faculty" done={Boolean(profile?.faculty?.trim())} />
              <CheckRow label="Campus location" done={Boolean((profile?.college_or_location || profile?.residential_college)?.trim())} />
            </div>
          </aside>
        </section>
      ) : null}
    </TradeShell>
  );
}

function TextField({
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
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function CheckRow({ done, label }: Readonly<{ done: boolean; label: string }>) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="font-semibold text-slate-700">{label}</span>
      <StatusPill tone={done ? "good" : "warn"}>{done ? "done" : "needed"}</StatusPill>
    </div>
  );
}
