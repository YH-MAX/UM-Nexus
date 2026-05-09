"use client";

import { useState } from "react";
import type { ContactRequest } from "@/lib/trade/api";
import { formatMoney } from "@/lib/trade/api";

type Props = Readonly<{
  request: ContactRequest;
  isUpdating: boolean;
  onConfirm: (agreedPrice: number, followedAi: boolean) => void;
  onCancel: () => void;
}>;

export function CompleteTradeModal({ request, isUpdating, onConfirm, onCancel }: Props) {
  const [agreedPrice, setAgreedPrice] = useState(
    request.listing?.price ? String(Math.round(request.listing.price)) : "",
  );
  const [followedAi, setFollowedAi] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);

  function handleConfirm() {
    const price = Number(agreedPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setPriceError("Enter the final agreed price before marking as completed.");
      return;
    }
    setPriceError(null);
    onConfirm(price, followedAi);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={onCancel}
        type="button"
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-950">Record trade completion</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Help improve future price suggestions by recording the final sale price.
        </p>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-950">{request.listing?.title ?? "Listing"}</p>
          {request.listing?.price ? (
            <p className="mt-1 text-sm text-slate-600">Listed at {formatMoney(request.listing.price)}</p>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold text-slate-800" htmlFor="complete-agreed-price">
              Final agreed price (RM)
            </label>
            <input
              className={`trade-input ${priceError ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : ""}`}
              id="complete-agreed-price"
              min="1"
              placeholder="e.g. 45"
              step="0.01"
              type="number"
              value={agreedPrice}
              onChange={(e) => {
                setAgreedPrice(e.target.value);
                if (priceError) setPriceError(null);
              }}
            />
            {priceError ? <p className="text-xs text-rose-600">{priceError}</p> : null}
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-emerald-200 hover:bg-emerald-50">
            <input
              checked={followedAi}
              className="mt-0.5 accent-emerald-700"
              type="checkbox"
              onChange={(e) => setFollowedAi(e.target.checked)}
            />
            <div>
              <p className="text-sm font-semibold text-slate-950">I followed the AI price suggestion</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Helps us measure how useful AI guidance is for UM campus trades.
              </p>
            </div>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            className="trade-button-secondary"
            disabled={isUpdating}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="trade-button-primary"
            disabled={isUpdating}
            onClick={handleConfirm}
            type="button"
          >
            {isUpdating ? "Completing…" : "Mark Completed"}
          </button>
        </div>
      </div>
    </div>
  );
}
