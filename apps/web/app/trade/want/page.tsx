"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Megaphone, Search } from "lucide-react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  createWantedPost,
  getCurrentUser,
  isProfileComplete,
  pickupAreas,
  tradeCategories,
  type CurrentProfile,
  type WantedPostPayload,
} from "@/lib/trade/api";

export default function WantPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "electronics",
    desired_item_name: "",
    max_budget: "",
    preferred_pickup_area: "kk1",
    residential_college: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let isMounted = true;
    void getCurrentUser()
      .then((current) => {
        if (isMounted) {
          setProfile(current.profile);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProfile(null);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [user]);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isProfileComplete(profile)) {
      setError("Complete your trade profile before posting a wanted request.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: WantedPostPayload = {
        title: form.title,
        description: form.description || undefined,
        category: form.category,
        desired_item_name: form.desired_item_name || undefined,
        max_budget: form.max_budget ? Number(form.max_budget) : undefined,
        currency: "MYR",
        preferred_pickup_area: form.preferred_pickup_area || undefined,
        residential_college: form.residential_college || undefined,
      };
      const wantedPost = await createWantedPost(payload);
      router.push(`/wanted-posts/${wantedPost.id}?posted=1`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create wanted post.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <TradeShell
      title="Looking for something?"
      description="Post a wanted request and let UM students know what you need. Wanted is for buyer demand; listings are still the main marketplace."
    >
      {!user ? (
        <RequireAuthCard description="Sign in with your UM account before creating buyer wanted posts." intent="post_wanted" returnTo="/trade/want" />
      ) : null}
      {user ? (
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          {!isProfileComplete(profile) ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950 lg:col-span-2">
              Complete your profile before posting wanted requests. You can keep browsing and saving listings now.
            </div>
          ) : null}
          <form
            className="trade-card grid gap-5 p-5"
            onSubmit={handleSubmit}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Wanted request</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Tell sellers what you need</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Title" required value={form.title} onChange={(value) => updateField("title", value)} />
              <TextField label="Desired item or model" value={form.desired_item_name} onChange={(value) => updateField("desired_item_name", value)} />
              <SelectField label="Category" value={form.category} options={tradeCategories} onChange={(value) => updateField("category", value)} />
              <TextField label="Maximum budget (MYR)" type="number" value={form.max_budget} onChange={(value) => updateField("max_budget", value)} />
              <SelectField label="Preferred pickup area" value={form.preferred_pickup_area} options={pickupAreas} onChange={(value) => updateField("preferred_pickup_area", value)} />
              <TextField label="Residential college / KK" value={form.residential_college} onChange={(value) => updateField("residential_college", value)} />
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-800">Need details, urgency, and acceptable alternatives</span>
              <textarea
                className="trade-input min-h-32"
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
              />
            </label>

            {error ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {error}
              </p>
            ) : null}

            <button
              className="trade-button-primary w-full md:w-fit"
              disabled={isSubmitting}
              type="submit"
            >
              <Megaphone aria-hidden="true" className="h-4 w-4" />
              {isSubmitting ? "Creating..." : "Create wanted post"}
            </button>
          </form>

          <aside className="trade-card h-fit p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Search aria-hidden="true" className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-950">Good examples</h2>
            <div className="mt-4 grid gap-3 text-sm text-slate-700">
              {[
                "Looking for a used monitor under RM200",
                "Need WIA2005 textbook",
                "Looking for a rice cooker near KK12",
              ].map((example) => (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-3" key={example}>{example}</p>
              ))}
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
  required = false,
  type = "text",
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}>) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <input
        className="trade-input"
        min={type === "number" ? "1" : undefined}
        required={required}
        step={type === "number" ? "0.01" : undefined}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}>) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <select
        className="trade-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
