import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Kicker, Panel } from "@/components/reservly/AppShell";
import {
  createService,
  deleteService,
  getDashboardData,
  updateAvailability,
  updateBusiness,
  updateService,
} from "@/lib/reservly/data";
import { getSiteUrl } from "@/lib/reservly/env";
import type {
  Availability,
  BookingLanguage,
  Business,
  DashboardData,
  Service,
} from "@/lib/reservly/types";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsTab,
});

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LANGS: BookingLanguage[] = ["English", "Francais", "Both"];

function SettingsTab() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const next = await getDashboardData();
    setData(next);
    setBusiness(next.business);
    setServices(next.services);
    setAvailability(next.availability);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function saveProfile() {
    if (!business) return;
    setSaving(true);
    try {
      await updateBusiness({
        id: business.id,
        name: business.name,
        category: business.category,
        city: business.city,
        whatsappNumber: business.whatsappNumber,
        bookingPageLanguage: business.bookingPageLanguage,
      });
      setMessage("Profile saved.");
      await refresh();
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
              })
            : updateService({
                id: service.id,
                businessId: business.id,
                name: service.name,
                durationMinutes: service.durationMinutes,
                priceLabel: service.priceLabel,
                active: service.active,
              }),
        ),
      );
      setMessage("Services saved.");
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function saveAvailability() {
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
      setMessage("Availability saved.");
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function removeService(service: Service) {
    if (service.id.startsWith("new_")) {
      setServices(services.filter((entry) => entry.id !== service.id));
      return;
    }
    await deleteService(service.id);
    await refresh();
  }

  if (!data || !business)
    return <Panel className="p-8 text-sm text-muted-foreground">Loading settings...</Panel>;

  const bookingLink = `${getSiteUrl()}/b/${business.slug}`;
  const usageLabel = data.usage.limit
    ? `${data.usage.used} / ${data.usage.limit} bookings used`
    : "Unlimited bookings";
  const usagePercent = data.usage.limit
    ? Math.min(100, (data.usage.used / data.usage.limit) * 100)
    : 100;

  return (
    <div className="space-y-8">
      <div>
        <Kicker>Account - Plan - Profile</Kicker>
        <h1 className="mt-4 font-serif text-4xl text-foreground sm:text-5xl">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage the business profile, services, availability, and plan.
        </p>
      </div>

      {message && (
        <div className="border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          {message}
        </div>
      )}

      <Panel className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="kicker text-accent">Current plan</div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-display text-3xl font-light tracking-[0.05em] text-foreground">
              {business.plan}
            </span>
            <span className="text-xs text-muted-foreground">{usageLabel} this month</span>
          </div>
          <div className="mt-3 h-1 w-full max-w-xs bg-muted">
            <div className="h-full bg-accent" style={{ width: `${usagePercent}%` }} />
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-frame">Pro</button>
          <button className="btn-solid">Studio</button>
        </div>
      </Panel>

      <Panel className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <Kicker tone="accent">Business profile</Kicker>
          <button disabled={saving} onClick={saveProfile} className="btn-frame-primary">
            Save
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Business name"
            value={business.name}
            onChange={(value) => setBusiness({ ...business, name: value })}
          />
          <Field
            label="City"
            value={business.city}
            onChange={(value) => setBusiness({ ...business, city: value })}
          />
          <Field
            label="Category"
            value={business.category}
            onChange={(value) => setBusiness({ ...business, category: value })}
          />
          <Field
            label="WhatsApp"
            value={business.whatsappNumber}
            onChange={(value) => setBusiness({ ...business, whatsappNumber: value })}
          />
          <div>
            <div className="kicker">Language</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {LANGS.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setBusiness({ ...business, bookingPageLanguage: lang })}
                  className={`border px-3 py-2 font-display text-xs tracking-[0.18em] uppercase ${
                    business.bookingPageLanguage === lang
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border-strong text-muted-foreground hover:border-accent"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="kicker">Public link</div>
            <div className="mt-3 flex items-center gap-3 border border-border-strong px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                {bookingLink}
              </span>
              <Link
                to="/b/$slug"
                params={{ slug: business.slug }}
                className="font-display text-[10px] tracking-[0.25em] uppercase text-accent"
              >
                Open
              </Link>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <Kicker tone="accent">Services</Kicker>
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
                  },
                ])
              }
              className="btn-frame"
            >
              Add
            </button>
            <button disabled={saving} onClick={saveServices} className="btn-frame-primary">
              Save
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {services.map((service, index) => (
            <div
              key={service.id}
              className="grid gap-3 border border-border-strong p-4 sm:grid-cols-[1fr_120px_120px_auto]"
            >
              <input
                value={service.name}
                onChange={(event) =>
                  replaceService(
                    index,
                    { ...service, name: event.target.value },
                    services,
                    setServices,
                  )
                }
                placeholder="Service name"
                className="bg-transparent text-sm text-foreground focus:outline-none"
              />
              <input
                value={service.durationMinutes}
                onChange={(event) =>
                  replaceService(
                    index,
                    { ...service, durationMinutes: Number(event.target.value) },
                    services,
                    setServices,
                  )
                }
                type="number"
                min={15}
                step={15}
                className="bg-transparent text-sm text-foreground focus:outline-none"
              />
              <input
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
                className="bg-transparent text-sm text-foreground focus:outline-none"
              />
              <button
                onClick={() => void removeService(service)}
                className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground hover:text-destructive"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <Kicker tone="accent">Availability</Kicker>
          <button disabled={saving} onClick={saveAvailability} className="btn-frame-primary">
            Save
          </button>
        </div>
        <div className="divide-y divide-border border border-border-strong">
          {availability
            .slice()
            .sort((a, b) => sortDay(a.dayOfWeek) - sortDay(b.dayOfWeek))
            .map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-[56px_1fr] gap-3 px-4 py-3 sm:grid-cols-[72px_100px_1fr] sm:items-center"
              >
                <div className="font-display text-sm tracking-[0.15em] uppercase text-foreground">
                  {DAY_LABELS[entry.dayOfWeek]}
                </div>
                <button
                  onClick={() =>
                    patchAvailability(
                      entry.dayOfWeek,
                      { isOpen: !entry.isOpen },
                      availability,
                      setAvailability,
                    )
                  }
                  className={`w-fit border px-2 py-1 font-display text-[10px] tracking-[0.2em] uppercase ${
                    entry.isOpen
                      ? "border-success/40 text-success"
                      : "border-border-strong text-muted-foreground"
                  }`}
                >
                  {entry.isOpen ? "Open" : "Closed"}
                </button>
                <div className="col-span-2 flex gap-2 sm:col-span-1">
                  <input
                    value={entry.opensAt}
                    disabled={!entry.isOpen}
                    onChange={(event) =>
                      patchAvailability(
                        entry.dayOfWeek,
                        { opensAt: event.target.value },
                        availability,
                        setAvailability,
                      )
                    }
                    type="time"
                    className="border border-border-strong bg-card px-2 py-1 text-sm text-foreground disabled:opacity-40"
                  />
                  <input
                    value={entry.closesAt}
                    disabled={!entry.isOpen}
                    onChange={(event) =>
                      patchAvailability(
                        entry.dayOfWeek,
                        { closesAt: event.target.value },
                        availability,
                        setAvailability,
                      )
                    }
                    type="time"
                    className="border border-border-strong bg-card px-2 py-1 text-sm text-foreground disabled:opacity-40"
                  />
                </div>
              </div>
            ))}
        </div>
      </Panel>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block border-b border-border-strong">
      <span className="kicker">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent py-3 text-base text-foreground focus:outline-none"
      />
    </label>
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
