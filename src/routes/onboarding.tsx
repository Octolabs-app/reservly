import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Page, Panel, SiteHeader } from "@/components/randevou/AppShell";
import { getCurrentOwner } from "@/lib/cf/auth";
import { createBusiness, createService, updateAvailability } from "@/lib/cf/client-data";
import { getSiteUrl } from "@/lib/randevou/env";
import { normalizeWhatsAppNumber, validateWhatsAppNumber } from "@/lib/randevou/phone";
import type { BookingLanguage } from "@/lib/randevou/types";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your business — Randevou" },
      {
        name: "description",
        content:
          "Three steps to get your Randevou booking link live: business info, services, opening hours.",
      },
    ],
  }),
  component: OnboardingPage,
});

const CATEGORIES = [
  { label: "Beauty", icon: "💇" },
  { label: "Health", icon: "🏥" },
  { label: "Fitness", icon: "🏋️" },
  { label: "Tutor", icon: "📚" },
  { label: "Home", icon: "🔧" },
  { label: "Hospitality", icon: "🏨" },
  { label: "Other", icon: "⭐" },
];
const LANGS: BookingLanguage[] = ["English", "Francais", "Both"];
const DURATIONS = [15, 30, 45, 60, 90, 120];
const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2)
    .toString()
    .padStart(2, "0");
  const minutes = index % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});
const DAYS = [
  { label: "Monday", dayOfWeek: 1 },
  { label: "Tuesday", dayOfWeek: 2 },
  { label: "Wednesday", dayOfWeek: 3 },
  { label: "Thursday", dayOfWeek: 4 },
  { label: "Friday", dayOfWeek: 5 },
  { label: "Saturday", dayOfWeek: 6 },
  { label: "Sunday", dayOfWeek: 0 },
];

type ServiceDraft = {
  name: string;
  durationMinutes: number;
  priceLabel: string;
  allDay: boolean;
  customDuration: boolean;
};
type HourDraft = {
  label: string;
  dayOfWeek: number;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
};

function slugPreview(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "your-business"
  );
}

function newServiceDraft(): ServiceDraft {
  return { name: "", durationMinutes: 45, priceLabel: "", allDay: false, customDuration: false };
}

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biz, setBiz] = useState({
    name: "",
    category: "",
    city: "",
    whatsappNumber: "+230",
    lang: "Both" as BookingLanguage,
  });
  const [services, setServices] = useState<ServiceDraft[]>([newServiceDraft()]);
  const [hours, setHours] = useState<HourDraft[]>(
    DAYS.map((day) => ({
      ...day,
      isOpen: day.dayOfWeek !== 0,
      opensAt: "09:00",
      closesAt: day.dayOfWeek === 6 ? "15:00" : "18:00",
    })),
  );

  useEffect(() => {
    getCurrentOwner()
      .then((owner) => setNeedsAuth(!owner))
      .finally(() => setCheckingAuth(false));
  }, []);

  const stepNames = ["Your business", "Your services", "Opening hours"];
  const validServices = services.filter((service) => service.name.trim());
  const ownerPhoneIssue =
    biz.whatsappNumber.trim() && biz.whatsappNumber.trim() !== "+230"
      ? validateWhatsAppNumber(biz.whatsappNumber)
      : null;
  const canNext1 = biz.name.trim() && biz.category && !ownerPhoneIssue;
  const canNext2 = validServices.length > 0;
  const siteHost = getSiteUrl().replace(/^https?:\/\//, "");

  async function finish() {
    const owner = await getCurrentOwner();
    if (!owner) {
      window.location.href = "/auth?redirectTo=/onboarding";
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const business = await createBusiness({
        name: biz.name,
        category: biz.category,
        city: biz.city,
        whatsappNumber:
          biz.whatsappNumber.trim() === "+230" ? "" : normalizeWhatsAppNumber(biz.whatsappNumber),
        bookingPageLanguage: biz.lang,
      });

      await Promise.all(
        validServices.map((service) =>
          createService({
            businessId: business.id,
            name: service.name,
            durationMinutes: service.durationMinutes,
            priceLabel: service.priceLabel,
            allDay: service.allDay,
          }),
        ),
      );

      await updateAvailability({
        businessId: business.id,
        days: hours.map((hour) => ({
          dayOfWeek: hour.dayOfWeek,
          isOpen: hour.isOpen,
          opensAt: hour.opensAt,
          closesAt: hour.closesAt,
        })),
      });

      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onboarding failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingAuth) {
    return (
      <>
        <SiteHeader />
        <Page width="sm">
          <OnboardingSkeleton />
        </Page>
      </>
    );
  }

  if (needsAuth) {
    return (
      <>
        <SiteHeader />
        <Page width="sm">
          <Panel className="overflow-hidden">
            <div className="bg-primary px-6 py-5">
              <div className="text-[15px] font-bold text-white">One quick step first</div>
              <div className="mt-0.5 text-xs text-white/70">
                Your booking page is saved to your owner account.
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Create a free account (or sign in) so Randevou can save your business, services, hours
                and booking link.
              </p>
              <a href="/auth?redirectTo=/onboarding" className="btn-solid mt-5 w-full py-3">
                Sign in or create account →
              </a>
            </div>
          </Panel>
        </Page>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <Page width="sm">
        <Panel className="overflow-hidden">
          {/* Header band */}
          <div className="bg-primary px-6 pb-4 pt-5">
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/70">
                Step {step} of 3 — {stepNames[step - 1]}
              </div>
              <Link to="/" className="text-xs text-white/50 hover:text-white">
                Cancel
              </Link>
            </div>
            <div className="mt-3 flex gap-1.5">
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    idx <= step ? "bg-white" : "bg-white/25"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-7">
            {step === 1 && (
              <div className="space-y-5">
                <header>
                  <h1 className="text-lg font-bold text-foreground">Tell us about your business</h1>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    This is what customers see on your booking page.
                  </p>
                </header>

                <div>
                  <label className="kicker mb-1.5 block" htmlFor="ob-name">
                    Business name *
                  </label>
                  <input
                    id="ob-name"
                    value={biz.name}
                    onChange={(event) => setBiz({ ...biz, name: event.target.value })}
                    placeholder="e.g. Salon Rose"
                    className="input-field"
                  />
                  {biz.name && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-primary-mid bg-primary-soft px-3 py-2">
                      <span className="text-[11px] text-muted-foreground">Your link:</span>
                      <span className="font-mono text-xs font-semibold text-primary">
                        {siteHost}/b/{slugPreview(biz.name)}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="kicker mb-2">Category *</div>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((category) => (
                      <Chip
                        key={category.label}
                        active={biz.category === category.label}
                        onClick={() => setBiz({ ...biz, category: category.label })}
                      >
                        <span>{category.icon}</span> {category.label}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="kicker mb-1.5 block" htmlFor="ob-city">
                    City
                  </label>
                  <input
                    id="ob-city"
                    value={biz.city}
                    onChange={(event) => setBiz({ ...biz, city: event.target.value })}
                    placeholder="Port Louis, Quatre Bornes, Curepipe…"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="kicker mb-1.5 block" htmlFor="ob-whatsapp">
                    Your WhatsApp number
                  </label>
                  <input
                    id="ob-whatsapp"
                    value={biz.whatsappNumber}
                    onChange={(event) => setBiz({ ...biz, whatsappNumber: event.target.value })}
                    onBlur={() => {
                      const normalized = normalizeWhatsAppNumber(biz.whatsappNumber);
                      if (!validateWhatsAppNumber(normalized)) {
                        setBiz({ ...biz, whatsappNumber: normalized });
                      }
                    }}
                    inputMode="tel"
                    placeholder="+230 5700 0000"
                    className="input-field"
                  />
                  <p
                    className={`mt-1 text-[11px] ${
                      ownerPhoneIssue ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {ownerPhoneIssue ?? "You'll get a WhatsApp alert for every new booking."}
                  </p>
                </div>

                <div>
                  <div className="kicker mb-2">Booking page language</div>
                  <div className="grid grid-cols-3 gap-2">
                    {LANGS.map((lang) => (
                      <Chip
                        key={lang}
                        active={biz.lang === lang}
                        onClick={() => setBiz({ ...biz, lang })}
                        full
                      >
                        {lang === "Francais" ? "Français" : lang}
                      </Chip>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    "Both" sends confirmations in English and French.
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <header>
                  <h1 className="text-lg font-bold text-foreground">Add your services</h1>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Slot times follow each service's duration automatically.
                  </p>
                </header>

                {services.map((service, index) => (
                  <div key={index} className="rounded-xl border border-border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="kicker">Service {index + 1}</span>
                      {services.length > 1 && (
                        <button
                          onClick={() => setServices(services.filter((_, idx) => idx !== index))}
                          className="text-xs font-medium text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      value={service.name}
                      aria-label={`Service ${index + 1} name`}
                      onChange={(event) =>
                        patchService(index, { name: event.target.value }, services, setServices)
                      }
                      placeholder="e.g. Haircut, Physio session, 1h tutoring…"
                      className="input-field"
                    />
                    <div className="mt-3">
                      <div className="kicker mb-2">Service duration</div>
                      <div className="flex flex-wrap gap-1.5">
                        {DURATIONS.map((duration) => (
                          <Chip
                            key={duration}
                            size="sm"
                            active={
                              !service.allDay &&
                              !service.customDuration &&
                              service.durationMinutes === duration
                            }
                            onClick={() =>
                              patchService(
                                index,
                                { durationMinutes: duration, allDay: false, customDuration: false },
                                services,
                                setServices,
                              )
                            }
                          >
                            {duration >= 60
                              ? `${duration / 60}h${duration % 60 ? ` ${duration % 60}m` : ""}`
                              : `${duration} min`}
                          </Chip>
                        ))}
                        <Chip
                          size="sm"
                          active={service.allDay}
                          onClick={() =>
                            patchService(
                              index,
                              { allDay: true, customDuration: false, durationMinutes: 480 },
                              services,
                              setServices,
                            )
                          }
                        >
                          Full day
                        </Chip>
                        <Chip
                          size="sm"
                          active={service.customDuration && !service.allDay}
                          onClick={() =>
                            patchService(
                              index,
                              { customDuration: true, allDay: false },
                              services,
                              setServices,
                            )
                          }
                        >
                          Custom
                        </Chip>
                      </div>
                      {service.customDuration && !service.allDay && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="number"
                            min={5}
                            step={5}
                            aria-label={`Service ${index + 1} duration in minutes`}
                            value={service.durationMinutes}
                            onChange={(event) =>
                              patchService(
                                index,
                                { durationMinutes: Math.max(5, Number(event.target.value) || 5) },
                                services,
                                setServices,
                              )
                            }
                            className="input-field w-28"
                          />
                          <span className="text-[13px] text-muted-foreground">minutes</span>
                        </div>
                      )}
                      {service.allDay && (
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          One booking takes the whole working day — customers pick a date, not a
                          time.
                        </p>
                      )}
                    </div>
                    <div className="mt-3">
                      <label className="kicker mb-1.5 block" htmlFor={`ob-price-${index}`}>
                        Price (optional)
                      </label>
                      <input
                        id={`ob-price-${index}`}
                        value={service.priceLabel}
                        onChange={(event) =>
                          patchService(
                            index,
                            { priceLabel: event.target.value },
                            services,
                            setServices,
                          )
                        }
                        placeholder="Rs 350"
                        className="input-field"
                      />
                    </div>
                  </div>
                ))}

                {services.length < 5 && (
                  <button
                    onClick={() => setServices([...services, newServiceDraft()])}
                    className="btn-frame-primary w-full"
                  >
                    + Add another service
                  </button>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <header>
                  <h1 className="text-lg font-bold text-foreground">Set your opening hours</h1>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Customers can only book slots during these hours.
                  </p>
                </header>

                <div className="overflow-hidden rounded-xl border border-border">
                  {hours.map((hour, index) => (
                    <div
                      key={hour.dayOfWeek}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        index < hours.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <Toggle
                        on={hour.isOpen}
                        label={`${hour.label} — ${hour.isOpen ? "open" : "closed"}`}
                        onChange={() => {
                          const next = [...hours];
                          next[index] = { ...next[index], isOpen: !next[index].isOpen };
                          setHours(next);
                        }}
                      />
                      <span
                        className={`min-w-[88px] text-[13px] ${
                          hour.isOpen ? "font-medium text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {hour.label}
                      </span>
                      {hour.isOpen ? (
                        <div className="ml-auto flex items-center gap-1.5">
                          <TimeSelect
                            value={hour.opensAt}
                            options={TIME_OPTIONS}
                            label={`${hour.label} opening time`}
                            onChange={(value) => {
                              const next = [...hours];
                              next[index] = { ...next[index], opensAt: value };
                              setHours(next);
                            }}
                          />
                          <span className="text-xs text-muted-foreground">–</span>
                          <TimeSelect
                            value={hour.closesAt}
                            options={TIME_OPTIONS}
                            label={`${hour.label} closing time`}
                            onChange={(value) => {
                              const next = [...hours];
                              next[index] = { ...next[index], closesAt: value };
                              setHours(next);
                            }}
                          />
                        </div>
                      ) : (
                        <span className="ml-auto text-xs text-muted-foreground">Closed</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-wa/30 bg-wa-soft px-3.5 py-2.5 text-xs text-success">
                  💬 After you go live, customers get a WhatsApp confirmation within seconds of
                  booking.
                </div>
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-lg border border-destructive/25 bg-destructive-soft px-3.5 py-2.5 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="mt-7 flex items-center justify-between gap-3">
              {step > 1 ? (
                <button onClick={() => setStep(step - 1)} className="btn-frame">
                  ← Back
                </button>
              ) : (
                <span />
              )}
              <button
                disabled={submitting || (step === 1 ? !canNext1 : step === 2 ? !canNext2 : false)}
                onClick={() => {
                  if (step < 3) setStep(step + 1);
                  else void finish();
                }}
                className={step === 3 ? "btn-accent" : "btn-solid"}
              >
                {submitting ? "Saving…" : step === 3 ? "Go live 🚀" : "Continue →"}
              </button>
            </div>
          </div>
        </Panel>
      </Page>
    </>
  );
}

function patchService(
  index: number,
  patch: Partial<ServiceDraft>,
  services: ServiceDraft[],
  setServices: (services: ServiceDraft[]) => void,
) {
  const next = [...services];
  next[index] = { ...next[index], ...patch };
  setServices(next);
}

function OnboardingSkeleton() {
  return (
    <Panel className="overflow-hidden">
      <div className="bg-primary/20 px-6 py-6">
        <div className="skeleton h-3 w-40" />
        <div className="mt-3 flex gap-1.5">
          {[0, 1, 2].map((item) => (
            <div key={item} className="skeleton h-1 flex-1" />
          ))}
        </div>
      </div>
      <div className="space-y-4 p-6">
        <div className="skeleton h-6 w-56" />
        <div className="skeleton h-4 w-72 max-w-full" />
        <div className="skeleton h-11 w-full" />
        <div className="skeleton h-11 w-full" />
        <div className="skeleton h-11 w-full" />
      </div>
    </Panel>
  );
}

function Chip({
  children,
  active,
  onClick,
  full,
  size = "md",
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  full?: boolean;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-[13px]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full transition-all ${pad} ${
        full ? "w-full" : ""
      } ${
        active
          ? "border-[1.5px] border-primary bg-primary-soft font-semibold text-primary"
          : "border-[1.5px] border-border bg-white text-muted-foreground hover:border-primary-mid hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        on ? "bg-primary" : "bg-border-strong"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function TimeSelect({
  value,
  options,
  label,
  onChange,
}: {
  value: string;
  options: string[];
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-lg border border-border bg-white px-2 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
