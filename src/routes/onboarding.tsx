import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Kicker, Page, Panel, SiteHeader } from "@/components/reservly/AppShell";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your business — Reservly" },
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
const LANGS = ["English", "Français", "Both"];
const DURATIONS = ["15", "30", "45", "60", "90", "120"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Service = { name: string; duration: string; price: string };
type Hour = { day: string; open: boolean; from: string; to: string };

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [biz, setBiz] = useState({ name: "", category: "", city: "", lang: "Both" });
  const [services, setServices] = useState<Service[]>([{ name: "", duration: "45", price: "" }]);
  const [hours, setHours] = useState<Hour[]>(
    DAYS.map((d, i) => ({ day: d, open: i < 6, from: "09:00", to: "18:00" })),
  );

  const stepNames = ["Business", "Services", "Hours"];
  const canNext1 = biz.name && biz.category;
  const canNext2 = services[0].name;

  return (
    <>
      <SiteHeader />
      <Page width="md">
        <div className="mb-8 flex items-center justify-between">
          <Kicker tone="accent">Setup &middot; Step {step} of 3</Kicker>
          <Link to="/" className="font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-accent">
            &larr; Cancel
          </Link>
        </div>

        {/* Progress rail */}
        <div className="mb-10 grid grid-cols-3 gap-2">
          {stepNames.map((s, i) => {
            const idx = i + 1;
            const active = idx === step;
            const done = idx < step;
            return (
              <button
                key={s}
                onClick={() => idx < step && setStep(idx)}
                className="text-left"
              >
                <div
                  className={`h-px ${
                    active || done ? "bg-accent" : "bg-border-strong"
                  }`}
                />
                <div
                  className={`mt-3 font-display text-[10px] tracking-[0.3em] uppercase ${
                    active ? "text-accent" : done ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  0{idx} &middot; {s}
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
                  This is what your customers see on the booking page.
                </p>
              </header>

              <Field label="Business name">
                <input
                  value={biz.name}
                  onChange={(e) => setBiz({ ...biz, name: e.target.value })}
                  placeholder="e.g. Salon Rose"
                  className="w-full bg-transparent py-3 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                />
              </Field>

              <div>
                <Label>Category</Label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <Chip
                      key={c}
                      active={biz.category === c}
                      onClick={() => setBiz({ ...biz, category: c })}
                    >
                      {c}
                    </Chip>
                  ))}
                </div>
              </div>

              <Field label="City">
                <input
                  value={biz.city}
                  onChange={(e) => setBiz({ ...biz, city: e.target.value })}
                  placeholder="Port Louis, Quatre Bornes…"
                  className="w-full bg-transparent py-3 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                />
              </Field>

              <div>
                <Label>Booking page language</Label>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {LANGS.map((l) => (
                    <Chip
                      key={l}
                      active={biz.lang === l}
                      onClick={() => setBiz({ ...biz, lang: l })}
                      full
                    >
                      {l}
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
                  Free plan supports one service. Pro unlocks up to five.
                </p>
              </header>

              <div className="space-y-4">
                {services.map((s, i) => (
                  <div key={i} className="border border-border-strong p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="kicker">Service {i + 1}</span>
                      {services.length > 1 && (
                        <button
                          onClick={() => setServices(services.filter((_, idx) => idx !== i))}
                          className="font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-destructive"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <Field label="Name">
                      <input
                        value={s.name}
                        onChange={(e) => {
                          const n = [...services];
                          n[i] = { ...n[i], name: e.target.value };
                          setServices(n);
                        }}
                        placeholder="e.g. Haircut, Physio session"
                        className="w-full bg-transparent py-2.5 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                      />
                    </Field>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <Label>Duration</Label>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {DURATIONS.map((d) => (
                            <Chip
                              key={d}
                              size="sm"
                              active={s.duration === d}
                              onClick={() => {
                                const n = [...services];
                                n[i] = { ...n[i], duration: d };
                                setServices(n);
                              }}
                            >
                              {d}m
                            </Chip>
                          ))}
                        </div>
                      </div>
                      <Field label="Price (opt.)">
                        <input
                          value={s.price}
                          onChange={(e) => {
                            const n = [...services];
                            n[i] = { ...n[i], price: e.target.value };
                            setServices(n);
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
                    setServices([...services, { name: "", duration: "45", price: "" }])
                  }
                  className="btn-frame w-full"
                >
                  + Add another service
                </button>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <header>
                <h1 className="font-serif text-3xl text-foreground">Set your opening hours</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Toggle days on or off, and set your daily window.
                </p>
              </header>

              <div className="divide-y divide-border border border-border-strong">
                {hours.map((h, i) => (
                  <div key={h.day} className="flex items-center gap-4 px-5 py-4">
                    <Toggle
                      on={h.open}
                      onChange={() => {
                        const n = [...hours];
                        n[i] = { ...n[i], open: !n[i].open };
                        setHours(n);
                      }}
                    />
                    <span
                      className={`min-w-[60px] font-display text-sm tracking-[0.15em] uppercase ${
                        h.open ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {h.day}
                    </span>
                    {h.open ? (
                      <div className="ml-auto flex items-center gap-2">
                        <TimeSelect
                          value={h.from}
                          options={["07:00", "08:00", "09:00", "10:00", "11:00"]}
                          onChange={(v) => {
                            const n = [...hours];
                            n[i] = { ...n[i], from: v };
                            setHours(n);
                          }}
                        />
                        <span className="text-muted-foreground">&ndash;</span>
                        <TimeSelect
                          value={h.to}
                          options={["16:00", "17:00", "18:00", "19:00", "20:00"]}
                          onChange={(v) => {
                            const n = [...hours];
                            n[i] = { ...n[i], to: v };
                            setHours(n);
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

          {/* Footer nav */}
          <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="btn-frame">
                &larr; Back
              </button>
            ) : (
              <span />
            )}
            <button
              disabled={step === 1 ? !canNext1 : step === 2 ? !canNext2 : false}
              onClick={() => {
                if (step < 3) setStep(step + 1);
                else navigate({ to: "/dashboard" });
              }}
              className="btn-solid"
            >
              {step === 3 ? "Open dashboard" : "Continue"} &rarr;
            </button>
          </div>
        </Panel>
      </Page>
    </>
  );
}

/* ─── Local primitives ─────────────────────────────────────────────── */
function Label({ children }: { children: React.ReactNode }) {
  return <div className="kicker">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border-strong">
      <Label>{label}</Label>
      {children}
    </div>
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
      onClick={onChange}
      className={`relative h-5 w-9 rounded-full transition-colors ${
        on ? "bg-primary" : "bg-muted"
      }`}
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
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-border-strong bg-card px-2 py-1 font-display text-xs tracking-[0.1em] text-foreground focus:border-accent focus:outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o} className="bg-card">
          {o}
        </option>
      ))}
    </select>
  );
}
