// Shared WhatsApp phone helpers — used by the public booking page,
// onboarding, settings, and server-side booking validation.
// Mauritius local mobiles ("5XXXXXXX") are auto-prefixed with +230.

export function normalizeWhatsAppNumber(value: string) {
  const compact = value.trim().replace(/[()\s.-]/g, "");
  if (/^5\d{7}$/.test(compact)) return `+230${compact}`;
  if (/^2305\d{7}$/.test(compact)) return `+${compact}`;
  return compact;
}

export function validateWhatsAppNumber(value: string): string | null {
  const normalized = normalizeWhatsAppNumber(value);
  if (!normalized) return "WhatsApp number is required.";
  if (!/^\+[1-9]\d{6,14}$/.test(normalized)) {
    return "Enter a valid international WhatsApp number, for example +230 5700 0000.";
  }
  return null;
}

export function isValidWhatsAppNumber(value: string): boolean {
  return validateWhatsAppNumber(value) === null;
}
