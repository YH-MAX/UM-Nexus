"use client";

import { useState } from "react";
import type { ContactRequest } from "@/lib/trade/api";

type Props = Readonly<{
  request: ContactRequest;
  isUpdating: boolean;
  onConfirm: (markReserved: boolean) => void;
  onCancel: () => void;
}>;

export function AcceptRequestModal({ request, isUpdating, onConfirm, onCancel }: Props) {
  const [markReserved, setMarkReserved] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={onCancel}
        type="button"
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-950">Accept contact request</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          The buyer will be notified and can see your contact details.
        </p>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-950">{request.listing?.title ?? "Listing"}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{request.message ?? "No message provided."}</p>
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold text-slate-800">After accepting</p>
          <div className="mt-2 grid gap-2">
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                !markReserved
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-200 hover:border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              <input
                checked={!markReserved}
                className="mt-0.5 accent-emerald-700"
                name="reserved"
                type="radio"
                onChange={() => setMarkReserved(false)}
              />
              <div>
                <p className="text-sm font-semibold text-slate-950">Accept only</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Listing stays available for other buyers while you arrange pickup.
                </p>
              </div>
            </label>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                markReserved
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-200 hover:border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              <input
                checked={markReserved}
                className="mt-0.5 accent-emerald-700"
                name="reserved"
                type="radio"
                onChange={() => setMarkReserved(true)}
              />
              <div>
                <p className="text-sm font-semibold text-slate-950">Accept and mark as Reserved</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Listing shows as reserved while you finalise pickup.
                </p>
              </div>
            </label>
          </div>
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
            onClick={() => onConfirm(markReserved)}
            type="button"
          >
            {isUpdating ? "Accepting…" : "Accept Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
