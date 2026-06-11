// src/lib/cf/data.ts
// Data access layer backed by Cloudflare D1.
// Replaces: src/lib/reservly/data.ts (Supabase SDK calls)
//
// All functions follow the same dual-path pattern as the original:
//   - If D1 is available  → use D1
//   - If not (local dev)  → fall back to dev-store
//
// Row types mirror the D1 schema columns exactly (snake_case).
// Mapping functions convert to the app's camelCase types.

import { getD1, d1All, d1First, d1Run, isD1Enabled } from "./db";
import { getCurrentOwner } from "./auth";
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
} from "@/lib/reservly/dev-store";
import { generateUniqueSlug } from "@/lib/reservly/slug";
import { calculateMonthlyUsage, generateSlots } from "@/lib/reservly/slots";
import {
  FREE_BOOKING_LIMIT,
  type Availability,
  type AvailabilityInput,
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
} from "@/lib/reservly/types";

// ─── Row types (D1 column names) ─────────────────────────────────────────────

type BusinessRow = {
  id: string; owner_id: string; name: string; slug: string; category: string;
  city: string; whatsapp_number: string; booking_page_language: string;
  timezone: string; plan: string; booking_limit_monthly: number | null;
  created_at: string; updated_at: string;
};
type ServiceRow = {
  id: string; business_id: string; name: string; duration_minutes: number;
  price_label: string; active: number; created_at: string; updated_at: string;
};
type AvailabilityRow = {
  id: string; business_id: string; day_of_week: number; is_open: number;
  opens_at: string; closes_at: string; created_at: string; updated_at: string;
};
type BookingRow = {
  id: string; business_id: string; service_id: string; customer_name: string;
  customer_phone: string; customer_language: string; start_at: string; end_at: string;
  status: string; source: string; notes: string | null; cancellation_reason: string | null;
  created_at: string; updated_at: string;
  // joined fields (optional)
  service_name?: string; service_price_label?: string;
  business_name?: string; business_slug?: string;
};

// ─── Map helpers ─────────────────────────────────────────────────────────────

function mapPlan(val: string | null | undefined): Plan {
  if (val === "pro" || val === "studio") return val;
  return "free";
}

function mapBusiness(row: BusinessRow): Business {
  return {
    id: row.id, ownerId: row.owner_id, name: row.name, slug: row.slug,
    category: row.category, city: row.city ?? "",
    whatsappNumber: row.whatsapp_number ?? "",
    bookingPageLanguage: (row.booking_page_language as Business["bookingPageLanguage"]) ?? "Both",
    timezone: row.timezone ?? "Indian/Mauritius",
    plan: mapPlan(row.plan),
    bookingLimitMonthly: row.booking_limit_monthly ?? FREE_BOOKING_LIMIT,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapService(row: ServiceRow): Service {
  return {
    id: row.id, businessId: row.business_id, name: row.name,
    durationMinutes: row.duration_minutes, priceLabel: row.price_label ?? "",
    active: Boolean(row.active), createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapAvailability(row: AvailabilityRow): Availability {
  return {
    id: row.id, businessId: row.business_id, dayOfWeek: row.day_of_week,
    isOpen: Boolean(row.is_open),
    opensAt: row.opens_at?.slice(0, 5) ?? "09:00",
    closesAt: row.closes_at?.slice(0, 5) ?? "18:00",
  };
}

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id, businessId: row.business_id, serviceId: row.service_id,
    customerName: row.customer_name, customerPhone: row.customer_phone,
    customerLanguage: (row.customer_language as Booking["customerLanguage"]) ?? "Both",
    startAt: row.start_at, endAt: row.end_at,
    status: (row.status as Booking["status"]) ?? "pending",
    source: (row.source as Booking["source"]) ?? "public",
    notes: row.notes, createdAt: row.created_at,
    serviceName: row.service_name,
    servicePriceLabel: row.service_price_label,
    businessName: row.business_name,
    businessSlug: row.business_slug,
  };
}

// ─── Business ────────────────────────────────────────────────────────────────

export async function createBusiness(input: BusinessInput): Promise<Business> {
  if (!isD1Enabled()) return createDevBusiness(input);

  const db = getD1()!;
  const owner = await getCurrentOwner();
  if (!owner) throw new Error("You need to sign in before creating a business.");

  const slug = await generateUniqueSlug(input.name, async (candidate) => {
    const row = await d1First(db.prepare("SELECT id FROM businesses WHERE slug = ?").bind(candidate));
    return Boolean(row);
  });

  const id = crypto.randomUUID();
  await d1Run(
    db.prepare(`
      INSERT INTO businesses
        (id, owner_id, name, slug, category, city, whatsapp_number,
         booking_page_language, timezone, plan, booking_limit_monthly)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Indian/Mauritius', 'free', ?)
    `).bind(
      id, owner.id, input.name.trim(), slug, input.category,
      input.city.trim(), input.whatsappNumber.trim(),
      input.bookingPageLanguage, FREE_BOOKING_LIMIT,
    ),
  );

  const row = await d1First<BusinessRow>(db.prepare("SELECT * FROM businesses WHERE id = ?").bind(id));
  return mapBusiness(row!);
}

export async function getBusinessForOwner(ownerId?: string): Promise<Business | null> {
  if (!isD1Enabled()) return (await getDevDashboardData()).business;

  const db = getD1()!;
  const owner = ownerId ?? (await getCurrentOwner())?.id;
  if (!owner) return null;

  const row = await d1First<BusinessRow>(
    db.prepare("SELECT * FROM businesses WHERE owner_id = ? ORDER BY created_at ASC LIMIT 1").bind(owner),
  );
  return row ? mapBusiness(row) : null;
}

export async function getPublicBusinessBySlug(slug: string): Promise<PublicBusiness | null> {
  if (!isD1Enabled()) return getDevPublicBusinessBySlug(slug);

  const db = getD1()!;
  const bizRow = await d1First<BusinessRow>(
    db.prepare("SELECT * FROM businesses WHERE slug = ?").bind(slug),
  );
  if (!bizRow) return null;

  const business = mapBusiness(bizRow);

  const [serviceRows, availRows, bookingRows] = await Promise.all([
    d1All<ServiceRow>(db.prepare("SELECT * FROM services WHERE business_id = ? AND active = 1 ORDER BY created_at").bind(business.id)),
    d1All<AvailabilityRow>(db.prepare("SELECT * FROM availability WHERE business_id = ? ORDER BY day_of_week").bind(business.id)),
    d1All<BookingRow>(db.prepare("SELECT * FROM bookings WHERE business_id = ? AND status IN ('pending','confirmed')").bind(business.id)),
  ]);

  const bookings = bookingRows.map(mapBooking);
  return {
    business,
    services: serviceRows.map(mapService),
    availability: availRows.map(mapAvailability),
    usage: calculateMonthlyUsage(bookings, business.plan, business.bookingLimitMonthly),
  };
}

export async function updateBusiness(input: Partial<BusinessInput> & { id: string }): Promise<Business> {
  if (!isD1Enabled()) return updateDevBusiness(input);

  const db = getD1()!;
  await d1Run(
    db.prepare(`
      UPDATE businesses SET
        name = COALESCE(?, name), category = COALESCE(?, category),
        city = COALESCE(?, city), whatsapp_number = COALESCE(?, whatsapp_number),
        booking_page_language = COALESCE(?, booking_page_language),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      input.name ?? null, input.category ?? null, input.city ?? null,
      input.whatsappNumber ?? null, input.bookingPageLanguage ?? null, input.id,
    ),
  );

  const row = await d1First<BusinessRow>(db.prepare("SELECT * FROM businesses WHERE id = ?").bind(input.id));
  return mapBusiness(row!);
}

export async function slugExists(slug: string): Promise<boolean> {
  if (!isD1Enabled()) return devSlugExists(slug);
  const db = getD1()!;
  const row = await d1First(db.prepare("SELECT id FROM businesses WHERE slug = ?").bind(slug));
  return Boolean(row);
}

// ─── Services ────────────────────────────────────────────────────────────────

export async function createService(input: ServiceInput): Promise<Service> {
  if (!isD1Enabled()) return createDevService(input);

  const db = getD1()!;
  const id = crypto.randomUUID();
  await d1Run(
    db.prepare(`
      INSERT INTO services (id, business_id, name, duration_minutes, price_label, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).bind(id, input.businessId, input.name.trim(), input.durationMinutes, input.priceLabel.trim()),
  );

  const row = await d1First<ServiceRow>(db.prepare("SELECT * FROM services WHERE id = ?").bind(id));
  return mapService(row!);
}

export async function updateService(input: Partial<ServiceInput> & { id: string }): Promise<Service> {
  if (!isD1Enabled()) return updateDevService(input);

  const db = getD1()!;
  await d1Run(
    db.prepare(`
      UPDATE services SET
        name = COALESCE(?, name),
        duration_minutes = COALESCE(?, duration_minutes),
        price_label = COALESCE(?, price_label),
        active = COALESCE(?, active),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      input.name ?? null, input.durationMinutes ?? null,
      input.priceLabel ?? null, input.active != null ? (input.active ? 1 : 0) : null,
      input.id,
    ),
  );

  const row = await d1First<ServiceRow>(db.prepare("SELECT * FROM services WHERE id = ?").bind(input.id));
  return mapService(row!);
}

export async function deleteService(id: string): Promise<void> {
  if (!isD1Enabled()) return deleteDevService(id);
  const db = getD1()!;
  await d1Run(db.prepare("UPDATE services SET active = 0, updated_at = datetime('now') WHERE id = ?").bind(id));
}

// ─── Availability ─────────────────────────────────────────────────────────────

export async function updateAvailability(input: AvailabilityInput): Promise<Availability[]> {
  if (!isD1Enabled()) return updateDevAvailability(input);

  const db = getD1()!;
  const stmts = input.days.map((day) =>
    db.prepare(`
      INSERT INTO availability (id, business_id, day_of_week, is_open, opens_at, closes_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(business_id, day_of_week) DO UPDATE SET
        is_open = excluded.is_open,
        opens_at = excluded.opens_at,
        closes_at = excluded.closes_at,
        updated_at = datetime('now')
    `).bind(
      crypto.randomUUID(), input.businessId, day.dayOfWeek,
      day.isOpen ? 1 : 0, day.opensAt, day.closesAt,
    ),
  );

  await db.batch(stmts);
  const rows = await d1All<AvailabilityRow>(
    db.prepare("SELECT * FROM availability WHERE business_id = ? ORDER BY day_of_week").bind(input.businessId),
  );
  return rows.map(mapAvailability);
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export async function getAvailableSlots(
  businessId: string, serviceId: string, date: string,
): Promise<Slot[]> {
  if (!isD1Enabled()) {
    const devPublic = await getDevPublicBusinessBySlug("salon-rose");
    const service = devPublic?.services.find((s) => s.id === serviceId);
    if (!service) return [];
    return generateSlots({
      date, service,
      availability: devPublic?.availability ?? [],
      bookings: [],
      monthlyFull: devPublic?.usage.full ?? false,
    });
  }

  const db = getD1()!;

  const [serviceRow, availRows, bookingRows, bizRow] = await Promise.all([
    d1First<ServiceRow>(db.prepare("SELECT * FROM services WHERE id = ? AND active = 1").bind(serviceId)),
    d1All<AvailabilityRow>(db.prepare("SELECT * FROM availability WHERE business_id = ?").bind(businessId)),
    d1All<BookingRow>(db.prepare("SELECT * FROM bookings WHERE business_id = ? AND status IN ('pending','confirmed')").bind(businessId)),
    d1First<BusinessRow>(db.prepare("SELECT * FROM businesses WHERE id = ?").bind(businessId)),
  ]);

  if (!serviceRow || !bizRow) return [];

  const business = mapBusiness(bizRow);
  const service = mapService(serviceRow);
  const bookings = bookingRows.map(mapBooking);
  const monthlyFull = calculateMonthlyUsage(bookings, business.plan, business.bookingLimitMonthly).full;

  return generateSlots({ date, service, availability: availRows.map(mapAvailability), bookings, monthlyFull });
}

export async function createBooking(input: BookingInput): Promise<Booking> {
  if (!isD1Enabled()) return createDevBooking(input);

  const db = getD1()!;

  const serviceRow = await d1First<ServiceRow>(
    db.prepare("SELECT * FROM services WHERE id = ? AND business_id = ? AND active = 1").bind(input.serviceId, input.businessId),
  );
  if (!serviceRow) throw new Error("This booking page is no longer available.");

  const service = mapService(serviceRow);

  // Check monthly limit
  const bizRow = await d1First<BusinessRow>(db.prepare("SELECT * FROM businesses WHERE id = ?").bind(input.businessId));
  if (bizRow) {
    const biz = mapBusiness(bizRow);
    if (biz.plan === "free" && biz.bookingLimitMonthly) {
      const monthStart = input.startAt.slice(0, 7) + "-01T00:00:00.000Z";
      const monthEnd = new Date(new Date(monthStart).getTime() + 32 * 24 * 3600 * 1000)
        .toISOString().slice(0, 7) + "-01T00:00:00.000Z";
      const countRow = await d1First<{ count: number }>(
        db.prepare(`
          SELECT COUNT(*) as count FROM bookings
          WHERE business_id = ? AND status IN ('pending','confirmed')
          AND start_at >= ? AND start_at < ?
        `).bind(input.businessId, monthStart, monthEnd),
      );
      if ((countRow?.count ?? 0) >= biz.bookingLimitMonthly) {
        throw new Error("Online booking is full for this month.");
      }
    }
  }

  // Check overlap
  const startMs = new Date(input.startAt).getTime();
  const endAt = new Date(startMs + service.durationMinutes * 60_000).toISOString();
  const overlap = await d1First(
    db.prepare(`
      SELECT id FROM bookings
      WHERE business_id = ? AND status IN ('pending','confirmed')
      AND start_at < ? AND end_at > ?
    `).bind(input.businessId, endAt, input.startAt),
  );
  if (overlap) throw new Error("That time has just been taken. Pick another slot.");

  const id = crypto.randomUUID();
  await d1Run(
    db.prepare(`
      INSERT INTO bookings
        (id, business_id, service_id, customer_name, customer_phone,
         customer_language, start_at, end_at, status, source, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'public', ?)
    `).bind(
      id, input.businessId, input.serviceId,
      input.customerName.trim(), input.customerPhone.trim(),
      input.customerLanguage, input.startAt, endAt, input.notes ?? null,
    ),
  );

  const booking: Booking = {
    id, businessId: input.businessId, serviceId: input.serviceId,
    serviceName: service.name, servicePriceLabel: service.priceLabel,
    customerName: input.customerName.trim(), customerPhone: input.customerPhone.trim(),
    customerLanguage: input.customerLanguage,
    startAt: input.startAt, endAt,
    status: "pending", source: "public", notes: input.notes,
    createdAt: new Date().toISOString(),
  };

  saveLastBooking(booking);
  return booking;
}

export async function getBookingById(id: string): Promise<Booking | null> {
  // Dev-store last-booking is always checked first (used by confirmation page)
  const devBooking = await getDevBookingById(id);
  if (devBooking) return devBooking;

  if (!isD1Enabled()) return null;
  const db = getD1()!;

  const row = await d1First<BookingRow>(
    db.prepare(`
      SELECT b.*,
        s.name as service_name, s.price_label as service_price_label,
        biz.name as business_name, biz.slug as business_slug
      FROM bookings b
      LEFT JOIN services s ON s.id = b.service_id
      LEFT JOIN businesses biz ON biz.id = b.business_id
      WHERE b.id = ?
    `).bind(id),
  );
  return row ? mapBooking(row) : null;
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!isD1Enabled()) return getDevDashboardData();

  const db = getD1()!;
  const owner = await getCurrentOwner();
  if (!owner) {
    return { owner: null, business: null, services: [], availability: [], bookings: [],
      usage: { plan: "free", used: 0, limit: FREE_BOOKING_LIMIT, nearLimit: false, full: false } };
  }

  const business = await getBusinessForOwner(owner.id);
  if (!business) {
    return { owner, business: null, services: [], availability: [], bookings: [],
      usage: { plan: "free", used: 0, limit: FREE_BOOKING_LIMIT, nearLimit: false, full: false } };
  }

  const [serviceRows, availRows, bookingRows] = await Promise.all([
    d1All<ServiceRow>(db.prepare("SELECT * FROM services WHERE business_id = ? AND active = 1 ORDER BY created_at").bind(business.id)),
    d1All<AvailabilityRow>(db.prepare("SELECT * FROM availability WHERE business_id = ? ORDER BY day_of_week").bind(business.id)),
    d1All<BookingRow>(db.prepare(`
      SELECT b.*, s.name as service_name, s.price_label as service_price_label,
        biz.name as business_name, biz.slug as business_slug
      FROM bookings b
      LEFT JOIN services s ON s.id = b.service_id
      LEFT JOIN businesses biz ON biz.id = b.business_id
      WHERE b.business_id = ? ORDER BY b.start_at
    `).bind(business.id)),
  ]);

  const bookings = bookingRows.map(mapBooking);
  return {
    owner, business,
    services: serviceRows.map(mapService),
    availability: availRows.map(mapAvailability),
    bookings,
    usage: calculateMonthlyUsage(bookings, business.plan, business.bookingLimitMonthly),
  };
}

export async function cancelBooking(id: string): Promise<Booking> {
  if (!isD1Enabled()) return cancelDevBooking(id);

  const db = getD1()!;
  await d1Run(db.prepare("UPDATE bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").bind(id));
  return (await getBookingById(id))!;
}

export async function markBookingConfirmed(id: string): Promise<Booking> {
  if (!isD1Enabled()) return confirmDevBooking(id);

  const db = getD1()!;
  await d1Run(db.prepare("UPDATE bookings SET status = 'confirmed', updated_at = datetime('now') WHERE id = ?").bind(id));
  return (await getBookingById(id))!;
}
