"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

import { getListingContact, type ListingContact } from "@/lib/trade/api";

export function useSellerContact(listingId: string, accountId: string | undefined, enabled: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key: string;
    contact: ListingContact | null;
    error: string | null;
    loading: boolean;
  }>({ key: "", contact: null, error: null, loading: false });
  const key = `${accountId ?? ""}:${listingId}:${attempt}`;

  useEffect(() => {
    if (!enabled || !accountId) {
      setState({ key, contact: null, error: null, loading: false });
      return;
    }
    const controller = new AbortController();
    setState({ key, contact: null, error: null, loading: true });
    void getListingContact(listingId, controller.signal).then((contact) => {
      if (!controller.signal.aborted) setState({ key, contact, error: null, loading: false });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ key, contact: null, error: error instanceof Error ? error.message : "Unable to load seller contact.", loading: false });
    });
    return () => controller.abort();
  }, [accountId, enabled, key, listingId]);

  return {
    contact: enabled && state.key === key ? state.contact : null,
    error: enabled && state.key === key ? state.error : null,
    loading: enabled && (state.key !== key || state.loading),
    retry: () => setAttempt((value) => value + 1),
  };
}

export type SellerContactState = ReturnType<typeof useSellerContact>;

export function DirectContactAction({ state }: Readonly<{ state: SellerContactState }>) {
  const { contact, loading } = state;
  const label = contact?.contact_method === "whatsapp" ? "Chat on WhatsApp" : contact?.contact_method === "telegram" ? "Message on Telegram" : "Email seller";
  if (!contact?.contact_url || loading) return <button className="trade-button-primary w-full" disabled type="button">{loading ? "Loading contact…" : "Contact unavailable"}</button>;
  return (
    <a className={`trade-button-primary nexus-contact-action w-full ${contact.contact_method === "whatsapp" ? "nexus-contact-whatsapp" : contact.contact_method === "telegram" ? "nexus-contact-telegram" : ""}`} href={contact.contact_url} rel="noopener noreferrer" target={contact.contact_method === "email" ? undefined : "_blank"}>
      <MessageCircle aria-hidden="true" className="h-4 w-4" />{label}
    </a>
  );
}

export function DirectSellerContact({ state, available }: Readonly<{ state: SellerContactState; available: boolean }>) {
  if (!available) return <p className="trade-helper-text">This item is not available for contact.</p>;
  return (
    <section aria-label="Direct seller contact" className="grid gap-3" id="seller-contact">
      <div>
        <p className="text-sm font-semibold text-slate-950">Contact seller directly</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">Use the contact method chosen by the seller. No approval needed.</p>
      </div>
      {state.error ? (
        <div className="trade-alert trade-alert-warning grid gap-2" role="alert">
          <p>{state.error}</p>
          <button className="trade-button-secondary" onClick={state.retry} type="button">Retry contact details</button>
        </div>
      ) : (
        <>
          {state.contact?.contact_value ? <p className="break-all text-sm font-medium text-stone-800">{state.contact.contact_value}</p> : null}
          <DirectContactAction state={state} />
        </>
      )}
      <p className="trade-helper-text">Check availability with the seller and meet in a public campus location. Inspect before paying.</p>
    </section>
  );
}
