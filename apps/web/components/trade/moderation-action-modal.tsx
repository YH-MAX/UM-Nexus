"use client";

import { useState } from "react";

export type ModerationActionModalProps = Readonly<{
  title: string;
  description: string;
  reasonLabel: string;
  reasonRequired: boolean;
  confirmLabel: string;
  confirmTone?: "danger" | "warn" | "safe";
  showNotifySeller?: boolean;
  isBusy?: boolean;
  onConfirm: (reason: string, notifySeller?: boolean) => void;
  onCancel: () => void;
}>;

export function ModerationActionModal({
  title,
  description,
  reasonLabel,
  reasonRequired,
  confirmLabel,
  confirmTone = "danger",
  showNotifySeller = false,
  isBusy = false,
  onConfirm,
  onCancel,
}: ModerationActionModalProps) {
  const [reason, setReason] = useState("");
  const [notifySeller, setNotifySeller] = useState(true);
  const [touched, setTouched] = useState(false);

  const isReasonMissing = reasonRequired && !reason.trim();

  const confirmColors = {
    danger: "bg-rose-700 hover:bg-rose-800 focus-visible:ring-rose-500",
    warn: "bg-amber-700 hover:bg-amber-800 focus-visible:ring-amber-500",
    safe: "bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-500",
  }[confirmTone];

  function handleConfirm() {
    setTouched(true);
    if (isReasonMissing) return;
    onConfirm(reason.trim(), showNotifySeller ? notifySeller : undefined);
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
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">
              {reasonLabel}
              {reasonRequired ? null : (
                <span className="ml-1 font-normal text-slate-500">(optional)</span>
              )}
            </span>
            <textarea
              className={`min-h-[80px] rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                touched && isReasonMissing
                  ? "border-rose-400 bg-rose-50"
                  : "border-slate-300 bg-white"
              }`}
              placeholder="Provide a clear reason that will be logged…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {touched && isReasonMissing ? (
              <p className="text-xs text-rose-600">A reason is required before submitting.</p>
            ) : null}
          </label>

          {showNotifySeller ? (
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <input
                checked={notifySeller}
                className="accent-slate-800"
                type="checkbox"
                onChange={(e) => setNotifySeller(e.target.checked)}
              />
              <span className="font-medium text-slate-800">Notify seller</span>
            </label>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${confirmColors}`}
            disabled={isBusy}
            onClick={handleConfirm}
            type="button"
          >
            {isBusy ? "Submitting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
