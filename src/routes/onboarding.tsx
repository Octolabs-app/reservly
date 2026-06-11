import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Kicker, Page, Panel, SiteHeader } from "@/components/reservly/AppShell";
import { getCurrentOwner } from "@/lib/cf/auth";
import { createBusiness, createService, updateAvailability } from "@/lib/cf/client-data";
import type { BookingLanguage } from "@/lib/reservly/types";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your business - Reservly" },
      {
        name: "description",
        content:
          "Three steps to get your Reservly booking link live: business info, services, opening hours.",
      },
    ],
  }),
  component: OnboardingPage,
});

const CATEGORIES = ["Beauty", "Health", "Fitness", "Tutor", "Home", "Hospitality", "Other"];
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
  { label: "Mon", dayOfWeek: 1 },
  { label: "Tue", dayOfWeek: 2 },
  { label: "Wed", dayOfWeek: 3 },
  { label: "Thu", dayOfWeek: 4 },
  { label: "Fri", dayOfWeek: 5 },
  { label: "Sat", dayOfWeek: 6 },
  { label: "Sun", dayOfWeek: 0 },
];

type ServiceDraft = { name: string; durationMinutes: number; priceLabel: string };
type HourDraft = {
  label: string;
  dayOfWeek: number;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
};

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
  const [services, setServices] = useState<ServiceDraft[]>([
    { name: "", durationMinutes: 45, priceLabel: "" },
  ]);
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

  const stepNames = ["Business", "Services", "Hours"];
  const validServices = services.filter((service) => service.name.trim());
  const canNext1 = biz.name.trim() && biz.category;
  const canNext2 = validServices.length > 0;

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
        whatsappNumber: biz.whatsappNumber,
        bookingPageLanguage: biz.lang,
      });

      await Promise.all(
        validServices.map((service) =>
          createService({
            businessId: business.id,
            name: service.name,
            durationMinutes: service.durationMinutes,
            priceLabel: service.priceLabel,
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
        <Page width="md">
          <OnboardingAuthSkeleton />
        </Page>
      </>
    );
  }

  if (needsAuth) {
    return (
      <>
        <SiteHeader />
        <Page width="sm">
          <Panel className="p-8">
            <Kicker tone="accent">Owner sign-in required</Kicker>
            <h1 className="mt-4 font-serif text-4xl text-foreground">
              Sign in before setting up your booking page.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Reservly saves your business, services, hours, and booking link to your owner account.
            </p>
            <a href="/auth?redirectTo=/onboarding" className="btn-solid mt-6 inline-flex">
              Sign in or create account
            </a>
          </Panel>
        </Page>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <Page width="md">
        <div className="mb-8 flex items-center justify-between">
          <Kicker tone="accent">Setup - Step {step} of 3</Kicker>
          <Link
            to="/"
            className="font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-accent"
          >
            Cancel
          </Link>
        </div>

        <div className="mb-10 grid grid-cols-3 gap-2">
          {stepNames.map((name, index) => {
            const idx = index + 1;
            const active = idx === step;
            const done = idx < step;
            return (
              <button key={name} onClick={() => done && setStep(idx)} className="text-left">
                <div className={`h-px ${active || done ? "bg-accent" : "bg-border-strong"}`} />
                <div
                  className={`mt-3 font-display text-[10px] tracking-[0.3em] uppercase ${
                    active ? "text-accent" : done ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  0{idx} - {name}
                </div>
              </button>
            );
          })}
        </div>

        <Panel className="p-8 sm:p-10">
          {step === 1 && (
            <div className="space-y-7">
              <header>
                <h1 className="font-serif text-3xl text-foreground">Tell us about your business</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  This is what customers see on your booking page.
                </p>
              </header>

              <Field label="Business name">
                <input
                  value={biz.name}
                  onChange={(event) => setBiz({ ...biz, name: event.target.value })}
                  placeholder="Salon Rose"
                  className="w-full bg-transparent py-3 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                />
              </Field>

              <div>
                <Label>Category</Label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => (
                    <Chip
                      key={category}
                      active={biz.category === category}
                      onClick={() => setBiz({ ...biz, category })}
                    >
                      {category}
                    </Chip>
                  ))}
                </div>
              </div>

              <Field label="City">
                <input
                  value={biz.city}
                  onChange={(event) => setBiz({ ...biz, city: event.target.value })}
                  placeholder="Port Louis"
                  className="w-full bg-transparent py-3 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                />
              </Field>

              <Field label="WhatsApp number">
                <input
                  value={biz.whatsappNumber}
                  onChange={(event) => setBiz({ ...biz, whatsappNumber: event.target.value })}
                  placeholder="+23057000000"
                  className="w-full bg-transparent py-3 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                />
              </Field>

              <div>
                <Label>Booking page language</Label>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {LANGS.map((lang) => (
                    <Chip
                      key={lang}
                      active={biz.lang === lang}
                      onClick={() => setBiz({ ...biz, lang })}
                      full
                    >
                      {lang}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <header>
                <h1 className="font-serif text-3xl text-foreground">Add your services</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Each service gets real duration-aware booking slots.
                </p>
              </header>

              <div className="space-y-4">
                {services.map((service, index) => (
                  <div key={index} className="border border-border-strong p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="kicker">Service {index + 1}</span>
                      {services.length > 1 && (
                        <button
                          onClick={() => setServices(services.filter((_, idx) => idx !== index))}
                          className="font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-destructive"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <Field label="Name">
                      <input
                        value={service.name}
                        onChange={(event) => {
                          const next = [...services];
                          next[index] = { ...next[index], name: event.target.value };
                          setServices(next);
                        }}
                        placeholder="Haircut"
                        className="w-full bg-transparent py-2.5 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                      />
                    </Field>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <Label>Duration</Label>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {DURATIONS.map((duration) => (
                            <Chip
                              key={duration}
                              size="sm"
                              active={service.durationMinutes === duration}
                              onClick={() => {
                                const next = [...services];
                                next[index] = { ...next[index], durationMinutes: duration };
                                setServices(next);
                              }}
                            >
                              {duration}m
                            </Chip>
                          ))}
                        </div>
                      </div>
                      <Field label="Price">
                        <input
                          value={service.priceLabel}
                          onChange={(event) => {
                            const next = [...services];
                            next[index] = { ...next[index], priceLabel: event.target.value };
                            setServices(next);
                          }}
                          placeholder="Rs 350"
                          className="w-full bg-transparent py-2.5 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>

              {services.length < 5 && (
                <button
                  onClick={() =>
                    setServices([...services, { name: "", durationMinutes: 45, priceLabel: "" }])
                  }
                  className="btn-frame w-full"
                >
                  Add another service
                </button>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <header>
                <h1 className="font-serif text-3xl text-foreground">Set your opening hours</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  These hours drive the public booking slots.
                </p>
              </header>

              <div className="divide-y divide-border border border-border-strong">
                {hours.map((hour, index) => (
                  <div key={hour.dayOfWeek} className="flex items-center gap-4 px-5 py-4">
                    <Toggle
                      on={hour.isOpen}
                      onChange={() => {
                        const next = [...hours];
                        next[index] = { ...next[index], isOpen: !next[index].isOpen };
                        setHours(next);
                      }}
                    />
                    <span
                      className={`min-w-[60px] font-display text-sm tracking-[0.15em] uppercase ${
                        hour.isOpen ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {hour.label}
                    </span>
                    {hour.isOpen ? (
                      <div className="ml-auto flex items-center gap-2">
                        <TimeSelect
                          value={hour.opensAt}
                          options={TIME_OPTIONS}
                          onChange={(value) => {
                            const next = [...hours];
                            next[index] = { ...next[index], opensAt: value };
                            setHours(next);
                          }}
                        />
                        <span className="text-muted-foreground">to</span>
                        <TimeSelect
                          value={hour.closesAt}
                          options={TIME_OPTIONS}
                          onChange={(value) => {
                            const next = [...hours];
                            next[index] = { ...next[index], closesAt: value };
                            setHours(next);
                          }}
                        />
                      </div>
                    ) : (
                      <span className="ml-auto font-display text-[11px] tracking-[0.25em] uppercase text-muted-foreground">
                        Closed
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="btn-frame">
                Back
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
              className="btn-solid"
            >
              {submitting ? "Saving..." : step === 3 ? "Open dashboard" : "Continue"}
            </button>
          </div>
        </Panel>
      </Page>
    </>
  );
}

function OnboardingAuthSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="h-3 w-40 animate-pulse bg-muted" />
        <div className="h-3 w-20 animate-pulse bg-muted" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((item) => (
          <div key={item} className="space-y-3">
            <div className="h-px animate-pulse bg-muted" />
            <div className="h-3 w-24 animate-pulse bg-muted" />
          </div>
        ))}
      </div>
      <Panel className="p-8 sm:p-10">
        <div className="space-y-6">
          <div className="h-9 w-72 max-w-full animate-pulse bg-muted" />
          <div className="h-4 w-80 max-w-full animate-pulse bg-muted" />
          <div className="h-14 animate-pulse border-b border-border-strong bg-muted/30" />
          <div className="h-14 animate-pulse border-b border-border-strong bg-muted/30" />
        </div>
      </Panel>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="kicker">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block border-b border-border-strong">
      <Label>{label}</Label>
      {children}
    </label>
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
  const pad = size === "sm" ? "px-2.5 py-1.5 text-[11px]" : "px-3.5 py-2 text-xs";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-display tracking-[0.18em] uppercase transition-all ${pad} ${
        full ? "w-full" : ""
      } ${
        active
          ? "border border-primary bg-primary/15 text-primary"
          : "border border-border-strong text-muted-foreground hover:border-accent hover:text-accent"
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground shadow-sm transition-all ${
          on ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function TimeSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="border border-border-strong bg-card px-2 py-1 font-display text-xs tracking-[0.1em] text-foreground focus:border-accent focus:outline-none"
    >
      {options.map((option) => (
        <option key={option} value={option} className="bg-card">
          {option}
        </option>
      ))}
    </select>
  );
}
