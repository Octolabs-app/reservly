export const FREE_BOOKING_LIMIT = 15;
export const DEFAULT_MIN_NOTICE_MINUTES = 120;
export const DEFAULT_MAX_ADVANCE_DAYS = 30;
export const DEFAULT_SLOT_INTERVAL_MINUTES = 30;
/** Hard ceiling for how far ahead the public page will ever render dates. */
export const MAX_ADVANCE_DAYS_CEILING = 365;

export type Plan = "free" | "pro" | "studio";
export type BookingStatus = "pending" | "confirmed" | "cancelled";
export type BookingLanguage = "English" | "Francais" | "Both";

/** Billing providers — no-BRN-friendly. Stripe is future-only. */
export type BillingProvider =
  | "manual"
  | "paddle_individual"
  | "dodo_individual"
  | "paypal_manual"
  | "stripe_future";

export type SubscriptionStatus =
  | "free"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "manual";

export type Subscription = {
  businessId: string;
  provider: BillingProvider;
  plan: Plan;
  status: SubscriptionStatus;
  paymentNote?: string | null;
  paymentReference?: string | null;
  currentPeriodEnd?: string | null;
  updatedAt?: string;
};

export type Owner = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export type Business = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  category: string;
  city: string;
  whatsappNumber: string;
  bookingPageLanguage: BookingLanguage;
  timezone: string;
  plan: Plan;
  bookingLimitMonthly: number | null;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  slotIntervalMinutes: number | null;
  noSameDay: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Service = {
  id: string;
  businessId: string;
  name: string;
  durationMinutes: number;
  priceLabel: string;
  active: boolean;
  allDay: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Availability = {
  id: string;
  businessId: string;
  dayOfWeek: number;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
};

export type Booking = {
  id: string;
  businessId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  customerLanguage: BookingLanguage;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  source: "public" | "dashboard";
  bookingRef?: string | null;
  notes?: string | null;
  createdAt?: string;
  serviceName?: string;
  servicePriceLabel?: string;
  businessName?: string;
  businessSlug?: string;
};

export type PublicBusiness = {
  business: Business;
  services: Service[];
  availability: Availability[];
  usage: PlanUsage;
};

export type PlanUsage = {
  plan: Plan;
  used: number;
  limit: number | null;
  nearLimit: boolean;
  full: boolean;
};

export type DashboardData = {
  owner: Owner | null;
  business: Business | null;
  services: Service[];
  availability: Availability[];
  bookings: Booking[];
  usage: PlanUsage;
};

export type BusinessInput = {
  name: string;
  category: string;
  city: string;
  whatsappNumber: string;
  bookingPageLanguage: BookingLanguage;
  minNoticeMinutes?: number;
  maxAdvanceDays?: number;
  slotIntervalMinutes?: number | null;
  noSameDay?: boolean;
};

export type ServiceInput = {
  businessId: string;
  name: string;
  durationMinutes: number;
  priceLabel: string;
  active?: boolean;
  allDay?: boolean;
};

export type AvailabilityInput = {
  businessId: string;
  days: Array<{
    dayOfWeek: number;
    isOpen: boolean;
    opensAt: string;
    closesAt: string;
  }>;
};

export type BookingInput = {
  businessId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  customerLanguage: BookingLanguage;
  startAt: string;
  notes?: string;
};

export type Slot = {
  time: string;
  startAt: string;
  available: boolean;
  reason?: "past" | "closed" | "taken" | "full" | "notice" | "same_day";
};
