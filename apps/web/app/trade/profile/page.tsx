"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";

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
  const router = useRouter();
  const { isLoading: isAuthLoading, supabase, user } = useAuth();
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
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

  async function signOut() {
    setIsSigningOut(true);
    setError(null);
    setNotice(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(signOutError.message);
        return;
      }
      startTransition(() => {
        router.push("/login");
        router.refresh();
      });
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <TradeShell title="Trade profile" description="UM identity, campus location, and preferred contact for marketplace actions.">
      {error ? (
        <div className="trade-alert trade-alert-danger">{error}</div>
      ) : null}
      {notice ? (
        <div className="trade-alert trade-alert-success">{notice}</div>
      ) : null}

      {!user ? <RequireAuthCard description="Sign in with your UM account to manage your trade profile." /> : null}

      {user && isLoading ? (
        <div className="trade-card p-5" aria-busy="true" role="status">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
            <span className="trade-loading-block h-10 w-10 shrink-0" />
            Loading profile...
          </div>
        </div>
      ) : user ? (
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid gap-5">
            {!isProfileComplete(profile) ? (
              <div className="trade-alert trade-alert-warning">
                Complete your profile to publish listings and contact sellers.
              </div>
            ) : null}
            <div className="trade-card p-5">
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
                <span className="trade-field-label">Campus location</span>
                <select
                  className="trade-input"
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
                <span className="trade-field-label">Preferred contact</span>
                <select
                  className="trade-input"
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
                <span className="trade-field-label">Bio</span>
                <textarea
                  className="trade-input min-h-28"
                  value={form.bio}
                  onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                />
              </label>
            </div>
            <button
              className="trade-button-primary mt-5"
              disabled={isSaving}
              onClick={() => void saveProfile()}
              type="button"
            >
              {isSaving ? "Saving..." : "Save profile"}
            </button>
            </div>
          </div>

          <aside className="grid h-fit gap-5">
          <section className="trade-card p-5">
            <p className="text-sm text-slate-500">Signed in as</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-950">{user.email}</p>
            <button
              className="trade-button-danger mt-4 w-full"
              disabled={isSigningOut}
              onClick={() => void signOut()}
              type="button"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </section>
          <section className="trade-card p-5">
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
          </section>
          <section className="trade-card p-5">
            <div className="trade-icon-frame h-12 w-12">
              <UserRound aria-hidden="true" className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-950">Public seller preview</h2>
            <p className="mt-2 text-sm font-semibold text-slate-900">{form.display_name || "Your display name"}</p>
            <p className="mt-1 text-sm text-slate-600">{form.faculty || "Faculty"} · {form.college_or_location || "Campus location"}</p>
            <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
              <div className="flex gap-2">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Your contact details are only shared after you accept a buyer&apos;s request.</p>
              </div>
            </div>
          </section>
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
      <span className="trade-field-label">{label}</span>
      <input
        className="trade-input"
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
