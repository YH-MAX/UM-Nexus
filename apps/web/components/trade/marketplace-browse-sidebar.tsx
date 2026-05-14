"use client";

import type { LucideIcon } from "lucide-react";
import {
  Armchair,
  Bed,
  BookOpen,
  Dumbbell,
  Gift,
  Laptop,
  LayoutGrid,
  MoreHorizontal,
  Shield,
  Shirt,
  Sparkles,
  Ticket,
  UtensilsCrossed,
} from "lucide-react";

import { tradeCategories } from "@/lib/trade/api";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "": LayoutGrid,
  textbooks_notes: BookOpen,
  electronics: Laptop,
  dorm_room: Bed,
  kitchen_appliances: UtensilsCrossed,
  furniture: Armchair,
  clothing: Shirt,
  sports_hobby: Dumbbell,
  tickets_events: Ticket,
  free_items: Gift,
  others: MoreHorizontal,
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

const browseRows = [
  { value: "", label: "All Listings" },
  ...tradeCategories.map((c) => ({
    value: c.value,
    label: CHIP_LABELS[c.value] ?? c.label,
  })),
];

type MarketplaceBrowseSidebarProps = Readonly<{
  activeCategory: string;
  onSelectCategory: (value: string) => void;
  filterSlot: React.ReactNode;
}>;

export function MarketplaceBrowseSidebar({
  activeCategory,
  onSelectCategory,
  filterSlot,
}: MarketplaceBrowseSidebarProps) {
  return (
    <aside className="hidden w-[252px] shrink-0 flex-col gap-6 border-r border-stone-200/70 pr-6 lg:flex">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Browse</p>
        <nav aria-label="Listing categories" className="mt-3 flex flex-col gap-1">
          {browseRows.map((row) => {
            const Icon = CATEGORY_ICONS[row.value] ?? LayoutGrid;
            const active = activeCategory === row.value;
            return (
              <button
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
                  active
                    ? "bg-[#f5f0e6] font-medium text-stone-950 shadow-sm ring-1 ring-amber-200/60"
                    : "text-stone-800 hover:bg-amber-50/80 hover:text-stone-950"
                }`}
                key={row.value || "all"}
                onClick={() => onSelectCategory(row.value)}
                type="button"
              >
                <Icon
                  aria-hidden="true"
                  className={`h-4 w-4 shrink-0 ${active ? "text-amber-800" : "text-stone-500"}`}
                />
                {row.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-stone-200/80 pt-6">{filterSlot}</div>

      <div className="mt-auto rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-[#fff9ed] p-4 shadow-sm">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/90 bg-white text-amber-700 shadow-sm">
            <Shield aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-950">
              UM Verified Only
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            </p>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              Every user here is a verified UM student.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
