import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { getRegionalProPrice } from "@/lib/randevou/pricing";
import { EmptyState, Panel } from "@/components/randevou/AppShell";
import {
  createService,
  deleteAccount,
  deleteService,
  disconnectGoogleAccount,
  getDashboardData,
  setPassword,
  updateAvailability,
  updateBusiness,
  updateService,
} from "@/lib/cf/client-data";
import { getSiteUrl } from "@/lib/randevou/env";
import { normalizeWhatsAppNumber, validateWhatsAppNumber } from "@/lib/randevou/phone";
import type {
  Availability,
  BookingLanguage,
  Business,
  DashboardData,
  Service,
} from "@/lib/randevou/types";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsTab,
});

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LANGS: BookingLanguage[] = ["English", "Francais", "Both"];

const NOTICE_OPTIONS = [
  { value: 0, label: "No minimum — book any time" },
  { value: 60, label: "At least 1 hour before" },
  { value: 120, label: "At least 2 hours before" },
  { value: 240, label: "At least 4 hours before" },
  { value: 720, label: "At least 12 hours before" },
  { value: 1440, label: "At least 1 day before" },
  { value: 2880, label: "At least 2 days before" },
];

const ADVANCE_OPTIONS = [
  { value: 7, label: "Up to 1 week ahead" },
  { value: 14, label: "Up to 2 weeks ahead" },
  { value: 30, label: "Up to 1 month ahead" },
  { value: 60, label: "Up to 2 months ahead" },
  { value: 90, label: "Up to 3 months ahead" },
];

const INTERVAL_OPTIONS = [
  { value: "", label: "Every 30 minutes (default)" },
  { value: "15", label: "Every 15 minutes" },
  { value: "20", label: "Every 20 minutes" },
  { value: "45", label: "Every 45 minutes" },
  { value: "60", label: "Every hour" },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240];

type Tone = "success" | "info" | "error";

function SettingsTab() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [saving, setSaving] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [billingConfig, setBillingConfig] = useState<{ paypalUrl: string | null; contactEmail: string } | null>(null);
  const proPrice = getRegionalProPrice();
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<Tone>("success");
  const [removeTarget, setRemoveTarget] = useState<Service | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [showSetPw, setShowSetPw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [settingPw, setSettingPw] = useState(false);

  async function refresh() {
    setLoadError(null);
    try {
      const next = await getDashboardData();
      setData(next);
      setBusiness(next.business);
      setServices(next.services);
      setAvailability(next.availability);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load settings.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function notify(text: string, tone: Tone = "success") {
    setMessageTone(tone);
    setMessage(text);
    setTimeout(() => setMessage(null), 5000);
  }

  function failMessage(err: unknown, fallback: string) {
    notify(err instanceof Error ? err.message : fallback, "error");
  }

  async function saveProfile() {
    if (!business) return;
    const phoneIssue = business.whatsappNumber
      ? validateWhatsAppNumber(business.whatsappNumber)
      : null;
    if (phoneIssue) {
      notify(phoneIssue, "error");
      return;
    }
    setSaving(true);
    try {
      await updateBusiness({
        id: business.id,
        name: business.name,
        category: business.category,
        city: business.city,
        whatsappNumber: normalizeWhatsAppNumber(business.whatsappNumber),
        bookingPageLanguage: business.bookingPageLanguage,
      });
      notify("✓ Profile saved");
      await refresh();
    } catch (err) {
      failMessage(err, "Profile could not be saved — try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveBookingRules() {
    if (!business) return;
    setSaving(true);
    try {
      await updateBusiness({
        id: business.id,
        minNoticeMinutes: business.minNoticeMinutes,
        maxAdvanceDays: business.maxAdvanceDays,
        slotIntervalMinutes: business.slotIntervalMinutes,
        noSameDay: business.noSameDay,
      });
      notify("✓ Booking rules saved");
      await refresh();
    } catch (err) {
      failMessage(err, "Booking rules could not be saved — try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveServices() {
    if (!business) return;
    setSaving(true);
    try {
      await Promise.all(
        services.map((service) =>
          service.id.startsWith("new_")
            ? createService({
                businessId: business.id,
                name: service.name,
                durationMinutes: service.durationMinutes,
                priceLabel: service.priceLabel,
                allDay: service.allDay,
              })
            : updateService({
                id: service.id,
                businessId: business.id,
                name: service.name,
                durationMinutes: service.durationMinutes,
                priceLabel: service.priceLabel,
                active: service.active,
                allDay: service.allDay,
              }),
        ),
      );
      notify("✓ Services saved");
      await refresh();
    } catch (err) {
      failMessage(err, "Services could not be saved — try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAvailabilityRows() {
    if (!business) return;
    setSaving(true);
    try {
      await updateAvailability({
        businessId: business.id,
        days: availability.map((entry) => ({
          dayOfWeek: entry.dayOfWeek,
          isOpen: entry.isOpen,
          opensAt: entry.opensAt,
          closesAt: entry.closesAt,
        })),
      });
      notify("✓ Opening hours saved");
      await refresh();
    } catch (err) {
      failMessage(err, "Opening hours could not be saved — try again.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemoveService() {
    if (!removeTarget) return;
    if (removeTarget.id.startsWith("new_")) {
      setServices(services.filter((entry) => entry.id !== removeTarget.id));
      setRemoveTarget(null);
      return;
    }
    try {
      await deleteService(removeTarget.id);
      setRemoveTarget(null);
      notify("✓ Service removed");
      await refresh();
    } catch (err) {
      failMessage(err, "The service could not be removed — try again.");
    }
  }

  // Online (automated) billing is not live yet. Until a provider (Paddle /
  // Dodo, as an individual/sole-trader) is approved, upgrades are arranged
  // manually — we never pretend a card checkout exists.
  function requestUpgrade() {
    setShowUpgrade(true);
    if (!billingConfig) {
      fetch("/api/billing/config", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => setBillingConfig(d))
        .catch(() => setBillingConfig({ paypalUrl: null, contactEmail: "hello@octolabs.app" }));
    }
  }

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
    window.location.href = "/";
  }

  async function confirmDeleteAccount() {
    try {
      await deleteAccount();
      window.location.href = "/";
    } catch (err) {
      setShowDelete(false);
      failMessage(err, "Account deletion failed — contact support.");
    }
  }

  async function disconnectGoogle() {
    try {
      await disconnectGoogleAccount();
      notify("Google account disconnected");
      await refresh();
    } catch (err) {
      failMessage(err, "Google account could not be disconnected.");
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) {
      notify("Password must be at least 8 characters.", "error");
      return;
    }
    setSettingPw(true);
    try {
      await setPassword(newPw);
      setNewPw("");
      setShowSetPw(false);
      notify("✓ Password set — you can now sign in with email + password.");
      await refresh();
    } catch (err) {
      failMessage(err, "Password could not be set — try again.");
    } finally {
      setSettingPw(false);
    }
  }

  if (loadError) {
    return (
      <Panel>
        <EmptyState
          icon="📡"
          title="Couldn't load settings"
          sub={loadError}
          action={
            <button onClick={() => void refresh()} className="btn-solid">
              Retry
            </button>
          }
        />
      </Panel>
    );
  }

  if (!data || !business) return <SettingsSkeleton />;

  const bookingLink = `${getSiteUrl()}/b/${business.slug}`;
  const usageLabel = data.usage.limit
    ? `${data.usage.used}/${data.usage.limit} bookings used`
    : "Unlimited bookings";
  const usagePercent = data.usage.limit
    ? Math.min(100, (data.usage.used / data.usage.limit) * 100)
    : 100;
  const ownerPhoneIssue = business.whatsappNumber
    ? validateWhatsAppNumber(business.whatsappNumber)
    : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Manage your business profile, services, hours and plan.
        </p>
      </div>

      {message && (
        <div
          role="status"
          className={`rounded-[10px] border px-3.5 py-2.5 text-sm ${
            messageTone === "success"
              ? "border-success/30 bg-success-soft text-success"
              : messageTone === "error"
                ? "border-destructive/25 bg-destructive-soft text-destructive"
                : "border-primary-mid bg-primary-soft text-primary"
          }`}
        >
          {message}
        </div>
      )}

      {/* Plan */}
      <div className="rounded-xl border border-primary-mid bg-primary-soft p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="kicker mb-1 text-primary">Current plan</div>
            <div className="text-[15px] font-bold capitalize text-foreground">
              {business.plan}
              <span className="ml-2 text-[13px] font-normal text-muted-foreground">
                · {usageLabel} this month
              </span>
            </div>
          </div>
          {business.plan === "free" && !showUpgrade && (
            <button
              onClick={() => requestUpgrade()}
              className="btn-solid px-3.5 py-2 text-xs"
            >
              Upgrade to Pro
            </button>
          )}
        </div>
        {data.usage.limit !== null && (
          <div className="mt-3 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-white/60">
            <div
              className={`h-full rounded-full transition-all ${
                usagePercent >= 90 ? "bg-destructive" : "bg-primary"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        )}

        {/* Upgrade panel */}
        {showUpgrade && business.plan === "free" && (
          <div className="mt-4 rounded-xl border border-primary-mid bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-bold text-foreground">Upgrade to Pro</div>
              <button
                onClick={() => setShowUpgrade(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕ Close
              </button>
            </div>

            <div className="mb-4 flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-bold text-primary">
                {proPrice.symbol}{proPrice.amount}
              </span>
              <span className="text-sm text-muted-foreground">/ month · {proPrice.currency}</span>
              {proPrice.note && (
                <span className="text-xs text-muted-foreground">({proPrice.note})</span>
              )}
            </div>

            <div className="mb-4 space-y-2 text-[13px] text-foreground">
              {["Unlimited bookings", "Unlimited services", "Custom booking rules", "Priority WhatsApp delivery", "Priority support"].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <span className="font-bold text-success">✓</span> {f}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {billingConfig?.paypalUrl && billingConfig.paypalUrl !== "https://paypal.me/YOUR_PAYPAL_USERNAME" ? (
                <a
                  href={`${billingConfig.paypalUrl}/${proPrice.amount}${proPrice.currency}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-solid flex w-full items-center justify-center gap-2 py-3"
                  onClick={() => notify("After paying, email us with your PayPal transaction ID — we'll activate Pro within a few hours.", "info")}
                >
                  <span className="text-lg">💳</span>
                  Pay {proPrice.symbol}{proPrice.amount} with PayPal
                </a>
              ) : (
                <div className="rounded-lg border border-border bg-surface px-4 py-3 text-[13px] text-muted-foreground">
                  Online payment is being set up. Use the contact option below.
                </div>
              )}

              <a
                href={`mailto:${billingConfig?.contactEmail ?? "hello@octolabs.app"}?subject=Randevou Pro upgrade&body=Hi, I'd like to upgrade to Pro. My business: ${business.name}`}
                className="btn-frame flex w-full items-center justify-center gap-2 py-2.5 text-sm"
              >
                ✉ Email us to upgrade manually
              </a>
            </div>

            <p className="mt-3 text-[11px] text-muted-foreground">
              After payment, email{" "}
              <span className="font-medium">{billingConfig?.contactEmail ?? "hello@octolabs.app"}</span>{" "}
              with your transaction ID and business name. We activate Pro within a few hours.
            </p>
          </div>
        )}
      </div>

      {/* Business profile */}
      <Panel className="p-5">
        <SectionHeader
          title="Business profile"
          action={
            <button
              disabled={saving}
              onClick={saveProfile}
              className="btn-solid px-3.5 py-2 text-xs"
            >
              Save
            </button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="biz-name"
            label="Business name"
            value={business.name}
            onChange={(value) => setBusiness({ ...business, name: value })}
          />
          <Field
            id="biz-city"
            label="City"
            value={business.city}
            onChange={(value) => setBusiness({ ...business, city: value })}
          />
          <Field
            id="biz-category"
            label="Category"
            value={business.category}
            onChange={(value) => setBusiness({ ...business, category: value })}
          />
          <div>
            <label className="kicker mb-1.5 block" htmlFor="biz-whatsapp">
              WhatsApp number
            </label>
            <input
              id="biz-whatsapp"
              value={business.whatsappNumber}
              onChange={(value) => setBusiness({ ...business, whatsappNumber: value.target.value })}
              inputMode="tel"
              className="input-field"
            />
            <p
              className={`mt-1 text-[11px] ${ownerPhoneIssue ? "text-destructive" : "text-muted-foreground"}`}
            >
              {ownerPhoneIssue ?? "Booking alerts arrive on this number."}
            </p>
          </div>
          <div>
            <div className="kicker mb-2">Booking page language</div>
            <div className="grid grid-cols-3 gap-2">
              {LANGS.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setBusiness({ ...business, bookingPageLanguage: lang })}
                  aria-pressed={business.bookingPageLanguage === lang}
                  className={`min-h-10 rounded-[10px] border-[1.5px] px-2 py-2 text-xs transition-all ${
                    business.bookingPageLanguage === lang
                      ? "border-primary bg-primary-soft font-semibold text-primary"
                      : "border-border bg-white text-muted-foreground hover:border-primary-mid"
                  }`}
                >
                  {lang === "Francais" ? "Français" : lang}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="kicker mb-2">Public booking link</div>
            <div className="flex items-center gap-2 rounded-[10px] border border-border bg-surface px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                {bookingLink}
              </span>
              <Link
                to="/b/$slug"
                params={{ slug: business.slug }}
                className="shrink-0 text-xs font-semibold text-primary hover:underline"
              >
                Open →
              </Link>
            </div>
          </div>
        </div>
      </Panel>

      {/* Booking rules */}
      <Panel className="p-5">
        <SectionHeader
          title="Booking rules"
          sub="Control how customers can schedule with you."
          action={
            <button
              disabled={saving}
              onClick={saveBookingRules}
              className="btn-solid px-3.5 py-2 text-xs"
            >
              Save
            </button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="kicker mb-1.5 block" htmlFor="rule-notice">
              Minimum notice before booking
            </label>
            <select
              id="rule-notice"
              value={business.minNoticeMinutes}
              onChange={(event) =>
                setBusiness({ ...business, minNoticeMinutes: Number(event.target.value) })
              }
              className="input-field"
            >
              {NOTICE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Stops last-minute bookings you can't prepare for.
            </p>
          </div>
          <div>
            <label className="kicker mb-1.5 block" htmlFor="rule-advance">
              How far ahead customers can book
            </label>
            <select
              id="rule-advance"
              value={business.maxAdvanceDays}
              onChange={(event) =>
                setBusiness({ ...business, maxAdvanceDays: Number(event.target.value) })
              }
              className="input-field"
            >
              {ADVANCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              How many days of dates the booking page shows.
            </p>
          </div>
          <div>
            <label className="kicker mb-1.5 block" htmlFor="rule-interval">
              Booking slot interval
            </label>
            <select
              id="rule-interval"
              value={
                business.slotIntervalMinutes == null ? "" : String(business.slotIntervalMinutes)
              }
              onChange={(event) =>
                setBusiness({
                  ...business,
                  slotIntervalMinutes:
                    event.target.value === "" ? null : Number(event.target.value),
                })
              }
              className="input-field"
            >
              {INTERVAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              How close together start times appear (e.g. 9:00, 9:30…).
            </p>
          </div>
        </div>
        <label className="mt-4 flex items-center gap-2.5 text-[13px] text-foreground">
          <input
            type="checkbox"
            checked={business.noSameDay}
            onChange={(event) => setBusiness({ ...business, noSameDay: event.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
          <span>
            No same-day booking
            <span className="ml-1 text-[11px] text-muted-foreground">
              — customers must book at least the next day
            </span>
          </span>
        </label>
      </Panel>

      {/* Services */}
      <Panel className="p-5">
        <SectionHeader
          title="Services"
          sub="Each service controls its own duration — slots follow automatically."
          action={
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setServices([
                    ...services,
                    {
                      id: `new_${Date.now()}`,
                      businessId: business.id,
                      name: "",
                      durationMinutes: 45,
                      priceLabel: "",
                      active: true,
                      allDay: false,
                    },
                  ])
                }
                className="btn-frame px-3.5 py-2 text-xs"
              >
                + Add
              </button>
              <button
                disabled={saving}
                onClick={saveServices}
                className="btn-solid px-3.5 py-2 text-xs"
              >
                Save
              </button>
            </div>
          }
        />
        <div className="space-y-3">
          {services.length === 0 && (
            <p className="rounded-lg bg-surface px-3.5 py-3 text-[13px] text-muted-foreground">
              No services yet — add your first one.
            </p>
          )}
          {services.map((service, index) => (
            <div key={service.id} className="rounded-xl border border-border p-3.5">
              <div className="grid gap-3 sm:grid-cols-[1fr_150px_110px_auto] sm:items-end">
                <div>
                  <label className="kicker mb-1.5 block" htmlFor={`svc-name-${index}`}>
                    Service name
                  </label>
                  <input
                    id={`svc-name-${index}`}
                    value={service.name}
                    onChange={(event) =>
                      replaceService(
                        index,
                        { ...service, name: event.target.value },
                        services,
                        setServices,
                      )
                    }
                    placeholder="e.g. Haircut"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="kicker mb-1.5 block" htmlFor={`svc-duration-${index}`}>
                    Duration
                  </label>
                  <select
                    id={`svc-duration-${index}`}
                    value={service.allDay ? "all-day" : String(service.durationMinutes)}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === "all-day") {
                        replaceService(
                          index,
                          { ...service, allDay: true, durationMinutes: 480 },
                          services,
                          setServices,
                        );
                      } else if (value === "custom") {
                        const entered = prompt("Custom duration in minutes:", "75");
                        const mins = Math.max(5, Math.min(1440, Number(entered) || 0));
                        if (mins)
                          replaceService(
                            index,
                            { ...service, allDay: false, durationMinutes: mins },
                            services,
                            setServices,
                          );
                      } else {
                        replaceService(
                          index,
                          { ...service, allDay: false, durationMinutes: Number(value) },
                          services,
                          setServices,
                        );
                      }
                    }}
                    className="input-field"
                  >
                    {DURATION_OPTIONS.map((duration) => (
                      <option key={duration} value={duration}>
                        {duration >= 60
                          ? `${Math.floor(duration / 60)}h${duration % 60 ? ` ${duration % 60}m` : ""}`
                          : `${duration} min`}
                      </option>
                    ))}
                    {!DURATION_OPTIONS.includes(service.durationMinutes) && !service.allDay && (
                      <option value={service.durationMinutes}>
                        {service.durationMinutes} min (custom)
                      </option>
                    )}
                    <option value="custom">Custom…</option>
                    <option value="all-day">Full day</option>
                  </select>
                </div>
                <div>
                  <label className="kicker mb-1.5 block" htmlFor={`svc-price-${index}`}>
                    Price
                  </label>
                  <input
                    id={`svc-price-${index}`}
                    value={service.priceLabel}
                    onChange={(event) =>
                      replaceService(
                        index,
                        { ...service, priceLabel: event.target.value },
                        services,
                        setServices,
                      )
                    }
                    placeholder="Rs 350"
                    className="input-field"
                  />
                </div>
                <button
                  onClick={() => setRemoveTarget(service)}
                  className="min-h-10 justify-self-start rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive sm:justify-self-auto"
                >
                  Remove
                </button>
              </div>
              {service.allDay && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Full-day service: customers pick a date, and one booking takes the whole working
                  day.
                </p>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {/* Opening hours */}
      <Panel className="p-5">
        <SectionHeader
          title="Opening hours"
          sub="Customers can only book inside these hours."
          action={
            <button
              disabled={saving}
              onClick={saveAvailabilityRows}
              className="btn-solid px-3.5 py-2 text-xs"
            >
              Save
            </button>
          }
        />
        <div className="overflow-hidden rounded-xl border border-border">
          {availability
            .slice()
            .sort((a, b) => sortDay(a.dayOfWeek) - sortDay(b.dayOfWeek))
            .map((entry, index, arr) => (
              <div
                key={entry.id}
                className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
                  index < arr.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <span className="min-w-[44px] text-[13px] font-medium text-foreground">
                  {DAY_LABELS[entry.dayOfWeek]}
                </span>
                <button
                  onClick={() =>
                    patchAvailability(
                      entry.dayOfWeek,
                      { isOpen: !entry.isOpen },
                      availability,
                      setAvailability,
                    )
                  }
                  aria-pressed={entry.isOpen}
                  aria-label={`${DAY_LABELS[entry.dayOfWeek]} — ${entry.isOpen ? "open" : "closed"}`}
                  className={`min-h-9 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    entry.isOpen
                      ? "bg-success-soft text-success"
                      : "bg-surface-2 text-muted-foreground"
                  }`}
                >
                  {entry.isOpen ? "Open" : "Closed"}
                </button>
                {entry.isOpen && (
                  <div className="ml-auto flex items-center gap-1.5">
                    <input
                      value={entry.opensAt}
                      aria-label={`${DAY_LABELS[entry.dayOfWeek]} opening time`}
                      onChange={(event) =>
                        patchAvailability(
                          entry.dayOfWeek,
                          { opensAt: event.target.value },
                          availability,
                          setAvailability,
                        )
                      }
                      type="time"
                      className="rounded-lg border border-border bg-white px-2 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <input
                      value={entry.closesAt}
                      aria-label={`${DAY_LABELS[entry.dayOfWeek]} closing time`}
                      onChange={(event) =>
                        patchAvailability(
                          entry.dayOfWeek,
                          { closesAt: event.target.value },
                          availability,
                          setAvailability,
                        )
                      }
                      type="time"
                      className="rounded-lg border border-border bg-white px-2 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                )}
              </div>
            ))}
        </div>
      </Panel>

      {/* Sign-in & security */}
      <Panel className="p-5">
        <SectionHeader title="Sign-in & security" sub="Google login and password settings." />

        {/* Google row */}
        <div className="mb-4 rounded-xl border border-border bg-surface px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-bold text-foreground">Google account</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {data.owner?.googleLinked
                  ? `Connected${data.owner.googleEmail ? ` as ${data.owner.googleEmail}` : ""}`
                  : "Use Google for faster sign-in without changing billing."}
              </div>
            </div>
            {data.owner?.googleLinked ? (
              data.owner.passwordLoginEnabled ? (
                <button
                  onClick={() => void disconnectGoogle()}
                  className="btn-frame px-3 py-2 text-xs"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => setShowSetPw(true)}
                  className="btn-frame px-3 py-2 text-xs"
                  title="Set an email/password login first, then you can disconnect Google"
                >
                  Set password to disconnect
                </button>
              )
            ) : (
              <a
                href="/api/auth/google/start?mode=link&redirectTo=/dashboard/settings"
                className="btn-frame-primary px-3 py-2 text-xs"
              >
                Connect Google
              </a>
            )}
          </div>
        </div>

        {/* Password row */}
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-bold text-foreground">Email / password</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {data.owner?.passwordLoginEnabled
                  ? "Password login is active. You can update it below."
                  : "No password set — you sign in with Google only."}
              </div>
            </div>
            <button
              onClick={() => setShowSetPw((v) => !v)}
              className="btn-frame px-3 py-2 text-xs"
            >
              {data.owner?.passwordLoginEnabled ? "Change password" : "Set password"}
            </button>
          </div>
          {showSetPw && (
            <form onSubmit={(e) => void handleSetPassword(e)} className="mt-4 flex flex-col gap-3">
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="New password (min 8 characters)"
                minLength={8}
                required
                autoFocus
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={settingPw}
                  className="btn-solid px-4 py-2 text-sm disabled:opacity-60"
                >
                  {settingPw ? "Saving…" : "Save password"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowSetPw(false); setNewPw(""); }}
                  className="btn-frame px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </Panel>

      {/* Account */}
      <Panel className="p-5">
        <SectionHeader title="Account" sub="Session and account controls." />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void signOut()} className="btn-frame">
            Sign out
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="rounded-[10px] border border-destructive/30 bg-destructive-soft px-4 py-2.5 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive hover:text-white"
          >
            Delete account
          </button>
        </div>
      </Panel>

      {removeTarget && (
        <ConfirmDialog
          title={`Remove "${removeTarget.name || "this service"}"?`}
          body="Customers will no longer be able to book it. Existing bookings keep their details."
          confirmLabel="Remove service"
          onCancel={() => setRemoveTarget(null)}
          onConfirm={() => void confirmRemoveService()}
        />
      )}

      {showDelete && (
        <ConfirmDialog
          title="Delete your account?"
          body="This permanently deletes your business, services, bookings and message history. This cannot be undone."
          confirmLabel="Delete everything"
          onCancel={() => setShowDelete(false)}
          onConfirm={() => void confirmDeleteAccount()}
        />
      )}
    </div>
  );
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div id="confirm-dialog-title" className="text-[15px] font-bold text-foreground">
          {title}
        </div>
        <p className="mt-1.5 text-[13px] text-muted-foreground">{body}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button ref={cancelRef} onClick={onCancel} className="btn-frame">
            Keep it
          </button>
          <button
            onClick={onConfirm}
            className="rounded-[10px] border border-destructive/30 bg-destructive-soft px-3 py-2 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive hover:text-white"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div>
        <div className="text-[15px] font-bold text-foreground">{title}</div>
        {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="skeleton h-7 w-36" />
        <div className="skeleton h-4 w-64 max-w-full" />
      </div>
      <div className="skeleton h-24 w-full rounded-xl" />
      {[0, 1, 2].map((panel) => (
        <div key={panel} className="rounded-2xl border border-border bg-card p-5">
          <div className="skeleton mb-4 h-5 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="skeleton h-11" />
            <div className="skeleton h-11" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="kicker mb-1.5 block" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input-field"
      />
    </div>
  );
}

function replaceService(
  index: number,
  service: Service,
  services: Service[],
  setServices: (services: Service[]) => void,
) {
  const next = [...services];
  next[index] = service;
  setServices(next);
}

function patchAvailability(
  dayOfWeek: number,
  patch: Partial<Availability>,
  availability: Availability[],
  setAvailability: (availability: Availability[]) => void,
) {
  setAvailability(
    availability.map((entry) => (entry.dayOfWeek === dayOfWeek ? { ...entry, ...patch } : entry)),
  );
}

function sortDay(dayOfWeek: number) {
  return dayOfWeek === 0 ? 7 : dayOfWeek;
}
