export const sellerContactMethods = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "email", label: "Email" },
] as const;

export function sellerContactError(method: string | null | undefined, rawValue?: string | null): string | null {
  const value = (rawValue || "").trim();
  if (method === "email") return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : "Enter a valid contact email address.";
  if (method === "telegram") return /^(?:https:\/\/(?:t\.me|telegram\.me)\/|@)?[A-Za-z][A-Za-z0-9_]{4,31}\/?$/.test(value) ? null : "Enter a valid Telegram username, for example @seller_um.";
  if (method === "whatsapp") {
    const phone = value.replace(/^https:\/\/wa\.me\//, "").replace(/\/$/, "");
    const number = phone.replace(/[+ ()\-.]/g, "").replace(/^00/, "");
    return /^\+?[0-9 ()\-.]+$/.test(phone) && /^[1-9][0-9]{6,14}$/.test(number) ? null : "Use an international WhatsApp number, for example +60123456789.";
  }
  return "Choose WhatsApp, Telegram or email so buyers can contact you directly.";
}
