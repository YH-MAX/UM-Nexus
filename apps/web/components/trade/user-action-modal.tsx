"use client";

import { useState } from "react";

export type UserActionModalProps = Readonly<{
  userName: string;
  actionLabel: string;
  newValue: string;
  isHighRisk?: boolean;
  isBusy?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}>;

export function UserActionModal({
  userName,
  actionLabel,
  newValue,
  isHighRisk = false,
  isBusy = false,
  onConfirm,
  onCancel,
}: UserActionModalProps) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  const isReasonMissing = !reason.trim();

  function handleConfirm() {
    setTouched(true);
    if (isReasonMissing) return;
    onConfirm(reason.trim());
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
        <h2 className="text-lg font-semibold text-slate-950">{actionLabel}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          <span className="font-semibold text-slate-900">{userName}</span> will be set to{" "}
          <span className="font-semibold text-slate-900">{newValue}</span>.
        </p>

        {isHighRisk ? (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Warning:</span> This action will restrict the user's access to UM Nexus Trade.
          </div>
        ) : null}

        <div className="mt-4 grid gap-1.5">
          <label className="text-sm font-semibold text-slate-800" htmlFor="user-action-reason">
            Reason <span className="font-normal text-slate-500">(required)</span>
          </label>
          <textarea
            className={`min-h-[80px] rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
              touched && isReasonMissing
                ? "border-rose-400 bg-rose-50"
                : "border-slate-300 bg-white"
            }`}
            id="user-action-reason"
            placeholder="Provide a clear reason that will be logged…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {touched && isReasonMissing ? (
            <p className="text-xs text-rose-600">A reason is required before submitting.</p>
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
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={handleConfirm}
            type="button"
          >
            {isBusy ? "Submitting…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
