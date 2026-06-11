import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Kicker, Panel } from "@/components/reservly/AppShell";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

function DashboardHome() {
  const [copied, setCopied] = useState(false);

  const stats = [
    { val: "4", label: "Today", tone: "primary" as const },
    { val: "19", label: "This week", tone: "neutral" as const },
    { val: "Rs 6.8K", label: "Revenue", tone: "accent" as const },
    { val: "1", label: "No-shows", tone: "warning" as const },
  ];

  const today = [
    { time: "09:00", name: "Marie D.", service: "Haircut", status: "confirmed", price: "Rs 350" },
    { time: "10:30", name: "Jean-Paul", service: "Colour", status: "confirmed", price: "Rs 800" },
    { time: "13:00", name: "Sophie R.", service: "Cut + Blow", status: "pending", price: "Rs 550" },
    { time: "15:00", name: null, service: null, status: "open", price: null },
    { time: "16:30", name: null, service: null, status: "open", price: null },
  ];

  const copy = () => {
    navigator.clipboard?.writeText("https://reservly.app/b/salon-rose").catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-10">
      {/* Greeting */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Kicker tone="muted">Wednesday · 10 June 2026</Kicker>
          <h1 className="mt-4 font-serif text-4xl text-foreground sm:text-5xl">
            Good morning, Marie.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Salon Rose &middot; 4 bookings today, 2 slots still open.
          </p>
        </div>
        <button onClick={copy} className={copied ? "btn-frame-primary" : "btn-frame"}>
          {copied ? "✓ Link copied" : "Copy booking link"}
        </button>
      </div>

      {/* Booking link banner */}
      <Panel className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="kicker text-accent">Your booking link</div>
          <div className="mt-2 font-display text-lg tracking-[0.05em] text-foreground">
            reservly.app/b/salon-rose
          </div>
        </div>
        <a
          href="/b/salon-rose"
          target="_blank"
          rel="noreferrer"
          className="btn-frame self-start sm:self-auto"
        >
          Preview →
        </a>
      </Panel>

      {/* Stats */}
      <div className="grid grid-cols-2 border border-border-strong sm:grid-cols-4">
        {stats.map((s, i) => (
          <StatCell
            key={s.label}
            {...s}
            border={i < stats.length - 1 ? "sm:border-r" : ""}
            mobileBorder={i % 2 === 0 ? "border-r" : ""}
            bottom={i < 2 ? "border-b sm:border-b-0" : ""}
          />
        ))}
      </div>

      {/* Today */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <Kicker tone="accent">Today · Wednesday 10 June</Kicker>
          <button className="font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-accent">
            + Add manual booking
          </button>
        </div>
        <Panel className="overflow-hidden">
          {today.map((b, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-card ${
                i < today.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <span className="min-w-[56px] font-display text-sm tracking-[0.1em] text-accent">
                {b.time}
              </span>
              <div className="flex-1">
                <div
                  className={`font-display text-base tracking-[0.05em] ${
                    b.name ? "text-foreground" : "italic text-muted-foreground"
                  }`}
                >
                  {b.name ?? "— slot open —"}
                </div>
                {b.service && (
                  <div className="mt-0.5 text-xs text-muted-foreground">{b.service}</div>
                )}
              </div>
              {b.price && (
                <span className="hidden font-display text-xs tracking-[0.1em] text-muted-foreground sm:block">
                  {b.price}
                </span>
              )}
              <StatusPill status={b.status as "confirmed" | "pending" | "open"} />
            </div>
          ))}
        </Panel>
      </div>
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
    <div className={`p-5 ${mobileBorder} ${border} ${bottom} border-border-strong`}>
      <div className={`font-display text-3xl font-light tracking-[0.04em] ${colorMap[tone]}`}>
        {val}
      </div>
      <div className="mt-2 font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: "confirmed" | "pending" | "open" }) {
  const map = {
    confirmed: { cls: "border-success/40 bg-success-soft text-success", label: "Confirmed" },
    pending: { cls: "border-warning/40 bg-warning-soft text-warning", label: "Pending" },
    open: { cls: "border-border text-muted-foreground", label: "Open" },
  } as const;
  const s = map[status];
  return (
    <span
      className={`border px-2.5 py-1 font-display text-[10px] tracking-[0.25em] uppercase ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
