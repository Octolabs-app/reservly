import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, Panel, StatusPill } from "@/components/reservly/AppShell";
import { getDashboardData } from "@/lib/cf/client-data";
import { getSiteUrl } from "@/lib/reservly/env";
import { formatDateLabel, formatTimeLabel, getBookingMonthKey } from "@/lib/reservly/slots";
import type { Booking, DashboardData } from "@/lib/reservly/types";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

function greeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

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
  const today = activeBookings
    .filter((booking) => booking.startAt.slice(0, 10) === todayKey)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
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
      [...upcoming]
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
        .slice(0, 6),
    [upcoming],
  );

  function copy() {
    if (!bookingLink) return;
    navigator.clipboard?.writeText(bookingLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function share() {
    if (!bookingLink || !data?.business) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Book with ${data.business.name}`,
          url: bookingLink,
        });
        return;
      } catch {
        /* user dismissed — fall back to copy */
      }
    }
    copy();
  }

  if (!data) return <DashboardSkeleton />;

  if (!data.business) {
    return (
      <Panel>
        <EmptyState
          icon="✨"
          title="Create your booking page"
          sub="Three quick steps: business info, services, opening hours."
          action={
            <Link to="/onboarding" className="btn-solid">
              Start setup →
            </Link>
          }
        />
      </Panel>
    );
  }

  const usagePct = data.usage.limit ? Math.round((data.usage.used / data.usage.limit) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {greeting(now)}, {ownerFirstName(data)} 👋
        </h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {formatDateLabel(now.toISOString(), { year: "numeric" })} · {data.business.name}
        </p>
      </div>

      {/* Booking link banner */}
      <div className="flex flex-col gap-3 rounded-xl border border-primary-mid bg-primary-soft px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="kicker mb-1 text-primary">Your booking link</div>
          <div className="truncate font-mono text-[13px] font-medium text-foreground">
            {displayUrl}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <button onClick={copy} className="btn-frame px-3 py-2 text-xs">
            {copied ? "✓ Copied" : "Copy"}
          </button>
          <a
            href={whatsAppShareUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-wa px-3 py-2 text-xs"
          >
            WhatsApp
          </a>
          <button onClick={share} className="btn-solid px-3 py-2 text-xs">
            Share
          </button>
          <a
            href={`/b/${data.business.slug}`}
            target="_blank"
            rel="noreferrer"
            className="btn-frame px-3 py-2 text-xs"
          >
            Preview
          </a>
        </div>
      </div>

      {/* Plan usage warning */}
      {data.usage.limit !== null && usagePct >= 60 && (
        <div
          className={`flex flex-wrap items-center justify-between gap-2.5 rounded-[10px] border px-3.5 py-2.5 ${
            usagePct >= 90
              ? "border-destructive/30 bg-destructive-soft"
              : "border-warning/30 bg-warning-soft"
          }`}
        >
          <div className={`text-xs ${usagePct >= 90 ? "text-destructive" : "text-warning"}`}>
            {data.usage.used}/{data.usage.limit} free bookings used this month
            {usagePct >= 90 && " — almost at your limit!"}
          </div>
          <Link to="/dashboard/settings" className="btn-solid px-3 py-1.5 text-xs">
            Upgrade
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard val={String(today.length)} label="Today" tone="primary" />
        <StatCard val={String(thisWeek)} label="This week" tone="neutral" />
        <StatCard val={String(monthCount)} label="This month" tone="success" />
        <StatCard
          val={data.usage.limit ? `${data.usage.used}/${data.usage.limit}` : "∞"}
          label="Plan usage"
          tone={data.usage.full ? "warning" : "neutral"}
        />
      </div>

      {/* Today timeline */}
      <div>
        <div className="kicker mb-2.5">
          Today — {formatDateLabel(now.toISOString(), { year: "numeric" })}
        </div>
        <Panel className="overflow-hidden">
          {today.length === 0 ? (
            <EmptyState
              icon="📅"
              title="No bookings today"
              sub="Share your booking link to fill your day."
            />
          ) : (
            today.map((booking, index) => (
              <BookingRow key={booking.id} booking={booking} last={index === today.length - 1} />
            ))
          )}
        </Panel>
      </div>

      {/* Upcoming */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <span className="kicker">Upcoming bookings</span>
          <Link
            to="/dashboard/bookings"
            className="text-xs font-medium text-primary hover:underline"
          >
            View all →
          </Link>
        </div>
        <Panel className="overflow-hidden">
          {nextRows.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No upcoming bookings"
              sub="New bookings appear here the moment customers confirm."
            />
          ) : (
            nextRows.map((booking, index) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                last={index === nextRows.length - 1}
                showDate
              />
            ))
          )}
        </Panel>
      </div>
    </div>
  );
}

function ownerFirstName(data: DashboardData) {
  const source = data.owner?.name || data.owner?.email || "owner";
  return source.split("@")[0].split(/\s+/)[0];
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="skeleton h-7 w-64 max-w-full" />
        <div className="skeleton h-4 w-44" />
      </div>
      <div className="skeleton h-20 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="skeleton h-20 rounded-xl" />
        ))}
      </div>
      <div className="skeleton h-3 w-36" />
      <div className="space-y-px overflow-hidden rounded-2xl border border-border bg-card">
        {[0, 1, 2].map((item) => (
          <div key={item} className="border-b border-border/60 px-4 py-3.5 last:border-0">
            <div className="skeleton h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingRow({
  booking,
  last,
  showDate = false,
}: {
  booking: Booking;
  last: boolean;
  showDate?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-surface ${
        last ? "" : "border-b border-border/70"
      }`}
    >
      <div className="min-w-[52px] shrink-0">
        {showDate && (
          <div className="text-[11px] text-muted-foreground">
            {formatDateLabel(booking.startAt)}
          </div>
        )}
        <div className="text-[13px] font-semibold text-foreground">
          {formatTimeLabel(booking.startAt)}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-foreground">
          {booking.customerName}
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {booking.serviceName ?? "Service"}
        </div>
      </div>
      {booking.servicePriceLabel && (
        <span className="hidden text-xs font-medium text-foreground sm:block">
          {booking.servicePriceLabel}
        </span>
      )}
      <StatusPill status={booking.status} />
    </div>
  );
}

function StatCard({
  val,
  label,
  tone,
}: {
  val: string;
  label: string;
  tone: "primary" | "neutral" | "success" | "warning";
}) {
  const map = {
    primary: "bg-primary-soft text-primary",
    neutral: "bg-surface text-foreground",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
  } as const;
  return (
    <div
      className={`rounded-xl border border-border px-3 py-3.5 text-center ${map[tone].split(" ")[0]}`}
    >
      <div className={`text-xl font-bold leading-none ${map[tone].split(" ")[1]}`}>{val}</div>
      <div className="kicker mt-1.5 text-[10px]">{label}</div>
    </div>
  );
}
