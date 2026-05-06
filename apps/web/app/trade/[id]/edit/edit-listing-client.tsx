"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { Camera, Save, Trash2, UploadCloud } from "lucide-react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { PriceText } from "@/components/trade/price-text";
import { SafetyNotice } from "@/components/trade/safety-notice";
import { StatusPill, statusTone } from "@/components/trade/status-pill";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  conditionOptions,
  contactMethods,
  formatCategory,
  formatPickupLocation,
  getListing,
  pickupAreas,
  publishListing,
  removeListingImage,
  tradeCategories,
  updateListing,
  uploadListingImage,
  type Listing,
  type ListingPayload,
} from "@/lib/trade/api";

type EditListingClientProps = Readonly<{
  listingId: string;
}>;

type PendingImage = {
  file: File;
  previewUrl: string;
};

const emptyPayload: ListingPayload = {
  title: "",
  description: "",
  category: "others",
  condition_label: "good",
  price: 0,
  currency: "MYR",
  pickup_location: "kk1",
  pickup_area: "kk1",
  pickup_note: "",
  contact_method: "telegram",
  contact_value: "",
};

export function EditListingClient({ listingId }: EditListingClientProps) {
  const router = useRouter();
  const { isLoading: isAuthLoading, user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [form, setForm] = useState<ListingPayload>(emptyPayload);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [removingImageId, setRemovingImageId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    void getListing(listingId)
      .then((nextListing) => {
        if (!isMounted) {
          return;
        }
        setListing(nextListing);
        setForm(listingToPayload(nextListing));
      })
      .catch((nextError) => {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load listing.");
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
  }, [listingId]);

  useEffect(() => {
    return () => {
      pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, [pendingImages]);

  const isSeller = Boolean(user && listing?.seller_id === user.id);
  const soldLocked = listing?.status === "sold";
  const validationWarnings = useMemo(() => listingWarnings(form, listing?.images.length ?? 0, pendingImages.length), [
    form,
    listing?.images.length,
    pendingImages.length,
  ]);

  function updateField(field: keyof ListingPayload, value: string | number | undefined) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "category" && value === "free_items" ? { price: 0 } : {}),
      ...(field === "pickup_location" ? { pickup_area: String(value ?? "") } : {}),
    }));
  }

  function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const currentCount = (listing?.images.length ?? 0) + pendingImages.length;
    const slots = Math.max(0, 5 - currentCount);
    const selected = files.slice(0, slots);
    if (files.length > selected.length) {
      setNotice("Only five listing photos are allowed in V1.");
    }
    setPendingImages((current) => [
      ...current,
      ...selected.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
    event.target.value = "";
  }

  function removePendingImage(previewUrl: string) {
    setPendingImages((current) => {
      const target = current.find((image) => image.previewUrl === previewUrl);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((image) => image.previewUrl !== previewUrl);
    });
  }

  async function removeExistingImage(imageId: string) {
    if (!listing) {
      return;
    }
    setRemovingImageId(imageId);
    setError(null);
    try {
      await removeListingImage(listing.id, imageId);
      const refreshed = await getListing(listing.id);
      setListing(refreshed);
      setNotice("Image removed.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to remove image.");
    } finally {
      setRemovingImageId(null);
    }
  }

  async function saveListing(options: { publish?: boolean } = {}) {
    if (!listing) {
      return;
    }
    const validationError = validatePayload(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateListing(listing.id, preparePayload(form));
      for (const [index, image] of pendingImages.entries()) {
        await uploadListingImage(updated.id, image.file, {
          sortOrder: updated.images.length + index,
          isPrimary: updated.images.length === 0 && index === 0,
        });
      }
      const published = options.publish ? await publishListing(updated.id) : await getListing(updated.id);
      setListing(published);
      setForm(listingToPayload(published));
      setPendingImages([]);
      if (options.publish) {
        router.push(`/trade/${published.id}`);
      } else {
        setNotice("Listing changes saved.");
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save listing.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <TradeShell
      title="Edit listing"
      description="Update your item details, pickup, contact method, and photos. Sold listings are locked except for status management."
      action={
        <Link className="trade-button-secondary" href={`/trade/${listingId}`}>
          Back to listing
        </Link>
      }
    >
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}
      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div> : null}

      {!user && !isAuthLoading ? <RequireAuthCard description="Sign in with your UM account to edit your listing." /> : null}

      {isLoading || isAuthLoading ? (
        <div className="trade-card p-5 text-sm text-slate-600">Loading listing editor...</div>
      ) : user && listing && !isSeller ? (
        <section className="trade-card p-6">
          <h2 className="text-xl font-semibold">Only the seller can edit this listing</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            You can still browse the listing, save it, or submit a contact request from the detail page.
          </p>
          <Link className="trade-button-primary mt-5" href={`/trade/${listing.id}`}>
            Open listing
          </Link>
        </section>
      ) : user && listing ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <section className="grid gap-5">
            <div className="trade-card p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Listing state</p>
                  <h2 className="mt-1 text-xl font-semibold">{listing.title}</h2>
                </div>
                <StatusPill tone={statusTone(listing.status)}>{listing.status.replaceAll("_", " ")}</StatusPill>
              </div>
              {soldLocked ? (
                <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  This item is marked sold. Core listing content is locked to preserve transaction history.
                </p>
              ) : null}
            </div>

            <PhotosEditor
              disabled={isSaving || soldLocked}
              listing={listing}
              pendingImages={pendingImages}
              removingImageId={removingImageId}
              onImageSelection={handleImageSelection}
              onRemoveExisting={removeExistingImage}
              onRemovePending={removePendingImage}
            />

            <section className="trade-card p-5">
              <h2 className="text-xl font-semibold">Item details</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <TextField disabled={soldLocked || isSaving} label="Title" value={form.title} onChange={(value) => updateField("title", value)} />
                <SelectField disabled={soldLocked || isSaving} label="Category" value={form.category} onChange={(value) => updateField("category", value)}>
                  {tradeCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </SelectField>
                <SelectField disabled={soldLocked || isSaving} label="Condition" value={form.condition_label ?? form.condition ?? ""} onChange={(value) => updateField("condition_label", value)}>
                  {conditionOptions.map((condition) => (
                    <option key={condition.value} value={condition.value}>
                      {condition.label}
                    </option>
                  ))}
                </SelectField>
                <TextField disabled={soldLocked || isSaving} label="Brand/model" value={[form.brand, form.model].filter(Boolean).join(" ")} onChange={(value) => updateBrandModel(value)} />
                <label className="grid gap-2 sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-800">Description</span>
                  <textarea
                    className="trade-input min-h-36"
                    disabled={soldLocked || isSaving}
                    value={form.description ?? ""}
                    onChange={(event) => updateField("description", event.target.value)}
                  />
                </label>
              </div>
            </section>

            <section className="trade-card p-5">
              <h2 className="text-xl font-semibold">Price, pickup, and contact</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <NumberField disabled={soldLocked || isSaving || form.category === "free_items"} label="Price (RM)" value={form.price} onChange={(value) => updateField("price", value)} />
                <NumberField disabled={soldLocked || isSaving} label="Original price (optional)" value={form.original_price ?? 0} onChange={(value) => updateField("original_price", value || undefined)} />
                <SelectField disabled={isSaving} label="Pickup location" value={form.pickup_location ?? form.pickup_area ?? ""} onChange={(value) => updateField("pickup_location", value)}>
                  {pickupAreas.map((area) => (
                    <option key={area.value} value={area.value}>
                      {area.label}
                    </option>
                  ))}
                </SelectField>
                <SelectField disabled={isSaving} label="Contact method" value={form.contact_method ?? "telegram"} onChange={(value) => updateField("contact_method", value)}>
                  {contactMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </SelectField>
                <TextField disabled={isSaving} label="Contact value" value={form.contact_value ?? ""} onChange={(value) => updateField("contact_value", value)} />
                <TextField disabled={isSaving} label="Pickup note" value={form.pickup_note ?? ""} onChange={(value) => updateField("pickup_note", value)} />
              </div>
            </section>
          </section>

          <aside className="grid gap-5 lg:sticky lg:top-24">
            <section className="trade-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Preview</p>
              <h2 className="mt-2 text-xl font-semibold">{form.title || "Listing title"}</h2>
              <div className="mt-3">
                <PriceText currency={form.currency} value={form.category === "free_items" ? 0 : form.price} />
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {formatCategory(form.category)} · {(form.condition_label ?? "good").replaceAll("_", " ")}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Pickup: {formatPickupLocation(form.pickup_location ?? form.pickup_area)}
              </p>
            </section>

            {validationWarnings.length > 0 ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <h2 className="font-semibold text-amber-950">Before publishing</h2>
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-amber-900">
                  {validationWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <SafetyNotice />

            <div className="grid gap-3">
              <button className="trade-button-primary w-full" disabled={isSaving || soldLocked} onClick={() => void saveListing()} type="button">
                <Save aria-hidden="true" className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save changes"}
              </button>
              {listing.status === "draft" ? (
                <button className="trade-button-secondary w-full border-emerald-200 text-emerald-800 hover:bg-emerald-50" disabled={isSaving} onClick={() => void saveListing({ publish: true })} type="button">
                  Publish draft
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </TradeShell>
  );

  function updateBrandModel(value: string) {
    const [brand, ...modelParts] = value.trim().split(/\s+/);
    setForm((current) => ({
      ...current,
      brand: brand || undefined,
      model: modelParts.join(" ") || undefined,
    }));
  }
}

function PhotosEditor({
  disabled,
  listing,
  pendingImages,
  removingImageId,
  onImageSelection,
  onRemoveExisting,
  onRemovePending,
}: Readonly<{
  disabled: boolean;
  listing: Listing;
  pendingImages: PendingImage[];
  removingImageId: string | null;
  onImageSelection: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveExisting: (imageId: string) => Promise<void>;
  onRemovePending: (previewUrl: string) => void;
}>) {
  const imageCount = listing.images.length + pendingImages.length;
  return (
    <section className="trade-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Photos</h2>
          <p className="mt-1 text-sm text-slate-600">{imageCount}/5 photos. First image is the cover.</p>
        </div>
        <label className={`trade-button-secondary ${disabled || imageCount >= 5 ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
          <UploadCloud aria-hidden="true" className="h-4 w-4" />
          Add photos
          <input
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={disabled || imageCount >= 5}
            multiple
            onChange={onImageSelection}
            type="file"
          />
        </label>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {listing.images.map((image) => (
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100" key={image.id}>
            {image.public_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={listing.title} className="aspect-square w-full object-cover" src={image.public_url} />
            ) : (
              <div className="flex aspect-square items-center justify-center p-4 text-center text-xs text-slate-500">
                {image.storage_path}
              </div>
            )}
            <button
              aria-label="Remove image"
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-rose-700 shadow-sm"
              disabled={disabled || removingImageId === image.id}
              onClick={() => void onRemoveExisting(image.id)}
              type="button"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        ))}
        {pendingImages.map((image) => (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50" key={image.previewUrl}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="New listing upload preview" className="aspect-square w-full object-cover" src={image.previewUrl} />
            <button
              aria-label="Remove new image"
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-rose-700 shadow-sm"
              disabled={disabled}
              onClick={() => onRemovePending(image.previewUrl)}
              type="button"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        ))}
        {imageCount === 0 ? (
          <div className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
            <Camera aria-hidden="true" className="mb-2 h-6 w-6 text-slate-400" />
            Listings with photos get more trust.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TextField({
  disabled,
  label,
  value,
  onChange,
}: Readonly<{
  disabled?: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
}>) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <input className="trade-input" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({
  disabled,
  label,
  value,
  onChange,
}: Readonly<{
  disabled?: boolean;
  label: string;
  value: number;
  onChange: (value: number) => void;
}>) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <input
        className="trade-input"
        disabled={disabled}
        min="0"
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function SelectField({
  children,
  disabled,
  label,
  value,
  onChange,
}: Readonly<{
  children: ReactNode;
  disabled?: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
}>) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <select className="trade-input" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function listingToPayload(listing: Listing): ListingPayload {
  const pickupLocation = listing.pickup_location ?? listing.pickup_area ?? "kk1";
  return {
    title: listing.title,
    description: listing.description ?? "",
    category: listing.category,
    item_name: listing.item_name ?? undefined,
    brand: listing.brand ?? undefined,
    model: listing.model ?? undefined,
    condition: listing.condition ?? listing.condition_label ?? "good",
    condition_label: listing.condition_label ?? listing.condition ?? "good",
    price: listing.price,
    original_price: listing.original_price ?? undefined,
    currency: listing.currency,
    pickup_location: pickupLocation,
    pickup_area: pickupLocation,
    pickup_note: listing.pickup_note ?? "",
    residential_college: listing.residential_college ?? undefined,
    contact_method: contactMethods.some((method) => method.value === listing.contact_method)
      ? (listing.contact_method as ListingPayload["contact_method"])
      : "in_app",
    contact_value: "",
  };
}

function preparePayload(payload: ListingPayload): Partial<ListingPayload> {
  const pickupLocation = payload.pickup_location || payload.pickup_area || "kk1";
  const category = payload.category || "others";
  return {
    ...payload,
    title: payload.title.trim(),
    description: payload.description?.trim(),
    category,
    condition: payload.condition_label ?? payload.condition ?? "good",
    condition_label: payload.condition_label ?? payload.condition ?? "good",
    price: category === "free_items" ? 0 : Number(payload.price || 0),
    original_price: payload.original_price ? Number(payload.original_price) : undefined,
    pickup_location: pickupLocation,
    pickup_area: pickupLocation,
    pickup_note: payload.pickup_note?.trim() || undefined,
    contact_value:
      payload.contact_method === "telegram" || payload.contact_method === "whatsapp"
        ? payload.contact_value?.trim() || undefined
        : undefined,
  };
}

function validatePayload(payload: ListingPayload): string | null {
  const prepared = preparePayload(payload);
  if (!prepared.title || prepared.title.length < 5 || prepared.title.length > 100) {
    return "Title must be 5 to 100 characters.";
  }
  if (!prepared.description || prepared.description.length < 10 || prepared.description.length > 2000) {
    return "Description must be 10 to 2000 characters.";
  }
  if (!prepared.category) {
    return "Choose a category.";
  }
  if (!prepared.condition_label) {
    return "Choose a condition.";
  }
  if (!prepared.pickup_location) {
    return "Choose a pickup location.";
  }
  if (Number(prepared.price) < 0) {
    return "Price must be 0 or more.";
  }
  if (!prepared.contact_method) {
    return "Choose a contact method before saving.";
  }
  if ((prepared.contact_method === "telegram" || prepared.contact_method === "whatsapp") && !prepared.contact_value) {
    return "Add your Telegram or WhatsApp contact before saving.";
  }
  return null;
}

function listingWarnings(payload: ListingPayload, existingImages: number, pendingImages: number): string[] {
  const warnings: string[] = [];
  if (existingImages + pendingImages === 0) {
    warnings.push("Add at least one photo if possible. Photos help buyers trust the listing.");
  }
  if (payload.category === "free_items" && payload.price !== 0) {
    warnings.push("Free Items will publish with RM0.");
  }
  if (!payload.pickup_note?.trim()) {
    warnings.push("Add a pickup note if the location needs extra context.");
  }
  return warnings;
}
