"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Eye,
  Lock,
  LogOut,
  Rocket,
  Save,
  Shield,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  contactMethods,
  formatPickupLocation,
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

const inputClassName =
  "min-w-0 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-950 shadow-sm outline-none transition duration-200 placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-500";

const selectClassName = `${inputClassName} h-12`;

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

  const readinessRows = useMemo(() => {
    const umEmailDone = Boolean(profile?.verified_um_email);
    const displayDone = Boolean((profile?.display_name || profile?.full_name)?.trim());
    const facultyDone = Boolean(profile?.faculty?.trim());
    const campusDone = Boolean((profile?.college_or_location || profile?.residential_college)?.trim());
    const rows = [
      { key: "email", label: "UM email verified", done: umEmailDone },
      { key: "name", label: "Display name", done: displayDone },
      { key: "faculty", label: "Faculty", done: facultyDone },
      { key: "campus", label: "Campus location", done: campusDone },
    ] as const;
    const doneCount = rows.filter((r) => r.done).length;
    const pct = Math.round((doneCount / rows.length) * 100);
    return { rows, doneCount, pct };
  }, [profile]);

  const profileComplete = user ? isProfileComplete(profile) : false;

  return (
    <TradeShell hideHero title="Trade profile" description="">
      <div className="min-w-0">
        {error ? (
          <div
            className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/95 p-4 text-sm leading-6 text-rose-800 shadow-sm"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/95 p-4 text-sm leading-6 text-emerald-900 shadow-sm">
            {notice}
          </div>
        ) : null}

        {!user ? <RequireAuthCard description="Sign in with your UM account to manage your trade profile." /> : null}

        {user && isLoading ? (
          <div
            className="rounded-2xl border border-stone-200 bg-white/95 p-8 shadow-sm"
            aria-busy="true"
            role="status"
          >
            <div className="flex items-center gap-4 text-sm font-semibold text-stone-600">
              <span className="trade-loading-block h-12 w-12 shrink-0 rounded-full" />
              Loading profile...
            </div>
          </div>
        ) : user ? (
          <div className="flex min-w-0 flex-col gap-8 lg:gap-10 xl:flex-row xl:items-start">
            <div className="min-w-0 flex-1">
              <ProfileHero />

              {!profileComplete ? <ProfileIncompleteBanner /> : null}

              <PublicIdentityCard form={form} setForm={setForm} />

              <CampusTradingDetailsCard form={form} setForm={setForm} />

              <SaveProfileAction isSaving={isSaving} onSave={() => void saveProfile()} />
            </div>

            <aside className="w-full shrink-0 space-y-5 xl:sticky xl:top-24 xl:w-[400px] xl:self-start">
              <SignedInCard email={user.email ?? ""} isSigningOut={isSigningOut} onSignOut={() => void signOut()} />
              <LaunchReadinessCard
                doneCount={readinessRows.doneCount}
                pct={readinessRows.pct}
                profileComplete={profileComplete}
                rows={readinessRows.rows}
              />
              <PublicSellerPreviewCard form={form} profile={profile} userEmail={user.email} />
              <PrivacySafetyCard />
            </aside>
          </div>
        ) : null}
      </div>
    </TradeShell>
  );
}

function ProfileHero() {
  return (
    <header className="mb-6 min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">UM Nexus Trade</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
        Complete your trade profile
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
        Build a trusted identity so fellow students can connect with confidence.
      </p>
    </header>
  );
}

function ProfileIncompleteBanner() {
  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-6 shadow-sm"
      aria-live="polite"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full border border-dashed border-amber-200/80 bg-amber-100/20"
      />
      <div className="relative flex items-start gap-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-amber-700 shadow-sm">
          <AlertCircle aria-hidden className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-stone-950">Your profile is incomplete</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
            Add your display name, faculty, and campus location to publish listings and contact sellers.
          </p>
        </div>
      </div>
    </section>
  );
}

function PublicIdentityCard({
  form,
  setForm,
}: Readonly<{
  form: ProfileForm;
  setForm: Dispatch<SetStateAction<ProfileForm>>;
}>) {
  return (
    <section className="mt-5 rounded-2xl border border-stone-200 bg-white/95 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 shadow-inner">
          <UserRound aria-hidden className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-stone-950">Public identity</h2>
          <p className="mt-1 text-sm text-stone-500">This is how other students will see you on UM Nexus Trade.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 sm:col-span-1">
          <span className="text-sm font-medium text-stone-900">Display name</span>
          <span className="text-sm text-stone-500">Your public name on the marketplace</span>
          <input
            className={`${inputClassName} h-12`}
            placeholder="Enter your display name"
            value={form.display_name}
            onChange={(e) => setForm((c) => ({ ...c, display_name: e.target.value }))}
          />
        </label>
        <label className="grid gap-2 sm:col-span-1">
          <span className="text-sm font-medium text-stone-900">Faculty</span>
          <span className="text-sm text-stone-500">Your faculty or school</span>
          <input
            className={`${inputClassName} h-12`}
            placeholder="Select your faculty"
            value={form.faculty}
            onChange={(e) => setForm((c) => ({ ...c, faculty: e.target.value }))}
          />
        </label>
        <label className="grid gap-2 sm:col-span-2">
          <span className="text-sm font-medium text-stone-900">Bio</span>
          <span className="text-sm text-stone-500">Tell other students a little about yourself (optional)</span>
          <textarea
            className={`${inputClassName} min-h-[7rem] resize-y py-3`}
            placeholder="Write a short bio..."
            value={form.bio}
            onChange={(e) => setForm((c) => ({ ...c, bio: e.target.value }))}
          />
          <span className="text-right text-xs text-stone-400">
            {form.bio.length} / 250
          </span>
        </label>
      </div>
    </section>
  );
}

function CampusTradingDetailsCard({
  form,
  setForm,
}: Readonly<{
  form: ProfileForm;
  setForm: Dispatch<SetStateAction<ProfileForm>>;
}>) {
  const methodLabel =
    contactMethods.find((m) => m.value === form.contact_preference)?.label ?? "your chosen method";

  return (
    <section className="mt-5 rounded-2xl border border-stone-200 bg-white/95 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 shadow-inner">
          <Shield aria-hidden className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-stone-950">Campus trading details</h2>
          <p className="mt-1 text-sm text-stone-500">Help students know where you are and how to reach you.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-stone-900">Campus location</span>
          <span className="text-sm text-stone-500">Your primary campus</span>
          <select
            className={selectClassName}
            value={form.college_or_location}
            onChange={(e) => setForm((c) => ({ ...c, college_or_location: e.target.value }))}
          >
            <option value="">Choose your campus</option>
            {pickupAreas.map((area) => (
              <option key={area.value} value={area.value}>
                {area.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-stone-900">Preferred contact</span>
          <span className="text-sm text-stone-500">How you prefer to be contacted</span>
          <select
            className={selectClassName}
            value={form.contact_preference}
            onChange={(e) => setForm((c) => ({ ...c, contact_preference: e.target.value }))}
          >
            {contactMethods.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 md:col-span-1">
          <span className="text-sm font-medium text-stone-900">Contact number</span>
          <span className="text-sm text-stone-500">
            Your mobile number with country code so buyers can reach you via {methodLabel}.
          </span>
          <input
            className={`${inputClassName} h-12`}
            placeholder="e.g. +60 12 345 6789"
            value={form.contact_value}
            onChange={(e) => setForm((c) => ({ ...c, contact_value: e.target.value }))}
          />
        </label>
      </div>
    </section>
  );
}

function SaveProfileAction({
  isSaving,
  onSave,
}: Readonly<{
  isSaving: boolean;
  onSave: () => void;
}>) {
  return (
    <div className="mt-8 min-w-0">
      <button
        className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-6 text-base font-semibold text-amber-400 shadow-lg transition duration-200 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-[260px]"
        disabled={isSaving}
        onClick={onSave}
        type="button"
      >
        <Save aria-hidden className="h-5 w-5 shrink-0 text-amber-400" />
        {isSaving ? "Saving..." : "Save profile"}
      </button>
      <p className="mt-4 flex items-center gap-2 text-sm text-stone-500">
        <Lock aria-hidden className="h-4 w-4 shrink-0 text-stone-400" />
        Your information is private and secure.
      </p>
    </div>
  );
}

function SignedInCard({
  email,
  isSigningOut,
  onSignOut,
}: Readonly<{
  email: string;
  isSigningOut: boolean;
  onSignOut: () => void;
}>) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white/95 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#faf6ed] text-amber-900 ring-1 ring-amber-200/60">
          <UserRound aria-hidden className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Signed in as</p>
          <p className="mt-1 break-words text-sm font-semibold text-stone-950">{email}</p>
        </div>
      </div>
      <button
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50/40 text-sm font-semibold text-red-700 transition duration-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSigningOut}
        onClick={onSignOut}
        type="button"
      >
        <LogOut aria-hidden className="h-4 w-4" />
        {isSigningOut ? "Signing out..." : "Sign out"}
      </button>
    </section>
  );
}

function LaunchReadinessCard({
  rows,
  pct,
  profileComplete,
  doneCount,
}: Readonly<{
  rows: ReadonlyArray<{ key: string; label: string; done: boolean }>;
  pct: number;
  profileComplete: boolean;
  doneCount: number;
}>) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white/95 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <Rocket aria-hidden className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-semibold text-stone-950">Launch readiness</h2>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
            profileComplete
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-300 bg-amber-50 text-amber-900"
          }`}
        >
          {profileComplete ? "Ready" : `${pct}% complete`}
        </span>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-stone-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            profileComplete ? "bg-emerald-500" : "bg-gradient-to-r from-amber-500 to-[#D6A846]"
          }`}
          style={{ width: `${profileComplete ? 100 : pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-stone-500">
        {doneCount} of {rows.length} checklist items complete
      </p>

      <ul className="mt-5 space-y-3">
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
          >
            <div className="flex min-w-0 items-center gap-3">
              {row.done ? (
                <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <Circle aria-hidden className="h-5 w-5 shrink-0 text-amber-400" />
              )}
              <span className="text-sm font-medium text-stone-900">{row.label}</span>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                row.done
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {row.done ? "Done" : "Needed"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PublicSellerPreviewCard({
  form,
  profile,
  userEmail,
}: Readonly<{
  form: ProfileForm;
  profile: CurrentProfile | null;
  userEmail: string | undefined;
}>) {
  const displayName = form.display_name.trim() || "Your Name";
  const initials = sellerPreviewInitials(form.display_name, userEmail);
  const facultyLine = form.faculty.trim() || "Faculty";
  const campusLine = formatPickupLocation(form.college_or_location || null);
  const verified = Boolean(profile?.verified_um_email);

  return (
    <section className="rounded-2xl border border-stone-200 bg-white/95 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          <Eye aria-hidden className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-semibold text-stone-950">Public seller preview</h2>
      </div>

      <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-stone-100 to-amber-50 text-base font-bold tracking-tight text-stone-800 ring-2 ring-amber-200/50">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-stone-950">{displayName}</p>
            {verified ? (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-[#fffdf8] px-2.5 py-1 text-xs font-semibold text-amber-900">
                <ShieldCheck aria-hidden className="h-3.5 w-3.5 text-amber-700" />
                UM Verified
              </span>
            ) : (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-600">
                Verification pending
              </span>
            )}
          </div>
        </div>
        <p className="mt-4 text-sm text-stone-600">
          <span className="font-medium text-stone-800">Faculty</span> · {facultyLine}
        </p>
        <p className="mt-1 text-sm text-stone-600">
          <span className="font-medium text-stone-800">Campus</span> · {campusLine}
        </p>

        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/80 p-3 text-sm leading-relaxed text-emerald-900">
          <div className="flex gap-2">
            <Lock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <p>Your contact details are shared only after a buyer&apos;s request is accepted.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PrivacySafetyCard() {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white/95 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          <Shield aria-hidden className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-stone-950">Privacy &amp; safety</h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            We keep your contact details hidden from other students until you accept their request.
          </p>
          <Link className="mt-3 inline-flex text-sm font-semibold text-amber-700 transition hover:text-amber-800" href="/safety">
            Learn how we protect you →
          </Link>
        </div>
      </div>
    </section>
  );
}

function sellerPreviewInitials(displayName: string, email: string | undefined): string {
  const name = displayName.trim();
  if (name.length >= 2) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0]![0];
      const b = parts[parts.length - 1]![0];
      if (a && b) {
        return (a + b).toUpperCase();
      }
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (name.length === 1) {
    return (name + (email?.[0] ?? "N")).toUpperCase();
  }
  const local = email?.split("@")[0]?.trim() ?? "";
  if (local.length >= 2) {
    return local.slice(0, 2).toUpperCase();
  }
  if (local.length === 1) {
    return (local + "N").toUpperCase();
  }
  return "YN";
}
