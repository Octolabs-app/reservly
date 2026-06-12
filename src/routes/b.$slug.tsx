import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Page, Panel, SiteHeader } from "@/components/rezavu/AppShell";
import { createBooking, getAvailableSlots, getPublicBusinessBySlug } from "@/lib/cf/client-data";
import { getSiteUrl } from "@/lib/rezavu/env";
import {
  defaultPageLang,
  showsLangToggle,
  slotReasonLabel,
  t,
  type PageLang,
} from "@/lib/rezavu/i18n";
import { normalizeWhatsAppNumber, validateWhatsAppNumber } from "@/lib/rezavu/phone";
import { addDaysToDateInput, mauritiusTodayInput } from "@/lib/rezavu/slots";
import type { BookingLanguage, PublicBusiness, Service, Slot } from "@/lib/rezavu/types";

export const Route = createFileRoute("/b/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Book with ${params.slug.replace(/-/g, " ")} — Rezavu` },
      {
        name: "description",
        content: "Pick a service and time. Confirmation arrives straight on WhatsApp.",
      },
    ],
  }),
  component: BookingPage,
});

const CATEGORY_ICONS: Record<string, string> = {
  Beauty: "💇",
  Health: "🏥",
  Fitness: "🏋️",
  Tutor: "📚",
  Home: "🔧",
  Hospitality: "🏨",
  Other: "⭐",
};

function dateChip(value: string, lang: PageLang) {
  const display = new Date(`${value}T12:00:00+04:00`);
  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  return {
    value,
    day: display.toLocaleDateString(locale, { weekday: "short", timeZone: "Indian/Mauritius" }),
    num: display.toLocaleDateString("en-GB", { day: "numeric", timeZone: "Indian/Mauritius" }),
    full: display.toLocaleDateString(locale, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      timeZone: "Indian/Mauritius",
    }),
  };
}

function BookingPage() {
  const { slug } = Route.useParams();
  const [data, setData] = useState<PublicBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string>("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState<BookingLanguage>("Both");
  const [pageLang, setPageLang] = useState<PageLang>("en");
  const [submitting, setSubmitting] = useState(false);

  const langSetting = data?.business.bookingPageLanguage;
  const maxDays = Math.min(data?.business.maxAdvanceDays ?? 14, 30);
  const dates = useMemo(() => {
    const today = mauritiusTodayInput();
    return Array.from({ length: maxDays }, (_, index) =>
      dateChip(addDaysToDateInput(today, index), pageLang),
    );
  }, [maxDays, pageLang]);

  useEffect(() => {
    setLoading(true);
    getPublicBusinessBySlug(slug)
      .then((result) => {
        setData(result);
        setServiceId(result?.services[0]?.id ?? "");
        setDate(mauritiusTodayInput());
        if (result) {
          setPageLang(defaultPageLang(result.business.bookingPageLanguage));
          setLanguage(result.business.bookingPageLanguage);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Booking page failed to load."))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!data || !serviceId || !date) return;
    setSelectedSlot(null);
    setSlotsLoading(true);
    // Stale-response guard: rapid date taps must not render an older response.
    let active = true;
    getAvailableSlots(data.business.id, serviceId, date)
      .then((result) => {
        if (active) setSlots(result);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Slots failed to load.");
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [data, serviceId, date]);

  const service = data?.services.find((entry) => entry.id === serviceId) ?? null;
  const phoneValidation = validateWhatsAppNumber(phone);
  const ready = Boolean(service && selectedSlot && name.trim().length > 1 && !phoneValidation);
  const progress =
    (service ? 1 : 0) +
    (date ? 1 : 0) +
    (selectedSlot ? 1 : 0) +
    (name.trim() && phone.trim() && !phoneValidation ? 1 : 0);
  const selectedDate = dates.find((entry) => entry.value === date);
  const siteHost = getSiteUrl().replace(/^https?:\/\//, "");
  const hasUnavailable = slots.some((slot) => !slot.available);

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
      window.location.href = `/b/${data.business.slug}/confirmed?bookingId=${booking.id}&lang=${pageLang}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking could not be created.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <Page width="sm">
        {loading && <BookingPageSkeleton />}

        {!loading && !data && (
          <Panel className="p-8 text-center">
            <div className="mb-3 text-4xl">🔍</div>
            <h1 className="text-lg font-bold text-foreground">{t("notFoundTitle", pageLang)}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{t("notFoundSub", pageLang)}</p>
          </Panel>
        )}

        {data && (
          <Panel className="overflow-hidden">
            {/* URL bar + language toggle */}
            <div className="flex items-center justify-between gap-3 bg-ink px-4 py-2.5">
              <span className="truncate font-mono text-[11px] text-white/50">
                {siteHost}/b/{data.business.slug}
              </span>
              {showsLangToggle(langSetting) && (
                <div className="flex gap-1" role="group" aria-label="Page language">
                  {(["en", "fr"] as PageLang[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setPageLang(lang)}
                      aria-pressed={pageLang === lang}
                      className={`rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                        pageLang === lang
                          ? "bg-white/20 text-white"
                          : "text-white/40 hover:text-white/70"
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="h-[3px] bg-surface-2">
              <div
                className="h-[3px] bg-primary transition-all duration-300"
                style={{ width: `${progress * 25}%` }}
              />
            </div>

            {/* Business header */}
            <div className="flex items-center gap-3.5 border-b border-border px-5 py-4">
              <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-2xl">
                {CATEGORY_ICONS[data.business.category] ?? "⭐"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-bold text-foreground">
                  {data.business.name}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full border border-primary/25 bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {data.business.category}
                  </span>
                  {data.business.city && (
                    <span className="text-xs text-muted-foreground">· {data.business.city}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-7 px-5 pb-6 pt-5">
              {data.usage.full && (
                <div className="rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-sm text-warning">
                  {t("monthFull", pageLang)}
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-destructive/25 bg-destructive-soft px-3.5 py-2.5 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* 1 — Service */}
              <Section label={t("pickService", pageLang)}>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {data.services.map((entry) => (
                    <ServiceButton
                      key={entry.id}
                      service={entry}
                      active={entry.id === serviceId}
                      lang={pageLang}
                      onClick={() => setServiceId(entry.id)}
                    />
                  ))}
                </div>
              </Section>

              {/* 2 — Date */}
              <Section label={t("pickDate", pageLang)}>
                <div className="flex gap-1.5 overflow-x-auto pb-1.5">
                  {dates.map((entry) => {
                    const active = date === entry.value;
                    return (
                      <button
                        key={entry.value}
                        onClick={() => setDate(entry.value)}
                        aria-pressed={active}
                        aria-label={entry.full}
                        className={`min-w-[52px] shrink-0 rounded-xl border-[1.5px] px-1.5 py-2 text-center transition-all ${
                          active
                            ? "border-primary bg-primary text-white"
                            : "border-border bg-white hover:border-primary-mid"
                        }`}
                      >
                        <div
                          className={`text-[10px] ${active ? "text-white/70" : "text-muted-foreground"}`}
                        >
                          {entry.day}
                        </div>
                        <div
                          className={`mt-0.5 text-[17px] font-semibold ${
                            active ? "text-white" : "text-foreground"
                          }`}
                        >
                          {entry.num}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Section>

              {/* 3 — Time */}
              <Section
                label={service?.allDay ? t("confirmDay", pageLang) : t("pickTime", pageLang)}
              >
                {slotsLoading ? (
                  <div className="grid grid-cols-3 gap-1.5">
                    {[0, 1, 2, 3, 4, 5].map((item) => (
                      <div key={item} className="skeleton h-10" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <div className="rounded-lg border border-border bg-surface px-3.5 py-3 text-[13px] text-muted-foreground">
                    {t("noSlots", pageLang)}
                  </div>
                ) : (
                  <div
                    className={
                      service?.allDay
                        ? "grid grid-cols-1 gap-1.5"
                        : "grid grid-cols-3 gap-1.5 sm:grid-cols-4"
                    }
                  >
                    {slots.map((slot) => {
                      const active = selectedSlot?.startAt === slot.startAt;
                      const reasonText = slot.reason
                        ? slotReasonLabel(slot.reason, pageLang)
                        : undefined;
                      return (
                        <button
                          key={slot.startAt}
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot)}
                          aria-pressed={active}
                          title={reasonText}
                          className={`rounded-[10px] border-[1.5px] py-2.5 text-center text-[13px] transition-all ${
                            !slot.available
                              ? "cursor-not-allowed border-border bg-surface text-muted-foreground/50 line-through opacity-60"
                              : active
                                ? "border-primary bg-primary font-semibold text-white"
                                : "border-border bg-white text-foreground hover:border-primary-mid"
                          }`}
                        >
                          {slot.time === "All day" ? t("allDay", pageLang) : slot.time}
                          {reasonText && <span className="sr-only"> — {reasonText}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                {hasUnavailable && !slotsLoading && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {t("slotLegend", pageLang)}
                  </p>
                )}
                {service?.allDay && slots.some((slot) => slot.available) && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {t("allDayNote", pageLang)}
                  </p>
                )}
              </Section>

              {/* 4 — Details */}
              <Section label={t("yourDetails", pageLang)}>
                <div className="space-y-3.5">
                  <div>
                    <label className="kicker mb-1.5 block" htmlFor="booking-name">
                      {t("yourName", pageLang)}
                    </label>
                    <input
                      id="booking-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder={t("namePlaceholder", pageLang)}
                      autoComplete="name"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="kicker mb-1.5 block" htmlFor="booking-phone">
                      {t("whatsappNumber", pageLang)}
                    </label>
                    <input
                      id="booking-phone"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      onBlur={() => {
                        const normalized = normalizeWhatsAppNumber(phone);
                        if (!validateWhatsAppNumber(normalized)) setPhone(normalized);
                      }}
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+230 5700 0000"
                      className="input-field"
                    />
                    <p
                      className={`mt-1 text-[11px] ${
                        phone.trim() && phoneValidation
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {phone.trim() && phoneValidation
                        ? `⚠ ${phoneValidation}`
                        : t("phoneHint", pageLang)}
                    </p>
                  </div>
                  <div>
                    <div className="kicker mb-2">{t("msgLanguage", pageLang)}</div>
                    <div
                      className="grid grid-cols-3 gap-2"
                      role="group"
                      aria-label={t("msgLanguage", pageLang)}
                    >
                      {(["English", "Francais", "Both"] as BookingLanguage[]).map((entry) => (
                        <button
                          key={entry}
                          onClick={() => setLanguage(entry)}
                          aria-pressed={language === entry}
                          className={`rounded-[10px] border-[1.5px] px-3 py-2 text-[13px] transition-all ${
                            language === entry
                              ? "border-primary bg-primary-soft font-semibold text-primary"
                              : "border-border bg-white text-muted-foreground hover:border-primary-mid"
                          }`}
                        >
                          {entry === "Francais"
                            ? "Français"
                            : entry === "Both"
                              ? pageLang === "fr"
                                ? "Les deux"
                                : "Both"
                              : entry}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>

              {/* Summary + CTA */}
              <div>
                {service && selectedDate && selectedSlot && (
                  <div className="mb-3 flex items-center gap-2 rounded-[10px] border border-primary-mid bg-primary-soft px-3.5 py-2.5 text-xs text-primary">
                    <span>📋</span>
                    <span className="font-medium">
                      {service.name} · {selectedDate.full}
                      {service.allDay
                        ? ` (${t("allDay", pageLang).toLowerCase()})`
                        : ` · ${selectedSlot.time}`}
                    </span>
                  </div>
                )}
                <button
                  onClick={confirm}
                  disabled={!ready || submitting || data.usage.full}
                  className={`${ready ? "btn-accent" : "btn-frame"} w-full py-3.5 text-[15px]`}
                >
                  {submitting
                    ? t("confirming", pageLang)
                    : ready
                      ? t("confirmBooking", pageLang)
                      : t("completeSteps", pageLang)}
                </button>
                <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="text-[13px] text-wa">●</span>
                  {t("waFootnote", pageLang)}
                </div>
              </div>
            </div>
          </Panel>
        )}
      </Page>
    </>
  );
}

function BookingPageSkeleton() {
  return (
    <Panel className="overflow-hidden">
      <div className="bg-ink px-4 py-3">
        <div className="skeleton h-3 w-48 opacity-30" />
      </div>
      <div className="flex items-center gap-3.5 border-b border-border px-5 py-4">
        <div className="skeleton h-13 w-13 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-5 w-40" />
          <div className="skeleton h-3.5 w-28" />
        </div>
      </div>
      <div className="space-y-6 px-5 py-5">
        {[0, 1, 2].map((section) => (
          <div key={section}>
            <div className="skeleton mb-3 h-3 w-32" />
            <div className="grid grid-cols-2 gap-2.5">
              <div className="skeleton h-16" />
              <div className="skeleton h-16" />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ServiceButton({
  service,
  active,
  lang,
  onClick,
}: {
  service: Service;
  active: boolean;
  lang: PageLang;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border-[1.5px] p-3.5 text-left transition-all ${
        active
          ? "border-primary bg-primary-soft shadow-[0_0_0_3px_rgba(27,79,216,0.09)]"
          : "border-border bg-white hover:border-primary-mid"
      }`}
    >
      <div className="text-[13px] font-semibold text-foreground">{service.name}</div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {service.allDay ? t("allDay", lang) : formatServiceDuration(service.durationMinutes)}
        </span>
        {service.priceLabel && (
          <span className="font-semibold text-foreground">{service.priceLabel}</span>
        )}
      </div>
    </button>
  );
}

function formatServiceDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="kicker mb-3">{label}</div>
      {children}
    </div>
  );
}
