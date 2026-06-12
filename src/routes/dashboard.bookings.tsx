import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, Panel, StatusPill } from "@/components/rezavu/AppShell";
import { cancelBooking, getDashboardData, markBookingConfirmed } from "@/lib/cf/client-data";
import { formatDateLabel, formatTimeLabel } from "@/lib/rezavu/slots";
import type { Booking, BookingStatus, DashboardData } from "@/lib/rezavu/types";

export const Route = createFileRoute("/dashboard/bookings")({
  component: BookingsTab,
});

const FILTERS: Array<{ id: "all" | BookingStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "confirmed", label: "Confirmed" },
  { id: "pending", label: "Pending" },
  { id: "cancelled", label: "Cancelled" },
];

function BookingsTab() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  async function refresh() {
    setLoadError(null);
    try {
      setData(await getDashboardData());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load bookings.");
    }
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
    setActionError(null);
    try {
      if (action === "cancel") await cancelBooking(booking.id);
      else await markBookingConfirmed(booking.id);
      setCancelTarget(null); // close only on success
      await refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "The change didn't go through — please try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loadError) {
    return (
      <Panel>
        <EmptyState
          icon="📡"
          title="Couldn't load bookings"
          sub={loadError}
          action={
            <button onClick={() => void refresh()} className="btn-solid">
              Retry
            </button>
          }
        />
      </Panel>
    );
  }

  if (!data) return <BookingsSkeleton />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Bookings</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Confirm, cancel and search every booking.
          </p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, phone, service…"
          aria-label="Search bookings by name, phone or service"
          className="input-field sm:w-72"
        />
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter bookings by status">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            aria-pressed={filter === item.id}
            className={`min-h-10 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
              filter === item.id
                ? "bg-primary text-white"
                : "border border-border bg-white text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="rounded-lg border border-destructive/25 bg-destructive-soft px-3.5 py-2.5 text-sm text-destructive">
          {actionError}
        </div>
      )}

      <Panel className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No bookings match"
            sub={
              query || filter !== "all"
                ? "Try a different search or filter."
                : "Share your booking link to start taking bookings."
            }
          />
        ) : (
          rows.map((booking, index) => (
            <div
              key={booking.id}
              className={`flex flex-col gap-2.5 px-4 py-3.5 transition-colors hover:bg-surface sm:flex-row sm:items-center ${
                index < rows.length - 1 ? "border-b border-border/70" : ""
              }`}
            >
              <div className="min-w-[88px] shrink-0">
                <div className="text-[11px] text-muted-foreground">
                  {formatDateLabel(booking.startAt)}
                </div>
                <div className="text-[13px] font-semibold text-foreground">
                  {formatTimeLabel(booking.startAt)}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-foreground">
                  {booking.customerName}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {booking.customerPhone || "No phone"} · {booking.serviceName ?? "Service"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={booking.status} />
                {booking.status === "pending" && (
                  <button
                    disabled={busyId === booking.id}
                    onClick={() => void act(booking, "confirm")}
                    className="min-h-10 rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-xs font-medium text-success transition-colors hover:bg-success hover:text-white"
                  >
                    Confirm
                  </button>
                )}
                {booking.status !== "cancelled" && (
                  <button
                    disabled={busyId === booking.id}
                    onClick={() => setCancelTarget(booking)}
                    className="min-h-10 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </Panel>

      {cancelTarget && (
        <CancelDialog
          booking={cancelTarget}
          busy={busyId === cancelTarget.id}
          error={actionError}
          onKeep={() => {
            setCancelTarget(null);
            setActionError(null);
          }}
          onCancel={() => void act(cancelTarget, "cancel")}
        />
      )}
    </div>
  );
}

function CancelDialog({
  booking,
  busy,
  error,
  onKeep,
  onCancel,
}: {
  booking: Booking;
  busy: boolean;
  error: string | null;
  onKeep: () => void;
  onCancel: () => void;
}) {
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    keepRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onKeep();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKeep]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onKeep}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-dialog-title"
        className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div id="cancel-dialog-title" className="text-[15px] font-bold text-foreground">
          Cancel this booking?
        </div>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {booking.customerName} will receive a WhatsApp cancellation message.
        </p>
        {error && (
          <div className="mt-3 rounded-lg border border-destructive/25 bg-destructive-soft px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button ref={keepRef} onClick={onKeep} className="btn-frame">
            Keep it
          </button>
          <button
            disabled={busy}
            onClick={onCancel}
            className="rounded-[10px] border border-destructive/30 bg-destructive-soft px-3 py-2 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive hover:text-white"
          >
            {busy ? "Cancelling…" : "Cancel booking"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="skeleton h-7 w-40" />
          <div className="skeleton h-4 w-60" />
        </div>
        <div className="skeleton h-10 w-72 max-w-full rounded-[10px]" />
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="skeleton h-10 w-24 rounded-full" />
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="border-b border-border/60 px-4 py-3.5 last:border-0">
            <div className="skeleton h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
