import type { Availability, Booking, Service, Slot } from "./types";

const MAURITIUS_OFFSET = "+04:00";

export function minutesFromTime(time: string) {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function timeFromMinutes(total: number) {
  const hours = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (total % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function dateInputFromDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isoFromMauritiusLocal(date: string, time: string) {
  return new Date(`${date}T${time}:00${MAURITIUS_OFFSET}`).toISOString();
}

export function formatDateLabel(iso: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Indian/Mauritius",
    weekday: "short",
    day: "2-digit",
    month: "short",
    ...options,
  }).format(new Date(iso));
}

export function formatTimeLabel(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Indian/Mauritius",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function getMauritiusDayOfWeek(date: string) {
  return new Date(`${date}T12:00:00${MAURITIUS_OFFSET}`).getUTCDay();
}

export function mauritiusDateFromIso(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Indian/Mauritius",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** Today's date input (YYYY-MM-DD) in Mauritius local time. */
export function mauritiusTodayInput(now = new Date()) {
  return mauritiusDateFromIso(now.toISOString());
}

/** Add days to a YYYY-MM-DD date input string (timezone-free arithmetic). */
export function addDaysToDateInput(dateInput: string, days: number) {
  const [y = 1970, m = 1, d = 1] = dateInput.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days, 12));
  return next.toISOString().slice(0, 10);
}

/**
 * UTC ISO bounds of the Mauritius calendar month containing `iso`.
 * Used so slot display and booking-limit enforcement agree on the bucket.
 */
export function mauritiusMonthBounds(iso: string): { start: string; end: string } {
  const monthKey = getBookingMonthKey(iso); // "YYYY-MM" in MU time
  const [y = 1970, m = 1] = monthKey.split("-").map(Number);
  const start = isoFromMauritiusLocal(`${monthKey}-01`, "00:00");
  const nextKey = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const end = isoFromMauritiusLocal(`${nextKey}-01`, "00:00");
  return { start, end };
}

export function getBookingMonthKey(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Indian/Mauritius",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(iso));
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

export function calculateMonthlyUsage(
  bookings: Booking[],
  plan: "free" | "pro" | "studio",
  limit: number | null,
  now = new Date(),
) {
  const currentMonth = getBookingMonthKey(now.toISOString());
  const used = bookings.filter(
    (booking) =>
      booking.status !== "cancelled" && getBookingMonthKey(booking.startAt) === currentMonth,
  ).length;
  const effectiveLimit = plan === "free" ? (limit ?? 15) : null;

  return {
    plan,
    used,
    limit: effectiveLimit,
    nearLimit: effectiveLimit === null ? false : used >= Math.max(1, effectiveLimit - 3),
    full: effectiveLimit === null ? false : used >= effectiveLimit,
  };
}

export function generateSlots({
  date,
  service,
  availability,
  bookings,
  monthlyFull,
  stepMinutes = 30,
  minNoticeMinutes = 0,
}: {
  date: string;
  service: Service;
  availability: Availability[];
  bookings: Booking[];
  monthlyFull: boolean;
  stepMinutes?: number;
  minNoticeMinutes?: number;
}): Slot[] {
  const dayOfWeek = getMauritiusDayOfWeek(date);
  const day = availability.find((entry) => entry.dayOfWeek === dayOfWeek);
  if (!day || !day.isOpen) return [];

  const open = minutesFromTime(day.opensAt);
  const close = minutesFromTime(day.closesAt);
  const now = Date.now();
  const minNoticeMs = Math.max(0, minNoticeMinutes) * 60_000;
  const step = stepMinutes > 0 ? stepMinutes : 30; // guard against a zero/negative interval looping forever

  function overlapsBooking(startMs: number, endMs: number) {
    return bookings.some((booking) => {
      if (booking.status === "cancelled") return false;
      const bookingStart = new Date(booking.startAt).getTime();
      const bookingEnd = new Date(booking.endAt).getTime();
      return (
        booking.businessId === service.businessId && startMs < bookingEnd && endMs > bookingStart
      );
    });
  }

  function slotReason(startMs: number, endMs: number): Slot["reason"] {
    if (monthlyFull) return "full";
    if (startMs <= now) return "past";
    if (startMs - now < minNoticeMs) return "notice";
    if (overlapsBooking(startMs, endMs)) return "taken";
    return undefined;
  }

  // All-day services offer a single slot that spans the whole working day.
  if (service.allDay) {
    const startAt = isoFromMauritiusLocal(date, day.opensAt);
    const startMs = new Date(startAt).getTime();
    const endMs = new Date(isoFromMauritiusLocal(date, day.closesAt)).getTime();
    const reason = slotReason(startMs, endMs);
    return [{ time: "All day", startAt, available: !reason, reason }];
  }

  const latestStart = close - service.durationMinutes;
  const slots: Slot[] = [];

  for (let minute = open; minute <= latestStart; minute += step) {
    const time = timeFromMinutes(minute);
    const startAt = isoFromMauritiusLocal(date, time);
    const startMs = new Date(startAt).getTime();
    const endMs = startMs + service.durationMinutes * 60_000;
    const reason = slotReason(startMs, endMs);
    slots.push({
      time,
      startAt,
      available: !reason,
      reason,
    });
  }

  return slots;
}
