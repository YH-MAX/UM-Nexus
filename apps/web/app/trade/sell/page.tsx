"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { TradeShell } from "@/components/trade/trade-shell";
import {
  createListing,
  pickupAreas,
  tradeCategories,
  uploadListingImage,
  type ListingPayload,
} from "@/lib/trade/api";

type PreviewFile = {
  file: File;
  previewUrl: string;
};

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
  });
  const [images, setImages] = useState<PreviewFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, [images]);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleImageSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []).slice(0, 4);
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setImages(
      selectedFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    );
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
      await Promise.all(
        images.map((image, index) =>
          uploadListingImage(listing.id, image.file, {
            sortOrder: index,
            isPrimary: index === 0,
          }),
        ),
      );

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
      description="Upload item photos and listing details. Demo mode uses the fixed campus test user."
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
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-800">Description</span>
          <textarea
            className="min-h-28 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
        </label>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-800">Item images</span>
            <input
              accept="image/jpeg,image/png,image/webp"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              multiple
              onChange={handleImageSelection}
              type="file"
            />
          </label>
          {images.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {images.map((image, index) => (
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white" key={image.previewUrl}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={`Upload preview ${index + 1}`}
                    className="aspect-square w-full object-cover"
                    src={image.previewUrl}
                  />
                  <p className="truncate px-3 py-2 text-xs text-slate-600">{image.file.name}</p>
                </div>
              ))}
            </div>
          ) : null}
          <p className="mt-3 text-xs text-slate-500">Select 1-4 jpg, png, or webp images.</p>
        </div>

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
