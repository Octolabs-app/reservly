import type { BookingLanguage } from "@/lib/randevou/types";

export type BookingMessageContext = {
  customerName: string;
  customerPhone?: string | null;
  businessName: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  bookingUrl?: string | null;
  priceLabel?: string | null;
  bookingRef?: string | null;
  language?: BookingLanguage;
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function line(...parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function languageMode(language: BookingLanguage | undefined) {
  if (language === "Francais") return "fr";
  if (language === "Both") return "both";
  return "en";
}

export function renderBookingConfirmation(input: BookingMessageContext) {
  const ref = input.bookingRef ?? null;
  const en = line(
    `Hi ${firstName(input.customerName)}, your booking at ${input.businessName} is received:`,
    `${input.serviceName} on ${input.dateLabel} at ${input.timeLabel}.`,
    input.priceLabel ? `Price: ${input.priceLabel}.` : null,
    ref ? `Ref: ${ref}.` : null,
    input.bookingUrl ? `Details: ${input.bookingUrl}` : null,
    ref ? `To cancel, reply: /cancel ${ref}` : "Reply CANCEL if you need to cancel.",
  );
  const fr = line(
    `Bonjour ${firstName(input.customerName)}, votre reservation chez ${input.businessName} est recue:`,
    `${input.serviceName}, le ${input.dateLabel} a ${input.timeLabel}.`,
    input.priceLabel ? `Prix: ${input.priceLabel}.` : null,
    ref ? `Ref: ${ref}.` : null,
    input.bookingUrl ? `Details: ${input.bookingUrl}` : null,
    ref ? `Pour annuler, repondez: /cancel ${ref}` : "Repondez CANCEL pour annuler.",
  );

  const mode = languageMode(input.language);
  if (mode === "both") return `${en}\n\n${fr}`;
  return mode === "fr" ? fr : en;
}

export function renderOwnerBookingAlert(input: BookingMessageContext) {
  const phone = input.customerPhone ? ` (${input.customerPhone})` : "";
  const en = line(
    `New booking for ${input.businessName}:`,
    `${input.customerName}${phone} booked ${input.serviceName}`,
    `on ${input.dateLabel} at ${input.timeLabel}.`,
    "Reply CONFIRM or CANCEL.",
  );
  const fr = line(
    `Nouvelle reservation pour ${input.businessName}:`,
    `${input.customerName}${phone} a reserve ${input.serviceName}`,
    `le ${input.dateLabel} a ${input.timeLabel}.`,
    "Repondez CONFIRM ou CANCEL.",
  );

  const mode = languageMode(input.language);
  if (mode === "both") return `${en}\n\n${fr}`;
  return mode === "fr" ? fr : en;
}

type AckKey =
  | "owner_confirmed"
  | "owner_cancelled"
  | "owner_none"
  | "owner_customer_cancelled"
  | "customer_confirmed"
  | "customer_cancelled"
  | "customer_confirmed_by_owner"
  | "customer_ambiguous";

const ACKS: Record<
  AckKey,
  { en: (c?: BookingMessageContext) => string; fr: (c?: BookingMessageContext) => string }
> = {
  owner_confirmed: {
    en: (c) =>
      `Confirmed: ${c?.customerName ?? "the booking"} on ${c?.dateLabel} at ${c?.timeLabel}. The customer has been notified.`,
    fr: (c) =>
      `Confirme: ${c?.customerName ?? "la reservation"} le ${c?.dateLabel} a ${c?.timeLabel}. Le client a ete informe.`,
  },
  owner_cancelled: {
    en: (c) =>
      `Cancelled: ${c?.customerName ?? "the booking"} on ${c?.dateLabel} at ${c?.timeLabel}. The customer has been notified.`,
    fr: (c) =>
      `Annule: ${c?.customerName ?? "la reservation"} le ${c?.dateLabel} a ${c?.timeLabel}. Le client a ete informe.`,
  },
  owner_none: {
    en: () => "No recent booking found to update. Manage bookings from your dashboard.",
    fr: () =>
      "Aucune reservation recente a modifier. Gerez vos reservations depuis votre tableau de bord.",
  },
  owner_customer_cancelled: {
    en: (c) =>
      `${c?.customerName} cancelled: ${c?.serviceName} on ${c?.dateLabel} at ${c?.timeLabel}.`,
    fr: (c) =>
      `${c?.customerName} a annule: ${c?.serviceName} le ${c?.dateLabel} a ${c?.timeLabel}.`,
  },
  customer_confirmed: {
    en: () => "Your booking is confirmed. See you soon!",
    fr: () => "Votre reservation est confirmee. A bientot !",
  },
  customer_cancelled: {
    en: () => "Your booking has been cancelled.",
    fr: () => "Votre reservation a ete annulee.",
  },
  customer_confirmed_by_owner: {
    en: (c) =>
      `Good news ${firstName(c?.customerName ?? "")}! ${c?.businessName} confirmed your booking: ${c?.serviceName} on ${c?.dateLabel} at ${c?.timeLabel}.`,
    fr: (c) =>
      `Bonne nouvelle ${firstName(c?.customerName ?? "")} ! ${c?.businessName} a confirme votre reservation: ${c?.serviceName} le ${c?.dateLabel} a ${c?.timeLabel}.`,
  },
  customer_ambiguous: {
    en: () =>
      "You have more than one upcoming booking — please contact the business directly on WhatsApp.",
    fr: () =>
      "Vous avez plusieurs reservations a venir — contactez directement le commerce sur WhatsApp.",
  },
};

export function renderReplyAck(
  key: AckKey,
  language: BookingLanguage | undefined,
  context?: BookingMessageContext,
) {
  const mode = languageMode(language);
  const en = ACKS[key].en(context);
  const fr = ACKS[key].fr(context);
  if (mode === "both") return `${en}\n\n${fr}`;
  return mode === "fr" ? fr : en;
}

/** Ambiguous /cancel: list the customer's active bookings and ask for a ref. */
export function renderChooseRefToCancel(
  language: BookingLanguage | undefined,
  items: Array<{ ref: string; serviceName: string; dateLabel: string; timeLabel: string }>,
) {
  const list = items
    .map((i) => `• ${i.ref} — ${i.serviceName}, ${i.dateLabel} ${i.timeLabel}`)
    .join("\n");
  const example = items[0]?.ref ?? "RDV-XXXX";
  const en = `You have ${items.length} upcoming bookings. Reply with the one to cancel, e.g.\n/cancel ${example}\n\n${list}`;
  const fr = `Vous avez ${items.length} reservations a venir. Repondez avec celle a annuler, ex:\n/cancel ${example}\n\n${list}`;
  const mode = languageMode(language);
  if (mode === "both") return `${en}\n\n———\n${fr}`;
  return mode === "fr" ? fr : en;
}

/** /cancel REF where the ref doesn't match an active booking for this number. */
export function renderRefNotFound(language: BookingLanguage | undefined) {
  const en =
    "We couldn't find an active booking with that reference for your number. Check the reference in your confirmation message and try again.";
  const fr =
    "Aucune reservation active avec cette reference pour votre numero. Verifiez la reference dans votre message de confirmation et reessayez.";
  const mode = languageMode(language);
  if (mode === "both") return `${en}\n\n${fr}`;
  return mode === "fr" ? fr : en;
}

export function renderCancellationMessage(input: BookingMessageContext) {
  const en = line(
    `Hi ${firstName(input.customerName)}, your booking at ${input.businessName} has been cancelled:`,
    `${input.serviceName} on ${input.dateLabel} at ${input.timeLabel}.`,
  );
  const fr = line(
    `Bonjour ${firstName(input.customerName)}, votre reservation chez ${input.businessName} a ete annulee:`,
    `${input.serviceName}, le ${input.dateLabel} a ${input.timeLabel}.`,
  );

  const mode = languageMode(input.language);
  if (mode === "both") return `${en}\n\n${fr}`;
  return mode === "fr" ? fr : en;
}
