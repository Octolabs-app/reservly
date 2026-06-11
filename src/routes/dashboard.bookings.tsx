import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Kicker, Panel } from "@/components/reservly/AppShell";
import { cancelBooking, getDashboardData, markBookingConfirmed } from "@/lib/cf/client-data";
import { formatDateLabel, formatTimeLabel } from "@/lib/reservly/slots";
import type { Booking, BookingStatus, DashboardData } from "@/lib/reservly/types";

export const Route = createFileRoute("/dashboard/bookings")({
  component: BookingsTab,
});

const FILTERS: Array<"all" | BookingStatus> = ["all", "confirmed", "pending", "cancelled"];

function BookingsTab() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    setData(await getDashboardData());
  }

  useEffect(() => {
    void refresh();
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.bookings ?? []).filter((booking) => {
      const matchesStatus = filter === "all" || booking.status === filter;
      const matchesQuery =
        !q ||
        booking.customerName.toLowerCase().includes(q) ||
        booking.customerPhone.toLowerCase().includes(q) ||
        (booking.serviceName ?? "").toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [data, filter, query]);

  async function act(booking: Booking, action: "cancel" | "confirm") {
    setBusyId(booking.id);
    try {
      if (action === "cancel") await cancelBooking(booking.id);
      else await markBookingConfirmed(booking.id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (!data) return <BookingsSkeleton />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Kicker>Bookings</Kicker>
          <h1 className="mt-4 font-serif text-4xl text-foreground sm:text-5xl">All bookings</h1>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, phone, service"
            className="w-full border border-border-strong bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none sm:w-72"
          />
          <div className="flex gap-1 border border-border-strong p-1">
            {FILTERS.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`px-3 py-1.5 font-display text-[10px] tracking-[0.25em] uppercase transition-colors ${
                  filter === item
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Panel className="overflow-hidden">
        {rows.length === 0 && (
          <div className="px-6 py-16 text-center font-display text-xs tracking-[0.25em] uppercase text-muted-foreground">
            No bookings match
          </div>
        )}
        {rows.map((booking, index) => (
          <div
            key={booking.id}
            className={`flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-card sm:flex-row sm:items-center ${
              index < rows.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <div className="min-w-[120px]">
              <div className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                {formatDateLabel(booking.startAt)}
              </div>
              <div className="mt-0.5 font-display text-base tracking-[0.05em] text-accent">
                {formatTimeLabel(booking.startAt)}
              </div>
            </div>
            <div className="flex-1">
              <div className="font-display text-base tracking-[0.05em] text-foreground">
                {booking.customerName}
              </div>
              <div className="text-xs text-muted-foreground">
                {booking.customerPhone} - {booking.serviceName ?? "Service"}
              </div>
            </div>
            <Status status={booking.status} />
            <div className="flex gap-2">
              {booking.status === "pending" && (
                <button
                  disabled={busyId === booking.id}
                  onClick={() => void act(booking, "confirm")}
                  className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground hover:text-success"
                >
                  Confirm
                </button>
              )}
              {booking.status !== "cancelled" && (
                <button
                  disabled={busyId === booking.id}
                  onClick={() => void act(booking, "cancel")}
                  className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground hover:text-destructive"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function BookingsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-4">
          <div className="h-3 w-28 animate-pulse bg-muted" />
          <div className="h-12 w-64 animate-pulse bg-muted" />
        </div>
        <div className="h-10 w-72 max-w-full animate-pulse border border-border-strong bg-muted/40" />
      </div>
      <Panel className="p-5">
        <div className="space-y-3">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-16 animate-pulse border border-border bg-muted/40" />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Status({ status }: { status: BookingStatus }) {
  const cls =
    status === "confirmed"
      ? "border-success/40 bg-success-soft text-success"
      : status === "pending"
        ? "border-warning/40 bg-warning-soft text-warning"
        : "border-destructive/40 bg-destructive/10 text-destructive";
  return (
    <span
      className={`w-fit border px-2.5 py-1 font-display text-[10px] tracking-[0.25em] uppercase ${cls}`}
    >
      {status}
    </span>
  );
}
