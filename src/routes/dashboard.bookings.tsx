import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Kicker, Panel } from "@/components/reservly/AppShell";

export const Route = createFileRoute("/dashboard/bookings")({
  component: BookingsTab,
});

const ROWS = [
  { date: "Wed 10 Jun", time: "09:00", name: "Marie D.", service: "Haircut", status: "confirmed" },
  { date: "Wed 10 Jun", time: "10:30", name: "Jean-Paul", service: "Colour", status: "confirmed" },
  { date: "Wed 10 Jun", time: "13:00", name: "Sophie R.", service: "Cut + Blow", status: "pending" },
  { date: "Thu 11 Jun", time: "09:30", name: "Priya N.", service: "Blowout", status: "confirmed" },
  { date: "Thu 11 Jun", time: "14:00", name: "Claire M.", service: "Haircut", status: "confirmed" },
  { date: "Fri 12 Jun", time: "10:00", name: "Anisha R.", service: "Colour", status: "pending" },
];

const FILTERS = ["All", "Confirmed", "Pending"] as const;

function BookingsTab() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const rows = ROWS.filter((r) => filter === "All" || r.status === filter.toLowerCase());

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Kicker>Upcoming · Next 7 days</Kicker>
          <h1 className="mt-4 font-serif text-4xl text-foreground sm:text-5xl">
            All bookings
          </h1>
        </div>
        <div className="flex gap-1 border border-border-strong p-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 font-display text-[10px] tracking-[0.25em] uppercase transition-colors ${
                filter === f
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <Panel className="overflow-hidden">
        {rows.length === 0 && (
          <div className="px-6 py-16 text-center font-display text-xs tracking-[0.25em] uppercase text-muted-foreground">
            No bookings match
          </div>
        )}
        {rows.map((b, i) => (
          <div
            key={i}
            className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-card ${
              i < rows.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <div className="min-w-[88px]">
              <div className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                {b.date}
              </div>
              <div className="mt-0.5 font-display text-base tracking-[0.05em] text-accent">
                {b.time}
              </div>
            </div>
            <div className="flex-1">
              <div className="font-display text-base tracking-[0.05em] text-foreground">
                {b.name}
              </div>
              <div className="text-xs text-muted-foreground">{b.service}</div>
            </div>
            <span
              className={`border px-2.5 py-1 font-display text-[10px] tracking-[0.25em] uppercase ${
                b.status === "confirmed"
                  ? "border-success/40 bg-success-soft text-success"
                  : "border-warning/40 bg-warning-soft text-warning"
              }`}
            >
              {b.status}
            </span>
            <button className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground hover:text-destructive">
              Cancel
            </button>
          </div>
        ))}
      </Panel>
    </div>
  );
}
