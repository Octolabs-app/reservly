import { saveLastBooking } from "@/lib/randevou/dev-store";
import type {
  Availability,
  AvailabilityInput,
  Booking,
  BookingInput,
  Business,
  BusinessInput,
  DashboardData,
  PublicBusiness,
  Service,
  ServiceInput,
  Slot,
} from "@/lib/randevou/types";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Request failed.");
  }

  return payload as T;
}

function jsonBody(value: unknown) {
  return JSON.stringify(value);
}

export function getPublicBusinessBySlug(slug: string): Promise<PublicBusiness | null> {
  return api(`/api/public/business?slug=${encodeURIComponent(slug)}`);
}

export function getAvailableSlots(
  businessId: string,
  serviceId: string,
  date: string,
): Promise<Slot[]> {
  const params = new URLSearchParams({ businessId, serviceId, date });
  return api(`/api/public/slots?${params.toString()}`);
}

export async function createBooking(input: BookingInput): Promise<Booking> {
  const booking = await api<Booking>("/api/public/bookings", {
    method: "POST",
    body: jsonBody(input),
  });
  // Cache for the confirmation page (sessionStorage is client-only).
  saveLastBooking(booking);
  return booking;
}

export function getBookingById(id: string): Promise<Booking | null> {
  return api(`/api/public/booking?id=${encodeURIComponent(id)}`);
}

export function getDashboardData(): Promise<DashboardData> {
  return api("/api/dashboard/data");
}

export function createBusiness(input: BusinessInput): Promise<Business> {
  return api("/api/dashboard/business", {
    method: "POST",
    body: jsonBody(input),
  });
}

export function updateBusiness(input: Partial<BusinessInput> & { id: string }): Promise<Business> {
  return api("/api/dashboard/business", {
    method: "PATCH",
    body: jsonBody(input),
  });
}

export function createService(input: ServiceInput): Promise<Service> {
  return api("/api/dashboard/service", {
    method: "POST",
    body: jsonBody({ action: "create", input }),
  });
}

export function updateService(input: Partial<ServiceInput> & { id: string }): Promise<Service> {
  return api("/api/dashboard/service", {
    method: "POST",
    body: jsonBody({ action: "update", input }),
  });
}

export function deleteService(id: string): Promise<void> {
  return api("/api/dashboard/service", {
    method: "POST",
    body: jsonBody({ action: "delete", id }),
  });
}

export function updateAvailability(input: AvailabilityInput): Promise<Availability[]> {
  return api("/api/dashboard/availability", {
    method: "POST",
    body: jsonBody(input),
  });
}

export async function createOwnerBooking(input: BookingInput): Promise<Booking> {
  return api("/api/dashboard/create-booking", {
    method: "POST",
    body: jsonBody(input),
  });
}

export function deleteAccount(): Promise<void> {
  return api("/api/auth/delete-account", {
    method: "POST",
    body: jsonBody({ confirm: "DELETE" }),
  });
}

export function disconnectGoogleAccount(): Promise<void> {
  return api("/api/auth/google/disconnect", {
    method: "POST",
    body: jsonBody({}),
  });
}

export function disconnectFacebookAccount(): Promise<void> {
  return api("/api/auth/facebook/disconnect", {
    method: "POST",
    body: jsonBody({}),
  });
}

export function setPassword(newPassword: string): Promise<void> {
  return api("/api/auth/set-password", {
    method: "POST",
    body: jsonBody({ newPassword }),
  });
}

export function cancelBooking(id: string): Promise<Booking> {
  return api("/api/dashboard/booking-action", {
    method: "POST",
    body: jsonBody({ id, action: "cancel" }),
  });
}

export function markBookingConfirmed(id: string): Promise<Booking> {
  return api("/api/dashboard/booking-action", {
    method: "POST",
    body: jsonBody({ id, action: "confirm" }),
  });
}
