// Public booking-page localization (EN/FR).
// The owner's "Booking page language" setting drives which language customers
// see: English / Francais render one language; "Both" shows an EN/FR toggle.

import type { BookingLanguage } from "./types";

export type PageLang = "en" | "fr";

export function defaultPageLang(setting: BookingLanguage | undefined): PageLang {
  return setting === "Francais" ? "fr" : "en";
}

export function showsLangToggle(setting: BookingLanguage | undefined): boolean {
  return setting === "Both";
}

const STRINGS = {
  pickService: { en: "1 — Pick a service", fr: "1 — Choisissez un service" },
  pickDate: { en: "2 — Pick a date", fr: "2 — Choisissez une date" },
  pickTime: { en: "3 — Pick a time", fr: "3 — Choisissez une heure" },
  confirmDay: { en: "3 — Confirm the day", fr: "3 — Confirmez la journée" },
  yourDetails: { en: "4 — Your details", fr: "4 — Vos coordonnées" },
  yourName: { en: "Your name *", fr: "Votre nom *" },
  whatsappNumber: { en: "WhatsApp number *", fr: "Numéro WhatsApp *" },
  msgLanguage: { en: "Message language", fr: "Langue des messages" },
  confirmBooking: { en: "Confirm booking →", fr: "Confirmer la réservation →" },
  completeSteps: { en: "Complete all steps above", fr: "Complétez les étapes ci-dessus" },
  confirming: { en: "Confirming…", fr: "Confirmation…" },
  noSlots: {
    en: "No slots on this date — try another day.",
    fr: "Aucun créneau à cette date — essayez un autre jour.",
  },
  allDayNote: {
    en: "This service takes the whole day — one booking per date.",
    fr: "Ce service occupe toute la journée — une réservation par date.",
  },
  allDay: { en: "All day", fr: "Toute la journée" },
  phoneHint: {
    en: "Your confirmation is sent to this number. Mauritius mobiles can be entered as 5XXX XXXX.",
    fr: "Votre confirmation sera envoyée à ce numéro. Les mobiles mauriciens peuvent être saisis 5XXX XXXX.",
  },
  monthFull: {
    en: "Online booking is full for this month. Please contact the business on WhatsApp.",
    fr: "Les réservations en ligne sont complètes ce mois-ci. Contactez le commerce sur WhatsApp.",
  },
  waFootnote: {
    en: "Confirmation via WhatsApp · no account needed",
    fr: "Confirmation par WhatsApp · sans compte",
  },
  notFoundTitle: {
    en: "This booking page is unavailable.",
    fr: "Cette page de réservation n'est pas disponible.",
  },
  notFoundSub: {
    en: "Check the link with the business, or try again later.",
    fr: "Vérifiez le lien avec le commerce, ou réessayez plus tard.",
  },
  namePlaceholder: { en: "Marie Dupont", fr: "Marie Dupont" },
  reasonPast: { en: "This time has passed", fr: "Cette heure est passée" },
  reasonTaken: { en: "Already booked", fr: "Déjà réservé" },
  reasonFull: {
    en: "Online booking is full this month",
    fr: "Réservations complètes ce mois-ci",
  },
  reasonNotice: {
    en: "Too soon — the business needs more notice",
    fr: "Trop tôt — le commerce demande plus de préavis",
  },
  reasonClosed: { en: "Closed", fr: "Fermé" },
  reasonSameDay: {
    en: "Same-day booking not available",
    fr: "Réservation le jour même indisponible",
  },
  slotLegend: {
    en: "Crossed-out times are unavailable.",
    fr: "Les heures barrées ne sont pas disponibles.",
  },
  // Confirmation page
  bookingReceived: { en: "Booking received", fr: "Réservation reçue" },
  youreBooked: { en: "You're booked!", fr: "C'est réservé !" },
  seeYouAt: { en: "See you at", fr: "À bientôt chez" },
  rowBusiness: { en: "Business", fr: "Commerce" },
  rowService: { en: "Service", fr: "Service" },
  rowDate: { en: "Date", fr: "Date" },
  rowTime: { en: "Time", fr: "Heure" },
  rowPrice: { en: "Price", fr: "Prix" },
  waSent: { en: "Confirmation sent on WhatsApp", fr: "Confirmation envoyée sur WhatsApp" },
  reminderNote: {
    en: "Keep an eye on WhatsApp — the business will confirm your booking there. Reply CANCEL if you need to cancel.",
    fr: "Surveillez WhatsApp — le commerce y confirmera votre réservation. Répondez CANCEL pour annuler.",
  },
  detailsInWhatsApp: {
    en: "Your booking details are in your WhatsApp confirmation.",
    fr: "Les détails de votre réservation sont dans votre confirmation WhatsApp.",
  },
  addToCalendar: { en: "Add to calendar", fr: "Ajouter au calendrier" },
  newBooking: { en: "New booking", fr: "Nouvelle réservation" },
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: PageLang): string {
  return STRINGS[key][lang];
}

export function slotReasonLabel(
  reason: "past" | "closed" | "taken" | "full" | "notice" | "same_day",
  lang: PageLang,
): string {
  const map = {
    past: "reasonPast",
    taken: "reasonTaken",
    full: "reasonFull",
    notice: "reasonNotice",
    closed: "reasonClosed",
    same_day: "reasonSameDay",
  } as const;
  return t(map[reason], lang);
}
