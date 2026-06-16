import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Page, Panel, SiteHeader } from "@/components/randevou/AppShell";
import { getBookingById } from "@/lib/cf/client-data";
import { getLastBooking } from "@/lib/randevou/dev-store";
import { t, type PageLang } from "@/lib/randevou/i18n";
import { formatDateLabel, formatTimeLabel } from "@/lib/randevou/slots";
import type { Booking } from "@/lib/randevou/types";

export const Route = createFileRoute("/b/$slug_/confirmed")({
  head: () => ({
    meta: [{ title: "Booking confirmed — Randevou" }, { name: "robots", content: "noindex" }],
  }),
  component: ConfirmedPage,
});

function ConfirmedPage() {
  const { slug } = Route.useParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [resolved, setResolved] = useState(false);
  const [show, setShow] = useState(false);

  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const bookingId = search?.get("bookingId") ?? null;
  const lang: PageLang = search?.get("lang") === "fr" ? "fr" : "en";

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 80);
    if (bookingId) {
      // The booking we just created is cached in sessionStorage — show it
      // instantly and let the API result replace it when available.
      const last = getLastBooking();
      if (last?.id === bookingId) setBooking(last);
      getBookingById(bookingId)
        .then((result) => {
          if (result) setBooking(result);
        })
        .catch(() => {})
        .finally(() => setResolved(true));
    } else {
      setResolved(true);
    }
    return () => clearTimeout(timer);
  }, [bookingId]);

  const businessName =
    booking?.businessName ??
    slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  const rows: Array<[string, string]> = booking
    ? [
        [t("rowBusiness", lang), businessName],
        [t("rowService", lang), booking.serviceName ?? "—"],
        [t("rowDate", lang), formatDateLabel(booking.startAt, { year: "numeric" })],
        [t("rowTime", lang), formatTimeLabel(booking.startAt)],
      ]
    : [];
  if (booking?.servicePriceLabel) rows.push([t("rowPrice", lang), booking.servicePriceLabel]);
  if (booking?.bookingRef) rows.push([t("rowRef", lang), booking.bookingRef]);

  return (
    <>
      <SiteHeader />
      <Page width="sm">
        <Panel className="overflow-hidden">
          <div className="bg-success px-5 py-3.5">
            <span className="text-sm font-bold text-white">{t("bookingReceived", lang)}</span>
          </div>
          <div className="px-6 pb-7 pt-9 text-center">
            <div
              className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-[2.5px] text-4xl transition-all duration-500 ${
                show
                  ? "scale-100 border-success bg-success-soft text-success opacity-100"
                  : "scale-50 border-border opacity-0"
              }`}
              style={{ transitionTimingFunction: "cubic-bezier(.34,1.56,.64,1)" }}
            >
              ✓
            </div>

            <h1 className="text-[22px] font-bold tracking-tight text-foreground">
              {t("youreBooked", lang)}
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {t("seeYouAt", lang)} {businessName}.
            </p>

            {booking ? (
              <div className="mt-6 rounded-xl border border-border bg-white px-4 py-1.5 text-left shadow-xs">
                {rows.map(([key, value], index) => (
                  <div
                    key={key}
                    className={`flex items-center justify-between gap-4 py-2.5 ${
                      index < rows.length - 1 ? "border-b border-border/70" : ""
                    }`}
                  >
                    <span className="text-[13px] text-muted-foreground">{key}</span>
                    <span className="text-right text-[13px] font-semibold text-foreground">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              resolved && (
                <div className="mt-6 rounded-xl bg-surface px-4 py-3.5 text-[13px] text-muted-foreground">
                  {t("detailsInWhatsApp", lang)}
                </div>
              )
            )}

            <div className="mt-4 flex items-center justify-center gap-2 rounded-[10px] border border-wa/25 bg-wa-soft px-4 py-2.5 text-[13px] text-success">
              <span className="text-base">💬</span>
              <span>
                {t("waSent", lang)}
                {booking?.customerPhone ? ` · ${booking.customerPhone}` : ""}
              </span>
            </div>

            <div className="mt-4 rounded-lg bg-surface px-3.5 py-2.5 text-left text-xs leading-relaxed text-muted-foreground">
              📅 {t("reminderNote", lang)}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2.5">
              {booking ? (
                <a
                  href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                    `Booking at ${businessName}`,
                  )}&dates=${calendarDate(booking.startAt)}/${calendarDate(booking.endAt)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-frame"
                >
                  {t("addToCalendar", lang)}
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  className="btn-frame cursor-not-allowed opacity-50"
                  title={t("detailsInWhatsApp", lang)}
                >
                  {t("addToCalendar", lang)}
                </span>
              )}
              <Link to="/b/$slug" params={{ slug }} className="btn-frame-primary">
                {t("newBooking", lang)}
              </Link>
            </div>

            <div className="mt-7">
              <Link
                to="/"
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Powered by Randevou →
              </Link>
            </div>
          </div>
        </Panel>
      </Page>
    </>
  );
}

function calendarDate(iso: string) {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
