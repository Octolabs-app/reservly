import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Kicker, Page, Panel, SiteHeader } from "@/components/reservly/AppShell";
import { getBookingById } from "@/lib/reservly/data";
import { formatDateLabel, formatTimeLabel } from "@/lib/reservly/slots";
import type { Booking } from "@/lib/reservly/types";

export const Route = createFileRoute("/b/$slug/confirmed")({
  head: () => ({
    meta: [{ title: "Booking confirmed - Reservly" }, { name: "robots", content: "noindex" }],
  }),
  component: ConfirmedPage,
});

function ConfirmedPage() {
  const { slug } = Route.useParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [show, setShow] = useState(false);
  const bookingId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("bookingId")
      : null;

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80);
    if (bookingId) {
      getBookingById(bookingId)
        .then(setBooking)
        .catch(() => setBooking(null));
    }
    return () => clearTimeout(t);
  }, [bookingId]);

  const businessName =
    booking?.businessName ??
    slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  const rows: Array<[string, string]> = [
    ["Business", businessName],
    ["Service", booking?.serviceName ?? "Selected service"],
    ["Date", booking ? formatDateLabel(booking.startAt, { year: "numeric" }) : "Confirmed"],
    ["Time", booking ? formatTimeLabel(booking.startAt) : "Confirmed"],
    ["Status", booking?.status ?? "pending"],
  ];

  if (booking?.servicePriceLabel) rows.push(["Price", booking.servicePriceLabel]);

  return (
    <>
      <SiteHeader />
      <Page width="sm">
        <div className="text-center">
          <Kicker tone="accent">Booking confirmed</Kicker>
        </div>

        <div className="mt-10 flex justify-center">
          <div
            className={`relative flex h-24 w-24 items-center justify-center border border-success text-4xl text-success transition-all duration-500 ${
              show ? "scale-100 opacity-100" : "scale-75 opacity-0"
            }`}
          >
            <span className="pulse-dot">OK</span>
          </div>
        </div>

        <h1 className="mt-8 text-center font-serif text-4xl text-foreground sm:text-5xl">
          You are booked in.
        </h1>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          See you soon at {businessName}.
        </p>

        <Panel className="mt-10 p-6">
          <div className="divide-y divide-border">
            {rows.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-4 py-3">
                <span className="font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                  {key}
                </span>
                <span className="text-right font-display text-sm tracking-[0.05em] text-foreground">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <div className="mt-6 flex items-center justify-center gap-2 border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          <span className="font-display text-[10px] tracking-[0.3em] uppercase">
            WhatsApp confirmation queued
          </span>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <a
            href={
              booking
                ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                    `Booking at ${businessName}`,
                  )}&dates=${calendarDate(booking.startAt)}/${calendarDate(booking.endAt)}`
                : "#"
            }
            className="btn-frame text-center"
          >
            Calendar
          </a>
          <Link to="/b/$slug" params={{ slug }} className="btn-frame-primary text-center">
            New booking
          </Link>
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/"
            className="font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-accent"
          >
            Back to Reservly
          </Link>
        </div>
      </Page>
    </>
  );
}

function calendarDate(iso: string) {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
