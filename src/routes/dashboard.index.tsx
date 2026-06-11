import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Kicker, Panel } from "@/components/reservly/AppShell";
import { getDashboardData } from "@/lib/cf/client-data";
import { getSiteUrl } from "@/lib/reservly/env";
import { formatDateLabel, formatTimeLabel, getBookingMonthKey } from "@/lib/reservly/slots";
import type { Booking, DashboardData } from "@/lib/reservly/types";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

function DashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getDashboardData().then(setData);
  }, []);

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const monthKey = getBookingMonthKey(now.toISOString());
  const activeBookings = data?.bookings.filter((booking) => booking.status !== "cancelled") ?? [];
  const today = activeBookings.filter((booking) => booking.startAt.slice(0, 10) === todayKey);
  const upcoming = activeBookings.filter(
    (booking) => new Date(booking.startAt).getTime() >= now.getTime(),
  );
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thisWeek = upcoming.filter((booking) => new Date(booking.startAt) <= weekEnd).length;
  const monthCount = activeBookings.filter(
    (booking) => getBookingMonthKey(booking.startAt) === monthKey,
  ).length;

  const bookingLink = data?.business ? `${getSiteUrl()}/b/${data.business.slug}` : "";
  const displayUrl = bookingLink.replace(/^https?:\/\//, "");
  const whatsAppShareUrl = data?.business
    ? `https://wa.me/?text=${encodeURIComponent(
        `Book your appointment with ${data.business.name} here: ${bookingLink}`,
      )}`
    : "#";

  const nextRows = useMemo(
    () =>
      upcoming
        .slice(0, 6)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [upcoming],
  );

  function copy() {
    if (!bookingLink) return;
    navigator.clipboard?.writeText(bookingLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (!data) return <DashboardSkeleton />;

  if (!data.business) {
    return (
      <Panel className="p-8">
        <Kicker tone="accent">Setup needed</Kicker>
        <h1 className="mt-4 font-serif text-4xl text-foreground">Create your booking page.</h1>
        <Link to="/onboarding" className="btn-solid mt-6 inline-flex">
          Start onboarding
        </Link>
      </Panel>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Kicker tone="muted">{formatDateLabel(now.toISOString(), { year: "numeric" })}</Kicker>
          <h1 className="mt-4 font-serif text-4xl text-foreground sm:text-5xl">
            Good morning, {data.owner?.name?.split("@")[0] ?? "owner"}.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.business.name} - {today.length} bookings today, {upcoming.length} upcoming.
          </p>
        </div>
        <button onClick={copy} className={copied ? "btn-frame-primary" : "btn-frame"}>
          {copied ? "Link copied" : "Copy booking link"}
        </button>
      </div>

      <Panel className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="kicker text-accent">Your booking link</div>
          <div className="mt-2 font-display text-lg tracking-[0.05em] text-foreground">
            {displayUrl}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button onClick={copy} className="btn-frame self-start sm:self-auto">
            {copied ? "Copied" : "Copy"}
          </button>
          <a
            href={whatsAppShareUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-frame self-start sm:self-auto"
          >
            WhatsApp
          </a>
          <a
            href={`/b/${data.business.slug}`}
            target="_blank"
            rel="noreferrer"
            className="btn-frame self-start sm:self-auto"
          >
            Preview
          </a>
        </div>
      </Panel>

      <div className="grid grid-cols-2 border border-border-strong sm:grid-cols-4">
        <StatCell
          val={String(today.length)}
          label="Today"
          tone="primary"
          border="sm:border-r"
          mobileBorder="border-r"
          bottom="border-b sm:border-b-0"
        />
        <StatCell
          val={String(thisWeek)}
          label="This week"
          tone="neutral"
          border="sm:border-r"
          bottom="border-b sm:border-b-0"
        />
        <StatCell
          val={String(monthCount)}
          label="This month"
          tone="accent"
          border="sm:border-r"
          mobileBorder="border-r"
        />
        <StatCell
          val={data.usage.limit ? `${data.usage.used}/${data.usage.limit}` : "Unlimited"}
          label="Plan usage"
          tone={data.usage.full ? "warning" : "neutral"}
        />
      </div>

      {data.usage.nearLimit && (
        <Panel className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="kicker text-warning">Upgrade recommended</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Free plan usage is {data.usage.used} / {data.usage.limit} bookings this month.
            </p>
          </div>
          <Link to="/dashboard/settings" className="btn-solid">
            Upgrade
          </Link>
        </Panel>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <Kicker tone="accent">Upcoming bookings</Kicker>
          <Link
            to="/dashboard/bookings"
            className="font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-accent"
          >
            View all
          </Link>
        </div>
        <Panel className="overflow-hidden">
          {nextRows.length === 0 && (
            <div className="px-6 py-12 text-center font-display text-xs tracking-[0.25em] uppercase text-muted-foreground">
              No upcoming bookings
            </div>
          )}
          {nextRows.map((booking, index) => (
            <BookingRow key={booking.id} booking={booking} last={index === nextRows.length - 1} />
          ))}
        </Panel>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-4">
          <div className="h-3 w-40 animate-pulse bg-muted" />
          <div className="h-12 w-72 max-w-full animate-pulse bg-muted" />
          <div className="h-4 w-60 max-w-full animate-pulse bg-muted" />
        </div>
        <div className="h-10 w-40 animate-pulse border border-border-strong bg-muted/40" />
      </div>
      <Panel className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="h-3 w-32 animate-pulse bg-muted" />
            <div className="h-6 w-64 max-w-full animate-pulse bg-muted" />
          </div>
          <div className="h-10 w-28 animate-pulse border border-border-strong bg-muted/40" />
        </div>
      </Panel>
      <div className="grid grid-cols-2 border border-border-strong sm:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="space-y-3 border-border-strong p-5 sm:border-r">
            <div className="h-8 w-16 animate-pulse bg-muted" />
            <div className="h-3 w-24 animate-pulse bg-muted" />
          </div>
        ))}
      </div>
      <Panel className="p-6">
        <div className="space-y-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-14 animate-pulse border border-border bg-muted/40" />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function BookingRow({ booking, last }: { booking: Booking; last: boolean }) {
  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-card ${
        last ? "" : "border-b border-border"
      }`}
    >
      <span className="min-w-[56px] font-display text-sm tracking-[0.1em] text-accent">
        {formatTimeLabel(booking.startAt)}
      </span>
      <div className="flex-1">
        <div className="font-display text-base tracking-[0.05em] text-foreground">
          {booking.customerName}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {formatDateLabel(booking.startAt)} - {booking.serviceName ?? "Service"}
        </div>
      </div>
      <StatusPill status={booking.status} />
    </div>
  );
}

function StatCell({
  val,
  label,
  tone,
  border,
  mobileBorder,
  bottom,
}: {
  val: string;
  label: string;
  tone: "primary" | "neutral" | "accent" | "warning";
  border?: string;
  mobileBorder?: string;
  bottom?: string;
}) {
  const colorMap = {
    primary: "text-primary",
    neutral: "text-foreground",
    accent: "text-accent",
    warning: "text-warning",
  } as const;
  return (
    <div
      className={`p-5 ${mobileBorder ?? ""} ${border ?? ""} ${bottom ?? ""} border-border-strong`}
    >
      <div className={`font-display text-3xl font-light tracking-[0.04em] ${colorMap[tone]}`}>
        {val}
      </div>
      <div className="mt-2 font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Booking["status"] }) {
  const map = {
    confirmed: { cls: "border-success/40 bg-success-soft text-success", label: "Confirmed" },
    pending: { cls: "border-warning/40 bg-warning-soft text-warning", label: "Pending" },
    cancelled: {
      cls: "border-destructive/40 bg-destructive/10 text-destructive",
      label: "Cancelled",
    },
  } as const;
  const item = map[status];
  return (
    <span
      className={`border px-2.5 py-1 font-display text-[10px] tracking-[0.25em] uppercase ${item.cls}`}
    >
      {item.label}
    </span>
  );
}
