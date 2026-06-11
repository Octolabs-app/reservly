import {
  cancelDevBooking,
  confirmDevBooking,
  createDevBooking,
  createDevBusiness,
  createDevService,
  deleteDevService,
  devSlugExists,
  getDevBookingById,
  getDevDashboardData,
  getDevPublicBusinessBySlug,
  saveLastBooking,
  updateDevAvailability,
  updateDevBusiness,
  updateDevService,
} from "./dev-store";
import { getCurrentOwner } from "./auth";
import { generateUniqueSlug } from "./slug";
import { calculateMonthlyUsage, generateSlots } from "./slots";
import { getBrowserSupabase } from "./supabase";
import {
  FREE_BOOKING_LIMIT,
  type Availability,
  type AvailabilityInput,
  DEFAULT_MAX_ADVANCE_DAYS,
  DEFAULT_MIN_NOTICE_MINUTES,
  type Booking,
  type BookingInput,
  type Business,
  type BusinessInput,
  type DashboardData,
  type Plan,
  type PublicBusiness,
  type Service,
  type ServiceInput,
  type Slot,
} from "./types";

// Supabase returns untyped records here because generated database types are produced after project link.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRecord = Record<string, any>;

function mapPlan(value: string | null | undefined): Plan {
  if (value === "pro" || value === "studio") return value;
  return "free";
}

function mapBusiness(row: DbRecord): Business {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    city: row.city ?? "",
    whatsappNumber: row.whatsapp_number ?? "",
    bookingPageLanguage: row.booking_page_language ?? "Both",
    timezone: row.timezone ?? "Indian/Mauritius",
    plan: mapPlan(row.plan),
    bookingLimitMonthly: row.booking_limit_monthly ?? FREE_BOOKING_LIMIT,
    minNoticeMinutes: row.min_notice_minutes ?? DEFAULT_MIN_NOTICE_MINUTES,
    maxAdvanceDays: row.max_advance_days ?? DEFAULT_MAX_ADVANCE_DAYS,
    slotIntervalMinutes: row.slot_interval_minutes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapService(row: DbRecord): Service {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    durationMinutes: row.duration_minutes,
    priceLabel: row.price_label ?? "",
    active: row.active ?? true,
    allDay: Boolean(row.all_day),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAvailability(row: DbRecord): Availability {
  return {
    id: row.id,
    businessId: row.business_id,
    dayOfWeek: row.day_of_week,
    isOpen: row.is_open,
    opensAt: row.opens_at?.slice(0, 5) ?? "09:00",
    closesAt: row.closes_at?.slice(0, 5) ?? "18:00",
  };
}

function mapBooking(row: DbRecord): Booking {
  const service = Array.isArray(row.services) ? row.services[0] : row.services;
  const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
  return {
    id: row.id,
    businessId: row.business_id,
    serviceId: row.service_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerLanguage: row.customer_language ?? "Both",
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status ?? "pending",
    source: row.source ?? "public",
    notes: row.notes,
    createdAt: row.created_at,
    serviceName: service?.name,
    servicePriceLabel: service?.price_label,
    businessName: business?.name,
    businessSlug: business?.slug,
  };
}

function bookingPayload(input: BookingInput, service: Service) {
  const startMs = new Date(input.startAt).getTime();
  return {
    id: crypto.randomUUID(),
    business_id: input.businessId,
    service_id: input.serviceId,
    customer_name: input.customerName.trim(),
    customer_phone: input.customerPhone.trim(),
    customer_language: input.customerLanguage,
    start_at: input.startAt,
    end_at: new Date(startMs + service.durationMinutes * 60_000).toISOString(),
    status: "pending",
    source: "public",
    notes: input.notes ?? null,
  };
}

export async function createBusiness(input: BusinessInput) {
  const supabase = await getBrowserSupabase();
  if (!supabase) return createDevBusiness(input);

  const owner = await getCurrentOwner();
  if (!owner) throw new Error("You need to sign in before creating a business.");

  const slug = await generateUniqueSlug(input.name, async (candidate) => {
    const { data, error } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  });

  const { data, error } = await supabase
    .from("businesses")
    .insert({
      owner_id: owner.id,
      name: input.name.trim(),
      slug,
      category: input.category,
      city: input.city.trim(),
      whatsapp_number: input.whatsappNumber.trim(),
      booking_page_language: input.bookingPageLanguage,
      timezone: "Indian/Mauritius",
      plan: "free",
      booking_limit_monthly: FREE_BOOKING_LIMIT,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapBusiness(data);
}

export async function getBusinessForOwner() {
  const supabase = await getBrowserSupabase();
  if (!supabase) return (await getDevDashboardData()).business;

  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapBusiness(data) : null;
}

export async function getPublicBusinessBySlug(slug: string): Promise<PublicBusiness | null> {
  const supabase = await getBrowserSupabase();
  if (!supabase) return getDevPublicBusinessBySlug(slug);

  const { data: businessRow, error: businessError } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (businessError) throw businessError;
  if (!businessRow) return null;

  const business = mapBusiness(businessRow);
  const [
    { data: serviceRows, error: serviceError },
    { data: availabilityRows, error: availabilityError },
    { data: bookingRows, error: bookingError },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("created_at"),
    supabase.from("availability").select("*").eq("business_id", business.id).order("day_of_week"),
    supabase
      .from("bookings")
      .select(
        "id,business_id,service_id,customer_name,customer_phone,customer_language,start_at,end_at,status,source,created_at",
      )
      .eq("business_id", business.id)
      .in("status", ["pending", "confirmed"]),
  ]);

  if (serviceError) throw serviceError;
  if (availabilityError) throw availabilityError;
  if (bookingError) throw bookingError;

  const bookings = (bookingRows ?? []).map(mapBooking);
  return {
    business,
    services: (serviceRows ?? []).map(mapService),
    availability: (availabilityRows ?? []).map(mapAvailability),
    usage: calculateMonthlyUsage(bookings, business.plan, business.bookingLimitMonthly),
  };
}

export async function updateBusiness(input: Partial<BusinessInput> & { id: string }) {
  const supabase = await getBrowserSupabase();
  if (!supabase) return updateDevBusiness(input);

  const { data, error } = await supabase
    .from("businesses")
    .update({
      name: input.name,
      category: input.category,
      city: input.city,
      whatsapp_number: input.whatsappNumber,
      booking_page_language: input.bookingPageLanguage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw error;
  return mapBusiness(data);
}

export async function createService(input: ServiceInput) {
  const supabase = await getBrowserSupabase();
  if (!supabase) return createDevService(input);

  const { data, error } = await supabase
    .from("services")
    .insert({
      business_id: input.businessId,
      name: input.name.trim(),
      duration_minutes: input.durationMinutes,
      price_label: input.priceLabel.trim(),
      active: input.active ?? true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapService(data);
}

export async function updateService(input: Partial<ServiceInput> & { id: string }) {
  const supabase = await getBrowserSupabase();
  if (!supabase) return updateDevService(input);

  const { data, error } = await supabase
    .from("services")
    .update({
      name: input.name,
      duration_minutes: input.durationMinutes,
      price_label: input.priceLabel,
      active: input.active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw error;
  return mapService(data);
}

export async function deleteService(id: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) return deleteDevService(id);

  const { error } = await supabase
    .from("services")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function updateAvailability(input: AvailabilityInput) {
  const supabase = await getBrowserSupabase();
  if (!supabase) return updateDevAvailability(input);

  const rows = input.days.map((day) => ({
    business_id: input.businessId,
    day_of_week: day.dayOfWeek,
    is_open: day.isOpen,
    opens_at: day.opensAt,
    closes_at: day.closesAt,
  }));

  const { data, error } = await supabase
    .from("availability")
    .upsert(rows, { onConflict: "business_id,day_of_week" })
    .select("*");
  if (error) throw error;
  return (data ?? []).map(mapAvailability);
}

export async function getAvailableSlots(businessId: string, serviceId: string, date: string) {
  const dashboard = await getDashboardData().catch(() => null);
  const publicData =
    dashboard?.business?.id === businessId
      ? {
          business: dashboard.business,
          services: dashboard.services,
          availability: dashboard.availability,
          usage: dashboard.usage,
          bookings: dashboard.bookings,
        }
      : null;

  let service = publicData?.services.find((entry) => entry.id === serviceId);
  let availability = publicData?.availability ?? [];
  let bookings = publicData?.bookings ?? [];
  let full = publicData?.usage.full ?? false;

  if (!service) {
    const supabase = await getBrowserSupabase();
    if (!supabase) {
      const devPublic = await getDevPublicBusinessBySlug("salon-rose");
      service = devPublic?.services.find((entry) => entry.id === serviceId);
      availability = devPublic?.availability ?? [];
      full = devPublic?.usage.full ?? false;
    } else {
      const [
        { data: serviceRow, error: serviceError },
        { data: availabilityRows, error: availabilityError },
        { data: bookingRows, error: bookingError },
        { data: businessRow, error: businessError },
      ] = await Promise.all([
        supabase.from("services").select("*").eq("id", serviceId).eq("active", true).single(),
        supabase.from("availability").select("*").eq("business_id", businessId),
        supabase
          .from("bookings")
          .select(
            "id,business_id,service_id,customer_name,customer_phone,customer_language,start_at,end_at,status,source,created_at",
          )
          .eq("business_id", businessId)
          .in("status", ["pending", "confirmed"]),
        supabase.from("businesses").select("*").eq("id", businessId).single(),
      ]);
      if (serviceError) throw serviceError;
      if (availabilityError) throw availabilityError;
      if (bookingError) throw bookingError;
      if (businessError) throw businessError;
      const business = mapBusiness(businessRow);
      service = mapService(serviceRow);
      availability = (availabilityRows ?? []).map(mapAvailability);
      bookings = (bookingRows ?? []).map(mapBooking);
      full = calculateMonthlyUsage(bookings, business.plan, business.bookingLimitMonthly).full;
    }
  }

  if (!service) return [] satisfies Slot[];
  return generateSlots({ date, service, availability, bookings, monthlyFull: full });
}

export async function createBooking(input: BookingInput) {
  const supabase = await getBrowserSupabase();
  if (!supabase) return createDevBooking(input);

  const { data: serviceRow, error: serviceError } = await supabase
    .from("services")
    .select("*")
    .eq("id", input.serviceId)
    .eq("business_id", input.businessId)
    .eq("active", true)
    .single();
  if (serviceError) throw serviceError;

  const service = mapService(serviceRow);
  const payload = bookingPayload(input, service);
  const optimisticBooking: Booking = {
    id: payload.id,
    businessId: input.businessId,
    serviceId: input.serviceId,
    serviceName: service.name,
    servicePriceLabel: service.priceLabel,
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    customerLanguage: input.customerLanguage,
    startAt: input.startAt,
    endAt: payload.end_at,
    status: "pending",
    source: "public",
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };

  const { error } = await supabase.from("bookings").insert(payload);
  if (error) throw new Error(error.message);

  saveLastBooking(optimisticBooking);
  return optimisticBooking;
}

export async function getBookingById(id: string) {
  const devBooking = await getDevBookingById(id);
  if (devBooking) return devBooking;

  const supabase = await getBrowserSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("bookings")
    .select("*,services(name,price_label),businesses(name,slug)")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data ? mapBooking(data) : null;
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await getBrowserSupabase();
  if (!supabase) return getDevDashboardData();

  const owner = await getCurrentOwner();
  if (!owner) {
    return {
      owner: null,
      business: null,
      services: [],
      availability: [],
      bookings: [],
      usage: { plan: "free", used: 0, limit: FREE_BOOKING_LIMIT, nearLimit: false, full: false },
    };
  }

  const business = await getBusinessForOwner();
  if (!business) {
    return {
      owner,
      business: null,
      services: [],
      availability: [],
      bookings: [],
      usage: { plan: "free", used: 0, limit: FREE_BOOKING_LIMIT, nearLimit: false, full: false },
    };
  }

  const [
    { data: serviceRows, error: serviceError },
    { data: availabilityRows, error: availabilityError },
    { data: bookingRows, error: bookingError },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("created_at"),
    supabase.from("availability").select("*").eq("business_id", business.id).order("day_of_week"),
    supabase
      .from("bookings")
      .select("*,services(name,price_label),businesses(name,slug)")
      .eq("business_id", business.id)
      .order("start_at"),
  ]);

  if (serviceError) throw serviceError;
  if (availabilityError) throw availabilityError;
  if (bookingError) throw bookingError;

  const bookings = (bookingRows ?? []).map(mapBooking);
  return {
    owner,
    business,
    services: (serviceRows ?? []).map(mapService),
    availability: (availabilityRows ?? []).map(mapAvailability),
    bookings,
    usage: calculateMonthlyUsage(bookings, business.plan, business.bookingLimitMonthly),
  };
}

export async function cancelBooking(id: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) return cancelDevBooking(id);

  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*,services(name,price_label),businesses(name,slug)")
    .single();
  if (error) throw error;
  return mapBooking(data);
}

export async function markBookingConfirmed(id: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) return confirmDevBooking(id);

  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*,services(name,price_label),businesses(name,slug)")
    .single();
  if (error) throw error;
  return mapBooking(data);
}

export async function slugExists(slug: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) return devSlugExists(slug);

  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
