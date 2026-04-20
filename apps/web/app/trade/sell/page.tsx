"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { TradeShell } from "@/components/trade/trade-shell";
import {
  addListingImage,
  createListing,
  pickupAreas,
  tradeCategories,
  type ListingPayload,
} from "@/lib/trade/api";

export default function SellPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "electronics",
    item_name: "",
    brand: "",
    model: "",
    condition_label: "good",
    price: "",
    pickup_area: "KK",
    residential_college: "",
    storage_path: "",
    public_url: "",
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
      const payload: ListingPayload = {
        title: form.title,
        description: form.description || undefined,
        category: form.category,
        item_name: form.item_name || undefined,
        brand: form.brand || undefined,
        model: form.model || undefined,
        condition_label: form.condition_label || undefined,
        price: Number(form.price),
        currency: "MYR",
        pickup_area: form.pickup_area || undefined,
        residential_college: form.residential_college || undefined,
      };

      const listing = await createListing(payload);
      if (form.storage_path.trim()) {
        await addListingImage(listing.id, {
          storage_path: form.storage_path.trim(),
          public_url: form.public_url.trim() || null,
          sort_order: 0,
          is_primary: true,
        });
      }

      router.push(`/trade/${listing.id}`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create listing.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <TradeShell
      title="Create a sell listing"
      description="The listing is created with the temporary demo user. Image upload is represented as metadata for this first slice."
    >
      <form
        className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Title" required value={form.title} onChange={(value) => updateField("title", value)} />
          <TextField label="Item name" value={form.item_name} onChange={(value) => updateField("item_name", value)} />
          <SelectField label="Category" value={form.category} options={tradeCategories} onChange={(value) => updateField("category", value)} />
          <TextField label="Price" required type="number" value={form.price} onChange={(value) => updateField("price", value)} />
          <TextField label="Brand" value={form.brand} onChange={(value) => updateField("brand", value)} />
          <TextField label="Model" value={form.model} onChange={(value) => updateField("model", value)} />
          <TextField label="Condition" value={form.condition_label} onChange={(value) => updateField("condition_label", value)} />
          <SelectField label="Pickup area" value={form.pickup_area} options={pickupAreas} onChange={(value) => updateField("pickup_area", value)} />
          <TextField label="Residential college" value={form.residential_college} onChange={(value) => updateField("residential_college", value)} />
          <TextField label="Image storage path" value={form.storage_path} onChange={(value) => updateField("storage_path", value)} />
          <TextField label="Public image URL" value={form.public_url} onChange={(value) => updateField("public_url", value)} />
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-800">Description</span>
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
          className="w-full rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 md:w-fit"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Creating..." : "Create listing"}
        </button>
      </form>
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
