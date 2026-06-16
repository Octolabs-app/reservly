import { generateUniqueSlug } from "./slug";
import { generateBookingRef } from "./ref";
import {
  calculateMonthlyUsage,
  dateInputFromDate,
  getMauritiusDayOfWeek,
  isoFromMauritiusLocal,
  mauritiusDateFromIso,
  timeFromMinutes,
} from "./slots";
import {
  DEFAULT_MAX_ADVANCE_DAYS,
  DEFAULT_MIN_NOTICE_MINUTES,
  FREE_BOOKING_LIMIT,
  type Availability,
  type AvailabilityInput,
  type Booking,
  type BookingInput,
  type Business,
  type BusinessInput,
  type DashboardData,
  type Owner,
  type PublicBusiness,
  type Service,
  type ServiceInput,
} from "./types";

type DevState = {
  owner: Owner;
  businesses: Business[];
  services: Service[];
  availability: Availability[];
  bookings: Booking[];
};

const STATE_KEY = "randevou_dev_state_v1";
const LAST_BOOKING_KEY = "randevou_last_booking";

const owner: Owner = {
  id: "dev-owner",
  email: "owner@randevou.local",
  name: "Marie Rose",
};

function id(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function today(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return dateInputFromDate(date);
}

function defaultState(): DevState {
  const business: Business = {
    id: "biz_salon_rose",
    ownerId: owner.id,
    name: "Salon Rose",
    slug: "salon-rose",
    category: "Beauty",
    city: "Port Louis",
    whatsappNumber: "+23057001234",
    bookingPageLanguage: "Both",
    timezone: "Indian/Mauritius",
    plan: "free",
    bookingLimitMonthly: FREE_BOOKING_LIMIT,
    minNoticeMinutes: DEFAULT_MIN_NOTICE_MINUTES,
    maxAdvanceDays: DEFAULT_MAX_ADVANCE_DAYS,
    slotIntervalMinutes: null,
    noSameDay: false,
    createdAt: new Date().toISOString(),
  };

  const services: Service[] = [
    {
      id: "svc_haircut",
      businessId: business.id,
      name: "Haircut",
      durationMinutes: 45,
      priceLabel: "Rs 350",
      active: true,
      allDay: false,
    },
    {
      id: "svc_colour",
      businessId: business.id,
      name: "Colour",
      durationMinutes: 90,
      priceLabel: "Rs 800",
      active: true,
      allDay: false,
    },
    {
      id: "svc_blowout",
      businessId: business.id,
      name: "Blowout",
      durationMinutes: 30,
      priceLabel: "Rs 250",
      active: true,
      allDay: false,
    },
  ];

  const days = [0, 1, 2, 3, 4, 5, 6];
  const availability: Availability[] = days.map((dayOfWeek) => ({
    id: `av_${dayOfWeek}`,
    businessId: business.id,
    dayOfWeek,
    isOpen: dayOfWeek !== 0,
    opensAt: "09:00",
    closesAt: dayOfWeek === 6 ? "15:00" : "18:00",
  }));

  const bookings: Booking[] = [
    bookingSeed("Marie D.", "+23057000001", services[0], today(0), "09:00", "confirmed"),
    bookingSeed("Jean-Paul", "+23057000002", services[1], today(0), "10:30", "confirmed"),
    bookingSeed("Sophie R.", "+23057000003", services[0], today(0), "14:00", "pending"),
    bookingSeed("Priya N.", "+23057000004", services[2], today(1), "09:30", "confirmed"),
    bookingSeed("Claire M.", "+23057000005", services[0], today(2), "11:00", "confirmed"),
    bookingSeed("Anisha R.", "+23057000006", services[1], today(3), "10:00", "pending"),
  ];

  return { owner, businesses: [business], services, availability, bookings };
}

function bookingSeed(
  customerName: string,
  customerPhone: string,
  service: Service,
  date: string,
  time: string,
  status: Booking["status"],
): Booking {
  const startAt = isoFromMauritiusLocal(date, time);
  return {
    id: id("book"),
    businessId: service.businessId,
    serviceId: service.id,
    serviceName: service.name,
    servicePriceLabel: service.priceLabel,
    customerName,
    customerPhone,
    customerLanguage: "Both",
    startAt,
    endAt: new Date(new Date(startAt).getTime() + service.durationMinutes * 60_000).toISOString(),
    status,
    source: "public",
    bookingRef: generateBookingRef(),
    createdAt: new Date().toISOString(),
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadState(): DevState {
  if (!canUseStorage()) return defaultState();
  const raw = window.localStorage.getItem(STATE_KEY);
  if (!raw) {
    const seeded = defaultState();
    saveState(seeded);
    return seeded;
  }

  try {
    return JSON.parse(raw) as DevState;
  } catch {
    const seeded = defaultState();
    saveState(seeded);
    return seeded;
  }
}

function saveState(state: DevState) {
  if (canUseStorage()) {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }
}

function withState<T>(updater: (state: DevState) => T) {
  const state = loadState();
  const result = updater(state);
  saveState(state);
  return result;
}

export async function getDevOwner() {
  return loadState().owner;
}

export async function getDevPublicBusinessBySlug(slug: string): Promise<PublicBusiness | null> {
  const state = loadState();
  const business = state.businesses.find((entry) => entry.slug === slug);
  if (!business) return null;
  const services = state.services.filter(
    (service) => service.businessId === business.id && service.active,
  );
  const availability = state.availability.filter((entry) => entry.businessId === business.id);
  const bookings = state.bookings.filter((booking) => booking.businessId === business.id);
  const usage = calculateMonthlyUsage(bookings, business.plan, business.bookingLimitMonthly);
  return { business, services, availability, usage };
}

export async function getDevPublicBusinessById(
  businessId: string,
): Promise<(PublicBusiness & { bookings: Booking[] }) | null> {
  const state = loadState();
  const business = state.businesses.find((entry) => entry.id === businessId);
  if (!business) return null;
  const services = state.services.filter(
    (service) => service.businessId === business.id && service.active,
  );
  const availability = state.availability.filter((entry) => entry.businessId === business.id);
  const bookings = state.bookings.filter((booking) => booking.businessId === business.id);
  const usage = calculateMonthlyUsage(bookings, business.plan, business.bookingLimitMonthly);
  return { business, services, availability, usage, bookings };
}

export async function devSlugExists(slug: string) {
  return loadState().businesses.some((business) => business.slug === slug);
}

export async function createDevBusiness(input: BusinessInput) {
  return withState((state) => {
    const business: Business = {
      id: id("biz"),
      ownerId: state.owner.id,
      name: input.name,
      slug: "",
      category: input.category,
      city: input.city,
      whatsappNumber: input.whatsappNumber,
      bookingPageLanguage: input.bookingPageLanguage,
      timezone: "Indian/Mauritius",
      plan: "free",
      bookingLimitMonthly: FREE_BOOKING_LIMIT,
      minNoticeMinutes: input.minNoticeMinutes ?? DEFAULT_MIN_NOTICE_MINUTES,
      maxAdvanceDays: input.maxAdvanceDays ?? DEFAULT_MAX_ADVANCE_DAYS,
      slotIntervalMinutes: input.slotIntervalMinutes ?? null,
      noSameDay: input.noSameDay ?? false,
      createdAt: new Date().toISOString(),
    };

    state.businesses = state.businesses.filter((entry) => entry.ownerId !== state.owner.id);
    state.services = state.services.filter((service) => service.businessId !== business.id);
    state.availability = state.availability.filter((entry) => entry.businessId !== business.id);
    state.bookings = state.bookings.filter((booking) => booking.businessId !== business.id);
    state.businesses.push(business);

    return generateUniqueSlug(input.name, async (slug) =>
      state.businesses.some((entry) => entry.slug === slug && entry.id !== business.id),
    ).then((slug) => {
      business.slug = slug;
      saveState(state);
      return business;
    });
  });
}

export async function updateDevBusiness(input: Partial<BusinessInput> & { id: string }) {
  return withState((state) => {
    const business = state.businesses.find((entry) => entry.id === input.id);
    if (!business) throw new Error("Business not found");
    Object.assign(business, {
      name: input.name ?? business.name,
      category: input.category ?? business.category,
      city: input.city ?? business.city,
      whatsappNumber: input.whatsappNumber ?? business.whatsappNumber,
      bookingPageLanguage: input.bookingPageLanguage ?? business.bookingPageLanguage,
      minNoticeMinutes: input.minNoticeMinutes ?? business.minNoticeMinutes,
      maxAdvanceDays: input.maxAdvanceDays ?? business.maxAdvanceDays,
      slotIntervalMinutes:
        "slotIntervalMinutes" in input
          ? (input.slotIntervalMinutes ?? null)
          : business.slotIntervalMinutes,
      noSameDay: input.noSameDay ?? business.noSameDay,
      updatedAt: new Date().toISOString(),
    });
    return business;
  });
}

export async function createDevService(input: ServiceInput) {
  return withState((state) => {
    const service: Service = {
      id: id("svc"),
      businessId: input.businessId,
      name: input.name,
      durationMinutes: input.durationMinutes,
      priceLabel: input.priceLabel,
      active: input.active ?? true,
      allDay: input.allDay ?? false,
      createdAt: new Date().toISOString(),
    };
    state.services.push(service);
    return service;
  });
}

export async function updateDevService(input: Partial<ServiceInput> & { id: string }) {
  return withState((state) => {
    const service = state.services.find((entry) => entry.id === input.id);
    if (!service) throw new Error("Service not found");
    Object.assign(service, {
      name: input.name ?? service.name,
      durationMinutes: input.durationMinutes ?? service.durationMinutes,
      priceLabel: input.priceLabel ?? service.priceLabel,
      active: input.active ?? service.active,
      allDay: input.allDay ?? service.allDay,
      updatedAt: new Date().toISOString(),
    });
    return service;
  });
}

export async function deleteDevService(idToDelete: string) {
  return withState((state) => {
    const service = state.services.find((entry) => entry.id === idToDelete);
    if (service) service.active = false;
  });
}

export async function updateDevAvailability(input: AvailabilityInput) {
  return withState((state) => {
    state.availability = state.availability.filter(
      (entry) => entry.businessId !== input.businessId,
    );
    const rows = input.days.map((day) => ({
      id: id("av"),
      businessId: input.businessId,
      dayOfWeek: day.dayOfWeek,
      isOpen: day.isOpen,
      opensAt: day.opensAt,
      closesAt: day.closesAt,
    }));
    state.availability.push(...rows);
    return rows;
  });
}

export async function createDevBooking(input: BookingInput) {
  return withState((state) => {
    const business = state.businesses.find((entry) => entry.id === input.businessId);
    const service = state.services.find((entry) => entry.id === input.serviceId && entry.active);
    if (!business || !service) throw new Error("This booking page is no longer available.");

    const usage = calculateMonthlyUsage(
      state.bookings.filter((booking) => booking.businessId === business.id),
      business.plan,
      business.bookingLimitMonthly,
    );
    if (usage.full) {
      throw new Error("Online booking is full for this month.");
    }

    const startMs = new Date(input.startAt).getTime();
    let endAt = new Date(startMs + service.durationMinutes * 60_000).toISOString();
    if (service.allDay) {
      const bookingDate = mauritiusDateFromIso(input.startAt);
      const day = state.availability.find(
        (entry) =>
          entry.businessId === business.id &&
          entry.dayOfWeek === getMauritiusDayOfWeek(bookingDate),
      );
      if (day) {
        endAt = isoFromMauritiusLocal(bookingDate, day.closesAt);
      }
    }
    const taken = state.bookings.some((booking) => {
      if (booking.businessId !== input.businessId || booking.status === "cancelled") return false;
      return (
        startMs < new Date(booking.endAt).getTime() &&
        new Date(booking.startAt).getTime() < new Date(endAt).getTime()
      );
    });

    if (taken) throw new Error("That time has just been taken. Pick another slot.");

    const booking: Booking = {
      id: id("book"),
      businessId: business.id,
      businessName: business.name,
      businessSlug: business.slug,
      serviceId: service.id,
      serviceName: service.name,
      servicePriceLabel: service.priceLabel,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerLanguage: input.customerLanguage,
      startAt: input.startAt,
      endAt,
      status: "pending",
      source: "public",
      bookingRef: generateBookingRef(),
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };
    state.bookings.push(booking);
    saveLastBooking(booking);
    return booking;
  });
}

export async function getDevBookingById(bookingId: string) {
  const last = getLastBooking();
  if (last?.id === bookingId) return last;
  const state = loadState();
  const booking = state.bookings.find((entry) => entry.id === bookingId);
  if (!booking) return null;
  const business = state.businesses.find((entry) => entry.id === booking.businessId);
  const service = state.services.find((entry) => entry.id === booking.serviceId);
  return {
    ...booking,
    businessName: business?.name,
    businessSlug: business?.slug,
    serviceName: service?.name,
    servicePriceLabel: service?.priceLabel,
  };
}

export async function getDevDashboardData(): Promise<DashboardData> {
  const state = loadState();
  const business = state.businesses.find((entry) => entry.ownerId === state.owner.id) ?? null;
  const services = business
    ? state.services.filter((service) => service.businessId === business.id && service.active)
    : [];
  const availability = business
    ? state.availability.filter((entry) => entry.businessId === business.id)
    : [];
  const bookings = business
    ? state.bookings
        .filter((booking) => booking.businessId === business.id)
        .map((booking) => {
          const service = state.services.find((entry) => entry.id === booking.serviceId);
          return {
            ...booking,
            serviceName: service?.name,
            servicePriceLabel: service?.priceLabel,
            businessName: business.name,
            businessSlug: business.slug,
          };
        })
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    : [];

  return {
    owner: state.owner,
    business,
    services,
    availability,
    bookings,
    usage: business
      ? calculateMonthlyUsage(bookings, business.plan, business.bookingLimitMonthly)
      : { plan: "free", used: 0, limit: FREE_BOOKING_LIMIT, nearLimit: false, full: false },
  };
}

export async function cancelDevBooking(bookingId: string) {
  return withState((state) => {
    const booking = state.bookings.find((entry) => entry.id === bookingId);
    if (!booking) throw new Error("Booking not found");
    booking.status = "cancelled";
    return booking;
  });
}

export async function confirmDevBooking(bookingId: string) {
  return withState((state) => {
    const booking = state.bookings.find((entry) => entry.id === bookingId);
    if (!booking) throw new Error("Booking not found");
    booking.status = "confirmed";
    return booking;
  });
}

export function saveLastBooking(booking: Booking) {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(LAST_BOOKING_KEY, JSON.stringify(booking));
  }
}

export function getLastBooking() {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(LAST_BOOKING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Booking;
  } catch {
    return null;
  }
}

export function defaultAvailabilityInput(businessId: string): AvailabilityInput {
  return {
    businessId,
    days: [
      { dayOfWeek: 1, isOpen: true, opensAt: "09:00", closesAt: "18:00" },
      { dayOfWeek: 2, isOpen: true, opensAt: "09:00", closesAt: "18:00" },
      { dayOfWeek: 3, isOpen: true, opensAt: "09:00", closesAt: "18:00" },
      { dayOfWeek: 4, isOpen: true, opensAt: "09:00", closesAt: "18:00" },
      { dayOfWeek: 5, isOpen: true, opensAt: "09:00", closesAt: "18:00" },
      { dayOfWeek: 6, isOpen: true, opensAt: "09:00", closesAt: "15:00" },
      { dayOfWeek: 0, isOpen: false, opensAt: "09:00", closesAt: "18:00" },
    ],
  };
}

export function formatDuration(durationMinutes: number) {
  if (durationMinutes < 60) return `${durationMinutes} min`;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function timeOptions(start = 7 * 60, end = 21 * 60, step = 30) {
  const options: string[] = [];
  for (let minute = start; minute <= end; minute += step) {
    options.push(timeFromMinutes(minute));
  }
  return options;
}
