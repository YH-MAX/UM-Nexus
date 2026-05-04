"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  createWantedPost,
  pickupAreas,
  tradeCategories,
  type WantedPostPayload,
} from "@/lib/trade/api";

export default function WantPage() {
  const router = useRouter();
  const { user } = useAuth();
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

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      router.push(`/wanted-posts/${wantedPost.id}`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create wanted post.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <TradeShell
      title="Create a wanted post"
      description="Describe what you need, your budget, and your pickup preference so the engine can recommend products and help nearby sellers find you."
    >
      {!user ? (
        <RequireAuthCard description="Sign in with your UM account before creating buyer wanted posts." />
      ) : null}
      {user ? (
      <form
        className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={handleSubmit}
      >
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
            className="min-h-28 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
        </label>

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </p>
        ) : null}

        <button
          className="w-full rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400 md:w-fit"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Creating..." : "Create wanted post"}
        </button>
      </form>
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
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600"
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
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600"
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
