import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Kicker, Page, Panel, SiteHeader } from "@/components/reservly/AppShell";
import { createBooking, getAvailableSlots, getPublicBusinessBySlug } from "@/lib/cf/client-data";
import { addDays, dateInputFromDate } from "@/lib/reservly/slots";
import type { BookingLanguage, PublicBusiness, Service, Slot } from "@/lib/reservly/types";

export const Route = createFileRoute("/b/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Book with ${params.slug.replace(/-/g, " ")} - Reservly` },
      {
        name: "description",
        content: "Pick a service and time. Confirmation arrives straight on WhatsApp.",
      },
    ],
  }),
  component: BookingPage,
});

function BookingPage() {
  const { slug } = Route.useParams();
  const [data, setData] = useState<PublicBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string>("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState<BookingLanguage>("Both");
  const [submitting, setSubmitting] = useState(false);

  const dates = useMemo(
    () =>
      Array.from({ length: 10 }, (_, index) => {
        const next = addDays(new Date(), index);
        return {
          value: dateInputFromDate(next),
          label: next.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
          }),
        };
      }),
    [],
  );

  useEffect(() => {
    setLoading(true);
    getPublicBusinessBySlug(slug)
      .then((result) => {
        setData(result);
        setServiceId(result?.services[0]?.id ?? "");
        setDate(dates[0]?.value ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Booking page failed to load."))
      .finally(() => setLoading(false));
  }, [slug, dates]);

  useEffect(() => {
    if (!data || !serviceId || !date) return;
    setSelectedSlot(null);
    getAvailableSlots(data.business.id, serviceId, date)
      .then(setSlots)
      .catch((err) => setError(err instanceof Error ? err.message : "Slots failed to load."));
  }, [data, serviceId, date]);

  const service = data?.services.find((entry) => entry.id === serviceId) ?? null;
  const phoneValidation = validateWhatsAppNumber(phone);
  const ready = Boolean(service && selectedSlot && name.trim().length > 1 && !phoneValidation);

  async function confirm() {
    if (!data || !service || !selectedSlot || !ready) return;
    setSubmitting(true);
    setError(null);
    try {
      const booking = await createBooking({
        businessId: data.business.id,
        serviceId: service.id,
        customerName: name,
        customerPhone: normalizeWhatsAppNumber(phone),
        customerLanguage: language,
        startAt: selectedSlot.startAt,
      });
      window.location.href = `/b/${data.business.slug}/confirmed?bookingId=${booking.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking could not be created.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <Page width="md">
        {loading && <BookingPageSkeleton />}

        {!loading && !data && (
          <Panel className="p-8">
            <Kicker tone="accent">Not found</Kicker>
            <h1 className="mt-4 font-serif text-4xl text-foreground">
              This booking page is unavailable.
            </h1>
          </Panel>
        )}

        {data && (
          <>
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <Kicker tone="accent">Booking - {service?.name ?? "Choose a service"}</Kicker>
                <h1 className="mt-4 font-serif text-4xl text-foreground sm:text-5xl">
                  {data.business.name}
                </h1>
                <div className="mt-2 font-display text-[11px] tracking-[0.3em] uppercase text-muted-foreground">
                  {data.business.category} - {data.business.city} - reservly.app/b/
                  {data.business.slug}
                </div>
              </div>
              <div className="hidden h-16 w-16 items-center justify-center border border-accent/40 text-2xl text-accent sm:flex">
                R
              </div>
            </div>

            {data.usage.full && (
              <div className="mb-6 border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning">
                Online booking is full for this month. Please contact the business on WhatsApp.
              </div>
            )}

            {error && (
              <div className="mb-6 border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Panel className="p-6 sm:p-8">
              <div className="space-y-10">
                <Section label="01 - Pick a service">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.services.map((entry) => (
                      <ServiceButton
                        key={entry.id}
                        service={entry}
                        active={entry.id === serviceId}
                        onClick={() => setServiceId(entry.id)}
                      />
                    ))}
                  </div>
                </Section>

                <Section label="02 - Pick a date">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {dates.map((entry) => (
                      <button
                        key={entry.value}
                        onClick={() => setDate(entry.value)}
                        className={`min-w-[92px] border p-3 text-center transition-all ${
                          date === entry.value
                            ? "border-primary bg-primary/10"
                            : "border-border-strong hover:border-accent/60"
                        }`}
                      >
                        <div className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                          {entry.label.split(" ")[0]}
                        </div>
                        <div className="mt-1 font-display text-sm tracking-[0.08em] text-foreground">
                          {entry.label.replace(/^\S+\s/, "")}
                        </div>
                      </button>
                    ))}
                  </div>
                </Section>

                <Section label="03 - Pick a time">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.length === 0 && (
                      <div className="col-span-full border border-border-strong p-4 text-sm text-muted-foreground">
                        No slots on this date.
                      </div>
                    )}
                    {slots.map((slot) => (
                      <button
                        key={slot.startAt}
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot)}
                        title={slot.reason}
                        className={`py-2.5 text-center font-display text-sm tracking-[0.1em] transition-all ${
                          !slot.available
                            ? "border border-border bg-muted/40 text-muted-foreground/40 line-through"
                            : selectedSlot?.startAt === slot.startAt
                              ? "border border-primary bg-primary/10 text-primary"
                              : "border border-border-strong text-foreground hover:border-accent/60"
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </Section>

                <Section label="04 - Your details">
                  <div className="space-y-4">
                    <Field label="Your name">
                      <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Marie Dupont"
                        className="w-full bg-transparent py-3 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                      />
                    </Field>
                    <Field label="WhatsApp number">
                      <input
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        onBlur={() => {
                          const normalized = normalizeWhatsAppNumber(phone);
                          if (!validateWhatsAppNumber(normalized)) setPhone(normalized);
                        }}
                        placeholder="+230 5700 0000"
                        className="w-full bg-transparent py-3 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                      />
                    </Field>
                    <p
                      className={`text-xs ${
                        phone.trim() && phoneValidation
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {phone.trim() && phoneValidation
                        ? phoneValidation
                        : "Use an international WhatsApp number. Mauritius mobile numbers can be entered as 5XXXXXXX."}
                    </p>
                    <div>
                      <div className="kicker">Language</div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {(["English", "Francais", "Both"] as BookingLanguage[]).map((entry) => (
                          <button
                            key={entry}
                            onClick={() => setLanguage(entry)}
                            className={`border px-3 py-2 font-display text-xs tracking-[0.18em] uppercase ${
                              language === entry
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-border-strong text-muted-foreground hover:border-accent"
                            }`}
                          >
                            {entry}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Section>

                <button
                  onClick={confirm}
                  disabled={!ready || submitting || data.usage.full}
                  className="btn-solid w-full py-4"
                >
                  {submitting
                    ? "Confirming..."
                    : ready
                      ? "Confirm booking"
                      : "Complete all steps above"}
                </button>
              </div>
            </Panel>
          </>
        )}
      </Page>
    </>
  );
}

function normalizeWhatsAppNumber(value: string) {
  const compact = value.trim().replace(/[()\s-]/g, "");
  if (/^5\d{7}$/.test(compact)) return `+230${compact}`;
  return compact;
}

function validateWhatsAppNumber(value: string) {
  const normalized = normalizeWhatsAppNumber(value);
  if (!normalized) return "WhatsApp number is required.";
  if (!/^\+[1-9]\d{6,14}$/.test(normalized)) {
    return "Enter a valid international WhatsApp number, for example +23057000000.";
  }
  return null;
}

function BookingPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="h-3 w-40 animate-pulse bg-muted" />
        <div className="h-12 w-3/4 animate-pulse bg-muted" />
        <div className="h-4 w-2/3 animate-pulse bg-muted" />
      </div>
      <Panel className="p-6 sm:p-8">
        <div className="space-y-8">
          {[0, 1, 2, 3].map((section) => (
            <div key={section} className="space-y-3">
              <div className="h-3 w-36 animate-pulse bg-muted" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="h-16 animate-pulse border border-border-strong bg-muted/40" />
                <div className="h-16 animate-pulse border border-border-strong bg-muted/40" />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ServiceButton({
  service,
  active,
  onClick,
}: {
  service: Service;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative border p-5 text-left transition-all ${
        active
          ? "border-primary bg-primary/10"
          : "border-border-strong hover:border-accent/60 hover:bg-card"
      }`}
    >
      <div className="font-display text-base tracking-[0.1em] uppercase text-foreground">
        {service.name}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{service.durationMinutes} min</span>
        <span className="font-display tracking-[0.15em] text-accent">{service.priceLabel}</span>
      </div>
      {active && (
        <span className="absolute right-3 top-3 font-display text-[10px] tracking-[0.3em] uppercase text-primary">
          Selected
        </span>
      )}
    </button>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 font-display text-[10px] tracking-[0.35em] uppercase text-accent">
        {label}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block border-b border-border-strong">
      <div className="kicker">{label}</div>
      {children}
    </label>
  );
}
