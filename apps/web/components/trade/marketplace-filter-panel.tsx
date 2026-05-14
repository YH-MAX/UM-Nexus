"use client";

import { X } from "lucide-react";

import {
  conditionOptions,
  listingStatusOptions,
  pickupAreas,
  tradeCategories,
} from "@/lib/trade/api";

export type ListingFilters = {
  search: string;
  category: string;
  condition: string;
  pickup_location: string;
  status: string;
  min_price: string;
  max_price: string;
  sort: string;
};

const CHIP_LABELS: Record<string, string> = {
  textbooks_notes: "Textbooks",
  electronics: "Electronics",
  kitchen_appliances: "Kitchen",
  sports_hobby: "Sports",
  tickets_events: "Tickets & Events",
  free_items: "Free Items",
  dorm_room: "Dorm & Room",
  furniture: "Furniture",
  clothing: "Clothing",
  others: "Others",
};

const categoryChips = [
  { value: "", label: "All" },
  ...tradeCategories.map((category) => ({
    value: category.value,
    label: CHIP_LABELS[category.value] ?? category.label,
  })),
];

export { categoryChips };

export function MarketplaceFilterPanel({
  filters,
  hasFilters,
  priceError,
  onClear,
  onUpdate,
  layout,
}: Readonly<{
  filters: ListingFilters;
  hasFilters: boolean;
  priceError: boolean;
  onClear: () => void;
  onUpdate: <K extends keyof ListingFilters>(key: K, value: ListingFilters[K]) => void;
  layout: "bar" | "sidebar";
}>) {
  const fields = (
    <>
      <SelectField label="Condition" value={filters.condition} onChange={(value) => onUpdate("condition", value)}>
        <option value="">Any condition</option>
        {conditionOptions.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </SelectField>
      <SelectField label="Pickup" value={filters.pickup_location} onChange={(value) => onUpdate("pickup_location", value)}>
        <option value="">Any pickup</option>
        {pickupAreas.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </SelectField>
      <SelectField label="Status" value={filters.status} onChange={(value) => onUpdate("status", value)}>
        {listingStatusOptions.map((item) => (
          <option key={item.value === "" ? "all" : item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </SelectField>
      <div className="grid min-w-0 gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Min price</span>
        <input
          className={`trade-input min-h-[42px] rounded-xl border-stone-200 ${priceError ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : ""}`}
          inputMode="decimal"
          min="0"
          placeholder="Min RM"
          type="number"
          value={filters.min_price}
          onChange={(event) => onUpdate("min_price", event.target.value)}
        />
      </div>
      <div className="grid min-w-0 gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Max price</span>
        <input
          className={`trade-input min-h-[42px] rounded-xl border-stone-200 ${priceError ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : ""}`}
          inputMode="decimal"
          min="0"
          placeholder="Max RM"
          type="number"
          value={filters.max_price}
          onChange={(event) => onUpdate("max_price", event.target.value)}
        />
      </div>
      <SelectField label="Sort by" value={filters.sort} onChange={(value) => onUpdate("sort", value)}>
        <option value="latest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="price_low_high">Price: Low to High</option>
        <option value="price_high_low">Price: High to Low</option>
      </SelectField>
    </>
  );

  if (layout === "sidebar") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Filters</p>
          <button
            className="text-xs font-semibold text-amber-800 underline-offset-2 hover:underline"
            onClick={onClear}
            type="button"
          >
            Reset
          </button>
        </div>
        {fields}
        {priceError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            Minimum price cannot be higher than maximum price.
          </p>
        ) : null}
        {hasFilters ? (
          <p className="text-[11px] font-medium text-stone-600">Results reflect your active filters.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-[#fbfaf7]/90 p-4 shadow-sm backdrop-blur-sm sm:p-5">
      <div className="flex flex-wrap items-end gap-3 md:gap-4 xl:flex-nowrap xl:gap-3">
        <div className="grid min-w-[140px] flex-1 gap-1.5 sm:min-w-[160px]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Condition</span>
          <select
            className="trade-input min-h-[42px] rounded-xl border-stone-200 bg-white"
            value={filters.condition}
            onChange={(event) => onUpdate("condition", event.target.value)}
          >
            <option value="">Any condition</option>
            {conditionOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid min-w-[140px] flex-1 gap-1.5 sm:min-w-[160px]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Pickup</span>
          <select
            className="trade-input min-h-[42px] rounded-xl border-stone-200 bg-white"
            value={filters.pickup_location}
            onChange={(event) => onUpdate("pickup_location", event.target.value)}
          >
            <option value="">Any pickup</option>
            {pickupAreas.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid min-w-[140px] flex-1 gap-1.5 sm:min-w-[160px]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Status</span>
          <select
            className="trade-input min-h-[42px] rounded-xl border-stone-200 bg-white"
            value={filters.status}
            onChange={(event) => onUpdate("status", event.target.value)}
          >
            {listingStatusOptions.map((item) => (
              <option key={item.value === "" ? "all" : item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid min-w-[120px] flex-1 gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Min price</span>
          <input
            className={`trade-input min-h-[42px] rounded-xl border-stone-200 bg-white ${priceError ? "border-rose-300" : ""}`}
            inputMode="decimal"
            min="0"
            placeholder="Min RM"
            type="number"
            value={filters.min_price}
            onChange={(event) => onUpdate("min_price", event.target.value)}
          />
        </div>
        <div className="grid min-w-[120px] flex-1 gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Max price</span>
          <input
            className={`trade-input min-h-[42px] rounded-xl border-stone-200 bg-white ${priceError ? "border-rose-300" : ""}`}
            inputMode="decimal"
            min="0"
            placeholder="Max RM"
            type="number"
            value={filters.max_price}
            onChange={(event) => onUpdate("max_price", event.target.value)}
          />
        </div>
        <div className="grid min-w-[160px] flex-1 gap-1.5 xl:min-w-[180px]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Sort by</span>
          <select
            className="trade-input min-h-[42px] rounded-xl border-stone-200 bg-white"
            value={filters.sort}
            onChange={(event) => onUpdate("sort", event.target.value)}
          >
            <option value="latest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="price_low_high">Price: Low to High</option>
            <option value="price_high_low">Price: High to Low</option>
          </select>
        </div>
      </div>
      {priceError ? (
        <p className="trade-alert trade-alert-danger mt-3 py-2 text-xs">Minimum price cannot be higher than maximum price.</p>
      ) : null}
      {hasFilters ? (
        <button
          className="trade-button-secondary mt-4 w-full border-stone-200 sm:w-auto"
          onClick={onClear}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

function SelectField({
  children,
  label,
  value,
  onChange,
}: Readonly<{
  children: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
}>) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</span>
      <select className="trade-input min-h-[42px] rounded-xl border-stone-200 bg-white" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}
