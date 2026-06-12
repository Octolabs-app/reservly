import type { BookingLanguage } from "@/lib/rezavu/types";

export type BookingMessageContext = {
  customerName: string;
  customerPhone?: string | null;
  businessName: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  bookingUrl?: string | null;
  priceLabel?: string | null;
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
  const en = line(
    `Hi ${firstName(input.customerName)}, your booking at ${input.businessName} is received:`,
    `${input.serviceName} on ${input.dateLabel} at ${input.timeLabel}.`,
    input.priceLabel ? `Price: ${input.priceLabel}.` : null,
    input.bookingUrl ? `Details: ${input.bookingUrl}` : null,
    "Reply CANCEL if you need to cancel.",
  );
  const fr = line(
    `Bonjour ${firstName(input.customerName)}, votre reservation chez ${input.businessName} est recue:`,
    `${input.serviceName}, le ${input.dateLabel} a ${input.timeLabel}.`,
    input.priceLabel ? `Prix: ${input.priceLabel}.` : null,
    input.bookingUrl ? `Details: ${input.bookingUrl}` : null,
    "Repondez CANCEL pour annuler.",
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
