import type { BookingLanguage } from "@/lib/reservly/types";

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
